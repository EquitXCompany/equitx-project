use soroban_sdk::{contracttype, Address, Env};

use crate::{collateralized::CDPStatus, Error};
const PRODUCT_CONSTANT: i128 = 1_000_000_000;

#[contracttype]
#[derive(Clone)]
pub struct StakerPosition {
    pub xasset_deposit: i128,
    pub product_constant: i128,
    pub compounded_constant: i128,
    pub epoch: u64,
}

#[contracttype]
pub struct AvailableAssets {
    pub available_xasset: i128,
    pub available_rewards: i128,
}

impl Default for StakerPosition {
    fn default() -> Self {
        StakerPosition {
            xasset_deposit: 0,
            product_constant: PRODUCT_CONSTANT, // Using 1_000_000 to represent 1.0 for better precision
            compounded_constant: 0,
            epoch: 0,
        }
    }
}

pub trait IsStabilityPool {
    /// Deposits xasset tokens into the Stability Pool.
    fn deposit(env: &Env, from: Address, amount: i128) -> Result<(), Error>;
    /// Withdraws xasset tokens from the Stability Pool.
    fn withdraw(env: &Env, to: Address, amount: i128) -> Result<(), Error>;
    /// Processes a liquidation event for a CDP.
    fn liquidate(env: &Env, cdp_owner: Address) -> Result<(i128, i128, CDPStatus), Error>;
    /// Allows a user to claim their share of collateral rewards.
    fn claim_rewards(env: &Env, to: Address) -> Result<i128, Error>;
    /// Retrieves the current deposit amount for a given address.
    fn get_staker_deposit_amount(env: &Env, address: Address) -> Result<i128, Error>;
    /// Retrieves the total amount of xasset tokens in the Stability Pool.
    fn get_total_xasset(env: &Env) -> i128;
    /// Retrieves the total amount of collateral rewards in the Stability Pool.
    fn get_total_collateral(env: &Env) -> i128;
    /// Allows a user to add their stake to the pool
    fn stake(env: &Env, from: Address, amount: i128) -> Result<(), Error>;
    /// Allows a user to remove their stake from the pool
    fn unstake(env: &Env, staker: Address) -> Result<(), Error>;
    /// Allows a user to view their available xasset and rewards
    fn get_available_assets(env: &Env, staker: Address) -> Result<AvailableAssets, Error>;
    /// Allows a user to view their available current position
    fn get_position(env: &Env, staker: Address) -> Result<StakerPosition, Error>;
    /// Allows a user to view the stability pool's current constants
    fn get_constants(env: &Env) -> StakerPosition;
}
