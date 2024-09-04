use crate::{Asset, PriceData};
use loam_sdk::{
    soroban_sdk::{Lazy, Vec},
    subcontract,
};

#[subcontract]
/// Oracle Consumer Interface from https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0040.md
pub trait IsSep40 {
    /// Return all assets quoted by the price feed
    fn assets(&self) -> loam_sdk::soroban_sdk::Vec<Asset>;

    /// Return the base asset the price is reported in
    fn base(&self) -> Asset;

    /// Return the number of decimals for all assets quoted by the oracle
    fn decimals(&self) -> u32;

    /// Get the most recent price for an asset
    fn lastprice(&self, asset: Asset) -> Option<PriceData>;

    /// Get price in base asset at specific timestamp
    fn price(&self, asset: Asset, timestamp: u64) -> Option<PriceData>;

    /// Get last N price records
    fn prices(&self, asset: Asset, records: u32) -> Option<Vec<PriceData>>;

    /// Return default tick period timeframe (in milliseconds)
    fn resolution(&self) -> u32;
}

#[subcontract]
/// While not part of the official consumer-facing spec, every SEP40 contract will need
/// to provide a way for Oracles to update the contract with new prices. This is an interface for
/// that, and also for other administrative functions, like initializing the contract.
pub trait IsSep40Admin {
    /// Initialize the subcontract with the given configuration.
    ///
    /// This assumes that you have already:
    ///
    /// - instantiated the Core subcontract with `admin_set`
    ///
    /// # Panics
    ///
    /// - if `sep40_init` has already been called
    /// - if `admin_set` has not yet been called and there is therefore not yet an admin
    /// - if admin did not sign the transaction envelope
    fn sep40_init(
        &self,
        // The assets supported by the contract.
        assets: Vec<Asset>,
        // The base asset for the prices.
        base: Asset,
        // The number of decimals for the prices.
        decimals: u32,
        // The resolution of the prices.
        resolution: u32,
    );

    /// Adds given assets to the contract quoted assets list. Can be invoked only by the admin account.
    ///
    /// # Panics
    ///
    /// Panics if the caller doesn't match admin, or if the assets are already added
    fn add_assets(&mut self, assets: Vec<Asset>);

    /// Record new price feed history snapshot. Can be invoked only by the admin account.
    ///
    /// # Panics
    ///
    /// Panics if the caller doesn't match admin address
    fn set_asset_price(&mut self, asset: Asset, price: i128, timestamp: u64);
}
