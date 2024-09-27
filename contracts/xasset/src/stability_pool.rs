use loam_sdk::{
    soroban_sdk::{self, contracttype, env, Address, Lazy, Map},
    subcontract, IntoKey,
};

#[contracttype]
#[derive(IntoKey)]
pub struct MyStabilityPool {
    deposits: Map<Address, StakerPosition>,
    total_xasset: i128,
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
    pub xasset_deposit: i128,
    pub product_constant: i128,
    pub compounded_constant: i128,
    pub epoch: u64,
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
    pub fn new(admin: Address) -> Self {
        MyStabilityPool {
            deposits: Map::new(env()),
            total_xasset: 0,
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

    pub fn update_constants(&mut self, xasset_debited: i128, xlm_earned: i128) {
        let new_product_constant = (self.product_constant as i128
            * (self.total_xasset - xasset_debited) as i128)
            / self.total_xasset as i128;
        let new_compounded_constant =
            self.compounded_constant + (xlm_earned * self.product_constant) / self.total_xasset;

        self.product_constant = new_product_constant;
        self.compounded_constant = new_compounded_constant;

        if self.total_xasset == 0 {
            self.epoch += 1;
            self.product_constant = 1_000_000;
            self.compounded_constant = 0;
        }
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

    pub fn get_admin(&self) -> Address {
        self.admin.clone()
    }

    pub fn set_admin(&mut self, new_admin: Address) {
        self.admin = new_admin;
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

    pub fn increment_epoch(&mut self) {
        self.epoch += 1;
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
        Self::new(env().current_contract_address())
    }
}

#[subcontract]
pub trait IsStabilityPool {
    /// Initializes the Stability Pool with an admin address.
    fn sp_init(&mut self, admin: Address);
    /// Deposits iAsset tokens into the Stability Pool.
    fn deposit(&mut self, from: Address, amount: i128);
    /// Withdraws xasset tokens from the Stability Pool.
    fn withdraw(&mut self, to: Address, amount: i128);
    /// Processes a liquidation event for a CDP.
    fn liquidate(&mut self, cdp_owner: Address) -> (i128, i128);
    /// Allows a user to claim their share of collateral rewards.
    fn claim_rewards(&mut self, to: Address) -> i128;
    /// Retrieves the current deposit amount for a given address.
    fn get_deposit(&self, address: Address) -> i128;
    /// Retrieves the total amount of xasset tokens in the Stability Pool.
    fn get_total_xasset(&self) -> i128;
    /// Retrieves the total amount of collateral rewards in the Stability Pool.
    fn get_total_collateral(&self) -> i128;
    /// Transfers XLM from the stability pool to an address
    fn transfer_xlm(&self, to: Address, amount: i128);
    /// Allows a user to add their stake to the pool
    fn stake(&mut self, from: Address, amount: i128);
    /// Allows a user to remove their stake from the pool
    fn unstake(&mut self, to: Address, amount: i128);
}
