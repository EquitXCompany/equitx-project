#![no_std]
use collateralized::{CDPAdmin, Collateralized, CDP, CDPStatus};
use loam_sdk::{
    derive_contract,
    soroban_sdk::{self, Address, String, Symbol, Vec},
};
use loam_subcontract_core::{admin::Admin, Core};
use loam_subcontract_ft::{Fungible, Sep41};
use stability_pool::{AvailableAssets, StabilityPool, StakerPosition};
use token::Token;

pub mod collateralized;
pub mod error;
mod storage;
pub mod stability_pool;
pub mod token;

#[cfg(feature = "mercury")]
pub mod index_types;

pub use error::Error;

// FIXME: copied from data_feed; find way to reuse
#[loam_sdk::soroban_sdk::contracttype]
pub struct PriceData {
    pub price: i128,    //asset price at given point in time
    pub timestamp: u64, //recording timestamp
}

pub mod data_feed {
    use loam_sdk::soroban_sdk;

    soroban_sdk::contractimport!(
        file = "../../target/wasm32-unknown-unknown/release/data_feed.wasm"
    );
}

#[derive_contract(
    Core(Admin),
    Collateralized(Token),
    CDPAdmin(Token),
    Sep41(Token),
    Fungible(Token),
    StabilityPool(Token)
)]
pub struct Contract;

impl Contract {
    pub(crate) fn require_auth() {
        Contract::admin_get()
            .expect("No admin! Call 'admin_set' first.")
            .require_auth();
    }
}

//mod test;