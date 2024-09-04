use crate::{Asset, PriceData};
use loam_sdk::{
    soroban_sdk::{Lazy, Vec},
    subcontract,
};

#[subcontract]
/// SEP40 extension implemented by Reflector Network: https://reflector.network/docs/interface
pub trait IsReflector {
    /// Get the most recent price update timestamp
    fn last_timestamp(&self) -> u64;

    /// Get the most recent cross price record for the pair of assets
    fn x_last_price(&self, base_asset: Asset, quote_asset: Asset) -> Option<PriceData>;

    /// Get the cross price for the pair of assets at specific timestamp
    fn x_price(&self, base_asset: Asset, quote_asset: Asset, timestamp: u64) -> Option<PriceData>;

    /// Get last N cross price records of for the pair of assets
    fn x_prices(
        &self,
        base_asset: Asset,
        quote_asset: Asset,
        records: u32,
    ) -> Option<Vec<PriceData>>;

    /// Get the time-weighted average price for the given asset over N recent records
    fn twap(&self, asset: Asset, records: u32) -> Option<i128>;

    /// Get the time-weighted average cross price for the given asset pair over N recent records
    fn x_twap(&self, base_asset: Asset, quote_asset: Asset, records: u32) -> Option<i128>;

    /// Get historical records retention period, in seconds
    fn period(&self) -> Option<u64>;

    // Part of Reflector Network implementation, but omitted here because this is implemented via
    // the SmartDeploy / Loam Deploy Wasm package management infrastructure.
    // /// Get contract protocol version
    // fn version(&self, ) -> u32;

    // Part of the Reflector Network implementation, but ommitted here because `get_admin` is
    // already implemented by the `Core` subcontract.
    // /// Get contract admin address
    // fn admin(&self, ) -> Option<Address>;
}

#[subcontract]
/// The Reflector contract is a superset of SEP40, and needs some of its own data, such as
/// `retention_period`, in order to work.
pub trait IsReflectorAdmin {
    /// Sets history retention period for the prices. Can be invoked only by the admin account.
    ///
    /// # Arguments
    ///
    /// * `period` - History retention period (in seconds)
    ///
    /// # Panics
    ///
    /// Panics if the caller doesn't match admin address, or if the period/version is invalid
    fn set_retention_period(&mut self, period: u64);
}
