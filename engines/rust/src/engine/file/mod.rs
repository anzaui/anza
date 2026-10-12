pub mod load;
pub mod read;
pub mod watch;

pub use {
  load::{all, all_with, one, one_with, LoadOptions, Template},
  read::{mmap, text},
  watch::{listen, FileWatcher},
};
