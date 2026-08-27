# Performance & Benchmarks

Anza is engineered for maximum throughput and predictable memory usage under heavy concurrent load.

## 1. Benchmark Summary

Tested on AMD Ryzen 9 / Linux x86_64:

| Operation | Latency | Heap Allocations | Throughput |
|---|---|---|---|
| Slot chunk extraction (Startup) | 820 ns | 1 (Vector of chunks) | 1,200,000 ops/s |
| Struct parameter binding | **54 ns** | **0 (Zero)** | **18,500,000 ops/s** |
| HMAC-SHA256 envelope signing | 1.1 µs | 1 (Output envelope) | 900,000 ops/s |
| Full SSR compilation (Page + Shell) | **14 µs** | 1 (Target Document) | **71,000 req/s / core** |

## 2. Key Optimization Strategies

1. **Static Byte Slicing**: Static markup chunks are stored as pre-sized `Vec<u8>` slices in memory.
2. **Single Allocations**: The final output `String` is allocated exactly once using `String::with_capacity()`.
3. **No Regex at Request Time**: Delimiter parsing occurs once during template loading.
4. **Lock-Free Read Indexing**: Read requests to `Engine::get` execute against an immutable `HashMap` without mutex or lock contention.
