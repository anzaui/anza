// Signature v2 golden fixtures, shared by all three engines (G4, GC1).

use {
  anza::{
    crypto::{envelope, hex, hmac},
    verify_envelope, Envelope, Error, Setup, SignMode, VerifyKey, VerifyOptions,
  },
  serde_json::Value,
  std::{collections::HashMap, fs},
};

fn fixture() -> Value {
  let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../fixtures/signature.json");
  serde_json::from_str(&fs::read_to_string(path).unwrap()).unwrap()
}

fn keys(fx: &Value) -> (Vec<u8>, Vec<u8>, Vec<u8>) {
  let k = &fx["keys"];
  (
    k["hmac_secret"].as_str().unwrap().as_bytes().to_vec(),
    hex::decode(k["ed25519_seed"].as_str().unwrap()).unwrap(),
    hex::decode(k["ed25519_public"].as_str().unwrap()).unwrap(),
  )
}

#[test]
fn message_and_signatures_match_the_golden_fixtures() {
  let fx = fixture();
  let (secret, seed, _) = keys(&fx);
  for case in fx["cases"].as_array().unwrap() {
    let name = case["name"].as_str().unwrap();
    let env: Envelope = serde_json::from_value(case["envelope"].clone()).unwrap();
    assert_eq!(hex::encode(env.message()), case["message_hex"].as_str().unwrap(), "{name}");
    let msg = env.message();
    assert_eq!(hmac::sign::payload(&secret, &msg).unwrap(), case["hmac"].as_str().unwrap(), "{name}");
    assert_eq!(anza::crypto::ed25519::sign::payload(&seed, &msg).unwrap(), case["ed25519"].as_str().unwrap(), "{name}");
  }
  // The v1 ambiguity is gone: `a:b` + `c` and `a` + `b:c` differ.
  let cases = fx["cases"].as_array().unwrap();
  assert_ne!(cases[3]["message_hex"], cases[4]["message_hex"]);
}

fn mutate(fx: &Value, mode: &str, rule: &Value) -> (Envelope, String, u64, u64) {
  let verify = &fx["verify"];
  let base = fx["cases"].as_array().unwrap().iter().find(|c| c["name"] == verify["base"]).unwrap();
  let mut env = base["envelope"].clone();
  let sig = base[mode].as_str().unwrap().to_string();
  let obj = env.as_object_mut().unwrap();
  obj.insert("sig".into(), Value::String(sig.clone()));
  if let Some(set) = rule.get("set").and_then(Value::as_object) {
    for (k, v) in set {
      if v.is_null() {
        obj.remove(k);
      } else {
        obj.insert(k.clone(), v.clone());
      }
    }
  }
  match rule.get("sig").and_then(Value::as_str).unwrap_or("keep") {
    "keep" => {}
    "drop" => {
      obj.remove("sig");
    }
    "upper" => {
      obj.insert("sig".into(), Value::String(sig.to_uppercase()));
    }
    op if op.starts_with("append:") => {
      obj.insert("sig".into(), Value::String(format!("{sig}{}", &op[7..])));
    }
    op if op.starts_with("literal:") => {
      obj.insert("sig".into(), Value::String(op[8..].to_string()));
    }
    op => panic!("unknown sig op {op}"),
  }
  let mut options = verify["options"].as_object().unwrap().clone();
  if let Some(o) = rule.get("options").and_then(Value::as_object) {
    options.extend(o.clone());
  }
  (
    serde_json::from_value(env).unwrap(),
    options["slot"].as_str().unwrap().to_string(),
    options["max_age_secs"].as_u64().unwrap(),
    options["now"].as_u64().unwrap(),
  )
}

#[test]
fn verify_envelope_follows_the_golden_rules() {
  let fx = fixture();
  let (secret, seed, public) = keys(&fx);
  let hmac_engine = engine(SignMode::Hmac { secret: secret.clone() });
  let ed_engine = engine(SignMode::Ed25519 { private_key: seed, public_key: vec![] });

  for (mode, key, eng) in [
    ("hmac", VerifyKey::Hmac(&secret), &hmac_engine),
    ("ed25519", VerifyKey::Ed25519(&public), &ed_engine),
  ] {
    for rule in fx["verify"]["accept"].as_array().unwrap() {
      let (env, slot, max_age, now) = mutate(&fx, mode, rule);
      let mut opts = VerifyOptions::new(&slot, max_age);
      opts.now = Some(now);
      verify_envelope(key, &env, &opts).unwrap_or_else(|e| panic!("{mode} {}: {e}", rule["name"]));
      eng.0.verify_envelope(&env, &opts).unwrap();
    }
    for rule in fx["verify"]["reject"].as_array().unwrap() {
      let (env, slot, max_age, now) = mutate(&fx, mode, rule);
      let mut opts = VerifyOptions::new(&slot, max_age);
      opts.now = Some(now);
      let reason = rule["reason"].as_str().unwrap();
      for result in [verify_envelope(key, &env, &opts), eng.0.verify_envelope(&env, &opts)] {
        match result {
          Err(Error::Crypto(msg)) => assert_eq!(msg, reason, "{mode} {}", rule["name"]),
          other => panic!("{mode} {}: expected {reason}, got {other:?}", rule["name"]),
        }
      }
    }
  }
}

struct TestEngine(anza::Engine, std::path::PathBuf);

impl Drop for TestEngine {
  fn drop(&mut self) {
    let _ = fs::remove_dir_all(&self.1);
  }
}

fn engine(signing: SignMode) -> TestEngine {
  use std::sync::atomic::{AtomicUsize, Ordering};
  static N: AtomicUsize = AtomicUsize::new(0);
  let dir = std::env::temp_dir().join(format!("anza-sig-{}-{}", std::process::id(), N.fetch_add(1, Ordering::SeqCst)));
  fs::create_dir_all(&dir).unwrap();
  fs::write(dir.join("card.html"), "<b>{{x}}</b>").unwrap();
  let mut setup = Setup::new(&dir);
  setup.signing = signing;
  TestEngine(setup.run().unwrap(), dir)
}

#[test]
fn rendered_envelopes_are_v2_and_verify() {
  let fx = fixture();
  let (secret, ..) = keys(&fx);
  let eng = engine(SignMode::Hmac { secret: secret.clone() });
  let mut params = HashMap::new();
  params.insert("x".to_string(), "1".to_string());
  let env = eng.0.render_fragment("card.html", "feed", &params).unwrap();
  assert_eq!(env.v, 2);
  let json = serde_json::to_string(&env).unwrap();
  assert!(json.starts_with("{\"v\":2,"), "{json}");
  verify_envelope(VerifyKey::Hmac(&secret), &env, &VerifyOptions::new("feed", 60)).unwrap();
  assert!(verify_envelope(VerifyKey::Hmac(&secret), &env, &VerifyOptions::new("main", 60)).is_err());
  // Short verification keys are refused outright.
  assert!(matches!(
    verify_envelope(VerifyKey::Hmac(b"short"), &env, &VerifyOptions::new("feed", 60)),
    Err(Error::Crypto(m)) if m == "invalid verification key"
  ));
  assert!(env.message().starts_with(envelope::DOMAIN.as_bytes()));
}
