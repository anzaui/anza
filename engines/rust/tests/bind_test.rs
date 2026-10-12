// The compiled binder: every parameter source gives the same output, a
// repeated slot resolves once, and pair lists keep "first pair wins" (GP1).

use {
  anza::engine::file::Template,
  serde::Serialize,
  std::{cell::Cell, collections::HashMap},
};

#[test]
fn every_source_renders_the_same() {
  let tpl = Template::new("t.html", "t.html", "<a href=\"/{{id}}\">{{title}} #{{id}}</a>{{{raw}}}", false).unwrap();
  let expected = "<a href=\"/7\">T #7</a><b>";

  let pairs = [("id", "7"), ("title", "T"), ("raw", "<b>"), ("id", "ignored")];
  assert_eq!(tpl.bind(&pairs).unwrap(), expected);
  assert_eq!(tpl.bind(&pairs[..]).unwrap(), expected);

  let map: HashMap<String, String> = [("id", "7"), ("title", "T"), ("raw", "<b>")]
    .into_iter()
    .map(|(k, v)| (k.to_string(), v.to_string()))
    .collect();
  assert_eq!(tpl.bind(&map).unwrap(), expected);

  #[derive(Serialize)]
  struct Row {
    id: u32,
    title: &'static str,
    raw: &'static str,
  }
  assert_eq!(tpl.render(&Row { id: 7, title: "T", raw: "<b>" }).unwrap(), expected);
  assert_eq!(tpl.bind(&()).unwrap(), "<a href=\"/\"> #</a>");
}

#[test]
fn serialize_runs_once_per_render() {
  struct Counted<'a>(&'a Cell<u32>);
  impl Serialize for Counted<'_> {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
      self.0.set(self.0.get() + 1);
      let mut map = HashMap::new();
      map.insert("a", "1");
      map.insert("b", "2");
      map.serialize(s)
    }
  }
  let tpl = Template::new("t.html", "t.html", "{{a}}{{b}}{{a}}{{b}}{{a}}", false).unwrap();
  let calls = Cell::new(0);
  assert_eq!(tpl.render(&Counted(&calls)).unwrap(), "12121");
  assert_eq!(calls.get(), 1);
}
