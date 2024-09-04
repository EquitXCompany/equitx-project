use loam_sdk::{
    soroban_sdk::{self, contracttype, env, Lazy, Map, Vec},
    vec, IntoKey,
};

use crate::sep40::{IsSep40, IsSep40Admin};
use crate::Contract;
use crate::{Asset, PriceData};

#[contracttype]
#[derive(IntoKey)]
pub struct DataFeed {
    // key is Asset, value is Map<timestamp, price>
    assets: Map<Asset, Map<u64, i128>>,
    base: Asset,
    decimals: u32,
    resolution: u32,
    last_timestamp: u64,
}

impl DataFeed {
    #[must_use]
    pub fn new(
        // The assets supported by the contract.
        assets: Vec<Asset>,
        // The base asset for the prices.
        base: Asset,
        // The number of decimals for the prices.
        decimals: u32,
        // The resolution of the prices.
        resolution: u32,
    ) -> Self {
        let mut asset_map = Map::new(env());
        for asset in assets.into_iter() {
            asset_map.set(asset, Map::new(env()));
        }
        DataFeed {
            assets: asset_map,
            base,
            decimals,
            resolution,
            last_timestamp: 0,
        }
    }
}

/// Loam SDK currently requires us to implement `Default`. This is nonsense and will be fixed in
/// https://github.com/loambuild/loam/issues/92
impl Default for DataFeed {
    fn default() -> Self {
        DataFeed::new(
            vec![],
            Asset::Stellar(env().current_contract_address()),
            0,
            0,
        )
    }
}

impl IsSep40Admin for DataFeed {
    fn sep40_init(&self, assets: Vec<Asset>, base: Asset, decimals: u32, resolution: u32) {
        Contract::require_auth();
        DataFeed::set_lazy(DataFeed::new(assets, base, decimals, resolution));
    }

    fn add_assets(&mut self, assets: Vec<Asset>) {
        Contract::require_auth();
        let env = env();
        for asset in assets {
            self.assets.set(asset, Map::new(env))
        }
    }

    fn set_asset_price(&mut self, asset_id: Asset, price: i128, timestamp: u64) {
        Contract::require_auth();
        let Some(mut asset) = self.assets.get(asset_id.clone()) else {
            panic!("Asset not found");
        };
        asset.set(timestamp, price);
        self.assets.set(asset_id, asset);
    }
}

impl IsSep40 for DataFeed {
    fn assets(&self) -> loam_sdk::soroban_sdk::Vec<Asset> {
        self.assets.keys()
    }

    fn base(&self) -> Asset {
        self.base.clone()
    }

    fn decimals(&self) -> u32 {
        self.decimals
    }

    fn lastprice(&self, asset: Asset) -> Option<PriceData> {
        let asset = self.assets.get(asset.clone())?;
        let timestamp = asset.keys().last()?;
        let price = asset.get(timestamp)?;
        Some(PriceData { price, timestamp })
    }

    fn price(&self, asset: Asset, timestamp: u64) -> Option<PriceData> {
        let price = self.assets.get(asset)?.get(timestamp)?;
        Some(PriceData { price, timestamp })
    }

    fn prices(&self, asset: Asset, records: u32) -> Option<Vec<PriceData>> {
        let asset = self.assets.get(asset)?;
        let mut prices = vec![];
        asset
            .keys()
            .iter()
            .rev()
            .take(records as usize)
            .for_each(|timestamp| {
                prices.push_back(PriceData {
                    price: asset.get_unchecked(timestamp),
                    timestamp,
                })
            });
        Some(prices)
    }

    fn resolution(&self) -> u32 {
        self.resolution
    }
}
