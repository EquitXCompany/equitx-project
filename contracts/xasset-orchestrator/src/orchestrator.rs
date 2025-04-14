use crate::{
    error::Error,
    token::{create_contract, xasset},
    Contract,
};
use loam_sdk::{
    loamstorage,
    soroban_sdk::{
        self, contracttype, env, token, Address, BytesN, Env, InstanceItem, IntoVal, Lazy, LoamKey,
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
}

#[subcontract]
pub trait IsOrchestratorTrait {
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
        // Check if the asset contract is already deployed
        if self.assets.has(symbol.clone()) {
            return Err(Error::AssetAlreadyDeployed);
        }

        // Upload the xasset wasm to prep for deploy
        let wasm_hash = env.deployer().upload_contract_wasm(xasset::WASM);

        // Deploy the contract, salting with the symbol
        let deployed_contract = create_contract(env, &wasm_hash, symbol.clone());
        
        // Create a client instance for this contract so we can initialize it
        let client = xasset::Client::new(env, &deployed_contract.as_ref().unwrap());

        // Initialize the contract
        client.cdp_init(
            &xlm_sac,
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
        self.assets.set(symbol.clone(), &deployed_contract.unwrap());

        Ok(())
    }
    fn get_asset_contract(&self, asset_symbol: String) -> Result<Address, Error> {
        if !self.assets.has(asset_symbol.clone()) {
            return Err(Error::NoSuchAsset);
        }
        return Ok(self.assets.get(asset_symbol.clone()).unwrap());
    }
}

// fn deploy_and_init(
//     owner: &Address,
//     salt: impl IntoVal<Env, BytesN<32>>,
//     wasm_hash: BytesN<32>,
// ) -> Result<Address, Error> {
//     // Deploy the contract using the installed Wasm code with given hash.
//     let address = env()
//         .deployer()
//         .with_current_contract(salt.into_val(env()))
//         .deploy_v2(wasm_hash, ());
//     // Set the owner of the contract to the given owner.
//     let client = xasset::Client::new(env(), &address);
//     client.try_admin_set(owner).map_err(|_| Error::InitFailed)?;
//     Ok(address)
// }
