use core::cmp;

use loam_sdk::{
    soroban_sdk::{self, contracttype, env, token, Address, Lazy, Map, String, Symbol, Vec },
    stellar_asset, IntoKey,
};
use loam_subcontract_core::Core;
use loam_subcontract_ft::{Fungible, IsFungible};

use crate::{collateralized::CDPStatus, data_feed};
use crate::{
    collateralized::{IsCDPAdmin, IsCollateralized, CDP},
    PriceData,
};
use crate::{
    stability_pool::{IsStabilityPool, MyStabilityPool, StakerPosition},
    Contract,
};

const BASIS_POINTS: i128 = 10_000;

#[contracttype]
pub struct Txn(Address, Address);

#[contracttype]
pub struct Allowance {
    amount: i128,
    live_until_ledger: u32,
}

#[contracttype]
#[derive(Clone, Copy)]
pub struct CDPInternal {
    pub xlm_deposited: i128,
    pub asset_lent: i128,
    pub status: CDPStatus,
}

impl CDPInternal {
    #[must_use]
    pub fn new(xlm_deposited: i128, asset_lent: i128) -> Self {
        CDPInternal {
            xlm_deposited,
            asset_lent,
            status: CDPStatus::Open,
        }
    }
}

#[contracttype]
#[derive(IntoKey)]
pub struct Token {
    /// Mapping of account addresses to their token balances
    balances: Map<Address, i128>,
    /// Mapping of transactions to their associated allowances
    allowances: Map<Txn, Allowance>,
    /// Mapping of addresses to their authorization status
    authorized: Map<Address, bool>,
    /// Name of the token
    name: String,
    /// Symbol of the token
    symbol: String,
    /// Number of decimal places for token amounts
    decimals: u32,
    /// XLM Stellar Asset Contract address, for XLM transfers
    xlm_sac: Address,
    /// Oracle contract ID for XLM price feed
    xlm_contract: Address,
    /// Oracle contract ID for asset price feed
    asset_contract: Address,
    /// Oracle asset ID this asset tracks.
    pegged_asset: Symbol,
    /// basis points; default 110%; updateable by admin
    min_collat_ratio: u32,
    /// each Address can only have one CDP per Asset
    cdps: Map<Address, CDPInternal>,
    /// stability pool for the token
    stability_pool: MyStabilityPool,
}

impl Token {
    #[must_use]
    pub fn new(
        xlm_sac: Address,
        xlm_contract: Address,
        asset_contract: Address,
        pegged_asset: Symbol,
        min_collat_ratio: u32,
        name: String,
        symbol: String,
        decimals: u32,
    ) -> Self {
        Token {
            xlm_sac,
            xlm_contract,
            asset_contract,
            pegged_asset,
            min_collat_ratio,
            cdps: Map::new(env()),
            stability_pool: MyStabilityPool::new(),
            balances: Map::new(env()),
            allowances: Map::new(env()),
            authorized: Map::new(env()),
            name,
            symbol,
            decimals,
        }
    }
}

/// Loam SDK currently requires us to implement `Default`. This is nonsense and will be fixed in
/// https://github.com/loambuild/loam/issues/92
impl Default for Token {
    fn default() -> Self {
        Token {
            xlm_sac: env().current_contract_address(),
            xlm_contract: env().current_contract_address(),
            asset_contract: env().current_contract_address(),
            pegged_asset: Symbol::new(env(), "XLM"),
            min_collat_ratio: 11000,
            cdps: Map::new(env()),
            stability_pool: MyStabilityPool::new(),
            balances: Map::new(env()),
            allowances: Map::new(env()),
            authorized: Map::new(env()),
            name: String::from_str(env(), "Default Token"),
            symbol: String::from_str(env(), "DTK"),
            decimals: 7,
        }
    }
}

impl IsFungible for Token {
    fn allowance(&self, from: Address, spender: Address) -> i128 {
        let allowance = self.allowances.get(Txn(from, spender));
        match allowance {
            Some(a) => {
                if env().ledger().sequence() <= a.live_until_ledger {
                    a.amount
                } else {
                    0
                }
            }
            None => 0,
        }
    }

    fn approve(&mut self, from: Address, spender: Address, amount: i128, live_until_ledger: u32) {
        from.require_auth();
        let current_ledger = env().ledger().sequence();
        assert!(
            !(live_until_ledger < current_ledger && amount != 0),
            "live_until_ledger must be greater than or equal to the current ledger number"
        );
        self.allowances.set(
            Txn(from, spender),
            Allowance {
                amount,
                live_until_ledger,
            },
        );
    }

    fn balance(&self, id: Address) -> i128 {
        self.balances.get(id).unwrap_or_default()
    }

    fn transfer(&mut self, from: Address, to: Address, amount: i128) {
        from.require_auth();
        let from_balance = self.balance(from.clone()) - amount;
        let to_balance = self.balance(to.clone()) + amount;
        self.balances.set(from, from_balance);
        self.balances.set(to, to_balance);
    }

    fn transfer_from(&mut self, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        let allowance = self.allowance(from.clone(), spender.clone());
        if allowance >= amount {
            self.transfer(from.clone(), to, amount);
            self.decrease_allowance(from, spender, amount);
        }
    }

    fn burn(&mut self, from: Address, amount: i128) {
        from.require_auth();
        let balance = self.balance(from.clone()) - amount;
        self.balances.set(from, balance);
    }

    fn burn_from(&mut self, spender: Address, from: Address, amount: i128) {
        spender.require_auth();
        let allowance = self.allowance(from.clone(), spender.clone());
        if allowance >= amount {
            self.burn(from.clone(), amount);
            self.decrease_allowance(from, spender, amount);
        }
    }

    fn decimals(&self) -> u32 {
        self.decimals
    }

    fn name(&self) -> String {
        self.name.clone()
    }

    fn symbol(&self) -> String {
        self.symbol.clone()
    }

    fn increase_allowance(&mut self, from: Address, spender: Address, amount: i128) {
        from.require_auth();
        let current_allowance = self.allowance(from.clone(), spender.clone());
        let new_amount = current_allowance + amount;
        let current_ledger = env().ledger().sequence();
        self.allowances.set(
            Txn(from, spender),
            Allowance {
                amount: new_amount,
                live_until_ledger: current_ledger + 1000, // Example: set to expire after 1000 ledgers
            },
        );
    }

    fn decrease_allowance(&mut self, from: Address, spender: Address, amount: i128) {
        from.require_auth();
        let current_allowance = self.allowance(from.clone(), spender.clone());
        let new_amount = current_allowance.checked_sub(amount).unwrap_or(0);
        let current_ledger = env().ledger().sequence();
        self.allowances.set(
            Txn(from, spender),
            Allowance {
                amount: new_amount,
                live_until_ledger: current_ledger + 1000, // Example: set to expire after 1000 ledgers
            },
        );
    }

    fn spendable_balance(&self, id: Address) -> i128 {
        self.balance(id)
    }

    fn authorized(&self, id: Address) -> bool {
        self.authorized.get(id).unwrap_or_default()
    }

    fn set_authorized(&mut self, id: Address, authorize: bool) {
        self::Contract::require_auth();
        self.authorized.set(id, authorize);
    }

    fn mint(&mut self, to: Address, amount: i128) {
        //self::Contract::require_auth();
        let balance = self.balance(to.clone()) + amount;
        self.balances.set(to, balance);
    }

    fn clawback(&mut self, from: Address, amount: i128) {
        //self::Contract::require_auth();
        let balance = self.balance(from.clone()) - amount;
        self.balances.set(from, balance);
    }

    fn set_admin(&mut self, new_admin: Address) {
        self::Contract::require_auth();
        Contract::set_admin(new_admin);
    }
}

impl IsCollateralized for Token {
    fn xlm_contract(&self) -> Address {
        self.xlm_contract.clone()
    }
    fn asset_contract(&self) -> Address {
        self.xlm_contract.clone()
    }
    fn pegged_asset(&self) -> Symbol {
        self.pegged_asset.clone()
    }
    fn minimum_collateralization_ratio(&self) -> u32 {
        self.min_collat_ratio
    }

    fn lastprice_xlm(&self) -> PriceData {
        let env = env();
        let contract = &self.xlm_contract;
        let client = data_feed::Client::new(env, contract);
        let data_feed::PriceData { price, timestamp } = client
            .lastprice(&data_feed::Asset::Other(Symbol::new(env, "XLM")))
            .expect("No XLM price data from Oracle");
        PriceData { price, timestamp }
    }

    fn lastprice_asset(&self) -> PriceData {
        let env = env();
        let contract = &self.asset_contract;
        let asset = &self.pegged_asset;
        let client = data_feed::Client::new(env, contract);
        let data_feed::PriceData { price, timestamp } = client
            .lastprice(&data_feed::Asset::Other(asset.clone()))
            .expect("No asset price data from Oracle");
        PriceData { price, timestamp }
    }

    fn decimals_xlm_feed(&self) -> u32 {
        let contract = &self.xlm_contract;
        let client = data_feed::Client::new(env(), contract);
        client.decimals()
    }

    fn decimals_asset_feed(&self) -> u32 {
        let contract = &self.asset_contract;
        let client = data_feed::Client::new(env(), contract);
        client.decimals()
    }

    fn open_cdp(&mut self, lender: Address, collateral: i128, asset_lent: i128) {
        lender.require_auth();

        let env = env();

        // 1. check if lender already has a CDP
        if self.cdps.contains_key(lender.clone()) {
            panic!("CDP already exists for this lender");
        }

        // 2. check that `lastprice` gives collateralization ratio over `min_collat_ratio`
        let cdp = CDPInternal::new(collateral, asset_lent);
        let xlm_price = self.lastprice_xlm();
        let xlm_decimals = self.decimals_xlm_feed();
        let xasset_price = self.lastprice_asset();
        let xasset_decimals = self.decimals_asset_feed();
        let CDP {
            collateralization_ratio,
            ..
        } = self.decorate(
            cdp.clone(),
            lender.clone(),
            xlm_price.price,
            xlm_decimals,
            xasset_price.price,
            xasset_decimals,
        );
        if collateralization_ratio < self.min_collat_ratio {
            panic!("Insufficient collateralization ratio");
        }

        // 3. transfer attached XLM to this contract
        let client = token::Client::new(env, &self.xlm_sac);
        client.transfer(&lender, &env.current_contract_address(), &collateral);

        // 4. mint `asset_lent` of this token to `address`
        self.mint(lender.clone(), asset_lent);

        // 5. create CDP
        self.cdps.set(lender, cdp);
    }

    fn cdp(&self, lender: Address) -> CDP {
        let cdp = self.cdps.get(lender.clone()).expect("CDP not found");
        let xlm_price = self.lastprice_xlm();
        let xlm_decimals = self.decimals_xlm_feed();
        let xasset_price = self.lastprice_asset();
        let xasset_decimals = self.decimals_asset_feed();
        self.decorate(
            cdp,
            lender,
            xlm_price.price,
            xlm_decimals,
            xasset_price.price,
            xasset_decimals,
        )
    }

    fn cdps(&self) -> Vec<CDP> {
        let mut cdps: Vec<CDP> = Vec::new(env());
        let xlm_price = self.lastprice_xlm();
        let xlm_decimals = self.decimals_xlm_feed();
        let xasset_price = self.lastprice_asset();
        let xasset_decimals = self.decimals_asset_feed();
        self.cdps.iter().for_each(|(lender, cdp)| {
            cdps.push_back(self.decorate(
                cdp,
                lender,
                xlm_price.price,
                xlm_decimals,
                xasset_price.price,
                xasset_decimals,
            ))
        });
        cdps
    }

    fn freeze_cdp(&mut self, lender: Address) {
        let mut cdp = self.cdp(lender.clone());
        if matches!(cdp.status, CDPStatus::Insolvent) {
            cdp.status = CDPStatus::Frozen;
            self.set_cdp_from_decorated(lender, cdp);
        } else {
            panic!("CDP not insolvent");
        }
    }

    fn add_collateral(&mut self, lender: Address, amount: i128) {
        lender.require_auth();
        let mut cdp = self.cdp(lender.clone());

        if matches!(cdp.status, CDPStatus::Closed) || matches!(cdp.status, CDPStatus::Frozen) {
            panic!("CDP must be Open or Insolvent to add collateral");
        }

        // Transfer XLM from lender to contract
        let client = token::Client::new(env(), &self.xlm_sac);
        client.transfer(&lender, &env().current_contract_address(), &amount);

        cdp.xlm_deposited += amount;
        self.set_cdp_from_decorated(lender, cdp);
    }

    fn withdraw_collateral(&mut self, lender: Address, amount: i128) {
        lender.require_auth();
        let mut cdp = self.cdp(lender.clone());

        if matches!(cdp.status, CDPStatus::Closed) || matches!(cdp.status, CDPStatus::Frozen) {
            panic!("CDP must be Open or Insolvent to withdraw collateral");
        }

        if cdp.xlm_deposited < amount {
            panic!("Insufficient collateral");
        }

        let new_cdp = self.decorate(
            CDPInternal {
                xlm_deposited: cdp.xlm_deposited - amount,
                asset_lent: cdp.asset_lent,
                status: cdp.status,
            },
            lender.clone(),
            self.lastprice_xlm().price,
            self.decimals_xlm_feed(),
            self.lastprice_asset().price,
            self.decimals_asset_feed(),
        );

        if new_cdp.collateralization_ratio < self.min_collat_ratio {
            panic!("Withdrawal would cause undercollateralization");
        }

        // Transfer XLM from contract to lender
        let client = token::Client::new(env(), &self.xlm_sac);
        client.transfer(&env().current_contract_address(), &lender, &amount);

        cdp.xlm_deposited -= amount;
        self.set_cdp_from_decorated(lender, cdp);
    }

    fn borrow_xasset(&mut self, lender: Address, amount: i128) {
        lender.require_auth();
        let mut cdp = self.cdp(lender.clone());

        if !matches!(cdp.status, CDPStatus::Open) {
            panic!("CDP must be Open to borrow asset");
        }

        let new_cdp = self.decorate(
            CDPInternal {
                xlm_deposited: cdp.xlm_deposited,
                asset_lent: cdp.asset_lent + amount,
                status: cdp.status,
            },
            lender.clone(),
            self.lastprice_xlm().price,
            self.decimals_xlm_feed(),
            self.lastprice_asset().price,
            self.decimals_asset_feed(),
        );

        if new_cdp.collateralization_ratio < self.min_collat_ratio {
            panic!("Borrowing would cause undercollateralization");
        }

        self.mint(lender.clone(), amount);

        cdp.asset_lent += amount;
        self.set_cdp_from_decorated(lender, cdp);
    }

    fn repay_debt(&mut self, lender: Address, amount: i128) {
        lender.require_auth();
        let mut cdp = self.cdp(lender.clone());

        if matches!(cdp.status, CDPStatus::Closed) || matches!(cdp.status, CDPStatus::Frozen) {
            panic!("CDP must be Open or Insolvent to repay debt");
        }

        if cdp.asset_lent < amount {
            panic!("Repayment amount exceeds debt");
        }

        self.burn(lender.clone(), amount);

        cdp.asset_lent -= amount;

        if cdp.asset_lent == 0 && cdp.xlm_deposited == 0 {
            self.close_cdp(lender);
        } else {
            self.set_cdp_from_decorated(lender, cdp);
        }
    }

    fn liquidate_cdp(&mut self, lender: Address) {
        self.liquidate(lender);
    }

    fn merge_cdps(&mut self, lenders: Vec<Address>) {
        if lenders.len() < 2 {
            panic!("At least two CDPs are required for merging");
        }

        let mut total_xlm = 0;
        let mut total_asset = 0;

        for lender in lenders.iter() {
            let cdp = self.cdp(lender.clone());
            if !matches!(cdp.status, CDPStatus::Frozen) {
                panic!("All CDPs must be frozen to merge");
            }
            total_xlm += cdp.xlm_deposited;
            total_asset += cdp.asset_lent;
        }

        // Merge into the first CDP
        let merged_cdp = CDPInternal {
            xlm_deposited: total_xlm,
            asset_lent: total_asset,
            status: CDPStatus::Frozen,
        };
        let first_lender = lenders.get(0).unwrap();
        self.cdps.set(first_lender.clone(), merged_cdp);

        // Remove other CDPs
        for lender in lenders.iter().skip(1) {
            self.cdps.remove(lender.clone());
        }
    }

    fn close_cdp(&mut self, lender: Address) {
        let cdp = self.cdp(lender.clone());
        if cdp.asset_lent > 0 {
            panic!("Cannot close CDP with outstanding debt");
        }

        // If there's any remaining collateral, return it to the lender
        if cdp.xlm_deposited > 0 {
            let client = token::Client::new(env(), &self.xlm_sac);
            client.transfer(
                &env().current_contract_address(),
                &lender,
                &cdp.xlm_deposited,
            );
        }

        // FIXME what is the point of having a CLOSED status if they are just removed?
        self.cdps.remove(lender);
    }
}

impl IsCDPAdmin for Token {
    fn cdp_init(
        &self,
        xlm_sac: Address,
        xlm_contract: Address,
        asset_contract: Address,
        pegged_asset: Symbol,
        min_collat_ratio: u32,
        name: String,
        symbol: String,
        decimals: u32,
    ) {
        self::Contract::require_auth();
        Token::set_lazy(Token::new(
            xlm_sac,
            xlm_contract,
            asset_contract,
            pegged_asset,
            min_collat_ratio,
            name,
            symbol,
            decimals, // FIXME: we should use this instead of the data feed to get xasset decimals?
        ));
        MyStabilityPool::set_lazy(MyStabilityPool::new()); // FIXME should there be a sp_init? would we ever want to initialize it separately tot he cdp contract given they are the same contract?
    }
    fn set_xlm_sac(&mut self, to: Address) {
        self::Contract::require_auth();
        self.xlm_sac = to;
    }
    fn set_xlm_contract(&mut self, to: Address) {
        self::Contract::require_auth();
        self.xlm_contract = to;
    }
    fn set_asset_contract(&mut self, to: Address) {
        self::Contract::require_auth();
        self.asset_contract = to;
    }
    fn set_pegged_asset(&mut self, to: Symbol) {
        self::Contract::require_auth();
        self.pegged_asset = to;
    }
    fn set_min_collat_ratio(&mut self, to: u32) -> u32 {
        self::Contract::require_auth();
        self.min_collat_ratio = to;
        to
    }
}

fn native() -> token::Client<'static> {
    stellar_asset!("native")
}

impl IsStabilityPool for Token {
    fn sp_init(&self) {
        Contract::admin_get().unwrap().require_auth();
        MyStabilityPool::set_lazy(MyStabilityPool::new());
    }

    fn deposit(&mut self, from: Address, amount: i128) {
        from.require_auth();
        let mut position =
            self.stability_pool
                .get_deposit(from.clone())
                .unwrap_or(StakerPosition {
                    xasset_deposit: 0,
                    product_constant: self.stability_pool.get_product_constant(),
                    compounded_constant: self.stability_pool.get_compounded_constant(),
                    epoch: 0,
                });

        // Collect 1 XLM fee for each new deposit
        native().transfer(&from.clone(), &env().current_contract_address(), &self.stability_pool.get_deposit_fee());
        self.stability_pool
            .add_fees_collected(self.stability_pool.get_deposit_fee());
        position.xasset_deposit += amount;
        self.stability_pool.set_deposit(from, position);
        self.stability_pool.add_total_xasset(amount);
    }

    fn withdraw(&mut self, to: Address, amount: i128) {
        to.require_auth();
        let mut position = self
            .stability_pool
            .get_deposit(to.clone())
            .unwrap_or_default();
        assert!(position.xasset_deposit >= amount, "Insufficient balance");

        let xasset_owed = if position.epoch == self.stability_pool.get_epoch() {
            (position.xasset_deposit * self.stability_pool.get_product_constant())
                / position.product_constant
        } else {
            0
        };

        assert!(
            xasset_owed >= amount,
            "Insufficient balance after liquidations"
        );

        position.xasset_deposit -= amount;
        self.stability_pool.set_deposit(to, position);
        self.stability_pool.add_total_xasset(-amount);
    }

    fn liquidate(&mut self, cdp_owner: Address) -> (i128, i128) {
        let mut cdp = self.cdp(cdp_owner.clone());
        let debt = cdp.asset_lent;
        let collateral = cdp.xlm_deposited;

        // Check if the CDP is frozen
        if !matches!(cdp.status, CDPStatus::Frozen) {
            panic!("CDP must be frozen to be liquidated");
        }

        // Ensure the debt and collateral are positive
        if debt <= 0 || collateral <= 0 {
            panic!("Debt and collateral must be positive");
        }

        let total_xasset = self.stability_pool.get_total_xasset();

        // Determine how much debt can be repaid from the Stability Pool
        let liquidated_debt = cmp::min(debt, total_xasset);

        // Calculate the proportional amount of collateral to withdraw
        let liquidated_collateral =
            (collateral as u128 * liquidated_debt as u128 / debt as u128) as i128;

        // Update the stability pool
        self.stability_pool.subtract_total_xasset(liquidated_debt);
        self.stability_pool
            .add_total_collateral(liquidated_collateral);

        // Update constants for the stability pool
        self.stability_pool
            .update_constants(liquidated_debt, liquidated_collateral);

        // Burn the liquidated debt
        let sp_address = env().current_contract_address();
        let balance = self.balance(sp_address.clone()) - liquidated_debt;
        self.balances.set(sp_address, balance);

        // Update the CDP
        cdp.xlm_deposited -= liquidated_collateral;
        cdp.asset_lent -= liquidated_debt;

        // If all debt is repaid, close the CDP
        if cdp.asset_lent == 0 {
            // Withdraw any remaining collateral
            if cdp.xlm_deposited > 0 {
                native().transfer(&env().current_contract_address(), &cdp_owner.clone(), &cdp.xlm_deposited);
            }
            // Close the CDP
            self.cdps.remove(cdp_owner);
        } else {
            // Otherwise, update the CDP
            self.set_cdp_from_decorated(cdp_owner, cdp);
        }

        (liquidated_debt, liquidated_collateral)
    }

    fn claim_rewards(&mut self, to: Address) -> i128 {
        to.require_auth();
        let position = self
            .stability_pool
            .get_deposit(to.clone())
            .unwrap_or_default();

        let xlm_reward = if position.epoch == self.stability_pool.get_epoch() {
            (position.xasset_deposit
                * (self.stability_pool.get_compounded_constant() - position.compounded_constant))
                / position.product_constant
        } else {
            0
        };

        self.stability_pool.subtract_total_collateral(xlm_reward);
        native().transfer(&env().current_contract_address(), &to, &xlm_reward);
        xlm_reward
    }

    fn get_deposit(&self, address: Address) -> i128 {
        self.stability_pool
            .get_deposit(address)
            .map_or(0, |p| p.xasset_deposit)
    }

    fn get_total_xasset(&self) -> i128 {
        self.stability_pool.get_total_xasset()
    }

    fn get_total_collateral(&self) -> i128 {
        self.stability_pool.get_total_collateral()
    }

    fn stake(&mut self, from: Address, amount: i128) {
        from.require_auth();

        // Check if the user already has a stake
        if self.stability_pool.get_deposit(from.clone()).is_some() {
            panic!("User already has a stake. Use deposit function to add to existing stake.");
        }

        native().transfer(&from.clone(), &env().current_contract_address(), &self.stability_pool.get_stake_fee());
        // Add stake fee
        self.stability_pool
            .add_fees_collected(self.stability_pool.get_stake_fee());

        // Create new position
        let position = StakerPosition {
            xasset_deposit: amount,
            product_constant: self.stability_pool.get_product_constant(),
            compounded_constant: self.stability_pool.get_compounded_constant(),
            epoch: 0,
        };

        // Set the new position in the stability pool
        self.stability_pool.set_deposit(from, position);
        self.stability_pool.add_total_xasset(amount);
    }

    fn unstake(&mut self, to: Address, amount: i128) {
        to.require_auth();

        let position = self
            .stability_pool
            .get_deposit(to.clone())
            .unwrap_or_default();
        assert!(
            position.xasset_deposit == amount,
            "Must unstake all xAsset to close SP account"
        );

        self.withdraw(to.clone(), amount);

        // Return 2 XLM fee upon closing the SP account
        self.stability_pool
            .subtract_fees_collected(self.stability_pool.get_unstake_return());

        native().transfer(&env().current_contract_address(), &to, &self.stability_pool.get_unstake_return());

        self.stability_pool.remove_deposit(to);
    }
}

impl Token {
    /// Decorate a CDPInternal with the collateralization ratio. Also check if the CDP is insolvent.
    fn decorate(
        &self,
        cdp: CDPInternal,
        lender: Address,
        xlm_price: i128,
        xlm_decimals: u32,
        xasset_price: i128,
        xasset_decimals: u32,
    ) -> CDP {
        // Need to divide in a way that never has a decimal, so decimals don't get truncated (or
        // that has only truncatable decimals as of the final operation).
        //
        // ratio = BASIS_POINTS * XLM locked * XLM's USD price / (xAsset minted * xAsset's USD price)
        //
        //   and: a price = multiplied price from oracle / oracle's number of decimals multiplier
        //   so that:
        //
        // ratio = BASIS_POINTS * XLM locked * (XLM's multiplied USD price / XLM's multiplier)
        //           / (xAsset minted * (xAsset's multiplied USD price / xAsset's USD multiplier)
        // ratio = BASIS_POINTS * XLM locked * XLM's multiplied USD price * xAsset's USD multiplier
        //           / (xAsset minted * XLM's multiplier * xAsset's multiplied USD price)
        //
        // Need to prevent exceeding i128 limit. Multiply the numerator OR denom by min multiplier.
        let (numer_decimals, denom_decimals) = if xlm_decimals == xasset_decimals {
            (0, 0)
        } else if xlm_decimals > xasset_decimals {
            (0, xlm_decimals - xasset_decimals)
        } else {
            (xasset_decimals - xlm_decimals, 0)
        };
        env().events().publish(
            (Symbol::new(&env(), "asset lent"),),
            cdp.asset_lent.clone(),
        );
        let collateralization_ratio = if cdp.asset_lent == 0 || xasset_price == 0 {
            u32::MAX
        } else {
            ((BASIS_POINTS as i128) * cdp.xlm_deposited * xlm_price * 10i128.pow(numer_decimals)
                / (cdp.asset_lent * 10i128.pow(denom_decimals) * xasset_price)) as u32
        };
        CDP {
            lender,
            xlm_deposited: cdp.xlm_deposited,
            asset_lent: cdp.asset_lent,
            collateralization_ratio,
            status: if matches!(cdp.status, CDPStatus::Open)
                && collateralization_ratio < self.min_collat_ratio
            {
                CDPStatus::Insolvent
            } else {
                cdp.status
            },
        }
    }

    fn set_cdp_from_decorated(&mut self, lender: Address, decorated_cdp: CDP) {
        self.cdps.set(
            lender,
            CDPInternal {
                xlm_deposited: decorated_cdp.xlm_deposited,
                asset_lent: decorated_cdp.asset_lent,
                status: decorated_cdp.status,
            },
        );
    }
}
