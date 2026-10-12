// tools/src/build/compress.rs
//
// Production builds write `<file>.br` (brotli, quality 11) and `<file>.gz`
// (gzip, level 9) beside every text asset of at least 1 KB, so hosts that
// serve precompressed files (nginx gzip_static/brotli_static, Caddy
// `precompressed`, …) send the smallest encoding without compressing on each
// request. Output is deterministic: fixed parameters, gzip mtime 0, no name.

use std::io::Write;
use std::path::{Path, PathBuf};

/// Extensions that get precompressed siblings.
const EXTENSIONS: &[&str] = &["html", "js", "mjs", "css", "json", "svg"];
/// Smaller files gain little and cost an extra file each.
const MIN_SIZE: u64 = 1024;

/// Files under `dist` that get `.br` / `.gz` siblings, sorted.
fn candidates(dist: &Path) -> Vec<PathBuf> {
  let mut files: Vec<PathBuf> = walkdir::WalkDir::new(dist)
    .sort_by_file_name()
    .into_iter()
    .filter_map(|e| e.ok())
    .filter(|e| e.file_type().is_file())
    .filter(|e| {
      e.path()
        .extension()
        .and_then(|x| x.to_str())
        .map_or(false, |x| EXTENSIONS.contains(&x))
    })
    .filter(|e| e.metadata().map_or(false, |m| m.len() >= MIN_SIZE))
    .map(|e| e.into_path())
    .collect();
  files.sort();
  files
}

/// Brotli at maximum quality.
pub fn brotli(data: &[u8]) -> Vec<u8> {
  let params = brotli::enc::BrotliEncoderParams {
    quality: 11,
    lgwin: 22,
    ..Default::default()
  };
  let mut out = Vec::with_capacity(data.len() / 3);
  let mut input = data;
  brotli::BrotliCompress(&mut input, &mut out, &params).expect("in-memory brotli cannot fail");
  out
}

/// Gzip at level 9 with a fixed header (mtime 0, no file name).
pub fn gzip(data: &[u8]) -> Vec<u8> {
  let mut enc = flate2::GzBuilder::new()
    .mtime(0)
    .write(Vec::with_capacity(data.len() / 3), flate2::Compression::best());
  enc.write_all(data).expect("in-memory gzip cannot fail");
  enc.finish().expect("in-memory gzip cannot fail")
}

/// Write `.br` and `.gz` beside every candidate file in `dist`. A variant
/// that would not be smaller than the original is skipped. Returns the
/// number of files written, or every write error.
pub fn precompress(dist: &Path) -> Result<usize, Vec<String>> {
  use rayon::prelude::*;
  let results: Vec<Result<usize, String>> = candidates(dist)
    .par_iter()
    .map(|path| {
      let data = std::fs::read(path).map_err(|e| format!("cannot read {}: {}", path.display(), e))?;
      let mut written = 0;
      for (ext, bytes) in [("br", brotli(&data)), ("gz", gzip(&data))] {
        if bytes.len() >= data.len() {
          continue;
        }
        let mut target = path.clone().into_os_string();
        target.push(".");
        target.push(ext);
        crate::fs_atomic::write(Path::new(&target), &bytes)?;
        written += 1;
      }
      Ok(written)
    })
    .collect();
  let mut count = 0;
  let mut errors = Vec::new();
  for r in results {
    match r {
      Ok(n) => count += n,
      Err(e) => errors.push(e),
    }
  }
  if errors.is_empty() {
    Ok(count)
  } else {
    Err(errors)
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use std::io::Read;

  #[test]
  fn writes_round_tripping_deterministic_siblings_for_large_text_files() {
    let dist = std::env::temp_dir().join(format!("anza-compress-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dist);
    std::fs::create_dir_all(dist.join("a")).unwrap();
    let big = "body { color: red; }\n".repeat(200);
    std::fs::write(dist.join("a/x.css"), &big).unwrap();
    std::fs::write(dist.join("small.js"), "export {};\n").unwrap();
    std::fs::write(dist.join("logo.png"), vec![0u8; 4096]).unwrap();

    assert_eq!(precompress(&dist).unwrap(), 2);
    assert!(!dist.join("small.js.br").exists());
    assert!(!dist.join("logo.png.gz").exists());

    let br = std::fs::read(dist.join("a/x.css.br")).unwrap();
    let mut plain = Vec::new();
    brotli::Decompressor::new(&br[..], 4096).read_to_end(&mut plain).unwrap();
    assert_eq!(plain, big.as_bytes());

    let gz = std::fs::read(dist.join("a/x.css.gz")).unwrap();
    let mut plain = String::new();
    flate2::read::GzDecoder::new(&gz[..]).read_to_string(&mut plain).unwrap();
    assert_eq!(plain, big);
    assert_eq!(&gz[4..8], &[0, 0, 0, 0], "gzip mtime must be 0");

    // Same input, same bytes.
    assert_eq!(brotli(big.as_bytes()), br);
    assert_eq!(gzip(big.as_bytes()), gz);
    let _ = std::fs::remove_dir_all(&dist);
  }
}
