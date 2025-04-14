#![cfg(test)]
extern crate std;

use crate::{SorobanContract__, SorobanContract__Client};

use loam_sdk::import_contract;
use loam_sdk::soroban_sdk::{
    testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation},
    Address, BytesN, Env,
};

loam_sdk::import_contract!(xasset);
loam_sdk::import_contract!(data_feed);

#[test]
fn create_orchestrator_contract() {
    let e = Env::default();
    let client = SorobanContract__Client::new(&e, &e.current_contract_address());
    assert!(client.deploy_asset, "deploy_asset_contract");
}
// TODO what to test?

// Create an orchestrator contract

// Test deploy_asset_contract
// Expect the contract to be deployed and interactable
// Test get_asset_contract
// Expect the contract to be returned
// Test get_asset_contract with an invalid asset symbol
// Expect an error to be returned
// Test deploy_asset_contract with an invalid (existing) asset symbol
// Expect an error to be returned
