use soroban_sdk::{self, contract, contractimpl, symbol_short, Address, BytesN, Env, Symbol};

use crate::Error;

const ADMIN_KEY: Symbol = symbol_short!("ADMIN");
// #[derive_contract(
//     Collateralized(Token),
//     CDPAdmin(Token),
//     Sep41(Token),
//     Fungible(Token),
//     StabilityPool(Token)
// )]
#[contract]
pub struct XAssetContract;

#[contractimpl]
impl XAssetContract {
    pub fn __constructor(
        env: &Env,
        admin: Address,
        // All the args needed to initialize the Token contract
    ) -> Result<(), Error> {
        Self::set_admin(env, &admin);
        Ok(())
    }

    /// Upgrade the contract to new wasm. Admin-only.
    pub fn upgrade(env: &Env, new_wasm_hash: BytesN<32>) {
        Self::require_admin(env);
        env.deployer().update_current_contract_wasm(new_wasm_hash);
    }

    /// Get the admin address
    fn admin(env: &Env) -> Option<Address> {
        env.storage().instance().get(&ADMIN_KEY)
    }

    /// Set the admin address. Can only be called once.
    fn set_admin(env: &Env, admin: &Address) {
        // Check if admin is already set
        if env.storage().instance().has(&ADMIN_KEY) {
            panic!("admin already set");
        }
        env.storage().instance().set(&ADMIN_KEY, admin);
    }

    fn require_admin(env: &Env) {
        let admin = Self::admin(env).expect("admin not set");
        admin.require_auth();
    }
}