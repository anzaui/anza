//! Custom tracing event formatter — timestamps, context labels, colors.

use chrono::Local;
use owo_colors::OwoColorize;
use std::fmt;
use std::io::IsTerminal;
use std::sync::Mutex;
use tracing::{Event, Level, Subscriber};
use tracing_subscriber::{
  fmt::{format::Writer, FmtContext, FormatEvent, FormatFields},
  registry::LookupSpan,
};

pub struct CustomFormatter {
  last_date: Mutex<String>,
}

impl Default for CustomFormatter {
  fn default() -> Self {
    Self {
      last_date: Mutex::new(String::new()),
    }
  }
}

impl<S, N> FormatEvent<S, N> for CustomFormatter
where
  S: Subscriber + for<'a> LookupSpan<'a>,
  N: for<'a> FormatFields<'a> + 'static,
{
  fn format_event(
    &self,
    _ctx: &FmtContext<'_, S, N>,
    mut writer: Writer<'_>,
    event: &Event<'_>,
  ) -> fmt::Result {
    let meta = event.metadata();
    let target = meta.target();
    let level = meta.level();
    let color = std::io::stdout().is_terminal() && std::env::var("NO_COLOR").is_err();

    let now = Local::now();
    let date = now.format("%Y-%m-%d").to_string();
    let time = now.format("%H:%M:%S").to_string();

    let mut last = self.last_date.lock().unwrap();
    if *last != date {
      *last = date.clone();
      drop(last);
      let line = if color {
        format!("{}> {}{}", ">".dimmed(), date.bold().white(), "")
      } else {
        format!("> {date}")
      };
      writeln!(writer, "{line}")?;
    } else {
      drop(last);
    }

    let label = label_for(target, level);
    let colored_label = colorize_label(&label, target, level, color);
    let pipe = if color { "|".dimmed().to_string() } else { "|".to_string() };
    let colored_time = if color {
      time.dimmed().to_string()
    } else {
      time.clone()
    };

    write!(
      writer,
      "  {pipe} {colored_time}  {colored_label:>9}  ",
    )?;

    let mut visitor = EventVisitor {
      writer: &mut writer,
      has_fields: false,
      use_color: color,
    };
    event.record(&mut visitor);

    writeln!(writer)
  }
}

fn label_for(target: &str, level: &Level) -> String {
  match target {
    t if t.starts_with("anza_logs::") => t.replace("anza_logs::", "").to_uppercase(),
    t if is_known_category(t) => t.to_uppercase(),
    _ => level.as_str().to_uppercase(),
  }
}

fn is_known_category(t: &str) -> bool {
  matches!(
    t,
    "info"
      | "debug"
      | "success"
      | "watcher"
      | "compiler"
      | "server"
      | "hmr"
      | "sync"
      | "fatal"
  )
}

fn colorize_label(label: &str, target: &str, level: &Level, use_color: bool) -> String {
  if !use_color {
    return label.to_string();
  }

  match target {
    "info" => label.blue().to_string(),
    "debug" => label.dimmed().to_string(),
    "success" => label.bold().green().to_string(),
    "watcher" => label.yellow().to_string(),
    "compiler" => label.cyan().to_string(),
    "server" => label.bright_blue().to_string(),
    "hmr" => label.bright_green().to_string(),
    "sync" => label.dimmed().to_string(),
    "fatal" => label.bold().red().to_string(),
    _ => match *level {
      Level::ERROR => label.bold().red().to_string(),
      Level::WARN => label.bold().yellow().to_string(),
      Level::INFO => label.blue().to_string(),
      Level::DEBUG | Level::TRACE => label.dimmed().to_string(),
    },
  }
}

struct EventVisitor<'a, 'writer> {
  writer: &'a mut Writer<'writer>,
  has_fields: bool,
  use_color: bool,
}

impl<'a, 'writer> tracing::field::Visit for EventVisitor<'a, 'writer> {
  fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn fmt::Debug) {
    if field.name() == "message" {
      let format_str = format!("{value:?}");
      if format_str.starts_with('"') && format_str.ends_with('"') && format_str.len() >= 2 {
        let _ = write!(self.writer, "{}", &format_str[1..format_str.len() - 1]);
      } else {
        let _ = write!(self.writer, "{format_str}");
      }
    } else {
      if !self.has_fields {
        let prefix = if self.use_color {
          " ".dimmed().to_string()
        } else {
          " ".to_string()
        };
        let _ = write!(self.writer, "{prefix}");
        self.has_fields = true;
      } else {
        let _ = write!(self.writer, " ");
      }
      let _ = write!(self.writer, "{}={value:?}", field.name());
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use tracing::Level;

  #[test]
  fn known_categories_map_to_uppercase() {
    assert_eq!(label_for("server", &Level::INFO), "SERVER");
    assert_eq!(label_for("success", &Level::INFO), "SUCCESS");
  }

  #[test]
  fn unknown_target_falls_back_to_level() {
    assert_eq!(label_for("other", &Level::ERROR), "ERROR");
  }

  #[test]
  fn recognizes_all_pipeline_categories() {
    for cat in ["watcher", "compiler", "server", "hmr", "sync", "fatal"] {
      assert!(is_known_category(cat));
    }
  }
}
