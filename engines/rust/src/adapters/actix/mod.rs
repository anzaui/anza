#[cfg(feature = "actix")]
pub mod fragment;
#[cfg(feature = "actix")]
pub mod page;
#[cfg(feature = "actix")]
pub mod stream;

#[cfg(feature = "actix")]
pub use stream::bytes;
