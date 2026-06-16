// tools/src/build/transform.rs
//
// Dock definition validation and transformation for the build pipeline.
// Ensures dock registry keys and custom element tags are properly separated,
// emitting diagnostics for ambiguous configurations that would trigger
// runtime warnings in the container registry.

use std::collections::HashMap;
use std::path::Path;

use swc_common::Span;
use swc_ecma_ast::*;
use swc_ecma_visit::{Visit, VisitWith};

use super::graph::{Diagnostic, Kind};

/// Validates dock() calls in a JS module, checking for naming ambiguities
/// between registry keys and custom element tags.
pub fn validate(file: &Path, program: &Program) -> Vec<Diagnostic> {
  let mut validator = DockValidator {
    diagnostics: Vec::new(),
    file: file.to_path_buf(),
    dock_registry: HashMap::new(),
  };
  program.visit_with(&mut validator);
  validator.diagnostics
}

struct DockValidator {
  diagnostics: Vec<Diagnostic>,
  file: std::path::PathBuf,
  dock_registry: HashMap<String, Span>,
}

impl Visit for DockValidator {
  fn visit_call_expr(&mut self, call: &CallExpr) {
    if let Callee::Expr(expr) = &call.callee {
      if let Expr::Ident(ident) = &**expr {
        if ident.sym == "dock" {
          self.check_dock(call);
        }
      }
    }
    call.visit_children_with(self);
  }
}

impl DockValidator {
  fn check_dock(&mut self, call: &CallExpr) {
    if call.args.len() < 2 {
      return;
    }

    // Extract dock name from first argument
    let name = self.extract_string(&call.args[0].expr);
    if name.is_empty() {
      return;
    }

    // Extract config object
    let config = match &*call.args[1].expr {
      Expr::Object(obj) => obj,
      _ => return,
    };

    // Look for explicit tag field
    let mut explicit_tag: Option<String> = None;
    for prop in &config.props {
      if let PropOrSpread::Prop(p) = prop {
        if let Prop::KeyValue(kv) = &**p {
          if let PropName::Ident(key) = &kv.key {
            if key.sym == "tag" {
              explicit_tag = Some(self.extract_string(&kv.value));
            }
          }
        }
      }
    }

    let resolved_tag = explicit_tag.unwrap_or_else(|| format!("dock-{}", name));

    // Warn when dock name matches its default tag (ambiguous naming)
    // e.g., dock('dock-docs', ...) without explicit tag override
    if name == resolved_tag {
      self.diagnostics.push(Diagnostic {
        kind: Kind::Type,
        file: self.file.clone(),
        line: 0,
        col: 0,
        message: format!(
          "dock('{}') registry key matches its custom element tag. Consider using a shorter registry key (e.g., 'docs') and an explicit tag: dock('docs', {{ tag: '{}', parent: '...' }})",
          name, resolved_tag
        ),
      });
    }

    // Check for duplicate registry keys
    if let Some(prev_span) = self.dock_registry.get(&name) {
      self.diagnostics.push(Diagnostic {
        kind: Kind::Type,
        file: self.file.clone(),
        line: 0,
        col: 0,
        message: format!(
          "duplicate dock registry key '{}' — previously defined at {:?}",
          name, prev_span
        ),
      });
    } else {
      self.dock_registry.insert(name, call.span);
    }
  }

  fn extract_string(&self, expr: &Expr) -> String {
    match expr {
      Expr::Lit(Lit::Str(s)) => s.value.as_str().map(|v| v.to_string()).unwrap_or_default(),
      _ => String::new(),
    }
  }
}
