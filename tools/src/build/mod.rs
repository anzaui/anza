// tools/src/build/mod.rs
//
// Import-graph resolution: walks the ESM import graph from entry points and
// copies only the reachable files into dist, preserving a browser-native folder
// structure. Reports diagnostics for missing imports, syntax errors, and
// unsupported prop types. No bundling (browser is single-threaded; that is a
// future scope).

pub mod base;
pub mod cache;
pub mod entries;
pub mod graph;
pub mod html;
pub mod order;
pub mod parse;
pub mod resolve;
pub mod ssg;
pub mod sw;
pub mod transform;

pub use graph::resolve;
