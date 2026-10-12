/// `anza create <name>`: the scaffolder lives in the npm package
/// (`npm create @anzaui/anza`); this command only points there.
#[derive(Debug, Clone)]
pub struct Create {
  pub name: String,
}

impl Create {
  pub fn validate(&self) -> Result<(), String> {
    if self.name.trim().is_empty() {
      return Err("project name must not be empty".into());
    }
    Ok(())
  }

  /// The hint printed for `anza create <name>`.
  pub fn hint(&self) -> String {
    format!(
      "Create a new Anza app with:\n\n  npm create @anzaui/anza {}\n",
      self.name.trim()
    )
  }

  pub fn run(&self) -> Result<(), String> {
    self.validate()?;
    println!("{}", self.hint());
    Ok(())
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn hint_points_to_npm_create() {
    let op = Create { name: "my-app".into() };
    assert!(op.hint().contains("npm create @anzaui/anza my-app"));
    assert!(Create { name: " ".into() }.run().is_err());
  }
}
