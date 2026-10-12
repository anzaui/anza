// Opt-in HTML escaping: `{{x}}` escaped, `{{{x}}}` raw (G9).

use {
  anza::{escape_html, Setup},
  std::{collections::HashMap, fs, path::PathBuf},
};

struct Dir(PathBuf);

impl Drop for Dir {
  fn drop(&mut self) {
    let _ = fs::remove_dir_all(&self.0);
  }
}

fn root(name: &str) -> Dir {
  let dir = std::env::temp_dir().join(format!("anza-escape-{}-{}", name, std::process::id()));
  let _ = fs::remove_dir_all(&dir);
  fs::create_dir_all(&dir).unwrap();
  fs::write(dir.join("card.html"), "<p title=\"{{x}}\">{{x}}</p><div>{{{x}}}</div>").unwrap();
  Dir(dir)
}

const EVIL: &str = "<script>alert('x')</script> & \"q\"";
const ESCAPED: &str = "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt; &amp; &quot;q&quot;";

#[test]
fn escape_html_is_shared() {
  assert_eq!(escape_html(EVIL), ESCAPED);
  assert_eq!(escape_html("plain"), "plain");
}

#[test]
fn escape_on_escapes_double_braces_only() {
  let dir = root("on");
  let mut setup = Setup::new(&dir.0);
  setup.escape = true;
  let engine = setup.run().unwrap();
  let mut params = HashMap::new();
  params.insert("x".to_string(), EVIL.to_string());
  let html = engine.render_fragment("card.html", "main", &params).unwrap().html;
  assert_eq!(html, format!("<p title=\"{ESCAPED}\">{ESCAPED}</p><div>{EVIL}</div>"));
}

#[test]
fn escape_off_by_default() {
  let dir = root("off");
  let engine = Setup::new(&dir.0).run().unwrap();
  let mut params = HashMap::new();
  params.insert("x".to_string(), EVIL.to_string());
  let html = engine.render_fragment("card.html", "main", &params).unwrap().html;
  assert_eq!(html, format!("<p title=\"{EVIL}\">{EVIL}</p><div>{EVIL}</div>"));
}

#[test]
fn triple_braces_parse() {
  use anza::engine::slot::{extract, Chunk};
  assert_eq!(
    extract("a{{{ b }}}c{{d}}").unwrap(),
    vec![
      Chunk::Static(b"a".to_vec()),
      Chunk::Raw("b".into()),
      Chunk::Static(b"c".to_vec()),
      Chunk::Slot("d".into())
    ]
  );
  assert!(extract("{{{x}}").is_err());
}
