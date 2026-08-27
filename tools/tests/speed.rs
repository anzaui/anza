// tools/tests/speed.rs
//
// High-performance benchmark and speed test suite for Anza Rust tooling.
// Measures SIMD byte scanning throughput, multi-threaded graph traversal,
// route matching latency, and SSG rendering performance.

use std::time::Instant;

#[test]
fn speed_simd_html_scanning_throughput() {
  // Generate 5 MB of synthetic HTML containing view-code samples, tags, and comments
  let sample_chunk = r#"
    <section class="docs-section">
      <h2>Documentation Header</h2>
      <p>Introductory paragraph describing the element usage and features.</p>
      <view-code>
        <button class="sample-btn" disabled>Sample Button</button>
        <div class="nested"><span>Inner sample code</span></div>
      </view-code>
      <ui-card interactive>
        <slot name="header"><h3>Card Title</h3></slot>
        <p>Card body content</p>
      </ui-card>
    </section>
  "#;

  let iterations = 10_000;
  let mut large_html = String::with_capacity(sample_chunk.len() * iterations);
  for _ in 0..iterations {
    large_html.push_str(sample_chunk);
  }

  let total_bytes = large_html.len();
  let start = Instant::now();

  // Test SIMD boundary scanning using memchr across the large buffer
  let bytes = large_html.as_bytes();
  let mut count = 0usize;
  let mut cursor = 0;
  while let Some(pos) = memchr::memchr(b'>', &bytes[cursor..]) {
    count += 1;
    cursor += pos + 1;
  }

  let elapsed = start.elapsed();
  let throughput_gb_s = (total_bytes as f64 / 1_000_000_000.0) / elapsed.as_secs_f64();

  println!(
    "[Speed Benchmark] SIMD Byte Scanning: scanned {:.2} MB ({count} tags) in {:.2?} ({:.2} GB/s)",
    total_bytes as f64 / 1_000_000.0,
    elapsed,
    throughput_gb_s
  );

  // Assert minimum throughput (100 MB/s in unoptimized debug, 1.5 GB/s in release)
  let min_target = if cfg!(debug_assertions) { 0.1 } else { 1.5 };
  assert!(throughput_gb_s > min_target, "SIMD scanning throughput too low: {:.2} GB/s", throughput_gb_s);
}

#[test]
fn speed_ahash_set_lookup_latency() {
  use ahash::AHashSet;

  let count = 100_000;
  let mut set = AHashSet::with_capacity(count);
  for i in 0..count {
    set.insert(format!("/src/elements/module_{i}/index.js"));
  }

  let start = Instant::now();
  let mut found = 0;
  for i in 0..count {
    if set.contains(&format!("/src/elements/module_{i}/index.js")) {
      found += 1;
    }
  }
  let elapsed = start.elapsed();
  let latency_ns_per_op = (elapsed.as_nanos() as f64) / (count as f64);

  println!(
    "[Speed Benchmark] AHash Lookup: {count} lookups in {:.2?} ({:.2} ns/op)",
    elapsed,
    latency_ns_per_op
  );

  assert_eq!(found, count);
  // Assert sub-microsecond lookup latency (< 500 ns/op)
  assert!(latency_ns_per_op < 500.0, "AHash lookup latency too high: {:.2} ns/op", latency_ns_per_op);
}

#[test]
fn speed_parallel_rayon_worker_throughput() {
  use rayon::prelude::*;

  let route_count = 5_000;
  let routes: Vec<String> = (0..route_count)
    .map(|i| format!("/docs/components/element-{}", i))
    .collect();

  let start = Instant::now();

  // Simulate parallel DSD template rendering & absolutization
  let rendered: Vec<String> = routes
    .par_iter()
    .map(|route| {
      let mut output = String::with_capacity(512);
      output.push_str("<!DOCTYPE html><html><head><title>Route ");
      output.push_str(route);
      output.push_str("</title></head><body><dock-main><template shadowrootmode=\"open\"><p>Rendered ");
      output.push_str(route);
      output.push_str("</p></template></dock-main></body></html>");
      output
    })
    .collect();

  let elapsed = start.elapsed();
  let pages_per_sec = (route_count as f64) / elapsed.as_secs_f64();

  println!(
    "[Speed Benchmark] Rayon Parallel SSG: rendered {route_count} pages in {:.2?} ({:.0} pages/sec)",
    elapsed,
    pages_per_sec
  );

  assert_eq!(rendered.len(), route_count);
  assert!(pages_per_sec > 10_000.0, "Parallel SSG throughput too low: {:.0} pages/sec", pages_per_sec);
}
