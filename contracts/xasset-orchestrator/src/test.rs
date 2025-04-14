#![cfg(test)]
extern crate std;

use crate::token::xasset as token;
use crate::{SorobanContract__, SorobanContract__Client};

use loam_sdk::import_contract;
use loam_sdk::soroban_sdk::{
    testutils::{Address as _, AuthorizedFunction, AuthorizedInvocation},
    Address, BytesN, Env, IntoVal, String, Symbol, Vec,
};

use crate::data_feed::Asset;
use crate::data_feed::{Client as DataFeedClient, WASM as DataFeedWasm};
use loam_sdk::soroban_sdk::token::StellarAssetClient;

loam_sdk::import_contract!(xasset);
loam_sdk::import_contract!(data_feed);

// fn create_token_contract<'a>(e: &Env, xlm_sac: &Address) -> SorobanContract__Client<'a> {
//     // Create the main token contract
//     let token = SorobanContract__Client::new(e, &e.register(SorobanContract__, {}));

//     // Create admin address
//     let admin = Address::generate(&e);
//     token.admin_set(&admin);

//     // Create data feed contract for price oracle
//     let datafeed = {
//         let contract = DataFeedClient::new(e, &e.register(DataFeedWasm, {}));
//         let asset_xlm = Asset::Other(Symbol::new(e, "XLM"));
//         let asset_xusd = Asset::Other(Symbol::new(e, "USDT"));
//         let asset_vec = Vec::from_array(e, [asset_xlm.clone(), asset_xusd.clone()]);
//         contract.admin_set(&admin);
//         contract.sep40_init(&asset_vec, &asset_xusd, &14, &300);
//         contract
//     };

//     let pegged_asset = Symbol::new(e, "USDT");
//     let min_collat_ratio = 11000;
//     let name = String::from_str(e, "United States Dollar xAsset");
//     let symbol = String::from_str(e, "xUSD");
//     let decimals = 7;
//     let annual_interest_rate: u32 = 11_00; // 11% interest rate

//     token.cdp_init(
//         &xlm_sac,
//         &datafeed.address,
//         &datafeed.address,
//         &pegged_asset,
//         &min_collat_ratio,
//         &name,
//         &symbol,
//         &decimals,
//         &annual_interest_rate,
//     );

//     token
// }

fn create_token_contract<'a>(e: &Env) -> token::Client<'a> {
    let admin = Address::generate(&e);
    token::Client::new(
        e,
        &e.register_stellar_asset_contract_v2(admin)
            .address(),
    )
}

// fn create_liqpool_contract<'a>(
//     e: &Env,
//     token_wasm_hash: &BytesN<32>,
//     token_a: &Address,
//     token_b: &Address,
// ) -> SorobanContract__Client<'a> {
//     let liqpool = SorobanContract__Client::new(e, &e.register(SorobanContract__, ()));
//     liqpool.initialize(token_wasm_hash, token_a, token_b);
//     liqpool
// }

fn install_token_wasm(e: &Env) -> BytesN<32> {
    import_contract!(xasset);
    e.deployer().upload_contract_wasm(xasset::WASM)
}

// #[allow(clippy::too_many_lines)]
// #[test]
// fn test() {
//     let e = Env::default();
//     e.mock_all_auths();

//     let mut admin1 = Address::generate(&e);
//     let mut admin2 = Address::generate(&e);

//     let mut token1 = create_token_contract(&e, &admin1);
//     let mut token2 = create_token_contract(&e, &admin2);
//     if token2.address < token1.address {
//         std::mem::swap(&mut token1, &mut token2);
//         std::mem::swap(&mut admin1, &mut admin2);
//     }
//     let user1 = Address::generate(&e);
//     let liqpool = create_liqpool_contract(
//         &e,
//         &install_token_wasm(&e),
//         &token1.address,
//         &token2.address,
//     );

//     let token_share = token::Client::new(&e, &liqpool.share_id());

//     token1.mint(&user1, &1000);
//     assert_eq!(token1.balance(&user1), 1000);

//     token2.mint(&user1, &1000);
//     assert_eq!(token2.balance(&user1), 1000);

//     liqpool.deposit(&user1, &100, &100, &100, &100);
//     assert_eq!(
//         e.auths(),
//         std::vec![(
//             user1.clone(),
//             AuthorizedInvocation {
//                 function: AuthorizedFunction::Contract((
//                     liqpool.address.clone(),
//                     symbol_short!("deposit"),
//                     (&user1, 100_i128, 100_i128, 100_i128, 100_i128).into_val(&e)
//                 )),
//                 sub_invocations: std::vec![
//                     AuthorizedInvocation {
//                         function: AuthorizedFunction::Contract((
//                             token1.address.clone(),
//                             symbol_short!("transfer"),
//                             (&user1, &liqpool.address, 100_i128).into_val(&e)
//                         )),
//                         sub_invocations: std::vec![]
//                     },
//                     AuthorizedInvocation {
//                         function: AuthorizedFunction::Contract((
//                             token2.address.clone(),
//                             symbol_short!("transfer"),
//                             (&user1, &liqpool.address, 100_i128).into_val(&e)
//                         )),
//                         sub_invocations: std::vec![]
//                     }
//                 ]
//             }
//         )]
//     );

//     assert_eq!(token_share.balance(&user1), 100);
//     assert_eq!(token_share.balance(&liqpool.address), 0);
//     assert_eq!(token1.balance(&user1), 900);
//     assert_eq!(token1.balance(&liqpool.address), 100);
//     assert_eq!(token2.balance(&user1), 900);
//     assert_eq!(token2.balance(&liqpool.address), 100);

//     liqpool.swap(&user1, &false, &49, &100);
//     assert_eq!(
//         e.auths(),
//         std::vec![(
//             user1.clone(),
//             AuthorizedInvocation {
//                 function: AuthorizedFunction::Contract((
//                     liqpool.address.clone(),
//                     symbol_short!("swap"),
//                     (&user1, false, 49_i128, 100_i128).into_val(&e)
//                 )),
//                 sub_invocations: std::vec![AuthorizedInvocation {
//                     function: AuthorizedFunction::Contract((
//                         token1.address.clone(),
//                         symbol_short!("transfer"),
//                         (&user1, &liqpool.address, 97_i128).into_val(&e)
//                     )),
//                     sub_invocations: std::vec![]
//                 }]
//             }
//         )]
//     );

//     assert_eq!(token1.balance(&user1), 803);
//     assert_eq!(token1.balance(&liqpool.address), 197);
//     assert_eq!(token2.balance(&user1), 949);
//     assert_eq!(token2.balance(&liqpool.address), 51);

//     e.budget().reset_unlimited();
//     liqpool.withdraw(&user1, &100, &197, &51);

//     assert_eq!(
//         e.auths(),
//         std::vec![(
//             user1.clone(),
//             AuthorizedInvocation {
//                 function: AuthorizedFunction::Contract((
//                     liqpool.address.clone(),
//                     symbol_short!("withdraw"),
//                     (&user1, 100_i128, 197_i128, 51_i128).into_val(&e)
//                 )),
//                 sub_invocations: std::vec![AuthorizedInvocation {
//                     function: AuthorizedFunction::Contract((
//                         token_share.address.clone(),
//                         symbol_short!("transfer"),
//                         (&user1, &liqpool.address, 100_i128).into_val(&e)
//                     )),
//                     sub_invocations: std::vec![]
//                 }]
//             }
//         )]
//     );

//     assert_eq!(token1.balance(&user1), 1000);
//     assert_eq!(token2.balance(&user1), 1000);
//     assert_eq!(token_share.balance(&user1), 0);
//     assert_eq!(token1.balance(&liqpool.address), 0);
//     assert_eq!(token2.balance(&liqpool.address), 0);
//     assert_eq!(token_share.balance(&liqpool.address), 0);
// }

// #[test]
// #[allow(clippy::should_panic_without_expect)]
// #[should_panic]
// fn deposit_amount_zero_should_panic() {
//     let e = Env::default();
//     e.mock_all_auths();

//     // Create contracts
//     let mut admin1 = Address::generate(&e);
//     let mut admin2 = Address::generate(&e);

//     let mut token_a = create_token_contract(&e, &admin1);
//     let mut token_b = create_token_contract(&e, &admin2);
//     if token_b.address < token_a.address {
//         std::mem::swap(&mut token_a, &mut token_b);
//         std::mem::swap(&mut admin1, &mut admin2);
//     }
//     let liqpool = create_liqpool_contract(
//         &e,
//         &install_token_wasm(&e),
//         &token_a.address,
//         &token_b.address,
//     );

//     // Create a user
//     let user1 = Address::generate(&e);

//     token_a.mint(&user1, &1000);
//     assert_eq!(token_a.balance(&user1), 1000);

//     token_b.mint(&user1, &1000);
//     assert_eq!(token_b.balance(&user1), 1000);

//     liqpool.deposit(&user1, &1, &0, &0, &0);
// }

// #[test]
// #[allow(clippy::should_panic_without_expect)]
// #[should_panic]
// fn swap_reserve_one_nonzero_other_zero() {
//     let e = Env::default();
//     e.mock_all_auths();

//     // Create contracts
//     let mut admin1 = Address::generate(&e);
//     let mut admin2 = Address::generate(&e);

//     let mut token_a = create_token_contract(&e, &admin1);
//     let mut token_b = create_token_contract(&e, &admin2);
//     if token_b.address < token_a.address {
//         std::mem::swap(&mut token_a, &mut token_b);
//         std::mem::swap(&mut admin1, &mut admin2);
//     }
//     let liqpool = create_liqpool_contract(
//         &e,
//         &install_token_wasm(&e),
//         &token_a.address,
//         &token_b.address,
//     );

//     // Create a user
//     let user1 = Address::generate(&e);

//     token_a.mint(&user1, &1000);
//     assert_eq!(token_a.balance(&user1), 1000);

//     token_b.mint(&user1, &1000);
//     assert_eq!(token_b.balance(&user1), 1000);

//     // Try to get to a situation where the reserves are 1 and 0.
//     // It shouldn't be possible.
//     token_b.transfer(&user1, &liqpool.address, &1);
//     liqpool.swap(&user1, &false, &1, &1);
// }
