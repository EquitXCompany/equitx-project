#![allow(unused)]
use loam_sdk::{
    import_contract,
    soroban_sdk::{self, contractimport, xdr::ToXdr, Address, Bytes, BytesN, Env, IntoVal, String},
};

use crate::error::Error;

// Could use this if it were public
// import_contract!(xasset);

pub mod xasset {
    use loam_sdk::soroban_sdk;
    loam_sdk::soroban_sdk::contractimport!(file = "../../target/wasm32-unknown-unknown/release/xasset.wasm",);
}

pub fn create_contract(
    e: &Env,
    token_wasm_hash: &BytesN<32>,
    asset_symbol: String,
) -> Result<Address, Error> {
    let mut salt = Bytes::new(e);
    salt.append(&asset_symbol.to_xdr(e));
    // owner is the admin of this orchestrator contract
    let owner = e.current_contract_address()
    let salt = e.crypto().sha256(&salt);
    let address = e.deployer()
        .with_current_contract(salt)
        .deploy_v2(token_wasm_hash.clone(), ())
    // Set the owner of the contract to this orchestrator
    let _ = xasset::Client::new(e, &address)
        .try_admin_set(&owner)
        .map_err(|_| Error::InitFailed)?;
    Ok(address)
}
