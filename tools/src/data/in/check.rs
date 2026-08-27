use std::path::PathBuf;
use crate::structure::{self, Mode};

#[derive(Debug, Clone)]
pub struct Check {
  pub src: PathBuf,
  pub strict: bool,
}

impl Check {
  pub fn run(&self) -> Result<(), String> {
    let mode = if self.strict { Mode::Check } else { Mode::Doctor };
    let label = match mode {
      Mode::Doctor => "doctor",
      Mode::Check => "check",
    };
    anza_logs::info!("Running anza {}…", label);

    let (project, hint) = structure::project_from_src(&self.src);
    anza_logs::info!("Project: {}", project.display());
    anza_logs::info!("Source hint: {}", hint);

    let report = structure::check(&project, &hint, mode);
    report.print();

    let errors = report.error_count();
    let warns = report.warn_count();
    if report.failed(mode) {
      return Err(format!(
        "{} failed: {} error(s), {} warning(s) — see {} (Troubleshooting + required tables)",
        label, errors, warns, structure::DOC
      ));
    }
    anza_logs::success!("{} passed ({} error(s), {} warning(s))", label, errors, warns);
    Ok(())
  }
}
