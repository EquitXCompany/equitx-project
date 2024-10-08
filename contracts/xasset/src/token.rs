use core::cmp;

use loam_sdk::{
    soroban_sdk::{self, contracttype, env, token, Address, Lazy, Map, String, Symbol, Vec},
    IntoKey,
};
use loam_subcontract_core::Core;
use loam_subcontract_ft::{Fungible, IsFungible, IsSep41};

use crate::{collateralized::CDPStatus, data_feed, Error};
use crate::{
    collateralized::{IsCDPAdmin, IsCollateralized, CDP},
    PriceData,
};
use crate::{
    stability_pool::{AvailableAssets, IsStabilityPool, MyStabilityPool, StakerPosition},
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

impl IsSep41 for Token {
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
        if self.balance(from.clone()) < amount {
            panic!("Insufficient balance");
        }
        self.transfer_internal(from, to, amount);
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
        if self.balance(from.clone()) < amount {
            panic!("Insufficient balance");
        }
        self.burn_internal(from, amount);
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
}

impl IsFungible for Token {
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
        self::Contract::require_auth();
        self.mint_internal(to, amount);
    }

    fn clawback(&mut self, from: Address, amount: i128) {
        self::Contract::require_auth();
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

    fn lastprice_xlm(&self) -> Result<PriceData, Error> {
        let env = env();
        let contract = &self.xlm_contract;
        let client = data_feed::Client::new(env, contract);
        match client.try_lastprice(&data_feed::Asset::Other(Symbol::new(env, "XLM"))) {
            Ok(price_data_option) => match price_data_option {
                core::prelude::v1::Ok(Some(data_feed::PriceData { price, timestamp })) => {
                    Ok(PriceData { price, timestamp })
                }
                core::prelude::v1::Ok(None) => Err(Error::OraclePriceFetchFailed),
                Err(_) => Err(Error::OraclePriceFetchFailed),
            },
            Err(_) => Err(Error::OraclePriceFetchFailed),
        }
    }

    fn lastprice_asset(&self) -> Result<PriceData, Error> {
        let env = env();
        let contract = &self.asset_contract;
        let asset = &self.pegged_asset;
        let client = data_feed::Client::new(env, contract);

        match client.try_lastprice(&data_feed::Asset::Other(asset.clone())) {
            Ok(price_data_option) => match price_data_option {
                core::prelude::v1::Ok(Some(data_feed::PriceData { price, timestamp })) => {
                    Ok(PriceData { price, timestamp })
                }
                core::prelude::v1::Ok(None) => Err(Error::OraclePriceFetchFailed),
                Err(_) => Err(Error::OraclePriceFetchFailed),
            },
            Err(_) => Err(Error::OraclePriceFetchFailed),
        }
    }

    fn decimals_xlm_feed(&self) -> Result<u32, Error> {
        let env = env();
        let contract = &self.xlm_contract;
        let client = data_feed::Client::new(env, contract);

        match client.try_decimals() {
            Ok(decimals_result) => match decimals_result {
                core::prelude::v1::Ok(decimals) => Ok(decimals),
                Err(_) => Err(Error::OracleDecimalsFetchFailed),
            },
            Err(_) => Err(Error::OracleDecimalsFetchFailed),
        }
    }

    fn decimals_asset_feed(&self) -> Result<u32, Error> {
        let env = env();
        let contract = &self.asset_contract;
        let client = data_feed::Client::new(env, contract);

        match client.try_decimals() {
            Ok(decimals_result) => match decimals_result {
                core::prelude::v1::Ok(decimals) => Ok(decimals),
                Err(_) => Err(Error::OracleDecimalsFetchFailed),
            },
            Err(_) => Err(Error::OracleDecimalsFetchFailed),
        }
    }

    fn open_cdp(
        &mut self,
        lender: Address,
        collateral: i128,
        asset_lent: i128,
    ) -> Result<(), Error> {
        lender.require_auth();

        let env = env();

        // 1. check if lender already has a CDP
        if self.cdps.contains_key(lender.clone()) {
            return Err(Error::CDPAlreadyExists);
        }

        // 2. check that `lastprice` gives collateralization ratio over `min_collat_ratio`
        let cdp = CDPInternal::new(collateral, asset_lent);
        let xlm_price = self.lastprice_xlm()?;
        let xlm_decimals = self.decimals_xlm_feed()?;
        let xasset_price = self.lastprice_asset()?;
        let xasset_decimals = self.decimals_asset_feed()?;
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
            return Err(Error::InsufficientCollateralization);
        }

        // 3. transfer attached XLM to this contract
        let _ = self
            .native()
            .try_transfer(&lender, &env.current_contract_address(), &collateral)
            .map_err(|_| Error::XLMTransferFailed)?;

        // 4. mint `asset_lent` of this token to `address`
        self.mint_internal(lender.clone(), asset_lent);

        // 5. create CDP
        self.cdps.set(lender, cdp);
        Ok(())
    }

    fn cdp(&self, lender: Address) -> Result<CDP, Error> {
        let cdp = self.cdps.get(lender.clone()).ok_or(Error::CDPNotFound)?;
        let xlm_price = self.lastprice_xlm()?;
        let xlm_decimals = self.decimals_xlm_feed()?;
        let xasset_price = self.lastprice_asset()?;
        let xasset_decimals = self.decimals_asset_feed()?;
        Ok(self.decorate(
            cdp,
            lender,
            xlm_price.price,
            xlm_decimals,
            xasset_price.price,
            xasset_decimals,
        ))
    }

    fn cdps(&self) -> Result<Vec<CDP>, Error> {
        let mut cdps: Vec<CDP> = Vec::new(env());
        let xlm_price = self.lastprice_xlm()?;
        let xlm_decimals = self.decimals_xlm_feed()?;
        let xasset_price = self.lastprice_asset()?;
        let xasset_decimals = self.decimals_asset_feed()?;
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
        Ok(cdps)
    }

    fn freeze_cdp(&mut self, lender: Address) -> Result<(), Error> {
        let mut cdp = self.cdp(lender.clone())?;
        if matches!(cdp.status, CDPStatus::Insolvent) {
            cdp.status = CDPStatus::Frozen;
            self.set_cdp_from_decorated(lender, cdp);
            Ok(())
        } else {
            Err(Error::CDPNotInsolvent)
        }
    }

    fn add_collateral(&mut self, lender: Address, amount: i128) -> Result<(), Error> {
        lender.require_auth();
        let mut cdp = self.cdp(lender.clone())?;

        if matches!(cdp.status, CDPStatus::Closed) || matches!(cdp.status, CDPStatus::Frozen) {
            return Err(Error::CDPNotOpenOrInsolvent);
        }

        // Transfer XLM from lender to contract
        let _ = self
            .native()
            .try_transfer(&lender, &env().current_contract_address(), &amount)
            .map_err(|_| Error::XLMTransferFailed)?;

        cdp.xlm_deposited += amount;
        self.set_cdp_from_decorated(lender, cdp);
        Ok(())
    }

    fn withdraw_collateral(&mut self, lender: Address, amount: i128) -> Result<(), Error> {
        lender.require_auth();
        let mut cdp = self.cdp(lender.clone())?;

        if matches!(cdp.status, CDPStatus::Closed) || matches!(cdp.status, CDPStatus::Frozen) {
            return Err(Error::CDPNotOpenOrInsolvent);
        }

        if cdp.xlm_deposited < amount {
            return Err(Error::InsufficientCollateral);
        }

        let new_cdp = self.decorate(
            CDPInternal {
                xlm_deposited: cdp.xlm_deposited - amount,
                asset_lent: cdp.asset_lent,
                status: cdp.status,
            },
            lender.clone(),
            self.lastprice_xlm()?.price,
            self.decimals_xlm_feed()?,
            self.lastprice_asset()?.price,
            self.decimals_asset_feed()?,
        );

        if new_cdp.collateralization_ratio < self.min_collat_ratio {
            return Err(Error::InvalidWithdrawal);
        }

        // Transfer XLM from contract to lender
        let _ = self
            .native()
            .try_transfer(&env().current_contract_address(), &lender, &amount)
            .map_err(|_| Error::XLMTransferFailed)?;

        cdp.xlm_deposited -= amount;
        self.set_cdp_from_decorated(lender, cdp);
        Ok(())
    }

    fn borrow_xasset(&mut self, lender: Address, amount: i128) -> Result<(), Error> {
        lender.require_auth();
        let mut cdp = self.cdp(lender.clone())?;

        if !matches!(cdp.status, CDPStatus::Open) {
            return Err(Error::CDPNotOpen);
        }

        let new_cdp = self.decorate(
            CDPInternal {
                xlm_deposited: cdp.xlm_deposited,
                asset_lent: cdp.asset_lent + amount,
                status: cdp.status,
            },
            lender.clone(),
            self.lastprice_xlm()?.price,
            self.decimals_xlm_feed()?,
            self.lastprice_asset()?.price,
            self.decimals_asset_feed()?,
        );

        if new_cdp.collateralization_ratio < self.min_collat_ratio {
            return Err(Error::InsufficientCollateralization);
        }

        // mint xasset
        self.mint_internal(lender.clone(), amount);

        cdp.asset_lent += amount;
        self.set_cdp_from_decorated(lender, cdp);
        Ok(())
    }

    fn repay_debt(&mut self, lender: Address, amount: i128) -> Result<(), Error> {
        lender.require_auth();
        let mut cdp = self.cdp(lender.clone())?;

        if matches!(cdp.status, CDPStatus::Closed) || matches!(cdp.status, CDPStatus::Frozen) {
            return Err(Error::CDPNotOpenOrInsolventForRepay);
        }

        if cdp.asset_lent < amount {
            return Err(Error::RepaymentExceedsDebt);
        }

        // check to ensure enough xasset is available
        if self.balance(lender.clone()) < amount {
            return Err(Error::InsufficientBalance);
        }

        //burn the xasset
        self.burn_internal(lender.clone(), amount);

        cdp.asset_lent -= amount;

        if cdp.asset_lent == 0 && cdp.xlm_deposited == 0 {
            self.close_cdp(lender)?;
        } else {
            self.set_cdp_from_decorated(lender, cdp);
        }
        Ok(())
    }

    fn liquidate_cdp(&mut self, lender: Address) -> Result<(i128, i128), Error> {
        self.liquidate(lender)
    }

    fn merge_cdps(&mut self, lenders: Vec<Address>) -> Result<(), Error> {
        if lenders.len() < 2 {
            return Err(Error::InvalidMerge);
        }

        let mut total_xlm = 0;
        let mut total_asset = 0;

        for lender in lenders.iter() {
            let cdp = self.cdp(lender.clone())?;
            if !matches!(cdp.status, CDPStatus::Frozen) {
                return Err(Error::InvalidMerge);
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
        Ok(())
    }

    fn close_cdp(&mut self, lender: Address) -> Result<(), Error> {
        let cdp = self.cdp(lender.clone())?;
        if cdp.asset_lent > 0 {
            return Err(Error::OutstandingDebt);
        }

        // If there's any remaining collateral, return it to the lender
        if cdp.xlm_deposited > 0 {
            let _ = self
                .native()
                .try_transfer(
                    &env().current_contract_address(),
                    &lender,
                    &cdp.xlm_deposited,
                )
                .map_err(|_| Error::XLMTransferFailed)?;
        }

        self.cdps.remove(lender);
        Ok(())
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

impl IsStabilityPool for Token {
    fn sp_init(&self) {
        Contract::admin_get().unwrap().require_auth();
        MyStabilityPool::set_lazy(MyStabilityPool::new());
    }

    fn deposit(&mut self, from: Address, amount: i128) -> Result<(), Error> {
        from.require_auth();
        // check if the user has sufficient xasset
        let balance = self.balance(from.clone());
        if balance < amount {
            return Err(Error::InsufficientBalance);
        }
        let current_position = self.get_deposit(from.clone())?;
        let mut position =
            self.stability_pool
                .get_deposit(from.clone())
                .unwrap_or(StakerPosition {
                    xasset_deposit: 0,
                    product_constant: self.stability_pool.get_product_constant(),
                    compounded_constant: self.stability_pool.get_compounded_constant(),
                    epoch: self.stability_pool.get_epoch(),
                });
        if position.epoch != self.stability_pool.get_epoch() {
            return Err(Error::ClaimRewardsFirst);
        }
        // Collect 1 XLM fee for each new deposit
        let _ = self
            .native()
            .try_transfer(
                &from.clone(),
                &env().current_contract_address(),
                &self.stability_pool.get_deposit_fee(),
            )
            .map_err(|_| Error::XLMTransferFailed)?;
        self.stability_pool
            .add_fees_collected(self.stability_pool.get_deposit_fee());
        position.xasset_deposit = current_position + amount;
        position.compounded_constant = self.stability_pool.get_compounded_constant();
        position.product_constant = self.stability_pool.get_product_constant();
        // transfer xasset from address to pool
        self.transfer_internal(from.clone(), env().current_contract_address(), amount);
        self.stability_pool.set_deposit(from, position);
        self.stability_pool.add_total_xasset(amount);
        Ok(())
    }
    // Modified withdraw method
    fn withdraw(&mut self, to: Address, amount: i128) -> Result<(), Error> {
        to.require_auth();
        self.withdraw_internal(to, amount)
    }

    fn liquidate(&mut self, cdp_owner: Address) -> Result<(i128, i128), Error> {
        let mut cdp = self.cdp(cdp_owner.clone())?;
        let debt = cdp.asset_lent;
        let collateral = cdp.xlm_deposited;

        // Check if the CDP is frozen
        if !matches!(cdp.status, CDPStatus::Frozen) {
            return Err(Error::InvalidLiquidation);
        }

        // Ensure the debt and collateral are positive
        if debt <= 0 || collateral <= 0 {
            return Err(Error::InvalidLiquidation);
        }

        let total_xasset = self.stability_pool.get_total_xasset();

        // Determine how much debt can be repaid from the Stability Pool
        let liquidated_debt = cmp::min(debt, total_xasset);

        // Calculate the proportional amount of collateral to withdraw
        let liquidated_collateral =
            (collateral as u128 * liquidated_debt as u128 / debt as u128) as i128;

        // Update constants for the stability pool
        self.stability_pool
            .update_constants(liquidated_debt, liquidated_collateral);

        // Update the stability pool
        self.stability_pool.subtract_total_xasset(liquidated_debt);
        self.stability_pool
            .add_total_collateral(liquidated_collateral);

        // Burn the liquidated debt
        self.burn_internal(env().current_contract_address(), liquidated_debt);

        // Update the CDP
        cdp.xlm_deposited -= liquidated_collateral;
        cdp.asset_lent -= liquidated_debt;

        // If all debt is repaid, close the CDP
        if cdp.asset_lent == 0 {
            self.cdps.remove(cdp_owner);
        } else {
            // Otherwise, update the CDP
            self.set_cdp_from_decorated(cdp_owner, cdp);
        }

        Ok((liquidated_debt, liquidated_collateral))
    }

    fn claim_rewards(&mut self, to: Address) -> Result<i128, Error> {
        to.require_auth();
        let mut position = self
            .stability_pool
            .get_deposit(to.clone())
            .ok_or(Error::StakeDoesntExist)?;

        let xlm_reward = self.calculate_rewards(&position);

        let _ = self
            .native()
            .try_transfer(&env().current_contract_address(), &to, &xlm_reward)
            .map_err(|_| Error::XLMTransferFailed)?;
        self.stability_pool.subtract_total_collateral(xlm_reward);
        position.epoch = self.stability_pool.get_epoch();
        position.xasset_deposit = self.get_deposit(to.clone())?;
        position.compounded_constant = self.stability_pool.get_compounded_constant();
        position.product_constant = self.stability_pool.get_product_constant();
        self.stability_pool.set_deposit(to, position);
        Ok(xlm_reward)
    }

    fn get_deposit(&self, address: Address) -> Result<i128, Error> {
        match self.stability_pool.get_deposit(address) {
            Some(position) => Ok(self.calculate_current_deposit(&position)),
            None => Err(Error::StakeDoesntExist),
        }
    }

    fn get_total_xasset(&self) -> i128 {
        self.stability_pool.get_total_xasset()
    }

    fn get_total_collateral(&self) -> i128 {
        self.stability_pool.get_total_collateral()
    }

    fn stake(&mut self, from: Address, amount: i128) -> Result<(), Error> {
        from.require_auth();

        // Check if the user already has a stake
        if self.stability_pool.get_deposit(from.clone()).is_some() {
            return Err(Error::StakeAlreadyExists);
        }
        // check if the user has sufficient xasset
        let balance = self.balance(from.clone());
        if balance < amount {
            return Err(Error::InsufficientBalance);
        }

        let _ = self
            .native()
            .try_transfer(
                &from.clone(),
                &env().current_contract_address(),
                &self.stability_pool.get_stake_fee(),
            )
            .map_err(|_| Error::XLMTransferFailed)?;
        // Add stake fee
        self.stability_pool
            .add_fees_collected(self.stability_pool.get_stake_fee());

        // Create new position
        let position = StakerPosition {
            xasset_deposit: amount,
            product_constant: self.stability_pool.get_product_constant(),
            compounded_constant: self.stability_pool.get_compounded_constant(),
            epoch: self.stability_pool.get_epoch(),
        };
        // transfer xasset from address to pool
        self.transfer_internal(from.clone(), env().current_contract_address(), amount);

        // Set the new position in the stability pool
        self.stability_pool.set_deposit(from, position);
        self.stability_pool.add_total_xasset(amount);
        Ok(())
    }

    // Modified unstake method
    fn unstake(&mut self, staker: Address) -> Result<(), Error> {
        staker.require_auth();

        self.stability_pool
            .get_deposit(staker.clone())
            .ok_or_else(|| Error::StakeDoesntExist)?;

        let amount = self.get_deposit(staker.clone())?;

        self.withdraw_internal(staker, amount)
    }

    fn get_available_assets(&self, staker: Address) -> Result<AvailableAssets, Error> {
        match self.stability_pool.get_deposit(staker) {
            Some(position) => {
                let d = self.calculate_current_deposit(&position);
                let xlm_reward = self.calculate_rewards(&position);
                Ok(AvailableAssets {
                    available_xasset: d,
                    available_rewards: xlm_reward,
                })
            }
            None => Err(Error::StakeDoesntExist),
        }
    }

    fn get_position(&self, staker: Address) -> Result<StakerPosition, Error> {
        match self.stability_pool.get_deposit(staker) {
            Some(position) => {
                Ok(position)
            }
            None => Err(Error::StakeDoesntExist),
        }
    }

    fn get_constants(&self) -> StakerPosition {
        StakerPosition {
            compounded_constant: self.stability_pool.get_compounded_constant(),
            product_constant: self.stability_pool.get_product_constant(),
            epoch: self.stability_pool.get_epoch(),
            xasset_deposit: self.stability_pool.get_total_xasset()
        }
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
        let collateralization_ratio = if cdp.asset_lent == 0 || xasset_price == 0 {
            u32::MAX
        } else {
            (BASIS_POINTS * cdp.xlm_deposited * xlm_price * 10i128.pow(numer_decimals)
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

    fn native(&self) -> token::Client {
        token::Client::new(env(), &self.xlm_sac)
    }

    // convenience functions for internal minting / transfering of the ft asset
    fn mint_internal(&mut self, to: Address, amount: i128) {
        let balance = self.balance(to.clone()) + amount;
        self.balances.set(to, balance);
    }

    fn transfer_internal(&mut self, from: Address, to: Address, amount: i128) {
        let from_balance = self.balance(from.clone()) - amount;
        let to_balance = self.balance(to.clone()) + amount;
        self.balances.set(from, from_balance);
        self.balances.set(to, to_balance);
    }

    fn burn_internal(&mut self, from: Address, amount: i128) {
        let balance = self.balance(from.clone()) - amount;
        self.balances.set(from, balance);
    }

    // New common method
    fn withdraw_internal(&mut self, to: Address, amount: i128) -> Result<(), Error> {
        let xasset_owed = self.get_deposit(to.clone())?;
        if xasset_owed < amount {
            return Err(Error::InsufficientStake);
        }
        if xasset_owed == amount {
            //close the position

            // Return 2 XLM fee upon closing the SP account
            let _ = self
                .native()
                .try_transfer(
                    &env().current_contract_address(),
                    &to,
                    &self.stability_pool.get_unstake_return(),
                )
                .map_err(|_| Error::XLMTransferFailed)?;
            self.stability_pool
                .subtract_fees_collected(self.stability_pool.get_unstake_return());

            // transfer xasset to address from pool
            self.transfer_internal(env().current_contract_address(), to.clone(), amount);
            self.stability_pool.remove_deposit(to);
            self.stability_pool.add_total_xasset(-amount);
            return Ok(());
        }
        let mut position = self
            .stability_pool
            .get_deposit(to.clone())
            .unwrap_or_default();

        position.xasset_deposit = xasset_owed - amount;

        position.compounded_constant = self.stability_pool.get_compounded_constant();
        position.product_constant = self.stability_pool.get_product_constant();
        // transfer xasset from pool to address
        self.transfer_internal(env().current_contract_address(), to.clone(), amount);
        self.stability_pool.set_deposit(to, position);
        self.stability_pool.add_total_xasset(-amount);
        Ok(())
    }

    fn calculate_current_deposit(&self, position: &StakerPosition) -> i128 {
        if position.epoch == self.stability_pool.get_epoch() {
            (position.xasset_deposit * self.stability_pool.get_product_constant())
                / position.product_constant
        } else {
            0
        }
    }

    fn calculate_rewards(&self, position: &StakerPosition) -> i128 {
        if position.epoch == self.stability_pool.get_epoch() {
            (position.xasset_deposit
                * (self.stability_pool.get_compounded_constant() - position.compounded_constant))
                / position.product_constant
        } else {
            (position.xasset_deposit
                * (self
                    .stability_pool
                    .get_compounded_epoch(position.epoch)
                    .expect("The historical compounded constant should always be recorded")
                    - position.compounded_constant))
                / position.product_constant
        }
    }
}
