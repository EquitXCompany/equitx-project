#![no_std]
use collateralized::{CDPAdmin, Collateralized};
use loam_sdk::derive_contract;
use loam_subcontract_core::{admin::Admin, Core};
use token::Token;

pub mod collateralized;
pub mod stability_pool;
pub mod token;

#[derive_contract(Core(Admin), Collateralized(Token), CDPAdmin(Token))]
pub struct Contract;

impl Contract {
    pub(crate) fn require_auth() {
        Contract::admin_get()
            .expect("No admin! Call 'admin_set' first.")
            .require_auth();
    }
}
