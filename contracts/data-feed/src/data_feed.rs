use loam_sdk::loamstorage;
use loam_sdk::soroban_sdk::PersistentItem;
use loam_sdk::{
    soroban_sdk::{self, env, InstanceItem, LoamKey, Map, PersistentMap, Vec},
    vec,
};

use crate::sep40::{IsSep40, IsSep40Admin};
use crate::Contract;
use crate::{Asset, PriceData};

#[loamstorage]
#[derive(Default)]
pub struct DataFeed {
    // key is Asset, value is Map<timestamp, price>
    asset_prices: PersistentMap<Asset, Map<u64, i128>>,
    assets: PersistentItem<Vec<Asset>>,
    base: InstanceItem<Asset>,
    decimals: InstanceItem<u32>,
    resolution: InstanceItem<u32>,
    last_timestamp: InstanceItem<u64>,
}

impl DataFeed {
    #[must_use]
    pub fn new(
        // The asset_prices supported by the contract.
        assets: Vec<Asset>,
        // The base asset for the prices.
        base: Asset,
        // The number of decimals for the prices.
        decimals: u32,
        // The resolution of the prices.
        resolution: u32,
    ) -> Self {
        let mut feed = DataFeed::default();
        feed.assets.set(&assets);
        for asset in assets.into_iter() {
            feed.asset_prices.set(asset, &Map::new(env()));
        }
        feed.base.set(&base);
        feed.decimals.set(&decimals);
        feed.resolution.set(&resolution);
        feed
    }
}

impl IsSep40Admin for DataFeed {
    fn sep40_init(&self, __assets: Vec<Asset>, __base: Asset, __decimals: u32, __resolution: u32) {
        Contract::require_auth();
        // DataFeed::set_lazy(DataFeed::new(assets, base, decimals, resolution));
    }

    fn add_assets(&mut self, assets: Vec<Asset>) {
        Contract::require_auth();
        let env = env();
        let mut assets_vec = self.assets.get().expect("Assets must be initialized").clone();
        for asset in assets {
            assets_vec.push_back(asset.clone());
            self.asset_prices.set(asset, &Map::new(env))
        }
        self.assets.set(&assets_vec);
    }

    fn set_asset_price(&mut self, asset_id: Asset, price: i128, timestamp: u64) {
        Contract::require_auth();
        let Some(mut asset) = self.asset_prices.get(asset_id.clone()) else {
            panic!("Asset not found");
        };
        asset.set(timestamp, price);
        self.asset_prices.set(asset_id, &asset);
    }
}

impl IsSep40 for DataFeed {
    fn assets(&self) -> loam_sdk::soroban_sdk::Vec<Asset> {
        self.assets.get().expect("Assets must be initialized").clone()
    }

    fn base(&self) -> Asset {
        self.base
            .get()
            .expect("Base needs to be initialized")
            .clone()
    }

    fn decimals(&self) -> u32 {
        self.decimals
            .get()
            .expect("Decimals needs to be initialized")
            .clone()
    }

    fn lastprice(&self, asset: Asset) -> Option<PriceData> {
        let asset = self.asset_prices.get(asset.clone())?;
        let timestamp = asset.keys().last()?;
        let price = asset.get(timestamp)?;
        Some(PriceData { price, timestamp })
    }

    fn price(&self, asset: Asset, timestamp: u64) -> Option<PriceData> {
        let price = self.asset_prices.get(asset)?.get(timestamp)?;
        Some(PriceData { price, timestamp })
    }

    fn prices(&self, asset: Asset, records: u32) -> Option<Vec<PriceData>> {
        let asset = self.asset_prices.get(asset)?;
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
            .get()
            .expect("Resolution needs to be initialized")
            .clone()
    }
}
