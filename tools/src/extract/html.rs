use scraper::Html;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap, HashSet};
use std::error::Error;
use std::path::{Path, PathBuf};

type ExtractResult<T> = Result<T, Box<dyn Error + Send + Sync>>;

#[derive(Serialize, Deserialize, Debug)]
pub struct TagsDescriptor {
  pub version: u8,
  pub refs: Vec<String>,
  pub ids: Vec<String>,
  pub classes: Vec<String>,
  pub tags: Vec<String>,
  pub compound: Vec<String>,
  pub attrs: Vec<String>,
  #[serde(rename = "refTypes")]
  pub ref_types: BTreeMap<String, String>,
}

pub fn parse_html(content: &str) -> TagsDescriptor {
  // Docs `<view-code>` embeds raw HTML/JS samples — treat interiors as opaque
  // text so nested sample tags are not collected into the descriptor.
  let content = crate::build::html::opaque_view_code(content);
  let document = Html::parse_fragment(&content);

  let mut refs = HashSet::new();
  let mut ids = HashSet::new();
  let mut classes = HashSet::new();
  let mut tags = HashSet::new();
  let mut compound = HashSet::new();
  let mut attrs = HashSet::new();
  let mut ref_types = BTreeMap::new();
  let mut ref_counts: HashMap<String, usize> = HashMap::new();

  for node in document.tree.values() {
    if let Some(element) = node.as_element() {
      let tag_name = element.name();
      if tag_name != "html" && tag_name != "body" && tag_name != "head" {
        tags.insert(tag_name.to_string());
      }

      for (name, _) in element.attrs() {
        attrs.insert(name.to_string());
      }

      if let Some(id) = element.attr("id") {
        ids.insert(id.to_string());
      }

      if let Some(reference) = element.attr("ref") {
        refs.insert(reference.to_string());
        ref_types
          .entry(reference.to_string())
          .or_insert_with(|| infer_element_type(tag_name).to_string());
        *ref_counts.entry(reference.to_string()).or_insert(0) += 1;
      }

      for class in element.classes() {
        classes.insert(class.to_string());
        compound.insert(format!("{}.{}", tag_name, class));
      }
    }
  }

  for (reference, count) in ref_counts {
    if count > 1 {
      anza_logs::warn!(
        "Duplicate template ref \"{}\" appears {} times",
        reference,
        count
      );
    }
  }

  TagsDescriptor {
    version: 1,
    refs: sorted(refs),
    ids: sorted(ids),
    classes: sorted(classes),
    tags: sorted(tags),
    compound: sorted(compound),
    attrs: sorted(attrs),
    ref_types,
  }
}

pub fn parse_file(html_path: &Path) -> ExtractResult<TagsDescriptor> {
  let content = std::fs::read_to_string(html_path)?;
  Ok(parse_html(&content))
}

pub fn emit_descriptor(html_path: &Path, descriptor: &TagsDescriptor) -> ExtractResult<PathBuf> {
  let mut json_path = html_path.to_path_buf();
  json_path.set_extension("tags.json");

  let json = serde_json::to_string(descriptor)?;
  std::fs::write(&json_path, json)?;
  Ok(json_path)
}

pub fn parse_and_emit(html_path: &Path) -> ExtractResult<PathBuf> {
  let descriptor = parse_file(html_path)?;
  let json_path = emit_descriptor(html_path, &descriptor)?;
  anza_logs::compiler!(
    "Generated tags descriptor for {:?}",
    html_path.file_name().unwrap_or_default()
  );
  Ok(json_path)
}

fn sorted(set: HashSet<String>) -> Vec<String> {
  let mut values: Vec<_> = set.into_iter().collect();
  values.sort();
  values
}

fn infer_element_type(tag: &str) -> &'static str {
  match tag {
    "a" => "HTMLAnchorElement",
    "button" => "HTMLButtonElement",
    "canvas" => "HTMLCanvasElement",
    "dialog" => "HTMLDialogElement",
    "form" => "HTMLFormElement",
    "img" => "HTMLImageElement",
    "input" => "HTMLInputElement",
    "label" => "HTMLLabelElement",
    "li" => "HTMLLIElement",
    "ol" => "HTMLOListElement",
    "option" => "HTMLOptionElement",
    "select" => "HTMLSelectElement",
    "slot" => "HTMLSlotElement",
    "textarea" => "HTMLTextAreaElement",
    "ul" => "HTMLUListElement",
    "video" => "HTMLVideoElement",
    _ => "HTMLElement",
  }
}

#[cfg(test)]
mod tests {
  use super::parse_html;

  #[test]
  fn parses_template_descriptor_metadata() {
    let descriptor = parse_html(
      r#"
			<form>
			  <input ref="email" id="email" class="field primary" data-state="idle" />
			  <button ref="submit" class="btn primary">Send</button>
			</form>
			"#,
    );

    assert_eq!(descriptor.version, 1);
    assert_eq!(descriptor.refs, vec!["email", "submit"]);
    assert_eq!(descriptor.ids, vec!["email"]);
    assert!(descriptor.classes.contains(&"field".to_string()));
    assert!(descriptor.classes.contains(&"primary".to_string()));
    assert!(descriptor.tags.contains(&"form".to_string()));
    assert!(descriptor.compound.contains(&"button.btn".to_string()));
    assert!(descriptor.attrs.contains(&"data-state".to_string()));
    assert_eq!(
      descriptor.ref_types.get("email").map(String::as_str),
      Some("HTMLInputElement")
    );
  }

  #[test]
  fn view_code_samples_are_opaque_to_tag_descriptor() {
    let descriptor = parse_html(
      r#"
			<h1>Dialog</h1>
			<p>Intro.</p>
			<view-code language="html">
			<button></button>
			<dialog></dialog>
			</some-el></some-el>
			</view-code>
			"#,
    );

    assert!(descriptor.tags.contains(&"view-code".to_string()));
    assert!(descriptor.tags.contains(&"h1".to_string()));
    assert!(descriptor.tags.contains(&"p".to_string()));
    assert!(
      !descriptor.tags.contains(&"button".to_string()),
      "sample <button> must not appear in tags: {:?}",
      descriptor.tags
    );
    assert!(
      !descriptor.tags.contains(&"dialog".to_string()),
      "sample <dialog> must not appear in tags: {:?}",
      descriptor.tags
    );
    assert!(!descriptor.tags.iter().any(|t| t == "some-el"));
  }

  #[test]
  fn view_code_with_raw_close_tags_does_not_panic() {
    let html = r#"
      <h1>Title</h1>
      <p>Intro</p>
      <view-code language="html"></some-el></some-el>
&lt;ui-button&gt;Ok&lt;/ui-button&gt;
</ui-x></ui-x>
</view-code>
      <p>After</p>
    "#;
    let descriptor = parse_html(html);
    assert_eq!(descriptor.version, 1);
    assert!(descriptor.tags.contains(&"view-code".to_string()));
    assert!(!descriptor.tags.iter().any(|t| t == "some-el" || t == "ui-x"));
  }

  #[test]
  fn view_code_nested_another_el_fixture() {
    let descriptor = parse_html(
      r#"<h1>X</h1><view-code language="html"><another-el></some-el></some-el></another-el></view-code>"#,
    );
    assert!(descriptor.tags.contains(&"view-code".to_string()));
    assert!(!descriptor.tags.iter().any(|t| t == "another-el" || t == "some-el"));
  }

  #[test]
  fn view_code_fixture_file_is_opaque() {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
      .join("fixtures/view-code-nested.html");
    let html = std::fs::read_to_string(&path).expect("fixture readable");
    let descriptor = parse_html(&html);
    assert!(descriptor.tags.contains(&"view-code".to_string()));
    assert!(descriptor.tags.contains(&"h1".to_string()));
    assert!(descriptor.tags.contains(&"p".to_string()));
    for leak in ["some-el", "button", "dialog", "another-el", "ui-button"] {
      assert!(
        !descriptor.tags.iter().any(|t| t == leak),
        "fixture leaked sample tag {leak}: {:?}",
        descriptor.tags
      );
    }
  }
}
