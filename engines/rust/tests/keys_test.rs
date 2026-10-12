// Signing keys are validated at setup and never printed (G2, G7).

use {
  anza::{Error, Setup, SignMode},
  std::{fs, path::PathBuf},
};

struct Dir(PathBuf);

impl Drop for Dir {
  fn drop(&mut self) {
    let _ = fs::remove_dir_all(&self.0);
  }
}

fn root(name: &str) -> Dir {
  let dir = std::env::temp_dir().join(format!("anza-keys-{}-{}", name, std::process::id()));
  let _ = fs::remove_dir_all(&dir);
  fs::create_dir_all(&dir).unwrap();
  fs::write(dir.join("card.html"), "<p>{{x}}</p>").unwrap();
  Dir(dir)
}

fn setup(dir: &Dir, signing: SignMode) -> Setup {
  let mut setup = Setup::new(&dir.0);
  setup.signing = signing;
  setup
}

fn is_crypto(result: anza::Result<anza::Engine>) -> bool {
  matches!(result, Err(Error::Crypto(_)))
}

const SEED: [u8; 32] = [7u8; 32];

fn public() -> Vec<u8> {
  ed25519_dalek::SigningKey::from_bytes(&SEED).verifying_key().to_bytes().to_vec()
}

#[test]
fn hmac_secret_must_be_at_least_32_bytes() {
  let dir = root("hmac");
  assert!(is_crypto(setup(&dir, SignMode::Hmac { secret: vec![] }).run()));
  assert!(is_crypto(setup(&dir, SignMode::Hmac { secret: vec![1; 31] }).run()));
  assert!(setup(&dir, SignMode::Hmac { secret: vec![1; 32] }).run().is_ok());
}

#[test]
fn ed25519_seed_must_be_32_bytes() {
  let dir = root("seed");
  let mode = |private_key: Vec<u8>| SignMode::Ed25519 { private_key, public_key: vec![] };
  assert!(is_crypto(setup(&dir, mode(vec![])).run()));
  assert!(is_crypto(setup(&dir, mode(vec![7; 31])).run()));
  assert!(is_crypto(setup(&dir, mode(vec![7; 64])).run()));
  assert!(setup(&dir, mode(SEED.to_vec())).run().is_ok());
}

#[test]
fn ed25519_public_key_must_match() {
  let dir = root("pub");
  let mode = |public_key: Vec<u8>| SignMode::Ed25519 { private_key: SEED.to_vec(), public_key };
  assert!(setup(&dir, mode(public())).run().is_ok());
  assert!(is_crypto(setup(&dir, mode(vec![0; 32])).run()));
  assert!(is_crypto(setup(&dir, mode(vec![0; 31])).run()));
}

#[test]
fn missing_key_files_are_a_setup_error() {
  let dir = root("files");
  let private = dir.0.join("origin.key");
  let public_path = dir.0.join("origin.pub");
  assert!(matches!(Setup::ed25519(&private, &public_path), Err(Error::Crypto(_))));

  fs::write(&private, SEED).unwrap();
  assert!(matches!(Setup::ed25519(&private, &public_path), Err(Error::Crypto(_))));

  fs::write(&public_path, public()).unwrap();
  let signing = Setup::ed25519(&private, &public_path).unwrap();
  let engine = setup(&dir, signing).run().unwrap();
  let env = engine.render_fragment("card.html", "main", &Default::default()).unwrap();
  assert!(env.sig.is_some());
}

#[test]
fn debug_output_redacts_keys() {
  let dir = root("debug");
  let secret = b"this-is-a-very-secret-hmac-key-0".to_vec();
  let s = setup(&dir, SignMode::Hmac { secret: secret.clone() });
  let printed = format!("{s:?} {:?}", s.run().unwrap().signer());
  assert!(!printed.contains("this-is-a-very-secret"), "{printed}");
  assert!(!printed.contains(&format!("{:?}", secret)), "{printed}");
  assert!(printed.contains("redacted"), "{printed}");

  let s = setup(&dir, SignMode::Ed25519 { private_key: SEED.to_vec(), public_key: vec![] });
  let printed = format!("{s:?} {:?}", s.run().unwrap().signer());
  assert!(!printed.contains("[7, 7"), "{printed}");
  assert!(!printed.contains("0707070707"), "{printed}");
  assert!(printed.contains("redacted"), "{printed}");
}
