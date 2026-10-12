# Performance

The engine keeps request-time work small. There is no published benchmark suite
for it yet; measure your own templates before relying on specific numbers.

## What the design does

1. **Parse at startup.** `{{…}}` delimiters are found once in `Setup::run()`; no
   parsing or regular expressions at request time.
2. **One output buffer.** A render pre-sizes a `Vec<u8>` (static bytes + 32 bytes
   per placeholder) and writes chunks and values into it.
3. **Borrowed values.** `Params` returns `Cow<str>`, so struct fields and
   `HashMap` values are copied straight into the output.
4. **Shared read lock.** Lookups take a read lock on an `RwLock<HashMap>`; many
   requests can read at once. Note that `Engine::get` clones the `Template`
   (including its chunks) on every lookup.
5. **Signing cost.** HMAC-SHA256 and Ed25519 signing run once per envelope over
   `ts:slot:html`, which allocates the message string.
