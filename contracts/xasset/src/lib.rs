#![no_std]
use collateralized::{CDPAdmin, CDPContract, CDPStatus, Collateralized};
use soroban_sdk::{self, contracttype, Address, String, Symbol, Vec};

use stellar_tokens::fungible::{Base, FungibleToken}
use stability_pool::{AvailableAssets, StabilityPool, StakerPosition};
use token::Token;

pub mod collateralized;
pub mod error;
pub mod index_types;
mod persistent_map;
pub mod stability_pool;
mod storage;
pub mod token;

pub(crate) use persistent_map::PersistentMapExt;

use crate::storage::InterestDetail;
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

#[derive_contract(
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

mod test;
