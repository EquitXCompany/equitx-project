#![no_std]
use loam_sdk::{
    derive_contract,
    soroban_sdk::{self, Vec},
};
use loam_subcontract_core::{admin::Admin, Core};

pub mod data_feed;
pub mod reflector;
pub mod sep40;

pub use data_feed::DataFeed;
pub use sep40::{Sep40, Sep40Admin};

/// Quoted asset definition
#[loam_sdk::soroban_sdk::contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum Asset {
    /// Can be a Stellar Classic or Soroban asset
    Stellar(loam_sdk::soroban_sdk::Address),
    /// For any external tokens/assets/symbols
    Other(loam_sdk::soroban_sdk::Symbol),
}

/// Price record definition
#[loam_sdk::soroban_sdk::contracttype]
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