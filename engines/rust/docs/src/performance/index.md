# Performance

The engine keeps request-time work small. There is no published benchmark suite
for it yet; measure your own templates before relying on specific numbers.

## What the design does

1. **Parse at startup.** `{{…}}` delimiters are found once in `Setup::run()`; no
   parsing or regular expressions at request time.
2. **Compiled templates.** Each template is compiled once into a binding plan;
   a render resolves each distinct placeholder name once, sizes one `String`
   and writes static text and values into it.
3. **Borrowed values.** `Params` returns `Cow<str>`, so struct fields and
   `HashMap` values are copied straight into the output.
4. **Shared read lock.** Lookups take a read lock on an `RwLock<HashMap>`; many
   requests can read at once. `Engine::get` returns an `Arc<Template>`, so a
   lookup never copies the template.
5. **Signing cost.** Keys are decoded and validated once in `Setup::run()`.
   HMAC-SHA256 and Ed25519 signing run once per envelope over the v2 message,
   which allocates the message bytes. Unsigned engines build no message.
