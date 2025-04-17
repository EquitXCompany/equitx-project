use crate::{error::Error, Contract};
use loam_sdk::{
    import_contract, loamstorage,
    soroban_sdk::{
        self, env, xdr::ToXdr, Address, Bytes, BytesN, Env, InstanceItem, Lazy, LoamKey,
        PersistentMap, String, Symbol,
    },
    subcontract,
};
use loam_subcontract_core::Core;

import_contract!(xasset);

#[loamstorage]
pub struct Storage {
    /// Wasm hash of the xasset contract
    wasm_hash: InstanceItem<BytesN<32>>,
    /// XLM SAC contract address; initialized and then passed
    /// to deployed xasset contracts
    xlm_sac: InstanceItem<Address>,
    /// XLM oracle contract, initialized and then passed
    /// to deployed xasset contracts
    xlm_contract: InstanceItem<Address>,
    /// A map of deployed asset contracts to their asset symbol.
    /// This is used to check if a contract is a valid asset contract
    /// and to get the asset symbol from the contract address.
    /// The key is the asset symbol, the value is the asset contract address.
    assets: PersistentMap<String, Address>,
}

#[subcontract]
pub trait IsOrchestratorTrait {
    fn init(
        &mut self,
        xlm_sac: Address,
        xlm_contract: Address,
        xasset_wasm_hash: BytesN<32>,
    ) -> Result<(), Error>;
    #[allow(clippy::too_many_arguments)]
    fn deploy_asset_contract(
        &mut self,
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
    fn init(
        &mut self,
        xlm_sac: Address,
        xlm_contract: Address,
        xasset_wasm_hash: BytesN<32>,
    ) -> Result<(), Error> {
        Contract::require_auth();
        self.xlm_sac.set(&xlm_sac);
        self.xlm_contract.set(&xlm_contract);
        self.wasm_hash.set(&xasset_wasm_hash);
        Ok(())
    }

    #[allow(clippy::too_many_arguments)]
    fn deploy_asset_contract(
        &mut self,
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

        let wasm_hash = match self.wasm_hash.get() {
            Some(inner) => inner,
            None => {
                return Err(Error::ContractNotInitalized);
            }
        };

        // Deploy the contract, salting with the symbol
        let deployed_contract = create_contract(env, &wasm_hash, symbol.clone());

        let contract_address = deployed_contract.map_err(|_| Error::XAssetDeployFailed)?;
        // Create a client instance for this contract so we can initialize it
        let client = xasset::Client::new(env, &contract_address);

        // Initialize the contract
        client.cdp_init(
            &self.xlm_sac.get().unwrap(),
            &self.xlm_contract.get().unwrap(),
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
        self.assets.get(asset_symbol).ok_or(Error::NoSuchAsset)
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
        .map_err(|_| Error::AssetAdminSetFailed)?;
    Ok(address)
}
