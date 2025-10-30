#![cfg(test)]
extern crate std;
use crate::data_feed::{DataFeed, DataFeedClient};
use crate::Asset;

use soroban_sdk::{testutils::Address as _, Address, Env};
use soroban_sdk::{Symbol, Vec};

fn create_datafeed_contract<'a>(e: &Env) -> DataFeedClient<'a> {
    let asset_xlm: Asset = Asset::Other(Symbol::new(e, "XLM"));
    let asset_xusd: Asset = Asset::Other(Symbol::new(e, "XUSD"));
    let asset_vec = Vec::from_array(e, [asset_xlm.clone(), asset_xusd.clone()]);
    let admin = Address::generate(&e);
    let contract_id = e.register(DataFeed, (admin, asset_vec, asset_xusd, 14u32, 300u32));

    DataFeedClient::new(e, &contract_id)
}

#[test]
fn test_data_feed() {
    let e = Env::default();
    e.mock_all_auths();

    let asset_xlm: Asset = Asset::Other(Symbol::new(&e, "XLM"));
    let asset_xusd: Asset = Asset::Other(Symbol::new(&e, "XUSD"));
    let asset_xeur: Asset = Asset::Other(Symbol::new(&e, "XEUR"));
    let datafeed = create_datafeed_contract(&e);

    // Test add_assets
    datafeed.add_assets(&Vec::from_array(&e, [asset_xeur.clone()]));

    // Test assets
    let assets = datafeed.assets();
    assert_eq!(assets.len(), 3);
    assert!(assets.contains(&asset_xlm));
    assert!(assets.contains(&asset_xusd));
    assert!(assets.contains(&asset_xeur));

    // Test base
    assert_eq!(datafeed.base(), asset_xusd);

    // Test decimals
    assert_eq!(datafeed.decimals(), 14);

    // Test resolution
    assert_eq!(datafeed.resolution(), 300);

    // Test set_asset_price and price
    let timestamp1: u64 = 1_000_000_000;
    let price1 = 10_000_000;
    datafeed.set_asset_price(&asset_xlm, &price1, &timestamp1);
    assert_eq!(
        datafeed.price(&asset_xlm, &timestamp1).unwrap().price,
        price1
    );

    // Test lastprice
    let last_price = datafeed.lastprice(&asset_xlm).unwrap();
    assert_eq!(last_price.price, price1);
    assert_eq!(last_price.timestamp, timestamp1);

    // Test prices (multiple records)
    let timestamp2: u64 = 1_000_001_000;
    let price2 = 10_500_000;
    datafeed.set_asset_price(&asset_xlm, &price2, &timestamp2);

    let prices = datafeed.prices(&asset_xlm, &2).unwrap();
    assert_eq!(prices.len(), 2);
    assert_eq!(prices.get(0).unwrap().price, price2);
    assert_eq!(prices.get(0).unwrap().timestamp, timestamp2);
    assert_eq!(prices.get(1).unwrap().price, price1);
    assert_eq!(prices.get(1).unwrap().timestamp, timestamp1);

    // Test prices with limit
    let prices_limited = datafeed.prices(&asset_xlm, &1).unwrap();
    assert_eq!(prices_limited.len(), 1);
    assert_eq!(prices_limited.get(0).unwrap().price, price2);
    assert_eq!(prices_limited.get(0).unwrap().timestamp, timestamp2);

    // Test non-existent asset
    let non_existent_asset = Asset::Other(Symbol::new(&e, "NON_EXISTENT"));
    assert!(datafeed.lastprice(&non_existent_asset).is_none());
    assert!(datafeed.price(&non_existent_asset, &timestamp1).is_none());
    assert!(datafeed.prices(&non_existent_asset, &1).is_none());

    // Test price at non-existent timestamp
    let non_existent_timestamp: u64 = 2_000_000_000;
    assert!(datafeed
        .price(&asset_xlm, &non_existent_timestamp)
        .is_none());
}
