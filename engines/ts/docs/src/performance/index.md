# Performance & Optimization

Anza is engineered for maximum throughput and predictable memory usage under heavy concurrent Node.js / Bun load.

## 1. Key Optimization Strategies

1. **JIT Closure Compilation**: Converts template chunk arrays into direct V8 JIT-optimized functions `(params) => ...`.
2. **No Regex at Request Time**: Delimiter parsing occurs once during template loading.
3. **Map-Based O(1) Dispatch**: Fast template lookup via native `Map.get()`.
4. **Timing-Safe Crypto**: Uses native `crypto.timingSafeEqual()` for tamper rejection in constant time.
