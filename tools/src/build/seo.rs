// tools/src/build/seo.rs
//
// SEO helpers for Mode A SSG: page titles and descriptions, `<lastmod>`
// dates from git (falling back to file mtimes), and W3C datetimes.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::UNIX_EPOCH;

/// Recommended upper bound for a meta description.
pub const DESCRIPTION_MAX: usize = 155;

/// Shorter descriptions get the section name added.
pub const DESCRIPTION_MIN: usize = 50;

/// `text` cut at the last word boundary within `max` characters, with `…`
/// when anything was dropped. Trailing punctuation before the cut is removed.
pub fn cut_at_word(text: &str, max: usize) -> String {
  let text = text.split_whitespace().collect::<Vec<_>>().join(" ");
  if text.chars().count() <= max {
    return text;
  }
  // Leave room for the ellipsis.
  let budget = max.saturating_sub(1);
  let head: String = text.chars().take(budget + 1).collect();
  let cut = match head.rfind(' ') {
    Some(at) if at > 0 => &head[..at],
    _ => &head[..head.char_indices().nth(budget).map_or(head.len(), |(i, _)| i)],
  };
  let cut = cut.trim_end_matches(|c: char| c.is_whitespace() || matches!(c, ',' | ';' | ':' | '—' | '-' | '(' | '.'));
  format!("{cut}…")
}

/// Human name for a URL segment: `quick-start` → `Quick Start`.
pub fn humanize(segment: &str) -> String {
  segment
    .split(|c| c == '-' || c == '_')
    .filter(|s| !s.is_empty())
    .map(|s| {
      let mut chars = s.chars();
      match chars.next() {
        Some(f) => format!("{}{}", f.to_uppercase(), chars.as_str()),
        None => String::new(),
      }
    })
    .collect::<Vec<_>>()
    .join(" ")
}

/// Last-change date of each file under `dir` (keys are absolute paths), from
/// one `git log --name-only` pass. Empty when `dir` is not in a git work tree
/// or git is not installed.
pub fn git_dates(dir: &Path) -> HashMap<PathBuf, String> {
  let mut dates = HashMap::new();
  let output = Command::new("git")
    .arg("-C")
    .arg(dir)
    .args(["log", "--format=%x00%cI", "--name-only", "--no-renames", "--relative", "--", "."])
    .output();
  let Ok(output) = output else {
    return dates;
  };
  if !output.status.success() {
    return dates;
  }
  let text = String::from_utf8_lossy(&output.stdout);
  let mut current: Option<&str> = None;
  for line in text.lines() {
    if let Some(date) = line.strip_prefix('\0') {
      current = Some(date.trim());
    } else if !line.trim().is_empty() {
      if let Some(date) = current {
        // Newest commit first: keep the first date seen per file.
        dates.entry(dir.join(line.trim())).or_insert_with(|| date.to_string());
      }
    }
  }
  dates
}

/// Newest last-change date of `files`: git dates where known, else the file
/// mtime. `None` when no file exists.
pub fn lastmod(files: &[PathBuf], git: &HashMap<PathBuf, String>) -> Option<String> {
  let mut best: Option<(i64, String)> = None;
  for file in files {
    let found = match git.get(file) {
      Some(date) => parse_w3c(date).map(|secs| (secs, date.clone())),
      None => std::fs::metadata(file)
        .and_then(|m| m.modified())
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| (d.as_secs() as i64, w3c_utc(d.as_secs() as i64))),
    };
    if let Some((secs, text)) = found {
      if best.as_ref().map_or(true, |(b, _)| secs > *b) {
        best = Some((secs, text));
      }
    }
  }
  best.map(|(_, text)| text)
}

/// Unix seconds → `YYYY-MM-DDTHH:MM:SSZ`.
pub fn w3c_utc(secs: i64) -> String {
  let days = secs.div_euclid(86_400);
  let rem = secs.rem_euclid(86_400);
  let (y, m, d) = civil_from_days(days);
  format!("{y:04}-{m:02}-{d:02}T{:02}:{:02}:{:02}Z", rem / 3600, rem % 3600 / 60, rem % 60)
}

/// Seconds since the epoch of a strict ISO 8601 datetime with offset
/// (`git log %cI`), for comparing dates.
fn parse_w3c(text: &str) -> Option<i64> {
  let num = |s: &str| s.parse::<i64>().ok();
  let (date, time) = text.split_once('T')?;
  let mut parts = date.split('-');
  let (y, m, d) = (num(parts.next()?)?, num(parts.next()?)?, num(parts.next()?)?);
  let (clock, offset) = if let Some(clock) = time.strip_suffix('Z') {
    (clock, 0)
  } else {
    let at = time.rfind(['+', '-'])?;
    let sign = if &time[at..at + 1] == "-" { -1 } else { 1 };
    let (oh, om) = time[at + 1..].split_once(':')?;
    (&time[..at], sign * (num(oh)? * 3600 + num(om)? * 60))
  };
  let mut hms = clock.split(':');
  let (hh, mm, ss) = (num(hms.next()?)?, num(hms.next()?)?, num(hms.next()?.split('.').next()?)?);
  Some(days_from_civil(y, m, d) * 86_400 + hh * 3600 + mm * 60 + ss - offset)
}

// Howard Hinnant's civil calendar algorithms.
fn days_from_civil(y: i64, m: i64, d: i64) -> i64 {
  let y = if m <= 2 { y - 1 } else { y };
  let era = y.div_euclid(400);
  let yoe = y - era * 400;
  let doy = (153 * (if m > 2 { m - 3 } else { m + 9 }) + 2) / 5 + d - 1;
  let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
  era * 146_097 + doe - 719_468
}

fn civil_from_days(z: i64) -> (i64, i64, i64) {
  let z = z + 719_468;
  let era = z.div_euclid(146_097);
  let doe = z - era * 146_097;
  let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
  let y = yoe + era * 400;
  let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
  let mp = (5 * doy + 2) / 153;
  let d = doy - (153 * mp + 2) / 5 + 1;
  let m = if mp < 10 { mp + 3 } else { mp - 9 };
  (if m <= 2 { y + 1 } else { y }, m, d)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn cuts_at_a_word_boundary() {
    let text = "Anza is a browser-native web platform library with reactive state, networking, offline storage, animations and custom elements, built without a bundler step at all.";
    let out = cut_at_word(text, DESCRIPTION_MAX);
    assert!(out.chars().count() <= DESCRIPTION_MAX, "{out}");
    assert!(out.ends_with("bundler…") || out.ends_with("a…") || out.ends_with('…'), "{out}");
    assert!(text.starts_with(out.trim_end_matches('…')), "{out}");
    let next = text[out.trim_end_matches('…').len()..].chars().next();
    assert!(matches!(next, Some(' ') | Some(',')), "cut mid-word: {out}");
    assert_eq!(cut_at_word("short  text", 155), "short text");
  }

  #[test]
  fn dates_round_trip() {
    assert_eq!(w3c_utc(0), "1970-01-01T00:00:00Z");
    assert_eq!(w3c_utc(1_791_852_360), "2026-10-13T00:46:00Z");
    assert_eq!(parse_w3c("2026-10-13T03:46:00+03:00"), Some(1_791_852_360));
    assert_eq!(parse_w3c("2026-10-13T00:46:00Z"), Some(1_791_852_360));
    assert_eq!(parse_w3c("2024-02-29T12:00:00-01:30"), Some(days_from_civil(2024, 2, 29) * 86_400 + 13 * 3600 + 1800));
  }

  #[test]
  fn lastmod_prefers_the_newest_git_date() {
    let a = PathBuf::from("/nope/a.html");
    let b = PathBuf::from("/nope/b.js");
    let git = HashMap::from([
      (a.clone(), "2026-01-02T10:00:00+02:00".to_string()),
      (b.clone(), "2026-01-02T09:00:00Z".to_string()),
    ]);
    assert_eq!(lastmod(&[a, b], &git).as_deref(), Some("2026-01-02T09:00:00Z"));
    assert_eq!(lastmod(&[PathBuf::from("/nope/missing")], &git), None);
  }
}
