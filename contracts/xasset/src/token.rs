use loam_sdk::{
    soroban_sdk::{self, contracttype, env, Address, Map, Symbol},
    IntoKey,
};

use crate::data_feed;
use crate::Contract;
use crate::{
    collateralized::{IsCDPAdmin, IsCollateralized, CDP},
    PriceData,
};

#[contracttype]
#[derive(IntoKey)]
pub struct Token {
    /// Oracle contract ID this asset tracks.
    pegged_contract: Address,
    /// Oracle asset ID this asset tracks.
    pegged_asset: Symbol,
    /// basis points; default 110%; updateable by admin
    min_collat_ratio: u32,
    /// each Address can only have one CDP per Asset. Given that you can adjust your CDPs freely, that seems fine?
    cdps: Map<Address, CDP>,
}

/// Loam SDK currently requires us to implement `Default`. This is nonsense and will be fixed in
/// https://github.com/loambuild/loam/issues/92
impl Default for Token {
    fn default() -> Self {
        Token {
            pegged_contract: env().current_contract_address(),
            pegged_asset: Symbol::new(env(), "XLM"),
            min_collat_ratio: 110,
            cdps: Map::new(env()),
        }
    }
}

impl IsCollateralized for Token {
    fn pegged_contract(&self) -> Address {
        self.pegged_contract.clone()
    }
    fn pegged_asset(&self) -> Symbol {
        self.pegged_asset.clone()
    }
    fn minimum_collateralization_ratio(&self) -> u32 {
        self.min_collat_ratio
    }

    fn lastprice(&self) -> Option<PriceData> {
        let env = env();
        let contract = &self.pegged_contract;
        let asset = &self.pegged_asset;
        let client = data_feed::Client::new(env, contract);
        let data_feed::PriceData { price, timestamp } =
            client.lastprice(&data_feed::Asset::Other(asset.clone()))?;
        Some(PriceData { price, timestamp })
    }
    // fn add_collateral(&self, cdp: CDP) -> CDP {
    //     self.cdps.get(address)
    // }
    //
    fn open_cdp(&self, asset_lent: u128) -> CDP {
        // 1. check if sender already has a CDP
        // 2. check that `lastprice` gives collateralization ratio over `min_collat_ratio`
        // 3. transfer attached XLM to... this contract?
        // 4. create CDP
        CDP::new(0, asset_lent)
    }
}

impl IsCDPAdmin for Token {
    fn set_pegged_contract(&mut self, to: Address) {
        Contract::require_auth();
        self.pegged_contract = to;
    }
    fn set_pegged_asset(&mut self, to: Symbol) {
        Contract::require_auth();
        self.pegged_asset = to;
    }
    fn set_min_collat_ratio(&mut self, to: u32) -> u32 {
        Contract::require_auth();
        self.min_collat_ratio = to;
        to
    }
}
