use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, xdr::ToXdr, Address, Bytes, BytesN, Env, Map, String, Symbol
};

use crate::error::Error;

pub mod xasset {
    soroban_sdk::contractimport!(file = "../../target/wasm32v1-none/release/xasset.wasm");
}

const ADMIN_KEY: Symbol = symbol_short!("ADMIN");
const STORAGE: Symbol = symbol_short!("STORAGE");

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Storage {
    /// Wasm hash of the xasset contract
    pub wasm_hash: BytesN<32>,
    /// XLM SAC contract address; initialized and then passed
    /// to deployed xasset contracts
    pub xlm_sac: Address,
    /// XLM oracle contract, initialized and then passed
    /// to deployed xasset contracts
    pub xlm_contract: Address,
    /// A map of deployed asset contracts to their asset symbol.
    /// This is used to check if a contract is a valid asset contract
    /// and to get the asset symbol from the contract address.
    /// The key is the asset symbol, the value is the asset contract address.
    pub assets: Map<String, Address>,
}

#[contract]
pub struct OrchestratorContract;

// #[subcontract]
// pub trait IsOrchestratorTrait {
//     fn init(
//         &mut self,
//         xlm_sac: loam_sdk::soroban_sdk::Address,
//         xlm_contract: loam_sdk::soroban_sdk::Address,
//         xasset_wasm_hash: loam_sdk::soroban_sdk::BytesN<32>,
//     ) -> Result<(), Error>;
//     fn update_xasset_wasm_hash(
//         &mut self,
//         xasset_wasm_hash: loam_sdk::soroban_sdk::BytesN<32>,
//     ) -> Result<loam_sdk::soroban_sdk::BytesN<32>, Error>;
//     #[allow(clippy::too_many_arguments)]
//     fn deploy_asset_contract(
//         &mut self,
//         asset_contract: loam_sdk::soroban_sdk::Address,
//         pegged_asset: loam_sdk::soroban_sdk::Symbol,
//         min_collat_ratio: u32,
//         name: loam_sdk::soroban_sdk::String,
//         symbol: loam_sdk::soroban_sdk::String,
//         decimals: u32,
//         annual_interest_rate: u32,
//     ) -> Result<loam_sdk::soroban_sdk::Address, Error>;
//     fn get_asset_contract(
//         &self,
//         asset_symbol: loam_sdk::soroban_sdk::String,
//     ) -> Result<loam_sdk::soroban_sdk::Address, Error>;
//     // Manually set an asset symbol to an existing contract address
//     fn set_asset_contract(
//         &mut self,
//         asset_symbol: loam_sdk::soroban_sdk::String,
//         asset_contract: loam_sdk::soroban_sdk::Address,
//     ) -> Result<(), Error>;
//     // Manually set an existing asset symbol to an existing contract address. Dangerous!
//     // This should only be used when needing to update an existing symbol's contract.
//     fn set_existing_asset_contract(
//         &mut self,
//         asset_symbol: loam_sdk::soroban_sdk::String,
//         asset_contract: loam_sdk::soroban_sdk::Address,
//     ) -> Result<(), Error>;
//     // Upgrade an existing asset contract to the xasset wasm of the orchestrator.
//     fn upgrade_existing_asset_contract(
//         &mut self,
//         asset_symbol: loam_sdk::soroban_sdk::String,
//     ) -> Result<loam_sdk::soroban_sdk::Address, Error>;
// }

#[contractimpl]
impl OrchestratorContract {
    pub fn __constructor(
        env: &Env,
        xlm_sac: Address,
        xlm_contract: Address,
        xasset_wasm_hash: BytesN<32>,
    ) -> Result<(), Error> {
        Self::require_admin(env);
        env.storage().instance().set(
            &STORAGE,
            &Storage {
                wasm_hash: xasset_wasm_hash,
                xlm_sac,
                xlm_contract,
                assets: Map::new(env),
            },
        );
        Ok(())
    }

    pub fn update_xasset_wasm_hash(
        env: &Env,
        xasset_wasm_hash: BytesN<32>,
    ) -> Result<BytesN<32>, Error> {
        Self::require_admin(env);
        let mut storage = Self::get_state(env.clone());
        storage.wasm_hash = xasset_wasm_hash.clone();
        env.storage()
            .instance()
            .set(&STORAGE, &storage);
        Ok(xasset_wasm_hash)
    }

    #[allow(clippy::too_many_arguments)]
    pub fn deploy_asset_contract(
        env: &Env,
        asset_contract: Address,
        pegged_asset: Symbol,
        min_collat_ratio: u32,
        name: String,
        symbol: String,
        decimals: u32,
        annual_interest_rate: u32,
    ) -> Result<Address, Error> {
        Self::require_admin(env);
        let mut storage = Self::get_state(env.clone());
        // Check if the asset contract is already deployed
        if storage.assets.contains_key(symbol.clone()) {
            return Err(Error::AssetAlreadyDeployed);
        }

        // Deploy the contract, salting with the symbol
        let deployed_contract = create_contract(env, &storage.wasm_hash, symbol.clone());

        let contract_address = deployed_contract.map_err(|_| Error::XAssetDeployFailed)?;
        // Create a client instance for this contract so we can initialize it
        let client = xasset::Client::new(env, &contract_address);

        // Initialize the contract
        client.cdp_init(
            &storage.xlm_sac,
            &storage.xlm_contract,
            &asset_contract,
            &pegged_asset,
            &min_collat_ratio,
            &name,
            &symbol,
            &decimals,
            &annual_interest_rate,
        );

        // Store the deployed contract address in the assets map
        storage.assets.set(symbol, contract_address.clone());
        env.storage().instance().set(&STORAGE, &storage);

        Ok(contract_address)
    }

    pub fn get_asset_contract(env: &Env, asset_symbol: String) -> Result<Address, Error> {
        let storage = Self::get_state(env.clone());
        storage.assets.get(asset_symbol).ok_or(Error::NoSuchAsset)
    }

    // Manually set a new asset symbol to a contract address. Dangerous!
    // This should only be needed if there is a change in storage, or a situation where
    // manual intervention is required.
    pub fn set_asset_contract(
        env: &Env,
        asset_symbol: String,
        asset_contract: Address,
    ) -> Result<(), Error> {
        Self::require_admin(env);
        let mut storage = Self::get_state(env.clone());
        if storage.assets.contains_key(asset_symbol.clone()) {
            return Err(Error::AssetAlreadyDeployed);
        }
        storage.assets.set(asset_symbol, asset_contract);
        env.storage().instance().set(&STORAGE, &storage);
        Ok(())
    }

    // Admin can manually set an existing asset symbol to an existing contract address.
    pub fn set_existing_asset_contract(
        env: &Env,
        asset_symbol: String,
        asset_contract: Address,
    ) -> Result<(), Error> {
        Self::require_admin(env);
        let mut storage = Self::get_state(env.clone());
        storage.assets.set(asset_symbol, asset_contract);
        env.storage().instance().set(&STORAGE, &storage);
        Ok(())
    }

    pub fn upgrade_existing_asset_contract(
        env: &Env,
        asset_symbol: String,
    ) -> Result<Address, Error> {
        Self::require_admin(env);
        let storage = Self::get_state(env.clone());
        if !storage.assets.contains_key(asset_symbol.clone()) {
            return Err(Error::NoSuchAsset);
        }
        let asset_contract = storage.assets.get(asset_symbol).unwrap();
        let client = xasset::Client::new(env, &asset_contract);
        let _ = client
            .try_redeploy(&storage.wasm_hash)
            .map_err(|_| Error::AssetUpgradeFailed)?;
        Ok(asset_contract)
    }

    /// Get current state of the contract
    pub fn get_state(env: Env) -> Storage {
        env.storage().instance().get(&STORAGE).unwrap()
    }

    /// Upgrade the contract to new wasm. Only callable by admin.
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

pub fn create_contract(
    env: &Env,
    token_wasm_hash: &BytesN<32>,
    asset_symbol: String,
) -> Result<Address, Error> {
    let mut salt = Bytes::new(env);
    salt.append(&asset_symbol.to_xdr(env));
    // owner is the admin of this orchestrator contract
    // TODO; in the future, the orchestrator (C... address) should own and administer all asset contracts
    let owner = OrchestratorContract::admin(env).unwrap();
    let salt = env.crypto().sha256(&salt);
    let address = env
        .deployer()
        .with_current_contract(salt)
        .deploy_v2(token_wasm_hash.clone(), ());
    // Set the owner of the contract to this orchestrator
    let _ = xasset::Client::new(env, &address)
        .try_admin_set(&owner)
        .map_err(|_| Error::AssetAdminSetFailed)?;
    Ok(address)
}
