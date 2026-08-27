# Bug Report: Rust SSG Deploy Base Test Environment Coupling

## 1. Summary
The unit test `build::base::tests::load_deploy_base_reads_ssg_json` in the Rust `tools/` crate relied on reading `../web/ssg.json` from the repository root, expecting `"base": "/anza"`. When `web/ssg.json` was updated for the custom domain `anza.aduki.org` (without a base path prefix), the unit test failed with `assertion left == right failed (left: "", right: "/anza")`.

## 2. Affected Files
- [tools/src/build/base.rs](file:///home/femar/A10B/anza/tools/src/build/base.rs)

## 3. Root Cause Analysis
Unit tests should be isolated and reproducible, avoiding direct coupling to external repository deployment config files that may change across branches or environments.

## 4. Fix Applied
Updated the test to create a self-contained temporary directory fixture with a localized `ssg.json` file, ensuring 100% deterministic test execution in all environments.

## 5. Verification
- `cargo test` in `tools/` runs all 74 unit tests with 0 failures in 0.00s.
