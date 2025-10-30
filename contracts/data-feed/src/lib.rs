#![no_std]

use soroban_sdk::{self, Vec, contracttype, env, Map};,

pub mod data_feed;
pub mod reflector;
pub mod sep40;

pub use data_feed::DataFeed;
pub use sep40::{Sep40, Sep40Admin};

/// Quoted asset definition
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum Asset {
    /// Can be a Stellar Classic or Soroban asset
    Stellar(loam_sdk::soroban_sdk::Address),
    /// For any external tokens/assets/symbols
    Other(loam_sdk::soroban_sdk::Symbol),
}

/// Price record definition
#[contracttype]
pub struct PriceData {
    pub price: i128,    //asset price at given point in time
    pub timestamp: u64, //recording timestamp
}

#[derive_contract(
    Core(Admin),
    Sep40(DataFeed),
    // Reflector(DataFeed),
    Sep40Admin(DataFeed)
)]
pub struct Contract;

impl Contract {
    pub(crate) fn require_auth() {
        Contract::admin_get()
            .expect("No admin! Call 'admin_set' first.")
            .require_auth();
    }
}

mod test;
