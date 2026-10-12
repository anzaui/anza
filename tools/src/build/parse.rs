// tools/src/build/parse.rs
//
// ESM import-graph parsing. Walks JS source with swc to extract:
//   - static/dynamic import specifiers
//   - re-export sources
//   - template/style asset paths from definition calls
//   - prop-type diagnostics from ui.element specs

use std::path::Path;
use std::sync::Arc;

use swc_common::{SourceMap, Span};
use swc_ecma_ast::*;
use swc_ecma_parser::{lexer::Lexer, Parser, StringInput, Syntax};
use swc_ecma_visit::{Visit, VisitWith};

use super::graph::{Diagnostic, Kind};

/// Parsed metadata for a single JS module.
pub struct Parsed {
  pub ast: Program,
  /// Static `import` / `export … from` specifiers.
  pub imports: Vec<(String, Span)>,
  /// Literal dynamic `import("…")` specifiers.
  pub dynamic: Vec<(String, Span)>,
  pub assets: Vec<(String, Span)>,
  /// Relative (`./`, `../`) assets of definition specs that a production
  /// build inlines into the module: every style, and every template except
  /// `page()` HTML (route-sized content the SSG already ships in HTML).
  pub inline: Vec<String>,
  pub prop_errors: Vec<(String, Span)>,
}

/// Parse a JS file and collect all import/asset/diagnostic metadata.
pub fn parse(file: &Path, cm: &Arc<SourceMap>) -> Result<Parsed, Diagnostic> {
  let fm = cm.load_file(file).map_err(|e| Diagnostic {
    kind: Kind::Parse,
    file: file.to_path_buf(),
    line: 0,
    col: 0,
    message: format!("cannot read file: {}", e),
  })?;

  let lexer = Lexer::new(
    Syntax::Es(Default::default()),
    Default::default(),
    StringInput::from(&*fm),
    None,
  );
  let mut parser = Parser::new_from(lexer);
  let program = match parser.parse_program() {
    Ok(p) => p,
    Err(err) => {
      return Err(Diagnostic {
        kind: Kind::Parse,
        file: file.to_path_buf(),
        line: 0,
        col: 0,
        message: format!("{:?}", err.kind()),
      });
    }
  };

  let mut visitor = Collector::default();
  program.visit_with(&mut visitor);

  Ok(Parsed {
    ast: program,
    imports: visitor.imports,
    dynamic: visitor.dynamic,
    assets: visitor.assets,
    inline: visitor.inline,
    prop_errors: visitor.prop_errors,
  })
}

#[derive(Default)]
struct Collector {
  imports: Vec<(String, Span)>,
  dynamic: Vec<(String, Span)>,
  assets: Vec<(String, Span)>,
  inline: Vec<String>,
  prop_errors: Vec<(String, Span)>,
}

/// Read a string-literal's value as an owned `String` (the swc atom may be WTF-8).
fn str_value(s: &Str) -> Option<String> {
  s.value.as_str().map(|v| v.to_string())
}

impl Visit for Collector {
  fn visit_import_decl(&mut self, n: &ImportDecl) {
    if let Some(v) = str_value(&n.src) {
      self.imports.push((v, n.src.span));
    }
    n.visit_children_with(self);
  }

  fn visit_named_export(&mut self, n: &NamedExport) {
    if let Some(src) = &n.src {
      if let Some(v) = str_value(src) {
        self.imports.push((v, src.span));
      }
    }
    n.visit_children_with(self);
  }

  fn visit_export_all(&mut self, n: &ExportAll) {
    if let Some(v) = str_value(&n.src) {
      self.imports.push((v, n.src.span));
    }
    n.visit_children_with(self);
  }

  fn visit_call_expr(&mut self, call: &CallExpr) {
    // Dynamic import("...")
    if let Callee::Import(_) = &call.callee {
      if let Some(arg) = call.args.first() {
        if let Expr::Lit(Lit::Str(s)) = &*arg.expr {
          if let Some(v) = str_value(s) {
            self.dynamic.push((v, s.span));
          }
        }
      }
    }

    // Definition calls carry template/style asset paths to copy:
    //   ui.element('tag', { template, style, props }) / ui.container(...)
    //   page(route, { template: { html, css }, ... }) / dock / view / part
    if let Callee::Expr(expr) = &call.callee {
      match &**expr {
        Expr::Member(member) => {
          if let (Expr::Ident(obj), MemberProp::Ident(prop)) = (&*member.obj, &member.prop) {
            if obj.sym == "ui" && (prop.sym == "element" || prop.sym == "container") {
              if call.args.len() >= 2 {
                if let Expr::Object(spec) = &*call.args[1].expr {
                  self.scan_spec(spec, false);
                }
              }
            }
          }
        }
        Expr::Ident(ident) => {
          if matches!(ident.sym.as_ref(), "page" | "dock" | "view" | "part") {
            if call.args.len() >= 2 {
              if let Expr::Object(spec) = &*call.args[1].expr {
                self.scan_spec(spec, ident.sym == "page");
              }
            }
          }
        }
        _ => {}
      }
    }

    call.visit_children_with(self);
  }
}

impl Collector {
  /// Records a relative asset path (template/style) for copying into dist.
  /// `inline`: the asset may be inlined into the module by a production build.
  fn push_asset(&mut self, s: &swc_ecma_ast::Str, inline: bool) {
    if let Some(v) = str_value(s) {
      if (v.starts_with("./") || v.starts_with("../") || v.starts_with('/'))
          && !v.starts_with("/*")
          && !v.starts_with("<!--")
          && !v.contains('{')
          && !v.contains('<') {
        if inline && !v.starts_with('/') && !self.inline.contains(&v) {
          self.inline.push(v.clone());
        }
        self.assets.push((v, s.span));
      }
    }
  }

  /// `page`: the spec belongs to a `page()` call (its HTML is not inlined).
  fn scan_spec(&mut self, spec: &ObjectLit, page: bool) {
    for prop in &spec.props {
      if let PropOrSpread::Prop(p) = prop {
        if let Prop::KeyValue(kv) = &**p {
          if let PropName::Ident(key) = &kv.key {
            match key.sym.as_ref() {
              // Legacy form: template/style are direct string paths.
              "template" | "style" => {
                let inline = !(page && key.sym == "template");
                match &*kv.value {
                  Expr::Lit(Lit::Str(s)) => self.push_asset(s, inline),
                  Expr::Array(arr) => {
                    for elem in &arr.elems {
                      if let Some(e) = elem {
                        if let Expr::Lit(Lit::Str(s)) = &*e.expr {
                          self.push_asset(s, inline);
                        }
                      }
                    }
                  }
                  // New form: template: { html: './t.html', css: './s.css' }.
                  Expr::Object(obj) => {
                    for p in &obj.props {
                      if let PropOrSpread::Prop(inner) = p {
                        if let Prop::KeyValue(ikv) = &**inner {
                          if let PropName::Ident(ik) = &ikv.key {
                            if ik.sym == "html" || ik.sym == "css" {
                              let inline = !(page && ik.sym == "html");
                              match &*ikv.value {
                                Expr::Lit(Lit::Str(s)) => self.push_asset(s, inline),
                                Expr::Array(arr) => {
                                  for elem in &arr.elems {
                                    if let Some(e) = elem {
                                      if let Expr::Lit(Lit::Str(s)) = &*e.expr {
                                        self.push_asset(s, inline);
                                      }
                                    }
                                  }
                                }
                                _ => {}
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                  _ => {}
                }
              }
              "props" => {
                if let Expr::Object(props) = &*kv.value {
                  self.scan_props(props);
                }
              }
              _ => {}
            }
          }
        }
      }
    }
  }

  fn scan_props(&mut self, props: &ObjectLit) {
    for prop in &props.props {
      if let PropOrSpread::Prop(p) = prop {
        if let Prop::KeyValue(kv) = &**p {
          if let Expr::Object(config) = &*kv.value {
            for c in &config.props {
              if let PropOrSpread::Prop(cp) = c {
                if let Prop::KeyValue(ckv) = &**cp {
                  if let PropName::Ident(ckey) = &ckv.key {
                    if ckey.sym == "type" {
                      if let Expr::Ident(t) = &*ckv.value {
                        let name = t.sym.to_string();
                        if name != "Boolean" && name != "Number" && name != "String" {
                          self.prop_errors.push((name, t.span));
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
