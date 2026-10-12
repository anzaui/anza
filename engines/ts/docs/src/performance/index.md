# Performance

The engine keeps request-time work small. There is no published benchmark suite
for it yet; measure your own templates before relying on specific numbers.

## What the design does

1. **Parse at startup.** `{{…}}` delimiters are found once in `Setup.run()`; no
   parsing or regular expressions at request time.
2. **One render function per template.** `compile(chunks)` builds a closure once;
   rendering is a loop of string concatenations.
3. **No parameter conversion.** Objects, `Map`s and `[key, value]` arrays each
   have their own loop. Object lookups are fastest; arrays search linearly per
   placeholder.
4. **`Map` lookups.** `engine.get(name)` is a single `Map.get`.
5. **Signing cost.** HMAC and Ed25519 run once per envelope through
   `node:crypto`.
