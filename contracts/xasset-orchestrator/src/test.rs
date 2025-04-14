#![cfg(test)]
extern crate std;

use crate::error::Error;
use crate::{SorobanContract__, SorobanContract__Client};

// use loam_sdk::import_contract;
use loam_sdk::soroban_sdk::{
    testutils::Address as _,
    Address, Env,
};
use loam_sdk::soroban_sdk::{String, Symbol, Vec};

loam_sdk::import_contract!(xasset);
loam_sdk::import_contract!(data_feed);

fn create_datafeed_contract<'a>(e: &Env) -> data_feed::Client<'a> {
    let datafeed = data_feed::Client::new(e, &e.register(SorobanContract__, ()));
    let asset_xlm: data_feed::Asset = data_feed::Asset::Other(Symbol::new(e, "XLM"));
    let asset_xusd: data_feed::Asset = data_feed::Asset::Other(Symbol::new(e, "XUSD"));
    let asset_vec = Vec::from_array(e, [asset_xlm.clone(), asset_xusd.clone()]);
    let admin = Address::generate(&e);
    // datafeed.admin_set(&admin);
    let _ = datafeed.try_admin_set(&admin);
    let _ = datafeed.try_sep40_init(&asset_vec, &asset_xusd, &14, &300);
    datafeed
}

fn create_orchestrator_contract<'a>(e: &Env) -> SorobanContract__Client<'a> {
    let orchestrator = SorobanContract__Client::new(&e, &e.register(SorobanContract__, ()));
    let admin = Address::generate(&e);
    let _ = orchestrator.try_admin_set(&admin);
    orchestrator.init(&Address::generate(&e));
    orchestrator
}

#[test]
fn test_orchestrator() {
    let e = Env::default();
    e.mock_all_auths();

    // Create a data feed contract
    let datafeed = create_datafeed_contract(&e);

    // Create an orchestrator contract
    let orchestrator = create_orchestrator_contract(&e);

    // Initialize the orchestrator with the data feed contract address
    let deploy_result = orchestrator.deploy_asset_contract(
        &datafeed.address,
        &datafeed.address,
        &datafeed.address,
        &Symbol::new(&e, "XLM"),
        &100,
        &String::from_str(&e, "XLM"),
        &String::from_str(&e, "XLM"),
        &6,
        &100,
    );
    std::println!("deploy_result: {:?}", deploy_result);
    // let contract_address = deploy_result.unwrap();
    // debug_assert_eq!(contract_address, orchestrator.address);

    // Test get_asset_contract with an invalid asset symbol
    let invalid_symbol = String::from_str(&e, "INVALID");
    let invalid_result  = orchestrator.try_get_asset_contract(&invalid_symbol);

    assert!(invalid_result.is_err());
    debug_assert_eq!(
        invalid_result.unwrap_err().unwrap(),
        Error::NoSuchAsset
    );
    // // Test deploy_asset_contract with an invalid (existing) asset symbol
    // let result = orchestrator.deploy_asset_contract(
    //     &datafeed.address,
    //     &datafeed.address,
    //     &datafeed.address,
    //     &Symbol::new(&e, "XLM"),
    //     &100,
    //     &String::from_str(&e, "XLM"),
    //     &invalid_symbol,
    //     &6,
    //     &100,
    // );
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
