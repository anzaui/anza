// Rendering golden fixtures, shared by all three engines (GC1):
// value stringification, escaping, the page pipeline, SSE/WS framing and
// manifest digests.

use {
  anza::{Envelope, Setup},
  serde_json::Value,
  std::{collections::HashMap, fs, path::PathBuf},
};

fn fixtures() -> PathBuf {
  PathBuf::from(concat!(env!("CARGO_MANIFEST_DIR"), "/../fixtures"))
}

fn fixture() -> Value {
  serde_json::from_str(&fs::read_to_string(fixtures().join("render.json")).unwrap()).unwrap()
}

fn engine(root: &str, escape: bool) -> anza::Engine {
  let mut setup = Setup::new(fixtures().join("render").join(root));
  setup.escape = escape;
  setup.run().unwrap()
}

#[test]
fn fragments_match_the_golden_fixtures() {
  for case in fixture()["fragments"].as_array().unwrap() {
    let name = case["name"].as_str().unwrap();
    let engine = engine(case["root"].as_str().unwrap(), case["escape"].as_bool().unwrap_or(false));
    let tpl = engine.get(case["template"].as_str().unwrap()).unwrap();
    assert_eq!(tpl.bind(&case["params"]).unwrap(), case["html"].as_str().unwrap(), "{name}");
    // Serializable structs go through the same conversion.
    assert_eq!(tpl.render(&case["params"]).unwrap(), case["html"].as_str().unwrap(), "{name}");
  }
}

#[test]
fn pages_match_the_golden_fixtures() {
  for case in fixture()["pages"].as_array().unwrap() {
    let name = case["name"].as_str().unwrap();
    let engine = engine(case["root"].as_str().unwrap(), false);
    let params: HashMap<String, String> = case["params"]
      .as_object()
      .unwrap()
      .iter()
      .map(|(k, v)| (k.clone(), v.as_str().unwrap().to_string()))
      .collect();
    let result = engine.render_page(case["route"].as_str().unwrap(), &params);
    match case.get("error").and_then(Value::as_str) {
      Some(code) => assert_eq!(result.unwrap_err().code(), code, "{name}"),
      None => assert_eq!(result.unwrap().html, case["html"].as_str().unwrap(), "{name}"),
    }
  }
}

#[test]
fn sse_and_ws_framing_match_the_golden_fixtures() {
  for case in fixture()["sse"].as_array().unwrap() {
    let env: Envelope = serde_json::from_value(case["envelope"].clone()).unwrap();
    assert_eq!(anza::stream::sse::encode(&env), case["frame"].as_str().unwrap());
    assert_eq!(anza::stream::ws::encode(&env), case["packet"].as_str().unwrap());
  }
}

#[test]
fn manifest_matches_the_golden_fixtures() {
  let fx = fixture();
  let manifest = engine(fx["manifest"]["root"].as_str().unwrap(), false).manifest().unwrap();
  let expected: HashMap<String, String> = serde_json::from_value(fx["manifest"]["templates"].clone()).unwrap();
  assert_eq!(manifest.templates, expected);
}

#[test]
fn error_codes_and_display_match_the_other_engines() {
  let e = anza::Error::not_found("Page not found");
  assert_eq!(e.code(), "NOT_FOUND");
  assert_eq!(e.to_string(), "[Anza:NOT_FOUND] Page not found");
}
