use crate::{Asset, PriceData};
use soroban_sdk::{Env, Vec};

/// Oracle Consumer Interface from https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0040.md
pub trait IsSep40 {
    /// Return all assets quoted by the price feed
    fn assets(env: &Env) -> Vec<Asset>;

    /// Return the base asset the price is reported in
    fn base(env: &Env) -> Asset;

    /// Return the number of decimals for all assets quoted by the oracle
    fn decimals(env: &Env) -> u32;

    /// Get the most recent price for an asset
    fn lastprice(env: &Env, asset: Asset) -> Option<PriceData>;

    /// Get price in base asset at specific timestamp
    fn price(env: &Env, asset: Asset, timestamp: u64) -> Option<PriceData>;

    /// Get last N price records
    fn prices(env: &Env, asset: Asset, records: u32) -> Option<Vec<PriceData>>;

    /// Return default tick period timeframe (in milliseconds)
    fn resolution(env: &Env) -> u32;
}

/// While not part of the official consumer-facing spec, every SEP40 contract will need
/// to provide a way for Oracles to update the contract with new prices. This is an interface for
/// that, and also for other administrative functions, like initializing the contract.
pub trait IsSep40Admin {
    /// Adds given assets to the contract quoted assets list. Can be invoked only by the admin account.
    ///
    /// # Panics
    ///
    /// Panics if the caller doesn't match admin, or if the assets are already added
    fn add_assets(env: &Env, assets: Vec<Asset>);

    /// Record new price feed history snapshot. Can be invoked only by the admin account.
    ///
    /// # Panics
    ///
    /// Panics if the caller doesn't match admin address
    fn set_asset_price(env: &Env, asset: Asset, price: i128, timestamp: u64);
}
