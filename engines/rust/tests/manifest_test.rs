// Engine::manifest() lists the SHA-256 hex digest of each template's content,
// like the TS and Python engines (GC1).

use {anza::data::r#in::config::setup::Setup, std::fs};

#[test]
fn manifest_is_the_hex_sha256_of_each_template() {
  let root = std::env::temp_dir().join(format!("anza-manifest-{}", std::process::id()));
  let _ = fs::remove_dir_all(&root);
  fs::create_dir_all(root.join("feed")).unwrap();
  fs::write(root.join("abc.html"), "abc").unwrap();
  fs::write(root.join("feed/empty.html"), "").unwrap();

  let manifest = Setup::new(&root).run().unwrap().manifest().unwrap();
  // Reference values from FIPS 180-2 / `sha256sum`.
  assert_eq!(
    manifest.get("abc.html"),
    Some("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
  );
  assert_eq!(
    manifest.get("feed/empty.html"),
    Some("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
  );
  let _ = fs::remove_dir_all(&root);
}
