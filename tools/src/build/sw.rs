// tools/src/build/sw.rs
//
// Service Worker post-processing. Rewrites bare module specifiers in
// dist/sw.js to relative paths because SW scope does not support import maps.

use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;

use swc_common::{SourceMap, Span};
use swc_ecma_ast::*;
use swc_ecma_parser::{lexer::Lexer, Parser, StringInput, Syntax};
use swc_ecma_visit::{Visit, VisitWith};

/// Rewrite bare module specifiers in `dist/sw.js` to relative paths.
pub fn rewrite_imports(dist: &Path, map: &HashMap<String, String>) {
  let sw = dist.join("sw.js");
  if !sw.exists() {
    return;
  }
  let content = match std::fs::read_to_string(&sw) {
    Ok(c) => c,
    Err(_) => return,
  };

  let cm = Arc::new(SourceMap::default());
  let fm = match cm.load_file(&sw) {
    Ok(f) => f,
    Err(_) => return,
  };

  let lexer = Lexer::new(
    Syntax::Es(Default::default()),
    Default::default(),
    StringInput::from(&*fm),
    None,
  );
  let mut parser = Parser::new_from(lexer);
  let program = match parser.parse_program() {
    Ok(p) => p,
    Err(_) => return,
  };

  let mut specs: Vec<(Span, String)> = Vec::new();
  let mut visitor = Collector {
    specs: &mut specs,
    map,
  };
  program.visit_with(&mut visitor);

  if specs.is_empty() {
    return;
  }

  // Sort by position descending so earlier byte offsets stay valid.
  specs.sort_by(|a, b| b.0.lo.0.cmp(&a.0.lo.0));

  let file_start = fm.start_pos.0;
  let mut result = content;

  for (span, replacement) in specs {
    let start = (span.lo.0.saturating_sub(file_start)) as usize;
    let end = (span.hi.0.saturating_sub(file_start)) as usize;
    if start < result.len() && end <= result.len() && end >= start {
      result.replace_range(start..end, &replacement);
    }
  }

  std::fs::write(&sw, result).ok();
}

struct Collector<'a> {
  specs: &'a mut Vec<(Span, String)>,
  map: &'a HashMap<String, String>,
}

impl<'a> Visit for Collector<'a> {
  fn visit_import_decl(&mut self, n: &ImportDecl) {
    self.collect(&n.src);
    n.visit_children_with(self);
  }

  fn visit_named_export(&mut self, n: &NamedExport) {
    if let Some(src) = &n.src {
      self.collect(src);
    }
    n.visit_children_with(self);
  }

  fn visit_export_all(&mut self, n: &ExportAll) {
    self.collect(&n.src);
    n.visit_children_with(self);
  }

  fn visit_call_expr(&mut self, call: &CallExpr) {
    if let Callee::Import(_) = &call.callee {
      if let Some(arg) = call.args.first() {
        if let Expr::Lit(Lit::Str(s)) = &*arg.expr {
          self.collect(s);
        }
      }
    }
    call.visit_children_with(self);
  }
}

impl<'a> Collector<'a> {
  fn collect(&mut self, s: &Str) {
    if let Some(v) = str_value(s) {
      if is_bare(&v) {
        if let Some(target) = self.map.get(&v) {
          let rel = relative(target);
          let quote = match s.raw.as_ref() {
            Some(raw) if raw.starts_with('"') => '"',
            _ => '\'',
          };
          let replacement = format!("{}{}{}", quote, rel, quote);
          self.specs.push((s.span, replacement));
        }
      }
    }
  }
}

fn str_value(s: &Str) -> Option<String> {
  s.value.as_str().map(|v| v.to_string())
}

fn is_bare(spec: &str) -> bool {
  !spec.starts_with("./")
    && !spec.starts_with("../")
    && !spec.starts_with('/')
    && !spec.starts_with("http://")
    && !spec.starts_with("https://")
    && !spec.starts_with("data:")
}

/// Convert an importmap target (e.g. `/sw/index.js` or legacy `/dist/sw/index.js`)
/// into a relative path from `dist/sw.js` (e.g. `./sw/index.js`).
fn relative(target: &str) -> String {
  if let Some(stripped) = target.strip_prefix("/dist/") {
    format!("./{}", stripped)
  } else if let Some(stripped) = target.strip_prefix('/') {
    format!("./{}", stripped)
  } else {
    format!("./{}", target)
  }
}
