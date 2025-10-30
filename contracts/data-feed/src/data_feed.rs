use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, panic_with_error, symbol_short, vec,
    Address, BytesN, Env, Map, Symbol, Vec,
};

use crate::sep40::{IsSep40, IsSep40Admin};
use crate::{Asset, PriceData};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    /// Asset not found
    AssetNotFound = 1,

    /// Asset already exists
    AssetAlreadyExists = 2,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub struct DataFeedStorage {
    // key is Asset, value is Map<timestamp, price>
    // asset_prices: PersistentMap<Asset, Map<u64, i128>>,
    // assets available in the contract
    assets: Vec<Asset>,
    base: Asset,
    decimals: u32,
    resolution: u32,
    last_timestamp: u64,
}

impl DataFeedStorage {
    /// Get current state of the contract
    pub fn get_state(env: &Env) -> DataFeedStorage {
        env.storage().instance().get(&STORAGE).unwrap()
    }

    pub fn set_state(env: &Env, storage: &DataFeedStorage) {
        env.storage().instance().set(&STORAGE, &storage);
    }
}

const ADMIN_KEY: Symbol = symbol_short!("ADMIN");
const STORAGE: Symbol = symbol_short!("STORAGE");

#[contracttype]
enum DataKey {
    Prices(Asset),
}

fn new_asset_prices_map(env: &Env) -> Map<u64, i128> {
    Map::new(env)
}

#[contract]
pub struct DataFeed;

#[contractimpl]
impl DataFeed {
    // #[must_use]
    pub fn __constructor(
        env: &Env,
        // Admin of the contract
        admin: Address,
        // The assets supported by the contract.
        assets: Vec<Asset>,
        // The base asset for the prices.
        base: Asset,
        // The number of decimals for the prices.
        decimals: u32,
        // The resolution of the prices.
        resolution: u32,
    ) -> Result<(), Error> {
        env.storage().instance().set(&ADMIN_KEY, &admin);
        let feed = DataFeedStorage {
            // asset_prices: PersistentMap::new(env),
            assets: assets.clone(),
            base,
            decimals,
            resolution,
            last_timestamp: 0,
        };
        DataFeedStorage::set_state(env, &feed);
        let new_map: Map<u64, i128> = Map::new(env);
        for asset in assets.into_iter() {
            env.storage()
                .persistent()
                .set(&DataKey::Prices(asset), &new_map);
        }
        Ok(())
    }

    fn require_admin(env: &Env) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&ADMIN_KEY)
            .expect("Admin must be set");
        admin.require_auth();
    }

    /// Upgrade the contract to new wasm
    pub fn upgrade(env: &Env, new_wasm_hash: BytesN<32>) {
        Self::require_admin(env);
        env.deployer().update_current_contract_wasm(new_wasm_hash);
    }

    fn get_asset_price(env: &Env, asset_id: Asset) -> Option<Map<u64, i128>> {
        env.storage().persistent().get(&DataKey::Prices(asset_id))
    }

    fn set_asset_price_internal(env: &Env, asset_id: Asset, price: i128, timestamp: u64) {
        let mut asset = Self::get_asset_price(env, asset_id.clone()).unwrap_or_else(|| {
            panic_with_error!(env, Error::AssetNotFound);
        });
        asset.set(timestamp, price);
        env.storage()
            .persistent()
            .set(&DataKey::Prices(asset_id), &asset);
    }
}

#[contractimpl]
impl IsSep40Admin for DataFeed {
    fn add_assets(env: &Env, assets: Vec<Asset>) {
        Self::require_admin(env);
        let current_storage = DataFeedStorage::get_state(env);
        let mut assets_vec = current_storage.assets;
        for asset in assets {
            if assets_vec.contains(&asset) {
                panic_with_error!(env, Error::AssetAlreadyExists);
            }
            assets_vec.push_back(asset.clone());
            env.storage()
                .persistent()
                .set(&DataKey::Prices(asset), &new_asset_prices_map(env));
        }
        DataFeedStorage::set_state(
            env,
            &DataFeedStorage {
                assets: assets_vec,
                ..current_storage
            },
        );
    }

    fn set_asset_price(env: &Env, asset_id: Asset, price: i128, timestamp: u64) {
        Self::require_admin(env);
        Self::set_asset_price_internal(env, asset_id, price, timestamp);
    }
}

#[contractimpl]
impl IsSep40 for DataFeed {
    fn assets(env: &Env) -> Vec<Asset> {
        DataFeedStorage::get_state(env).assets.clone()
    }

    fn base(env: &Env) -> Asset {
        DataFeedStorage::get_state(env).base.clone()
    }

    fn decimals(env: &Env) -> u32 {
        DataFeedStorage::get_state(env).decimals
    }

    fn lastprice(env: &Env, asset: Asset) -> Option<PriceData> {
        let Some(asset) = Self::get_asset_price(env, asset.clone()) else {
            panic_with_error!(env, Error::AssetNotFound);
        };
        let timestamp = asset.keys().last()?;
        let price = asset.get(timestamp)?;
        Some(PriceData { price, timestamp })
    }

    fn price(env: &Env, asset: Asset, timestamp: u64) -> Option<PriceData> {
        let Some(asset) = Self::get_asset_price(env, asset.clone()) else {
            panic_with_error!(env, Error::AssetNotFound);
        };
        let price = asset.get(timestamp)?;
        Some(PriceData { price, timestamp })
    }

    fn prices(env: &Env, asset: Asset, records: u32) -> Option<Vec<PriceData>> {
        let Some(asset) = Self::get_asset_price(env, asset.clone()) else {
            panic_with_error!(env, Error::AssetNotFound);
        };
        let mut prices = vec![env];
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

    fn resolution(env: &Env) -> u32 {
        DataFeedStorage::get_state(env).resolution
    }
}
