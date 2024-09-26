use core::cmp;

use loam_sdk::{
    soroban_sdk::{self, contracttype, env, token, Address, Lazy, Map, String}, stellar_asset, subcontract, IntoKey
};
use loam_subcontract_core::Core;

use crate::Contract;

#[contracttype]
#[derive(IntoKey)]
pub struct MyStabilityPool {
    deposits: Map<Address, StakerPosition>,
    total_iasset: i128,
    total_collateral: i128,
    admin: Address,
    product_constant: i128,
    compounded_constant: i128,
    epoch: u64,
    fees_collected: i128,
    stake_fee: i128,
    unstake_return: i128,
}

#[contracttype]
pub struct StakerPosition {
    iasset_deposit: i128,
    product_constant: i128,
    compounded_constant: i128,
    epoch: u64,
}

impl Default for StakerPosition {
    fn default() -> Self {
        StakerPosition {
            iasset_deposit: 0,
            product_constant: 1_000_000, // Using 1_000_000 to represent 1.0 for better precision
            compounded_constant: 0,
            epoch: 0,
        }
    }
}

fn native() -> token::Client<'static> {
    stellar_asset!("native")
}

impl MyStabilityPool {
    #[must_use]
    pub fn new(admin: Address) -> Self {
        MyStabilityPool {
            deposits: Map::new(env()),
            total_iasset: 0,
            total_collateral: 0,
            admin,
            product_constant: 1_000_000, 
            compounded_constant: 0,
            epoch: 0,
            fees_collected: 0,
            stake_fee: 70_000_000,
            unstake_return: 20_000_000,
        }
    }

    fn update_constants(&mut self, iasset_debited: i128, xlm_earned: i128) {
        let new_product_constant = (self.product_constant as i128 * (self.total_iasset - iasset_debited) as i128) / self.total_iasset as i128;
        let new_compounded_constant = self.compounded_constant + (xlm_earned * self.product_constant) / self.total_iasset;

        self.product_constant = new_product_constant;
        self.compounded_constant = new_compounded_constant;

        if self.total_iasset == 0 {
            self.epoch += 1;
            self.product_constant = 1_000_000;
            self.compounded_constant = 0;
        }
    }
}

impl Default for MyStabilityPool {
    fn default() -> Self {
        Self::new(env().current_contract_address())
    }
}

#[subcontract]
pub trait IsStabilityPool {
    /// Initializes the Stability Pool with an admin address.
    fn sp_init(&mut self, admin: Address);
    /// Deposits iAsset tokens into the Stability Pool.
    fn deposit(&mut self, from: Address, amount: i128);
    /// Withdraws iAsset tokens from the Stability Pool.
    fn withdraw(&mut self, to: Address, amount: i128);
    /// Processes a liquidation event for a CDP.
    fn liquidate(&mut self, cdp_owner: Address, debt: i128, collateral: i128) -> (i128, i128);
    /// Allows a user to claim their share of collateral rewards.
    fn claim_rewards(&mut self, to: Address) -> i128;
    /// Retrieves the current deposit amount for a given address.
    fn get_deposit(&self, address: Address) -> i128;
    /// Retrieves the total amount of iAsset tokens in the Stability Pool.
    fn get_total_iasset(&self) -> i128;
    /// Retrieves the total amount of collateral rewards in the Stability Pool.
    fn get_total_collateral(&self) -> i128;
    /// Transfers XLM from the stability pool to an address
    fn transfer_xlm(&self, to: Address, amount: i128);
    /// Allows a user to add their stake to the pool
    fn stake(&mut self, from: Address, amount: i128);
    /// Allows a user to remove their stake from the pool
    fn unstake(&mut self, to: Address, amount: i128);
}

impl IsStabilityPool for MyStabilityPool {
    fn sp_init(&mut self, admin: Address) {
        Contract::admin_get().unwrap().require_auth();
        MyStabilityPool::set_lazy(MyStabilityPool::new(admin));
    }

    fn deposit(&mut self, from: Address, amount: i128) {
        from.require_auth();
        let mut position = self.deposits.get(from.clone()).unwrap_or(StakerPosition {
            iasset_deposit: 0,
            product_constant: self.product_constant,
            compounded_constant: self.compounded_constant,
            epoch: self.epoch,
        });

        // Collect 1 XLM fee for each new deposit
        self.fees_collected += 10_000_000; // 1 XLM in stroop

        position.iasset_deposit += amount;
        self.deposits.set(from, position);
        self.total_iasset += amount;
    }

    fn withdraw(&mut self, to: Address, amount: i128) {
        to.require_auth();
        let mut position = self.deposits.get(to.clone()).unwrap_or_default();
        assert!(position.iasset_deposit >= amount, "Insufficient balance");

        let iasset_owed = if position.epoch == self.epoch {
            (position.iasset_deposit * self.product_constant) / position.product_constant
        } else {
            0
        };

        assert!(iasset_owed >= amount, "Insufficient balance after liquidations");

        position.iasset_deposit -= amount;
        self.deposits.set(to, position);
        self.total_iasset -= amount;
    }

    fn liquidate(&mut self, cdp_owner: Address, debt: i128, collateral: i128) -> (i128, i128) {
        self.admin.require_auth();
        
        let liquidated_debt = cmp::min(debt, self.total_iasset);
        let liquidated_collateral = collateral * liquidated_debt / debt;

        self.total_iasset -= liquidated_debt;
        self.total_collateral += liquidated_collateral;

        self.update_constants(liquidated_debt, liquidated_collateral);

        (liquidated_debt, liquidated_collateral)
    }

    fn claim_rewards(&mut self, to: Address) -> i128 {
        to.require_auth();
        let position = self.deposits.get(to.clone()).unwrap_or_default();
        
        let xlm_reward = if position.epoch == self.epoch {
            (position.iasset_deposit * (self.compounded_constant - position.compounded_constant)) / position.product_constant
        } else {
            0
        };

        self.total_collateral -= xlm_reward;
        xlm_reward
    }

    fn get_deposit(&self, address: Address) -> i128 {
        self.deposits.get(address).map_or(0, |p| p.iasset_deposit)
    }

    fn get_total_iasset(&self) -> i128 {
        self.total_iasset
    }

    fn get_total_collateral(&self) -> i128 {
        self.total_collateral
    }

    fn transfer_xlm(&self, to: Address, amount: i128) {
        native().transfer(&env().current_contract_address(), &to, &amount);
    }

    fn stake(&mut self, from: Address, amount: i128) {
        from.require_auth();
        
        // todo: figure out if need to subtract fee or how thats done
        self.fees_collected += self.stake_fee;

        self.deposit(from, amount);
    }

    fn unstake(&mut self, to: Address, amount: i128) {
        to.require_auth();
        
        let position = self.deposits.get(to.clone()).unwrap_or_default();
        assert!(position.iasset_deposit == amount, "Must unstake all iAsset to close SP account");

        self.withdraw(to.clone(), amount);
        
        // Return 2 XLM fee upon closing the SP account
        self.fees_collected -= self.unstake_return; // 2 XLM in stroop

        self.transfer_xlm(to.clone(), self.unstake_return);

        self.deposits.remove(to);
    }
}
