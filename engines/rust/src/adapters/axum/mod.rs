#[cfg(feature = "axum")]
pub mod fragment;
#[cfg(feature = "axum")]
pub mod page;
#[cfg(feature = "axum")]
pub mod stream;

#[cfg(feature = "axum")]
pub use stream::event;
