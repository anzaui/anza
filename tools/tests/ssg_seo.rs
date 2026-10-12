// tools/tests/ssg_seo.rs
//
// SSG heads: titles from the H1 with the section and site name, word-boundary
// descriptions with the section added to short/repeated ones, the full
// OG/Twitter set, a linked JSON-LD graph and sitemap <lastmod>.

use std::path::{Path, PathBuf};

use anza_cli::extract::compile;

fn write(root: &Path, rel: &str, content: &str) {
  let path = root.join(rel);
  std::fs::create_dir_all(path.parent().unwrap()).unwrap();
  std::fs::write(path, content).unwrap();
}

struct Fixture {
  root: PathBuf,
}

impl Drop for Fixture {
  fn drop(&mut self) {
    let _ = std::fs::remove_dir_all(&self.root);
  }
}

fn page(root: &Path, dir: &str, route: &str, extra: &str, html: &str) -> String {
  write(
    root,
    &format!("src/pages/{dir}/index.js"),
    &format!("page('{route}', {{ tag: 'doc-{}', template: {{ html: './index.html' }}{extra} }});\n", dir.replace('/', "-")),
  );
  write(root, &format!("src/pages/{dir}/index.html"), html);
  format!("import './pages/{dir}/index.js';\n")
}

fn head(html: &str) -> &str {
  &html[..html.find("</head>").unwrap()]
}

fn meta<'a>(html: &'a str, key: &str) -> Option<&'a str> {
  let needle = format!("=\"{key}\" content=\"");
  let at = html.find(&needle)? + needle.len();
  Some(&html[at..at + html[at..].find('"')?])
}

#[test]
fn heads_carry_titles_descriptions_social_tags_and_structured_data() {
  let root = std::env::temp_dir().join(format!("anza-ssg-seo-{}", std::process::id()));
  let _ = std::fs::remove_dir_all(&root);
  let fx = Fixture { root: root.clone() };
  write(&root, "src/index.html", "<!DOCTYPE html>\n<html><head><title>t</title></head><body></body></html>\n");
  write(&root, "ssg.json", r#"{ "origin": "https://example.com", "siteName": "Site", "image": "/og.png" }"#);
  write(&root, "src/og.png", "png");
  let long = "Word ".repeat(60);
  let mut imports = String::new();
  imports += &page(&root, "home", "/", "", "<h1>Site</h1><p>The home page of the example site, long enough to stand alone.</p>");
  imports += &page(&root, "docs", "/docs", "", "<h1>Welcome</h1><p>All the documentation for the example site in one place.</p>");
  imports += &page(&root, "sec", "/docs/sec/index", "", "<h1>Section &amp; Co</h1><p>Overview of the section, with enough words to be a description.</p>");
  imports += &page(&root, "sec/a", "/docs/sec/a", "", "<h1>Alpha</h1><p>Common problems.</p>");
  imports += &page(&root, "sec/b", "/docs/sec/b", "", &format!("<h1>Beta</h1><p>{long}</p>"));
  imports += &page(&root, "other/a", "/docs/other/a", "", "<h1>Other</h1><p>Common problems.</p>");
  imports += &page(
    &root,
    "sec/c",
    "/docs/sec/c",
    ", seo: { title: 'Declared Title', description: 'Declared description.', image: 'https://cdn.example/c.png' }",
    "<h1>Gamma</h1><p>x</p>",
  );
  write(&root, "src/index.js", &imports);
  compile(&root.join("src"), &root.join("dist"), true, &[]).expect("build");
  let dist = root.join("dist");
  let read = |rel: &str| std::fs::read_to_string(dist.join(rel)).unwrap();

  // Titles: H1 — Section — Site; the section is the parent page's H1.
  let a = read("docs/sec/a/index.html");
  assert!(head(&a).contains("<title>Alpha — Section &amp; Co — Site</title>"), "{}", head(&a));
  assert!(read("docs/sec/index/index.html").contains("<title>Section &amp; Co — Site</title>"));
  assert!(read("index.html").contains("<title>Site</title>"));
  let c = read("docs/sec/c/index.html");
  assert!(c.contains("<title>Declared Title</title>"), "{}", head(&c));

  // Descriptions: short/repeated ones get the section; long ones cut at a word.
  assert_eq!(meta(&a, "description"), Some("Section &amp; Co: Common problems."));
  assert_eq!(meta(&read("docs/other/a/index.html"), "description"), Some("Other: Common problems."));
  let b = read("docs/sec/b/index.html");
  let desc = meta(&b, "description").unwrap();
  assert!(desc.chars().count() <= 155 && desc.ends_with("Word…"), "{desc}");
  assert_eq!(meta(&c, "description"), Some("Declared description."));

  // Social tags, with the site image or the page's own.
  assert_eq!(meta(&a, "og:type"), Some("article"));
  assert_eq!(meta(&a, "og:site_name"), Some("Site"));
  assert_eq!(meta(&a, "og:image"), Some("https://example.com/og.png"));
  assert_eq!(meta(&a, "twitter:card"), Some("summary_large_image"));
  assert_eq!(meta(&a, "twitter:title"), meta(&a, "og:title"));
  assert_eq!(meta(&c, "og:image"), Some("https://cdn.example/c.png"));
  assert_eq!(meta(&read("index.html"), "og:type"), Some("website"));
  assert!(dist.join("og.png").is_file(), "site image copied to dist");

  // JSON-LD graph.
  let ld_at = a.find("application/ld+json\">").unwrap() + 21;
  let ld: serde_json::Value = serde_json::from_str(&a[ld_at..ld_at + a[ld_at..].find("</script>").unwrap()]).unwrap();
  let graph = ld["@graph"].as_array().unwrap();
  let crumbs = graph.iter().find(|n| n["@type"] == "BreadcrumbList").expect("breadcrumbs");
  let names: Vec<&str> = crumbs["itemListElement"].as_array().unwrap().iter().map(|i| i["name"].as_str().unwrap()).collect();
  assert_eq!(names, ["Site", "Docs", "Section & Co", "Alpha"]);
  assert_eq!(crumbs["itemListElement"][2]["item"], "https://example.com/docs/sec/index");
  let article = graph.iter().find(|n| n["@type"] == "TechArticle").expect("article");
  assert_eq!(article["headline"], "Alpha");
  assert!(article["dateModified"].as_str().unwrap().len() >= 20);

  // Sitemap: every URL has a W3C <lastmod>.
  let sitemap = read("sitemap.xml");
  assert_eq!(sitemap.matches("<url>").count(), 7, "{sitemap}");
  assert_eq!(sitemap.matches("<lastmod>").count(), 7, "{sitemap}");
  drop(fx);
}
