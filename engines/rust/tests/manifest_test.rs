// Engine::manifest() lists the BLAKE3 hex digest of each template's content (E3).

use {anza::data::r#in::config::setup::Setup, std::fs};

#[test]
fn manifest_is_the_hex_blake3_of_each_template() {
  let root = std::env::temp_dir().join(format!("anza-manifest-{}", std::process::id()));
  let _ = fs::remove_dir_all(&root);
  fs::create_dir_all(root.join("feed")).unwrap();
  fs::write(root.join("abc.html"), "abc").unwrap();
  fs::write(root.join("feed/empty.html"), "").unwrap();

  let manifest = Setup::new(&root).run().unwrap().manifest().unwrap();
  // Reference values from the BLAKE3 spec / `b3sum`.
  assert_eq!(
    manifest.get("abc.html"),
    Some("6437b3ac38465133ffb63b75273a8db548c558465d79db03fd359c6cd5bd9d85")
  );
  assert_eq!(
    manifest.get("feed/empty.html"),
    Some("af1349b9f5f9a1a6a0404dea36dcc9499bcb25c9adc112b7cc9a93cae41f3262")
  );
  let _ = fs::remove_dir_all(&root);
}
