#![no_std]

use loam_sdk::derive_contract;
use loam_sdk::soroban_sdk::{Address, BytesN};
use loam_subcontract_core::{admin::Admin, Core};

pub mod error;
mod liquidity_pool;
pub mod token;
use crate::error::Error;
pub use liquidity_pool::*;
pub mod orchestrator;
pub use orchestrator::IsOrchestratorTrait;

#[derive_contract(Core(Admin), IsOrchestratorTrait(Storage))]
pub struct Contract;

impl Contract {
    pub(crate) fn require_auth() {
        Contract::admin_get()
            .expect("No admin! Call 'admin_set' first.")
            .require_auth();
    }
}

mod test;
