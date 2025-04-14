#![no_std]

use loam_sdk::derive_contract;
use loam_sdk::soroban_sdk::{Address, BytesN, Symbol, String};
use loam_subcontract_core::{admin::Admin, Core};

pub mod error;
use crate::error::Error;
pub mod orchestrator;
pub use orchestrator::*;

pub mod data_feed {
    use loam_sdk::soroban_sdk;

    soroban_sdk::contractimport!(
        file = "../../target/wasm32-unknown-unknown/release/data_feed.wasm"
    );
}

#[derive_contract(Core(Admin), OrchestratorTrait(Storage))]
pub struct Contract;

mod test;
