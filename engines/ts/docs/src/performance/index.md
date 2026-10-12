# Performance

The engine keeps request-time work small. There is no published benchmark suite
for it yet; measure your own templates before relying on specific numbers.

## What the design does

1. **Parse at startup.** `{{…}}` delimiters are found once in `Setup.run()`; no
   parsing or regular expressions at request time.
2. **One render function per template.** `compile(chunks)` builds a closure once;
   rendering is a loop of string concatenations.
3. **No parameter conversion.** Objects, `Map`s and `[key, value]` arrays each
   have their own loop. Object lookups are fastest; an own-property check
   (`Object.hasOwn`) only runs for names an `Object.prototype` member could
   answer, such as `toString`. Arrays are turned into a `Map` once per render.
4. **No escaping work when it is off.** With `escape: false` (the default) the
   renderer has no escape branch; with `escape: true` only `{{name}}` slots
   call `escapeHtml`, which returns the string untouched when it has no
   special characters.
5. **`Map` lookups.** `engine.get(name)` is a name check and a single `Map.get`.
6. **Signing cost.** Keys are decoded once in `Setup.run()`. HMAC and Ed25519
   run once per envelope through `node:crypto`; unsigned envelopes do no
   signing work.
