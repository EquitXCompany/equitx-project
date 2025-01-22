#![cfg(test)]
extern crate std;
use crate::{collateralized::CDPStatus, data_feed::Asset, Error, PriceData, SorobanContract__, SorobanContract__Client, Token, CDP};

use crate::data_feed::DataFeed;
use loam_sdk::soroban_sdk::{
    testutils::Address as _, token, Address, Env, String, Symbol
};

fn create_datafeed_contract<'a>(
    e: &Env,
) -> data_feed::SorobanContract__Client<'a> {
    let datafeed = data_feed::SorobanContract__Client::new(e, &e.register_contract(None, SorobanContract__ {}));
    let asset_xlm: Asset = Asset::Other(Symbol::new(e, "XLM"));
    let asset_xusd: Asset = Asset::Other(Symbol::new(e, "XUSD"));
    let asset_vec = Vec::from_array(e, [asset_xlm.clone(), asset_xusd.clone()]);
    let admin = Address::generate(&e);
    datafeed.admin_set(&admin);
    datafeed.sep40_init(&asset_vec, &asset_xusd, &14, &300);
    datafeed
}

fn create_token_contract<'a>(e: &Env) -> SorobanContract__Client<'a> {
    let token = SorobanContract__Client::new(e, &e.register_contract(None, SorobanContract__ {}));
    let xlm_sac = Address::generate(e);
    let xlm_contract = Address::generate(e);
    let asset_contract = Address::generate(e);
    let pegged_asset = Symbol::new(e, "USDT");
    let min_collat_ratio = 11000;
    let name = String::from_str(e, "United States Dollar xAsset");
    let symbol = String::from_str(e, "xUSD");
    let decimals = 7;

    token.cdp_init(
        &xlm_sac,
        &xlm_contract,
        &asset_contract,
        &pegged_asset,
        &min_collat_ratio,
        &name,
        &symbol,
        &decimals,
    );

    token
}

#[test]
fn test_token_initialization() {
    let e = Env::default();
    e.mock_all_auths();

    let token = create_token_contract(&e);

    assert_eq!(token.symbol(), String::from_str(&e, "xUSD"));
    assert_eq!(token.name(), String::from_str(&e, "United States Dollar xAsset"));
    assert_eq!(token.decimals(), 7);
}

#[test]
fn test_cdp_operations() {
    let e = Env::default();
    e.mock_all_auths();

    let mut token = create_token_contract(&e);
    let alice = Address::generate(&e);
    let bob = Address::generate(&e);

    // Mock XLM price
    token.set_xlm_contract(&e.register_contract(None, DataFeed::default()));
    let xlm_price = 10_000_000_000_000;
    token.set_asset_price(&Asset::Other(Symbol::new(&e, "XLM")), &xlm_price, &1000);

    // Mock USDT price
    token.set_asset_contract(&e.register_contract(None, DataFeed::default()));
    let usdt_price = 100_000_000_000_000;
    token.set_asset_price(&Asset::Other(Symbol::new(&e, "USDT")), &usdt_price, &1000);

    // Open CDPs
    token.open_cdp(&alice, &1_700_000_000, &100_000_000).unwrap();
    token.open_cdp(&bob, &1_300_000_000, &100_000_000).unwrap();

    // Check CDPs
    let alice_cdp = token.cdp(alice.clone()).unwrap();
    let bob_cdp = token.cdp(bob.clone()).unwrap();

    assert_eq!(alice_cdp.xlm_deposited, 1_700_000_000);
    assert_eq!(alice_cdp.asset_lent, 100_000_000);
    assert_eq!(bob_cdp.xlm_deposited, 1_300_000_000);
    assert_eq!(bob_cdp.asset_lent, 100_000_000);

    // Update minimum collateralization ratio
    token.set_min_collat_ratio(&15000);
    assert_eq!(token.minimum_collateralization_ratio(), 15000);

    // Check if CDPs become insolvent
    let alice_cdp = token.cdp(alice.clone()).unwrap();
    let bob_cdp = token.cdp(bob.clone()).unwrap();

    assert_eq!(alice_cdp.status, CDPStatus::Open);
    assert_eq!(bob_cdp.status, CDPStatus::Insolvent);
}

#[test]
fn test_token_transfers() {
    let e = Env::default();
    e.mock_all_auths();

    let mut token = create_token_contract(&e);
    let alice = Address::generate(&e);
    let bob = Address::generate(&e);

    // Mint tokens to Alice
    token.mint(&alice, &1000_0000000);

    assert_eq!(token.balance(alice.clone()), 1000_0000000);
    assert_eq!(token.balance(bob.clone()), 0);

    // Transfer from Alice to Bob
    token.transfer(&alice, &bob, &500_0000000);

    assert_eq!(token.balance(alice.clone()), 500_0000000);
    assert_eq!(token.balance(bob.clone()), 500_0000000);
}

#[test]
fn test_allowances() {
    let e = Env::default();
    e.mock_all_auths();

    let mut token = create_token_contract(&e);
    let alice = Address::generate(&e);
    let bob = Address::generate(&e);

    // Set allowance
    token.approve(&alice, &bob, &1000_0000000, &(e.ledger().sequence() + 1000));

    assert_eq!(token.allowance(alice.clone(), bob.clone()), 1000_0000000);

    // Transfer from Alice to Bob using allowance
    token.transfer_from(&bob, &alice, &bob, &500_0000000);

    assert_eq!(token.allowance(alice.clone(), bob.clone()), 500_0000000);
    assert_eq!(token.balance(bob.clone()), 500_0000000);
}

#[test]
fn test_stability_pool() {
    let e = Env::default();
    e.mock_all_auths();

    let mut token = create_token_contract(&e);
    let alice = Address::generate(&e);
    let bob = Address::generate(&e);

    // Mint tokens to Alice and Bob
    token.mint(&alice, &1000_0000000);
    token.mint(&bob, &1000_0000000);

    // Stake in stability pool
    token.stake(&alice, &500_0000000).unwrap();
    token.stake(&bob, &700_0000000).unwrap();

    // Check stakes
    let alice_stake = token.get_staker_deposit_amount(alice.clone()).unwrap();
    let bob_stake = token.get_staker_deposit_amount(bob.clone()).unwrap();

    assert_eq!(alice_stake, 500_0000000);
    assert_eq!(bob_stake, 700_0000000);

    // Check total xasset in stability pool
    assert_eq!(token.get_total_xasset(), 1200_0000000);

    // Withdraw from stability pool
    token.withdraw(&alice, &200_0000000).unwrap();

    let alice_stake = token.get_staker_deposit_amount(alice.clone()).unwrap();
    assert_eq!(alice_stake, 300_0000000);
}

#[test]
fn test_liquidation() {
    let e = Env::default();
    e.mock_all_auths();

    let mut token = create_token_contract(&e);
    let alice = Address::generate(&e);

    // Open CDP for Alice
    token.open_cdp(&alice, &1000_0000000, &500_0000000).unwrap();

    // Set XLM price to make the CDP insolvent
    token.set_xlm_contract(&e.register_contract(None, DataFeed::default()));
    let xlm_price = 5_000_000_000_000; // Half the original price
    token.set_asset_price(&Asset::Other(Symbol::new(&e, "XLM")), &xlm_price, &2000);

    // Check if the CDP is insolvent
    let alice_cdp = token.cdp(alice.clone()).unwrap();
    assert_eq!(alice_cdp.status, CDPStatus::Insolvent);

    // Freeze the CDP
    token.freeze_cdp(alice.clone()).unwrap();

    // Liquidate the CDP
    let (liquidated_debt, liquidated_collateral) = token.liquidate_cdp(alice.clone()).unwrap();

    assert!(liquidated_debt > 0);
    assert!(liquidated_collateral > 0);

    // Check if the CDP is closed or has reduced debt/collateral
    let alice_cdp = token.cdp(alice.clone()).unwrap();
    assert!(alice_cdp.xlm_deposited < 1000_0000000);
    assert!(alice_cdp.asset_lent < 500_0000000);
}

#[test]
fn test_error_handling() {
    let e = Env::default();
    e.mock_all_auths();

    let mut token = create_token_contract(&e);
    let alice = Address::generate(&e);
    let bob = Address::generate(&e);

    // Try to transfer more than balance
    let result = token.transfer(&alice, &bob, &1000_0000000);
    assert!(matches!(result, Err(Error::InsufficientBalance)));

    // Try to open a second CDP for Alice
    token.open_cdp(&alice, &1000_0000000, &500_0000000).unwrap();
    let result = token.open_cdp(&alice, &1000_0000000, &500_0000000);
    assert!(matches!(result, Err(Error::CDPAlreadyExists)));

    // Try to withdraw more than staked
    token.stake(&bob, &100_0000000).unwrap();
    let result = token.withdraw(&bob, &200_0000000);
    assert!(matches!(result, Err(Error::InsufficientStake)));
}