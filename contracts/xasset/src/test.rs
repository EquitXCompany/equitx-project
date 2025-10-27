#![cfg(test)]
extern crate std;
use crate::collateralized::CDPStatus;
use crate::data_feed;
use crate::token::{TokenContract, TokenContractClient};
use data_feed::Asset;
use soroban_sdk::testutils::Ledger;
use soroban_sdk::{
    testutils::Address as _,
    token::{self, Client as TokenClient, StellarAssetClient},
    Address, Env, String, Symbol, Vec,
};

fn create_sac_token_clients<'a>(
    e: &Env,
    admin: &Address,
) -> (TokenClient<'a>, StellarAssetClient<'a>) {
    let sac = e.register_stellar_asset_contract_v2(admin.clone());
    (
        token::Client::new(e, &sac.address()),
        token::StellarAssetClient::new(e, &sac.address()),
    )
}

fn create_data_feed(e: &Env) -> data_feed::Client<'_> {
    let contract_address = e.register(data_feed::WASM, ());
    let contract = data_feed::Client::new(e, &contract_address);
    let asset_xlm = Asset::Other(Symbol::new(e, "XLM"));
    let asset_xusd = Asset::Other(Symbol::new(e, "USDT"));
    let asset_vec = Vec::from_array(e, [asset_xlm.clone(), asset_xusd.clone()]);
    let admin = Address::generate(e);
    contract.admin_set(&admin);
    contract.sep40_init(&asset_vec, &asset_xusd, &14, &300);
    contract
}

fn create_token_contract<'a>(
    e: &Env,
    admin: Address,
    datafeed: data_feed::Client<'_>,
    xlm_sac: Address,
) -> TokenContractClient<'a> {
    let pegged_asset = Symbol::new(e, "USDT");
    let min_collat_ratio = 11000;
    let name = String::from_str(e, "United States Dollar xAsset");
    let symbol = String::from_str(e, "xUSD");
    let decimals = 7;
    let annual_interest_rate: u32 = 11_00; // 11% interest rate
    let contract_id = e.register(
        TokenContract,
        (
            admin,
            &xlm_sac,
            &datafeed.address,
            &datafeed.address,
            &pegged_asset,
            &min_collat_ratio,
            &name,
            &symbol,
            &decimals,
            &annual_interest_rate,
        ),
    );

    TokenContractClient::new(e, &contract_id)
}

#[test]
fn test_token_initialization() {
    let e = Env::default();
    e.mock_all_auths();
    let xlm_admin_address = Address::generate(&e);
    let xlm_sac = e.register_stellar_asset_contract_v2(xlm_admin_address);

    let datafeed = create_data_feed(&e);
    let admin: Address = Address::generate(&e);
    let token = create_token_contract(&e, admin, datafeed, xlm_sac.address());
    assert_eq!(token.symbol(), String::from_str(&e, "xUSD"));
    assert_eq!(
        token.name(),
        String::from_str(&e, "United States Dollar xAsset")
    );
    assert_eq!(token.decimals(), 7);
}

#[test]
fn test_cdp_operations() {
    let e = Env::default();
    e.mock_all_auths();
    let xlm_admin_address = Address::generate(&e);
    let (_, xlm_admin) = create_sac_token_clients(&e, &xlm_admin_address);
    let xlm_token_address = xlm_admin.address.clone();
    let datafeed = create_data_feed(&e);
    let admin: Address = Address::generate(&e);
    xlm_admin.mint(&admin.clone(), &10_000_000_000_000);
    let token = create_token_contract(&e, admin, datafeed, xlm_token_address);
    let alice = Address::generate(&e);
    let bob = Address::generate(&e);

    // Fund Alice and Bob with XLM
    xlm_admin.mint(&alice, &2_000_000_000_000);
    xlm_admin.mint(&bob, &1_500_000_000_000);
    // Mock XLM price
    let xlm_contract = token.xlm_contract();
    let client = data_feed::Client::new(&e, &xlm_contract);
    let xlm_price = 10_000_000_000_000;
    client.set_asset_price(&Asset::Other(Symbol::new(&e, "XLM")), &xlm_price, &1000);

    // Mock USDT price
    let usdt_contract = token.asset_contract();
    let client = data_feed::Client::new(&e, &usdt_contract);
    let usdt_price: i128 = 100_000_000_000_000;
    client.set_asset_price(&Asset::Other(Symbol::new(&e, "USDT")), &usdt_price, &1000);

    // Open CDPs
    token.open_cdp(&alice, &1_700_000_000, &100_000_000);
    token.open_cdp(&bob, &1_300_000_000, &100_000_000);

    // Check CDPs
    let alice_cdp = token.cdp(&alice.clone());
    let bob_cdp = token.cdp(&bob.clone());

    assert_eq!(alice_cdp.xlm_deposited, 1_700_000_000);
    assert_eq!(alice_cdp.asset_lent, 100_000_000);
    assert_eq!(bob_cdp.xlm_deposited, 1_300_000_000);
    assert_eq!(bob_cdp.asset_lent, 100_000_000);

    // Update minimum collateralization ratio
    token.set_min_collat_ratio(&15000);
    assert_eq!(token.minimum_collateralization_ratio(), 15000);

    // Check if CDPs become insolvent
    let alice_cdp = token.cdp(&alice.clone());
    let bob_cdp = token.cdp(&bob.clone());

    assert_eq!(alice_cdp.status, CDPStatus::Open);
    assert_eq!(bob_cdp.status, CDPStatus::Insolvent);
}

#[test]
fn test_token_transfers() {
    let e = Env::default();
    e.mock_all_auths();

    let xlm_admin_address = Address::generate(&e);
    let (_, xlm_admin) = create_sac_token_clients(&e, &xlm_admin_address);
    let xlm_token_address = xlm_admin.address.clone();
    let datafeed = create_data_feed(&e);
    let admin: Address = Address::generate(&e);
    let token = create_token_contract(&e, admin, datafeed, xlm_token_address);

    let alice = Address::generate(&e);
    let bob = Address::generate(&e);

    // Mint tokens to Alice
    token.mint(&alice, &1000_0000000);

    assert_eq!(token.balance(&alice), 1000_0000000);
    assert_eq!(token.balance(&bob), 0);

    // Transfer from Alice to Bob
    token.transfer(&alice, &bob, &500_0000000);

    assert_eq!(token.balance(&alice), 500_0000000);
    assert_eq!(token.balance(&bob), 500_0000000);
}

#[test]
fn test_allowances() {
    let e = Env::default();
    e.mock_all_auths();

    let xlm_admin_address = Address::generate(&e);
    let (_, xlm_admin) = create_sac_token_clients(&e, &xlm_admin_address);
    let xlm_token_address = xlm_admin.address.clone();
    let datafeed = create_data_feed(&e);
    let admin: Address = Address::generate(&e);
    let token = create_token_contract(&e, admin, datafeed, xlm_token_address);

    let alice = Address::generate(&e); // Token holder
    let bob = Address::generate(&e); // Will give approval
    let carol = Address::generate(&e); // Will execute transfer_from

    // Mint initial tokens to Bob
    token.mint(&bob, &2000_0000000);
    assert_eq!(token.balance(&bob), 2000_0000000);

    // Bob approves Carol to spend tokens
    token.approve(&bob, &carol, &1000_0000000, &(e.ledger().sequence() + 1000));
    assert_eq!(token.allowance(&bob, &carol), 1000_0000000);

    // Carol transfers from Bob to Alice using allowance
    token.transfer_from(&carol, &bob, &alice, &500_0000000);

    // Verify allowance was decreased
    assert_eq!(token.allowance(&bob, &carol), 500_0000000);

    // Verify balances
    assert_eq!(token.balance(&bob), 1500_0000000); // Original holder lost tokens
    assert_eq!(token.balance(&alice), 500_0000000); // Recipient got tokens
    assert_eq!(token.balance(&carol), 0); // Spender balance unchanged
}

#[test]
fn test_stability_pool() {
    let e = Env::default();
    e.mock_all_auths();

    let xlm_admin_address = Address::generate(&e);
    let (_, xlm_admin) = create_sac_token_clients(&e, &xlm_admin_address);
    let xlm_token_address = xlm_admin.address.clone();
    let datafeed = create_data_feed(&e);
    let admin: Address = Address::generate(&e);
    let token = create_token_contract(&e, admin, datafeed, xlm_token_address);

    let alice = Address::generate(&e);
    let bob = Address::generate(&e);
    xlm_admin.mint(&alice, &1_000_000_000_000);
    xlm_admin.mint(&bob, &1_000_000_000_000);

    // Mint tokens to Alice and Bob
    token.mint(&alice, &1000_0000000);
    token.mint(&bob, &1000_0000000);

    // Stake in stability pool
    token.stake(&alice, &500_0000000);
    token.stake(&bob, &700_0000000);

    // Check stakes
    let alice_stake = token.get_staker_deposit_amount(&alice.clone());
    let bob_stake = token.get_staker_deposit_amount(&bob.clone());

    assert_eq!(alice_stake, 500_0000000);
    assert_eq!(bob_stake, 700_0000000);

    // Check total xasset in stability pool
    assert_eq!(token.get_total_xasset(), 1200_0000000);

    // Withdraw from stability pool
    token.withdraw(&alice, &200_0000000);

    let alice_stake = token.get_staker_deposit_amount(&alice.clone());
    assert_eq!(alice_stake, 300_0000000);
}

#[test]
fn test_liquidation() {
    let e = Env::default();
    e.mock_all_auths();

    let xlm_admin_address = Address::generate(&e);
    let (_, xlm_admin) = create_sac_token_clients(&e, &xlm_admin_address);
    let xlm_token_address = xlm_admin.address.clone();
    let datafeed = create_data_feed(&e);
    let admin: Address = Address::generate(&e);
    let token = create_token_contract(&e, admin, datafeed, xlm_token_address);

    let alice = Address::generate(&e);
    xlm_admin.mint(&alice, &2_000_000_000_000);
    let staker = Address::generate(&e); // Add a staker
    xlm_admin.mint(&staker, &2_000_000_000_000); // Mint some XLM to staker

    token.mint(&staker, &1000_0000000);
    token.stake(&staker, &50_0000000);

    // Mock initial prices
    let xlm_contract = token.xlm_contract();
    let client = data_feed::Client::new(&e, &xlm_contract);
    let xlm_price = 10_000_000_000_000;
    client.set_asset_price(&Asset::Other(Symbol::new(&e, "XLM")), &xlm_price, &1000);

    let usdt_contract = token.asset_contract();
    let client = data_feed::Client::new(&e, &usdt_contract);
    let usdt_price: i128 = 100_000_000_000_000;
    client.set_asset_price(&Asset::Other(Symbol::new(&e, "USDT")), &usdt_price, &1000);

    // Open CDP for Alice
    token.open_cdp(&alice, &10_000_000_000, &700_000_000);

    // Update XLM price to make the CDP insolvent
    let client = data_feed::Client::new(&e, &xlm_contract);
    let xlm_price = 5_000_000_000_000; // Half the original price
    client.set_asset_price(&Asset::Other(Symbol::new(&e, "XLM")), &xlm_price, &1000);

    // Check if the CDP is insolvent
    let alice_cdp = token.cdp(&alice);
    assert_eq!(alice_cdp.status, CDPStatus::Insolvent);

    // Freeze the CDP
    token.freeze_cdp(&alice);

    // Liquidate the CDP
    token.liquidate_cdp(&alice);

    // Check if the CDP is closed or has reduced debt/collateral
    let alice_cdp = token.cdp(&alice);
    assert!(alice_cdp.xlm_deposited < 10_000_000_000);
    assert!(alice_cdp.asset_lent < 700_000_000);
}

#[test]
fn test_error_handling() {
    let e = Env::default();
    e.mock_all_auths();

    let xlm_admin_address = Address::generate(&e);
    let (_, xlm_admin) = create_sac_token_clients(&e, &xlm_admin_address);
    let xlm_token_address = xlm_admin.address.clone();
    let datafeed = create_data_feed(&e);
    let admin: Address = Address::generate(&e);
    let token = create_token_contract(&e, admin, datafeed, xlm_token_address);

    let alice = Address::generate(&e);
    let bob = Address::generate(&e);
    xlm_admin.mint(&alice, &2_000_000_000_000);
    xlm_admin.mint(&bob, &2_000_000_000_000);

    // Mock prices
    let xlm_contract = token.xlm_contract();
    let client = data_feed::Client::new(&e, &xlm_contract);
    let xlm_price = 10_000_000_000_000;
    client.set_asset_price(&Asset::Other(Symbol::new(&e, "XLM")), &xlm_price, &1000);

    let usdt_contract = token.asset_contract();
    let client = data_feed::Client::new(&e, &usdt_contract);
    let usdt_price: i128 = 100_000_000_000_000;
    client.set_asset_price(&Asset::Other(Symbol::new(&e, "USDT")), &usdt_price, &1000);

    // Try to transfer more than balance
    let result = token.try_transfer(&alice, &bob, &1000_0000000);
    assert!(result.is_err());

    // Try to open a second CDP for Alice
    token.open_cdp(&alice, &2_000_000_000, &100_000_000);
    let result = token.try_open_cdp(&alice, &2_000_000_000, &100_000_000);
    assert!(result.is_err());

    // Try to withdraw more than staked
    token.mint(&bob, &1200_0000000);
    token.stake(&bob, &100_0000000);
    let result = token.try_withdraw(&bob, &200_0000000);
    assert!(result.is_err());
}

#[test]
fn test_cdp_operations_with_interest() {
    let e = Env::default();
    e.mock_all_auths();

    let xlm_admin_address = Address::generate(&e);
    let (sac_contract, xlm_admin) = create_sac_token_clients(&e, &xlm_admin_address);
    let xlm_token_address = xlm_admin.address.clone();
    let datafeed = create_data_feed(&e);
    let admin: Address = Address::generate(&e);
    let token = create_token_contract(&e, admin, datafeed, xlm_token_address);

    let alice = Address::generate(&e);
    xlm_admin.mint(&alice, &2_000_000_000_000);

    // Mock prices
    let xlm_contract = token.xlm_contract();
    let client = data_feed::Client::new(&e, &xlm_contract);
    let xlm_price = 10_000_000_000_000;
    client.set_asset_price(&Asset::Other(Symbol::new(&e, "XLM")), &xlm_price, &1000);

    let usdt_contract = token.asset_contract();
    let client = data_feed::Client::new(&e, &usdt_contract);
    let usdt_price: i128 = 100_000_000_000_000;
    client.set_asset_price(&Asset::Other(Symbol::new(&e, "USDT")), &usdt_price, &1000);

    // Set initial timestamp
    let initial_time = 1700000000;
    Ledger::set_timestamp(&e.ledger(), initial_time);

    // Open initial CDP
    token.open_cdp(&alice, &10_000_000_000, &500_000_000);
    let initial_cdp = token.cdp(&alice);
    assert_eq!(initial_cdp.xlm_deposited, 10_000_000_000);
    assert_eq!(initial_cdp.asset_lent, 500_000_000);
    assert_eq!(initial_cdp.accrued_interest.amount, 0);

    // Advance time by 1 year (31536000 seconds)
    Ledger::set_timestamp(&e.ledger(), initial_time + 31536000);

    // Check interest has accrued (11% annual rate)
    let cdp_after_year = token.cdp(&alice);
    assert!(cdp_after_year.accrued_interest.amount > 0);
    // With 11% interest rate, expect ~55_000_000 interest (500_000_000 * 0.11)
    assert!(cdp_after_year.accrued_interest.amount >= 54_000_000); // Allow for some rounding

    // Advance another 6 months
    Ledger::set_timestamp(&e.ledger(), initial_time + 47304000);

    // Borrow more
    token.borrow_xasset(&alice, &200_000_000);

    // Advance 3 more months
    Ledger::set_timestamp(&e.ledger(), initial_time + 55944000);

    // Check total debt (original + borrowed + accumulated interest)
    let cdp_before_repay = token.cdp(&alice);
    assert!(cdp_before_repay.asset_lent + cdp_before_repay.accrued_interest.amount > 700_000_000);

    // Approve contract to spend XLM from Alice for paying interest
    sac_contract.approve(
        &alice,
        &token.address.clone(),
        &token.get_accrued_interest(&alice).approval_amount,
        &(e.ledger().sequence() + 100),
    );

    // Repay some debt (this should first pay off accrued interest)
    token.repay_debt(&alice, &300_000_000);

    let final_cdp = token.cdp(&alice);
    // Verify debt reduction
    assert!(
        final_cdp.asset_lent + final_cdp.accrued_interest.amount
            < cdp_before_repay.asset_lent + cdp_before_repay.accrued_interest.amount
    );

    // test pay_interest
    // Advance time by 2 months
    let time_after_debt = initial_time + 55944000 + 5_184_000; // +60 days (2 months in seconds)
    Ledger::set_timestamp(&e.ledger(), time_after_debt);

    // Get updated accrued interest
    let cdp_for_interest = token.cdp(&alice);
    let accrued_interest = cdp_for_interest.accrued_interest.amount;
    assert!(accrued_interest > 0);

    let repay_interest_amount = accrued_interest / 2;
    let cdp_post_pay = token.pay_interest(&alice, &repay_interest_amount);

    assert!(cdp_post_pay.accrued_interest.amount < accrued_interest);
    assert!(cdp_post_pay.accrued_interest.amount > 0);
}
