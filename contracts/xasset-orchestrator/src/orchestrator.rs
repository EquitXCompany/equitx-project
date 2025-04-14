use crate::{
    error::Error,
    token::{create_contract, xasset},
    Contract,
};
use loam_sdk::{
    loamstorage,
    soroban_sdk::{
        self, contracttype, env, token, Address, BytesN, InstanceItem, IntoVal, Lazy, LoamKey,
        PersistentMap, String, Symbol,
    },
    subcontract,
};

#[loamstorage]
pub struct Storage {
    /// A map of deployed asset contracts to their asset symbol.
    /// This is used to check if a contract is a valid asset contract
    /// and to get the asset symbol from the contract address.
    /// The key is the asset symbol, the value is the asset contract address.
    assets: PersistentMap<String, Address>,
    /// The xasset wasm
    wasm_hash: InstanceItem<BytesN<32>>,
}

#[subcontract]
pub trait IsOrchestratorTrait {
    fn initialize(&mut self, wasm_hash: BytesN<32>) -> Result<(), Error>;
    fn deploy_asset(
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
    ) -> Result<(), Error>;
    fn get_asset_contract(&self, asset_symbol: String) -> Result<Address, Error>;
}

impl IsOrchestratorTrait for Storage {
    fn initialize(&mut self, wasm_hash: BytesN<32>) -> Result<(), Error> {
        self.wasm_hash.set(&wasm_hash);
        Ok(())
    }
    fn deploy_asset(
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
    ) -> Result<(), Error> {
        let env = env();
        let asset_contract = token::Client::new(&env, &asset_contract);
        let wasm_hash = self.wasm_hash.get().unwrap();

        // Check if the asset contract is a valid asset contract
        if asset_contract.symbol() != symbol {
            return Err(Error::InvalidAssetContract);
        }

        // Check if the asset contract is already deployed
        if self.assets.has(symbol) {
            return Err(Error::AssetAlreadyDeployed);
        }

        let deployed_contract = create_contract(env, &wasm_hash, symbol.clone());
        // self.assets.set(symbol, asset_contract.address())?;

        // // Initialize the asset contract
        // asset_contract.initialize(
        //     &pegged_asset,
        //     &min_collat_ratio,
        //     &name,
        //     &symbol,
        //     &decimals,
        //     &annual_interest_rate,
        // )?;

        Ok(())
    }
    fn get_asset_contract(&self, asset_symbol: String) -> Result<Address, Error> {
        if !self.assets.has(asset_symbol.clone()) {
            return Err(Error::NoSuchAsset);
        }
        return Ok(self.assets.get(asset_symbol.clone()).unwrap());
    }
}
