use {
  anza::{
    crypto::{ed25519, hmac},
    data::r#in::{
      config::setup::Setup,
      template::{fragment::Fragment, page::Page},
    },
    engine::cache::SignMode,
  },
  std::{
    collections::HashMap,
    fs,
  },
};

#[derive(serde::Serialize)]
struct SampleArticle {
  id: u64,
  slug: String,
  title: String,
  author: String,
}

#[test]
fn test_struct_direct_rendering() {
  let template = "<article id=\"art-{{id}}\"><h1>{{title}}</h1><span>By {{author}}</span><a href=\"/{{slug}}\">Link</a></article>";
  let chunks = anza::engine::slot::extract(template).unwrap();
  let tpl = anza::engine::file::Template {
    name: "test.html".into(),
    path: std::path::PathBuf::from("test.html"),
    raw: template.into(),
    digest: [0u8; 32],
    chunks,
  };

  let art = SampleArticle {
    id: 101,
    slug: "zero-overhead".into(),
    title: "Zero Overhead STUI".into(),
    author: "Ada Lovelace".into(),
  };

  // Direct struct rendering with zero boilerplate:
  let rendered = tpl.render(&art).unwrap();
  assert_eq!(
    rendered,
    "<article id=\"art-101\"><h1>Zero Overhead STUI</h1><span>By Ada Lovelace</span><a href=\"/zero-overhead\">Link</a></article>"
  );

  // Key-value tuple slice rendering:
  let slice_rendered = tpl.bind(&[
    ("id", "202"),
    ("title", "Slice Title"),
    ("author", "Grace Hopper"),
    ("slug", "slice-slug"),
  ]).unwrap();
  assert_eq!(
    slice_rendered,
    "<article id=\"art-202\"><h1>Slice Title</h1><span>By Grace Hopper</span><a href=\"/slice-slug\">Link</a></article>"
  );
}

#[test]
fn test_slot_parsing_and_injection() {
  let template = "<ui-card><span slot=\"title\">{{title}}</span><div class=\"count\">{{count}}</div></ui-card>";
  let chunks = anza::engine::slot::extract(template).unwrap();
  assert_eq!(chunks.len(), 5);

  let mut params = HashMap::new();
  params.insert("title".into(), "Dashboard".into());
  params.insert("count".into(), "42".into());

  let rendered = anza::engine::slot::string(&chunks, &params).unwrap();
  assert_eq!(rendered, "<ui-card><span slot=\"title\">Dashboard</span><div class=\"count\">42</div></ui-card>");
}

#[test]
fn test_crypto_hmac_signing_and_verification() {
  let secret = b"super-secret-key-32-bytes-long!!";
  let payload = "1724770000:main:<ui-card>Live</ui-card>";

  let sig = hmac::sign::payload(secret, payload.as_bytes()).unwrap();
  assert!(!sig.is_empty());

  let valid = hmac::verify::check(secret, payload.as_bytes(), &sig);
  assert!(valid);

  let invalid = hmac::verify::check(secret, b"tampered-payload", &sig);
  assert!(!invalid);
}

#[test]
fn test_crypto_ed25519_signing_and_verification() {
  let private_key = [7u8; 32];
  let public_key = ed25519_dalek::SigningKey::from_bytes(&private_key).verifying_key().to_bytes();
  let payload = "1724770000:main:<ui-card>Signed with Ed25519</ui-card>";

  let sig = ed25519::sign::payload(&private_key, payload.as_bytes()).unwrap();
  assert_eq!(sig.len(), 128); // 64 bytes hex encoded

  let valid = ed25519::verify::check(&public_key, payload.as_bytes(), &sig);
  assert!(valid);

  let invalid = ed25519::verify::check(&public_key, b"corrupted-payload", &sig);
  assert!(!invalid);
}

#[test]
fn test_engine_setup_and_fragment_rendering() {
  let temp_dir = std::env::temp_dir().join("anza_test_templates");
  let _ = fs::remove_dir_all(&temp_dir);
  fs::create_dir_all(temp_dir.join("feed")).unwrap();

  let card_path = temp_dir.join("feed/card.html");
  fs::write(
    &card_path,
    "<ui-card><div class=\"title\">{{title}}</div><ui-badge>{{status}}</ui-badge></ui-card>",
  ).unwrap();

  let secret = b"my-test-secret-key-32-bytes-long";
  let engine = Setup {
    root: temp_dir.clone(),
    signing: SignMode::Hmac { secret: secret.to_vec() },
    watch: false,
  }.run().unwrap();

  let mut params = HashMap::new();
  params.insert("title".into(), "Server Engine".into());
  params.insert("status".into(), "Online".into());

  let envelope = Fragment {
    template: "feed/card.html".into(),
    slot: "main".into(),
    params,
  }.run(&engine).unwrap();

  assert_eq!(envelope.slot, "main");
  assert!(envelope.html.contains("<ui-card><div class=\"title\">Server Engine</div>"));
  assert!(envelope.sig.is_some());

  // Verify signature
  let sig = envelope.sig.clone().unwrap();
  let msg = envelope.message();
  assert!(hmac::verify::check(secret, msg.as_bytes(), &sig));

  let _ = fs::remove_dir_all(&temp_dir);
}

#[test]
fn test_full_page_ssr_compilation() {
  let temp_dir = std::env::temp_dir().join("anza_test_ssr");
  let _ = fs::remove_dir_all(&temp_dir);
  fs::create_dir_all(temp_dir.join("pages")).unwrap();

  let home_path = temp_dir.join("pages/home.html");
  fs::write(
    &home_path,
    "<page-home><template shadowrootmode=\"open\"><h1>{{title}}</h1></template></page-home>",
  ).unwrap();

  let engine = Setup {
    root: temp_dir.clone(),
    signing: SignMode::None,
    watch: false,
  }.run().unwrap();

  let mut params = HashMap::new();
  params.insert("title".into(), "Welcome to Anza".into());

  let doc = Page {
    route: "/".into(),
    params,
  }.run(&engine).unwrap();

  assert!(doc.html.contains("<!DOCTYPE html>"));
  assert!(doc.html.contains("<dock-main>"));
  assert!(doc.html.contains("<template shadowrootmode=\"open\">"));
  assert!(doc.html.contains("<h1>Welcome to Anza</h1>"));

  let _ = fs::remove_dir_all(&temp_dir);
}
