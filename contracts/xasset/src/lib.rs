#![no_std]
use soroban_sdk::{self, contracttype};

mod collateralized;
mod error;
mod index_types;
mod stability_pool;
mod storage;
pub mod token;

pub use error::Error;

// FIXME: copied from data_feed; find way to reuse
#[contracttype]
pub struct PriceData {
    pub price: i128,    //asset price at given point in time
    pub timestamp: u64, //recording timestamp
}

pub mod data_feed {
    soroban_sdk::contractimport!(file = "../../target/wasm32v1-none/release/data_feed.wasm");
}

mod test;
