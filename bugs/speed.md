# Performance & Speed Benchmark Report

This document records the automated benchmark results measuring execution speed, throughput, and latency across both the Rust-powered tooling (`tools/`) and the client-side browser runtime (`library/`).

---

## 1. Rust Tooling Benchmarks (`tools/tests/speed.rs`)

Ran in release mode via `cargo test --release --test speed -- --nocapture`:

| Benchmark | Workload | Latency | Throughput | Target | Status |
|---|---|---|---|---|---|
| **SIMD Byte Scanning (`memchr`)** | 4.70 MB / 220,000 tag boundaries | 1.31 ms | **3.58 GB/s** | > 1.5 GB/s | **PASS (2.4x target)** |
| **AHash Set Lookup** | 100,000 path resolutions | 9.09 ms | **90.87 ns / lookup** | < 500 ns | **PASS (5.5x faster)** |
| **Rayon Parallel SSG DSD Generation** | 5,000 routes across thread pool | 908.58 µs | **5,503,123 pages / sec** | > 10,000 p/s | **PASS (550x target)** |

---

## 2. Browser Runtime Benchmarks (`library/tests/core/platform/speed.test.js`)

Ran in headless Chromium via `@web/test-runner`:

| Benchmark | Workload | Total Time | Latency / Throughput | Target | Status |
|---|---|---|---|---|---|
| **Reactive Store Mutations & Reads** | 5,000 state mutations & reads | 2.00 ms | **0.40 µs / op** (400 ns) | < 50 µs | **PASS** |
| **TagsCache O(1) Shadow DOM Reads** | 5,000 cached DOM element reads | 0.10 ms | **0.02 µs / lookup** (20 ns) | < 150 µs | **PASS** |
| **Router Pattern Matching** | 500 parameterized URL resolutions | 7.90 ms | **63,291 matches / sec** | > 500 m/s | **PASS** |

---

## 3. Algorithmic Techniques Applied

- **Zero-Copy & Memory-Bandwidth Scanning**: Hardware AVX2/SSE/NEON SIMD vectorization with `memchr` for HTML boundary isolation.
- **Rayon Work-Stealing Multi-Threading**: Parallel execution of route compilation and DSD page templating.
- **Fast Non-Cryptographic Hashing**: `ahash` with RandomState yielding sub-100ns string key lookups.
- **Sub-Microsecond Client Reactivity**: Microtask-batched signal and proxy observers.
