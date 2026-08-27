pub mod load;
pub mod read;
pub mod watch;

pub use {
  load::{all, one, Template},
  read::{mmap, text},
  watch::{listen, FileWatcher},
};
