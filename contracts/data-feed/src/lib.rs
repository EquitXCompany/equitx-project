#![no_std]
use loam_sdk::{derive_contract, soroban_sdk::Vec};
use loam_subcontract_core::{admin::Admin, Core};

pub mod data_feed;
pub mod reflector;
pub mod sep40;

use data_feed::DataFeed;
use sep40::{Asset, PriceData, Sep40, Sep40Admin};

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
