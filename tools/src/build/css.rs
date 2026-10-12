// tools/src/build/css.rs
//
// Production CSS: every stylesheet in dist is bundled (local `@import` chains
// inlined, so `tokens/index.css` is one request instead of eleven) and
// minified with Lightning CSS. Only safe transforms: the output is the same
// cascade for the target browsers. External `@import url(https://…)` stays.
// Dev builds skip this so the dev server serves the source files as written.

use std::collections::HashMap;
use std::path::{Path, PathBuf};

use lightningcss::bundler::{Bundler, ResolveResult, SourceProvider};
use lightningcss::stylesheet::{MinifyOptions, ParserOptions, PrinterOptions, StyleSheet};
use lightningcss::targets::{Browsers, Features, Targets};

/// Browser targets: roughly the last two versions of evergreen browsers plus
/// Safari / iOS 16.4. Features they all support are left as written.
fn targets() -> Targets {
  let v = |major: u32, minor: u32| Some((major << 16) | (minor << 8));
  Targets {
    browsers: Some(Browsers {
      chrome: v(120, 0),
      edge: v(120, 0),
      firefox: v(121, 0),
      safari: v(16, 4),
      ios_saf: v(16, 4),
      ..Browsers::default()
    }),
    include: Features::empty(),
    // light-dark() lowering rewrites colors into custom-property toggles that
    // depend on where color-scheme is set; never rewrite it.
    exclude: Features::LightDark,
  }
}

/// Every CSS file of the build, read once, served to the bundler.
struct DistFiles {
  dist: PathBuf,
  files: HashMap<PathBuf, String>,
}

impl SourceProvider for DistFiles {
  type Error = std::io::Error;

  fn read<'a>(&'a self, file: &Path) -> Result<&'a str, Self::Error> {
    self.files.get(file).map(String::as_str).ok_or_else(|| {
      std::io::Error::new(
        std::io::ErrorKind::NotFound,
        format!("{} is not a stylesheet of this build", file.display()),
      )
    })
  }

  fn resolve(&self, specifier: &str, originating_file: &Path) -> Result<ResolveResult, Self::Error> {
    if specifier.contains("://") || specifier.starts_with("//") || specifier.starts_with("data:") {
      return Ok(ResolveResult::External(specifier.to_string()));
    }
    let path = match specifier.strip_prefix('/') {
      Some(site_root) => self.dist.join(site_root),
      None => originating_file.parent().unwrap_or(&self.dist).join(specifier),
    };
    Ok(ResolveResult::File(normalize(&path)))
  }
}

/// Bundle and minify one stylesheet (`file` is an absolute dist path).
fn optimize(provider: &DistFiles, file: &Path) -> Result<String, String> {
  let mut bundler = Bundler::new(provider, None, ParserOptions::default());
  let mut sheet: StyleSheet = bundler.bundle(file).map_err(|e| e.to_string())?;
  let targets = targets();
  sheet
    .minify(MinifyOptions {
      targets,
      ..MinifyOptions::default()
    })
    .map_err(|e| e.to_string())?;
  let out = sheet
    .to_css(PrinterOptions {
      minify: true,
      targets,
      ..PrinterOptions::default()
    })
    .map_err(|e| e.to_string())?;
  Ok(out.code)
}

/// Minify a CSS string that is inlined into HTML (no `@import` resolution).
/// Returns the input unchanged when it does not parse.
pub fn minify_inline(css: &str) -> String {
  let Ok(mut sheet) = StyleSheet::parse(css, ParserOptions::default()) else {
    return css.to_string();
  };
  let targets = targets();
  if sheet
    .minify(MinifyOptions {
      targets,
      ..MinifyOptions::default()
    })
    .is_err()
  {
    return css.to_string();
  }
  sheet
    .to_css(PrinterOptions {
      minify: true,
      targets,
      ..PrinterOptions::default()
    })
    .map(|out| out.code)
    .unwrap_or_else(|_| css.to_string())
}

/// Bundle + minify every `.css` among `outputs` (paths relative to `dist`),
/// in place. A stylesheet Lightning CSS cannot process is left as written
/// and reported as a warning; a failed write is an error.
pub fn optimize_dist(dist: &Path, outputs: &[PathBuf]) -> Result<Vec<String>, Vec<String>> {
  use rayon::prelude::*;

  let mut rels: Vec<&PathBuf> = outputs
    .iter()
    .filter(|p| p.extension().map_or(false, |e| e == "css"))
    .collect();
  rels.sort();
  rels.dedup();

  let mut errors = Vec::new();
  let mut files = HashMap::new();
  for rel in &rels {
    let path = normalize(&dist.join(rel));
    match std::fs::read_to_string(&path) {
      Ok(text) => {
        files.insert(path, text);
      }
      Err(err) => errors.push(format!("cannot read {}: {}", path.display(), err)),
    }
  }
  let provider = DistFiles {
    dist: dist.to_path_buf(),
    files,
  };

  // Compute every result from the original sources first, then write, so a
  // file is never bundled from an already-minified import.
  let results: Vec<(PathBuf, Result<String, String>)> = rels
    .par_iter()
    .map(|rel| {
      let path = normalize(&dist.join(rel));
      let out = optimize(&provider, &path);
      (path, out)
    })
    .collect();

  let mut warnings = Vec::new();
  for (path, result) in results {
    match result {
      Ok(css) => {
        if let Err(err) = crate::fs_atomic::write(&path, css.as_bytes()) {
          errors.push(err);
        }
      }
      Err(err) => warnings.push(format!("CSS left unminified: {}: {}", path.display(), err)),
    }
  }
  if errors.is_empty() {
    Ok(warnings)
  } else {
    Err(errors)
  }
}

fn normalize(path: &Path) -> PathBuf {
  let mut out = PathBuf::new();
  for comp in path.components() {
    match comp {
      std::path::Component::ParentDir => {
        out.pop();
      }
      std::path::Component::CurDir => {}
      other => out.push(other.as_os_str()),
    }
  }
  out
}

#[cfg(test)]
mod tests {
  use super::*;

  fn temp_dist(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("anza-css-{}-{}", name, std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(dir.join("tokens/primitives")).unwrap();
    dir
  }

  #[test]
  fn bundles_import_chains_and_keeps_external_imports() {
    let dist = temp_dist("bundle");
    std::fs::write(
      dist.join("tokens/index.css"),
      "@import url('https://fonts.example.com/x.css');\n@import './primitives/colors.css';\n@import url(\"/tokens/primitives/space.css\") layer(base);\n:root {  --a : 1px ; }\n",
    )
    .unwrap();
    std::fs::write(dist.join("tokens/primitives/colors.css"), ":root {\n  --red: #ff0000;\n}\n").unwrap();
    std::fs::write(dist.join("tokens/primitives/space.css"), ".x { margin: 0px 0px 0px 0px; }\n").unwrap();
    let outputs: Vec<PathBuf> = ["tokens/index.css", "tokens/primitives/colors.css", "tokens/primitives/space.css"]
      .iter()
      .map(PathBuf::from)
      .collect();

    let warnings = optimize_dist(&dist, &outputs).expect("optimize");
    assert!(warnings.is_empty(), "{warnings:?}");
    let css = std::fs::read_to_string(dist.join("tokens/index.css")).unwrap();
    assert!(css.starts_with("@import \"https://fonts.example.com/x.css\""), "{css}");
    assert!(!css.contains("primitives"), "{css}");
    assert!(css.contains("--red:red"), "{css}");
    assert!(css.contains("@layer base{.x{margin:0}}"), "{css}");
    assert!(css.contains("--a:1px"), "{css}");
    // Imported files are minified on their own as well.
    let colors = std::fs::read_to_string(dist.join("tokens/primitives/colors.css")).unwrap();
    assert_eq!(colors, ":root{--red:red}");
    let _ = std::fs::remove_dir_all(&dist);
  }

  #[test]
  fn unparsable_css_is_left_as_written() {
    let dist = temp_dist("broken");
    std::fs::write(dist.join("a.css"), "@import './missing.css';\n.a { color: red }\n").unwrap();
    let warnings = optimize_dist(&dist, &[PathBuf::from("a.css")]).expect("not fatal");
    assert_eq!(warnings.len(), 1, "{warnings:?}");
    let css = std::fs::read_to_string(dist.join("a.css")).unwrap();
    assert!(css.contains("@import './missing.css';"));
    let _ = std::fs::remove_dir_all(&dist);
  }

  #[test]
  fn minify_inline_shrinks_and_survives_bad_input() {
    assert_eq!(minify_inline(":host {  display : block ; }\n"), ":host{display:block}");
    assert_eq!(minify_inline("{{{"), "{{{");
  }
}
