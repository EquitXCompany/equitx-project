use crate::{error::Error, Contract};
use loam_sdk::{
    loamstorage,
    soroban_sdk::{
        self, env, xdr::ToXdr, Address, Bytes, BytesN, Env, InstanceItem, Lazy, LoamKey,
        PersistentMap, String, Symbol,
    },
    subcontract,
};
use loam_subcontract_core::Core;

#[loamstorage]
pub struct Storage {
    /// XLM SAC contract address; initialized and then passed
    /// to deployed xasset contracts
    xlm_sac: InstanceItem<Address>,
    /// A map of deployed asset contracts to their asset symbol.
    /// This is used to check if a contract is a valid asset contract
    /// and to get the asset symbol from the contract address.
    /// The key is the asset symbol, the value is the asset contract address.
    assets: PersistentMap<String, Address>,
}

#[subcontract]
pub trait IsOrchestratorTrait {
    fn init(&mut self, xlm_sac: Address) -> Result<(), Error>;
    fn deploy_asset_contract(
        &mut self,
        xlm_sac: Address,
        xlm_contract: Address,
        asset_contract: Address,
        pegged_asset: Symbol,
        min_collat_ratio: u32,
        name: String,
        symbol: String,
        decimals: u32,
        annual_interest_rate: u32,
    ) -> Result<Address, Error>;
    fn get_asset_contract(&self, asset_symbol: String) -> Result<Address, Error>;
    // Manually set an asset symbol to an existing contract address
    fn set_asset_contract(
        &mut self,
        asset_symbol: String,
        asset_contract: Address,
    ) -> Result<(), Error>;
    // Manually set an existing asset symbol to an existing contract address. Dangerous!
    // This should only be used when needing to update an existing symbol's contract.
    fn set_existing_asset_contract(
        &mut self,
        asset_symbol: String,
        asset_contract: Address,
    ) -> Result<(), Error>;
}

impl IsOrchestratorTrait for Storage {
    fn init(&mut self, xlm_sac: Address) -> Result<(), Error> {
        self.xlm_sac.set(&xlm_sac);
        Ok(())
    }

    fn deploy_asset_contract(
        &mut self,
        _xlm_sac: Address,
        xlm_contract: Address,
        asset_contract: Address,
        pegged_asset: Symbol,
        min_collat_ratio: u32,
        name: String,
        symbol: String,
        decimals: u32,
        annual_interest_rate: u32,
    ) -> Result<Address, Error> {
        let env = env();
        Contract::require_auth();
        // Check if the asset contract is already deployed
        if self.assets.has(symbol.clone()) {
            return Err(Error::AssetAlreadyDeployed);
        }

        // Upload the xasset wasm to prep for deploy
        let wasm_hash = env.deployer().upload_contract_wasm(xasset::WASM);

        // Deploy the contract, salting with the symbol
        let deployed_contract = create_contract(env, &wasm_hash, symbol.clone());

        let contract_address = deployed_contract.map_err(|_| Error::InitFailed)?;
        // Create a client instance for this contract so we can initialize it
        let client = xasset::Client::new(env, &contract_address);

        // Initialize the contract
        client.cdp_init(
            &self.xlm_sac.get().unwrap(),
            &xlm_contract,
            &asset_contract,
            &pegged_asset,
            &min_collat_ratio,
            &name,
            &symbol,
            &decimals,
            &annual_interest_rate,
        );

        // Store the deployed contract address in the assets map
        self.assets.set(symbol.clone(), &contract_address);

        Ok(contract_address)
    }

    fn get_asset_contract(&self, asset_symbol: String) -> Result<Address, Error> {
        if !self.assets.has(asset_symbol.clone()) {
            return Err(Error::NoSuchAsset);
        }
        return Ok(self.assets.get(asset_symbol.clone()).unwrap());
    }

    fn set_asset_contract(
        &mut self,
        asset_symbol: String,
        asset_contract: Address,
    ) -> Result<(), Error> {
        Contract::require_auth();
        if self.assets.has(asset_symbol.clone()) {
            return Err(Error::AssetAlreadyDeployed);
        }
        self.assets.set(asset_symbol.clone(), &asset_contract);
        Ok(())
    }

    fn set_existing_asset_contract(
        &mut self,
        asset_symbol: String,
        asset_contract: Address,
    ) -> Result<(), Error> {
        Contract::require_auth();
        self.assets.set(asset_symbol.clone(), &asset_contract);
        Ok(())
    }
}

pub mod xasset {
    use loam_sdk::soroban_sdk;
    loam_sdk::soroban_sdk::contractimport!(
        file = "../../target/wasm32-unknown-unknown/release/xasset.wasm",
    );
}

pub fn create_contract(
    e: &Env,
    token_wasm_hash: &BytesN<32>,
    asset_symbol: String,
) -> Result<Address, Error> {
    let mut salt = Bytes::new(e);
    salt.append(&asset_symbol.to_xdr(e));
    // owner is the admin of this orchestrator contract
    // TODO; in the future, the orchestrator (C... address) should own and administer all asset contracts
    let owner = Contract::admin_get().expect("No admin! Call 'admin_set' first.");
    let salt = e.crypto().sha256(&salt);
    let address = e
        .deployer()
        .with_current_contract(salt)
        .deploy_v2(token_wasm_hash.clone(), ());
    // Set the owner of the contract to this orchestrator
    let _ = xasset::Client::new(e, &address)
        .try_admin_set(&owner)
        .map_err(|_| Error::InitFailed)?;
    Ok(address)
}
