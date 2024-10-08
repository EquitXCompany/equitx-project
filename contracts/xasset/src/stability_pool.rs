use loam_sdk::{
    soroban_sdk::{self, contracttype, env, Address, Lazy, Map},
    subcontract, IntoKey,
};

use crate::Error;

#[contracttype]
#[derive(IntoKey)]
pub struct MyStabilityPool {
    deposits: Map<Address, StakerPosition>,
    compound_record: Map<u64, i128>,
    total_xasset: i128,
    total_collateral: i128,
    product_constant: i128,
    compounded_constant: i128,
    epoch: u64,
    fees_collected: i128,
    deposit_fee: i128,
    stake_fee: i128,
    unstake_return: i128,
}

#[contracttype]
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
            product_constant: 1_000_000, // Using 1_000_000 to represent 1.0 for better precision
            compounded_constant: 0,
            epoch: 0,
        }
    }
}

impl MyStabilityPool {
    #[must_use]
    pub fn new() -> Self {
        MyStabilityPool {
            deposits: Map::new(env()),
            compound_record: Map::new(env()),
            total_xasset: 0,
            total_collateral: 0,
            product_constant: 1_000_000,
            compounded_constant: 0,
            epoch: 0,
            fees_collected: 0,
            deposit_fee: 10_000_000,
            stake_fee: 70_000_000,
            unstake_return: 20_000_000,
        }
    }

    pub fn update_constants(&mut self, xasset_debited: i128, xlm_earned: i128) {
        // Check if total_xasset is zero prior to calculation
        if self.total_xasset == 0 {
            self.increment_epoch();
            return;
        }

        // Proceed with updates if total_xasset is not zero
        let new_product_constant =
            (self.product_constant * (self.total_xasset - xasset_debited)) / self.total_xasset;
        let new_compounded_constant =
            self.compounded_constant + (xlm_earned * self.product_constant) / self.total_xasset;

        self.product_constant = new_product_constant;
        self.compounded_constant = new_compounded_constant;
        if self.total_xasset == xasset_debited {
            self.increment_epoch();
        }
    }

    pub fn increment_epoch(&mut self) {
        self.compound_record
            .set(self.epoch, self.compounded_constant);
        self.epoch += 1;
        self.product_constant = 1_000_000;
        self.compounded_constant = 0;
    }

    pub fn get_deposit(&self, address: Address) -> Option<StakerPosition> {
        self.deposits.get(address)
    }

    pub fn set_deposit(&mut self, address: Address, position: StakerPosition) {
        self.deposits.set(address, position);
    }

    pub fn get_total_xasset(&self) -> i128 {
        self.total_xasset
    }

    pub fn add_total_xasset(&mut self, amount: i128) {
        self.total_xasset += amount;
    }

    pub fn subtract_total_xasset(&mut self, amount: i128) {
        self.total_xasset -= amount;
    }

    pub fn get_total_collateral(&self) -> i128 {
        self.total_collateral
    }

    pub fn add_total_collateral(&mut self, amount: i128) {
        self.total_collateral += amount;
    }

    pub fn subtract_total_collateral(&mut self, amount: i128) {
        self.total_collateral -= amount;
    }

    pub fn get_product_constant(&self) -> i128 {
        self.product_constant
    }

    pub fn set_product_constant(&mut self, value: i128) {
        self.product_constant = value;
    }

    pub fn get_compounded_constant(&self) -> i128 {
        self.compounded_constant
    }

    pub fn set_compounded_constant(&mut self, value: i128) {
        self.compounded_constant = value;
    }

    pub fn get_epoch(&self) -> u64 {
        self.epoch
    }

    pub fn get_compounded_epoch(&self, epoch: u64) -> Option<i128> {
        self.compound_record.get(epoch)
    }

    pub fn get_fees_collected(&self) -> i128 {
        self.fees_collected
    }

    pub fn add_fees_collected(&mut self, amount: i128) {
        self.fees_collected += amount;
    }

    pub fn subtract_fees_collected(&mut self, amount: i128) {
        self.fees_collected -= amount;
    }

    pub fn get_stake_fee(&self) -> i128 {
        self.stake_fee
    }

    pub fn get_deposit_fee(&self) -> i128 {
        self.deposit_fee
    }

    pub fn set_stake_fee(&mut self, value: i128) {
        self.stake_fee = value;
    }

    pub fn get_unstake_return(&self) -> i128 {
        self.unstake_return
    }

    pub fn set_unstake_return(&mut self, value: i128) {
        self.unstake_return = value;
    }

    pub fn remove_deposit(&mut self, address: Address) {
        self.deposits.remove(address);
    }
}

impl Default for MyStabilityPool {
    fn default() -> Self {
        Self::new()
    }
}

#[subcontract]
pub trait IsStabilityPool {
    /// Initializes the Stability Pool.
    fn sp_init(&self);
    /// Deposits xasset tokens into the Stability Pool.
    fn deposit(&mut self, from: Address, amount: i128) -> Result<(), Error>;
    /// Withdraws xasset tokens from the Stability Pool.
    fn withdraw(&mut self, to: Address, amount: i128) -> Result<(), Error>;
    /// Processes a liquidation event for a CDP.
    fn liquidate(&mut self, cdp_owner: Address) -> Result<(i128, i128), Error>;
    /// Allows a user to claim their share of collateral rewards.
    fn claim_rewards(&mut self, to: Address) -> Result<i128, Error>;
    /// Retrieves the current deposit amount for a given address.
    fn get_deposit(&self, address: Address) -> Result<i128, Error>;
    /// Retrieves the total amount of xasset tokens in the Stability Pool.
    fn get_total_xasset(&self) -> i128;
    /// Retrieves the total amount of collateral rewards in the Stability Pool.
    fn get_total_collateral(&self) -> i128;
    /// Allows a user to add their stake to the pool
    fn stake(&mut self, from: Address, amount: i128) -> Result<(), Error>;
    /// Allows a user to remove their stake from the pool
    fn unstake(&mut self, staker: Address) -> Result<(), Error>;
    /// Allows a user to view their available xasset and rewards
    fn get_available_assets(&self, staker: Address) -> Result<AvailableAssets, Error>;
    /// Allows a user to view their available current position
    fn get_position(&self, staker: Address) -> Result<StakerPosition, Error>;
    /// Allows a user to view the stability pool's current constants
    fn get_constants(&self) -> StakerPosition;
}
