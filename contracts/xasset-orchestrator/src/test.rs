#![cfg(test)]

use crate::error::Error;
use crate::orchestrator::OrchestratorContract;

use soroban_sdk::{testutils::Address as _, Address, BytesN, Env};
use soroban_sdk::{String, Symbol};

pub mod xasset {
    soroban_sdk::contractimport!(file = "../../target/wasm32v1-none/release/xasset.wasm");
}

fn generate_client<'a>(env: &Env, admin: &Address) -> OrchestratorContractClient<'a> {
    let contract_id = env.register(OrchestratorContract, (admin,));
    OrchestratorContractClient::new(env, &contract_id)
}
fn create_orchestrator_contract<'a>(e: &Env) -> SorobanContract__Client<'a> {
    let orchestrator = SorobanContract__Client::new(e, &e.register(SorobanContract__, ()));
    let admin: Address = Address::generate(e);
    let _ = orchestrator.try_admin_set(&admin);
    let wasm_hash: BytesN<32> = e.deployer().upload_contract_wasm(xasset::WASM);
    orchestrator.init(&Address::generate(e), &Address::generate(e), &wasm_hash);
    orchestrator
}

#[test]
fn test_orchestrator() {
    let e = Env::default();
    e.mock_all_auths();

    // Create test address to use as arguments
    let test_address = Address::generate(&e);

    // Create an orchestrator contract
    let orchestrator = create_orchestrator_contract(&e);

    // Initialize the orchestrator with the test contract address
    let try_deploy_result = orchestrator.try_deploy_asset_contract(
        &test_address,
        &Symbol::new(&e, "XLM"),
        &100,
        &String::from_str(&e, "XLM"),
        &String::from_str(&e, "XUSD"),
        &6,
        &100,
    );
    assert!(try_deploy_result.is_ok());
    let deploy_result = try_deploy_result.unwrap().unwrap();

    // get_asset_contract with a non-existent asset symbol
    let invalid_symbol = String::from_str(&e, "NOASSET");
    let invalid_result = orchestrator.try_get_asset_contract(&invalid_symbol);
    assert!(invalid_result.is_err());
    assert_eq!(invalid_result.unwrap_err().unwrap(), Error::NoSuchAsset);

    // deploy_asset_contract with an invalid (existing) asset symbol
    let result = orchestrator.try_deploy_asset_contract(
        &test_address,
        &Symbol::new(&e, "XLM"),
        &100,
        &String::from_str(&e, "XLM"),
        &String::from_str(&e, "XUSD"),
        &6,
        &100,
    );
    assert!(result.is_err());
    assert_eq!(result.unwrap_err().unwrap(), Error::AssetAlreadyDeployed);

    // get_asset_contract with a valid asset symbol
    let valid_symbol = String::from_str(&e, "XUSD");
    let valid_result = orchestrator.try_get_asset_contract(&valid_symbol);
    assert!(valid_result.is_ok());
    let contract_address = valid_result.unwrap().unwrap();
    assert_eq!(&contract_address, &deploy_result);

    // set a symbol to a contract address
    let new_symbol = String::from_str(&e, "XEUR");
    let new_address: Address = Address::generate(&e);

    orchestrator.set_asset_contract(&new_symbol, &new_address);
    let updated_result = orchestrator.try_get_asset_contract(&new_symbol);
    assert!(updated_result.is_ok());
    assert_eq!(updated_result.unwrap().unwrap(), new_address);

    // set an existing symbol to a different contract address
    let existing_symbol = String::from_str(&e, "XUSD");
    let existing_address = Address::generate(&e);
    orchestrator.set_existing_asset_contract(&existing_symbol, &existing_address);
    let existing_updated_result = orchestrator.try_get_asset_contract(&existing_symbol);
    assert!(existing_updated_result.is_ok());
    assert_eq!(existing_updated_result.unwrap().unwrap(), existing_address);

    // update the xasset wasm hash
    let new_wasm_hash: BytesN<32> = e.deployer().upload_contract_wasm(xasset::WASM);
    let result = orchestrator.try_update_xasset_wasm_hash(&new_wasm_hash);
    assert_eq!(result.unwrap().unwrap(), new_wasm_hash);
}
