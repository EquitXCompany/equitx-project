use core::cmp;

use loam_sdk::loamstorage;
use loam_sdk::soroban_sdk::{
    self, env, panic_with_error, token, Address, InstanceItem, LoamKey, PersistentItem,
    PersistentMap, String, Symbol, Vec,
};
use loam_subcontract_ft::{Fungible, IsFungible, IsSep41};

use crate::storage::{Allowance, CDPInternal, Interest, InterestDetail};
use crate::{collateralized::CDPStatus, data_feed, storage::Txn, Error};
use crate::{
    collateralized::{CDPContract, IsCDPAdmin, IsCollateralized},
    PriceData,
};
use crate::{
    stability_pool::{AvailableAssets, IsStabilityPool, StakerPosition},
    Contract,
};

const BASIS_POINTS: i128 = 10_000;
const PRODUCT_CONSTANT: i128 = 1_000_000_000;
const DEPOSIT_FEE: i128 = 10_000_000;
const STAKE_FEE: i128 = 70_000_000;
const UNSTAKE_RETURN: i128 = 20_000_000;
// Constants for interest calculation
const SECONDS_PER_YEAR: u64 = 31_536_000; // 365 days
const INTEREST_PRECISION: i128 = 1_000_000_000; // 9 decimal places for precision
const DEFAULT_PRECISION: i128 = 10_000_000; // 7 decimal places for precision

fn bankers_round(value: i128, precision: i128) -> i128 {
    let half = precision / 2;

    // Calculate remainder and halfway point
    let remainder = value.rem_euclid(precision);
    let halfway = precision - half; // This is effectively (precision / 2)

    // Determine if we are exactly in the middle
    let is_middle = remainder == half || remainder == halfway;

    // Compute rounded value
    if is_middle {
        // Check if the current value is even, if so, round down; otherwise, round up
        if (value / precision) % 2 == 0 {
            value / precision
        } else {
            value / precision + 1
        }
    } else if remainder < half {
        value / precision
    } else {
        value / precision + 1
    }
}

fn calculate_collateralization_ratio(
    asset_lent: i128,
    xasset_price: i128,
    xlm_deposited: i128,
    xlm_price: i128,
    xlm_decimals: u32,
    xasset_decimals: u32,
    accrued_interest: i128,
) -> u32 {
    let (numer_decimals, denom_decimals) = if xlm_decimals == xasset_decimals {
        (0, 0)
    } else if xlm_decimals > xasset_decimals {
        (0, xlm_decimals - xasset_decimals)
    } else {
        (xasset_decimals - xlm_decimals, 0)
    };

    let collateralization_ratio = if asset_lent == 0 || xasset_price == 0 {
        u32::MAX
    } else {
        // Include accrued interest in the calculation: (a - i)b / (mp)
        let effective_xlm = xlm_deposited.saturating_sub(accrued_interest);
        (BASIS_POINTS * effective_xlm * xlm_price * 10i128.pow(numer_decimals)
            / (asset_lent * 10i128.pow(denom_decimals) * xasset_price)) as u32
    };
    collateralization_ratio
}

#[loamstorage]
#[derive(Default)]
pub struct Token {
    /// Name of the token
    name: InstanceItem<String>,
    /// Mapping of account addresses to their token balances
    balances: PersistentMap<Address, i128>,
    /// Mapping of transactions to their associated allowances
    allowances: PersistentMap<Txn, Allowance>,
    /// Mapping of addresses to their authorization status
    authorized: PersistentMap<Address, bool>,
    /// Symbol of the token
    symbol: InstanceItem<String>,
    /// Number of decimal places for token amounts
    decimals: InstanceItem<u32>,
    /// XLM Stellar Asset Contract address, for XLM transfers
    xlm_sac: InstanceItem<Address>,
    /// Oracle contract ID for XLM price feed
    xlm_contract: InstanceItem<Address>,
    /// Oracle contract ID for asset price feed
    asset_contract: InstanceItem<Address>,
    /// Oracle asset ID this asset tracks.
    pegged_asset: InstanceItem<Symbol>,
    /// basis points; default 110%; updateable by admin
    min_collat_ratio: InstanceItem<u32>,
    /// each Address can only have one CDP per Asset
    cdps: PersistentMap<Address, CDPInternal>,
    /* stability pool fields */
    /// stability pool deposits
    deposits: PersistentMap<Address, StakerPosition>,
    /// stability pool compound records
    compound_record: PersistentMap<u64, i128>,
    /// stability pool interest collected records
    interest_record: PersistentMap<u64, i128>,
    /// total xasset in the stability pool
    total_xasset: PersistentItem<i128>,
    /// total collateral in the stability pool
    total_collateral: PersistentItem<i128>,
    /// current product constant of the stability pool
    product_constant: PersistentItem<i128>,
    /// current compounded constant of the stability pool
    compounded_constant: PersistentItem<i128>,
    /// current epoch of the stability pool
    epoch: PersistentItem<u64>,
    /// current total of collected fees for stability pool
    fees_collected: PersistentItem<i128>,
    /// stability pool deposit fee
    deposit_fee: InstanceItem<i128>,
    /// stability pool stake fee
    stake_fee: InstanceItem<i128>,
    /// stability pool fee amount returned upon unstaking
    unstake_return: InstanceItem<i128>,
    /// Annual interest rate in basis points (e.g., 500 = 5%)
    interest_rate: InstanceItem<u32>,
    /// Total interest collected (in XLM) by the protocol
    interest_collected: InstanceItem<i128>,
}

impl Token {
    #[allow(clippy::too_many_arguments)]
    pub fn init(
        xlm_sac: Address,
        xlm_contract: Address,
        asset_contract: Address,
        pegged_asset: Symbol,
        min_collat_ratio: u32,
        name: String,
        symbol: String,
        decimals: u32,
        annual_interest_rate: u32,
    ) {
        let mut token = Token::default();
        token.xlm_sac.set(&xlm_sac);
        token.xlm_contract.set(&xlm_contract);
        token.asset_contract.set(&asset_contract);
        token.pegged_asset.set(&pegged_asset);
        token.min_collat_ratio.set(&min_collat_ratio);
        token.name.set(&name);
        token.symbol.set(&symbol);
        token.decimals.set(&decimals);
        token.total_xasset.set(&0);
        token.total_collateral.set(&0);
        token.product_constant.set(&PRODUCT_CONSTANT);
        token.compounded_constant.set(&0);
        token.epoch.set(&0);
        token.fees_collected.set(&0);
        token.deposit_fee.set(&DEPOSIT_FEE);
        token.stake_fee.set(&STAKE_FEE);
        token.unstake_return.set(&UNSTAKE_RETURN);
        token.interest_collected.set(&0);
        token.interest_rate.set(&annual_interest_rate);
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
            &Allowance {
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
            panic_with_error!(env(), Error::InsufficientBalance);
        }
        self.transfer_internal(from, to, amount);
    }

    fn transfer_from(&mut self, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        let allowance = self.allowance(from.clone(), spender.clone());
        if allowance >= amount {
            self.transfer_internal(from.clone(), to, amount);
            self.decrease_allowance(from, spender, amount);
        }
    }

    fn burn(&mut self, from: Address, amount: i128) {
        from.require_auth();
        if self.balance(from.clone()) < amount {
            panic_with_error!(env(), Error::InsufficientBalance);
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
            .get()
            .expect("Decimals need to be initialized")
    }

    fn name(&self) -> String {
        self.name
            .get()
            .expect("Name needs to be initialized")
            .clone()
    }

    fn symbol(&self) -> String {
        self.symbol
            .get()
            .expect("Symbol needs to be initialized")
            .clone()
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
            &Allowance {
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
            &Allowance {
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
        self.authorized.set(id, &authorize);
    }

    fn mint(&mut self, to: Address, amount: i128) {
        self::Contract::require_auth();
        self.mint_internal(to, amount);
    }

    fn clawback(&mut self, from: Address, amount: i128) {
        self::Contract::require_auth();
        let balance = self.balance(from.clone()) - amount;
        self.balances.set(from, &balance);
    }

    fn set_admin(&mut self, new_admin: Address) {
        self::Contract::require_auth();
        Contract::set_admin(new_admin);
    }
}

impl IsCollateralized for Token {
    fn xlm_contract(&self) -> Address {
        self.xlm_contract
            .get()
            .expect("XLM contract address needs to be initialized")
            .clone()
    }

    fn xlm_sac(&self) -> Address {
        self.xlm_sac
            .get()
            .expect("XLM stellar asset contract address needs to be initialized")
            .clone()
    }

    fn asset_contract(&self) -> Address {
        self.asset_contract
            .get()
            .expect("Asset contract address needs to be initialized")
            .clone()
    }

    fn pegged_asset(&self) -> Symbol {
        self.pegged_asset
            .get()
            .expect("Pegged asset needs to be initialized")
            .clone()
    }

    fn minimum_collateralization_ratio(&self) -> u32 {
        self.min_collat_ratio
            .get()
            .expect("Minimum collateralization ratio needs to be initialized")
    }

    fn lastprice_xlm(&self) -> Result<PriceData, Error> {
        let env = env();
        let contract = &self.xlm_contract();
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
        let contract = &self.asset_contract();
        let asset = &self.pegged_asset();
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
        let contract = &self.xlm_contract();
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
        let contract = &self.asset_contract();
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
        if self.cdps.has(lender.clone()) {
            return Err(Error::CDPAlreadyExists);
        }

        // 2. check that `lastprice` gives collateralization ratio over `min_collat_ratio`
        let cdp = CDPInternal::new(collateral, asset_lent, env.ledger().timestamp());
        let xlm_price = self.lastprice_xlm()?;
        let xlm_decimals = self.decimals_xlm_feed()?;
        let xasset_price = self.lastprice_asset()?;
        let xasset_decimals = self.decimals_asset_feed()?;
        let CDPContract {
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
        if collateralization_ratio < self.minimum_collateralization_ratio() {
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
        self.cdps.set(lender.clone(), &cdp.clone());

        #[cfg(feature = "mercury")]
        crate::index_types::CDP {
            id: lender.clone(),
            xlm_deposited: cdp.xlm_deposited,
            asset_lent: cdp.asset_lent,
            accrued_interest: cdp.accrued_interest.amount,
            interest_paid: cdp.accrued_interest.paid,
            last_interest_time: cdp.last_interest_time,
            status: cdp.status,
            ledger: env.ledger().sequence(),
            timestamp: env.ledger().timestamp(),
        }
        .emit(env);
        Ok(())
    }

    fn cdp(&self, lender: Address) -> Result<CDPContract, Error> {
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
                accrued_interest: cdp.accrued_interest,
                last_interest_time: cdp.last_interest_time,
            },
            lender.clone(),
            self.lastprice_xlm()?.price,
            self.decimals_xlm_feed()?,
            self.lastprice_asset()?.price,
            self.decimals_asset_feed()?,
        );

        if new_cdp.collateralization_ratio < self.minimum_collateralization_ratio() {
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

        if matches!(cdp.status, CDPStatus::Closed) || matches!(cdp.status, CDPStatus::Frozen) {
            return Err(Error::CDPNotOpenOrInsolvent);
        }

        let new_cdp = self.decorate(
            CDPInternal {
                xlm_deposited: cdp.xlm_deposited,
                asset_lent: cdp.asset_lent + amount,
                status: cdp.status,
                accrued_interest: cdp.accrued_interest,
                last_interest_time: cdp.last_interest_time,
            },
            lender.clone(),
            self.lastprice_xlm()?.price,
            self.decimals_xlm_feed()?,
            self.lastprice_asset()?.price,
            self.decimals_asset_feed()?,
        );

        if new_cdp.collateralization_ratio < self.minimum_collateralization_ratio() {
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

        // Pay off any interest first
        cdp = self.pay_interest_from(lender.clone())?;

        // Now continue with debt repayment
        if cdp.asset_lent < amount {
            return Err(Error::RepaymentExceedsDebt);
        }

        // Check to ensure enough xasset is available
        if self.balance(lender.clone()) < amount {
            return Err(Error::InsufficientBalance);
        }

        // Burn the xasset
        self.burn_internal(lender.clone(), amount);

        cdp.asset_lent -= amount;

        if cdp.asset_lent == 0 && cdp.xlm_deposited == 0 {
            self.close_cdp(lender)?;
        } else {
            self.set_cdp_from_decorated(lender, cdp);
        }
        Ok(())
    }

    fn liquidate_cdp(&mut self, lender: Address) -> Result<(i128, i128, CDPStatus), Error> {
        self.liquidate(lender)
    }

    fn get_accrued_interest(&self, lender: Address) -> Result<InterestDetail, Error> {
        let cdp = self.cdps.get(lender.clone()).ok_or(Error::CDPNotFound)?;
        let (interest, last_interest_time) = self.get_updated_accrued_interest(&cdp)?;

        // Calculate approvalAmount: Projected interest 5 minutes ahead
        let now = env().ledger().timestamp();
        let five_min_later = now + 300; // 5 minutes in seconds

        // Project interest 5 minutes ahead
        let projected_interest =
            self.get_projected_interest(&cdp, cdp.last_interest_time, five_min_later)?;
        let approval_amount = self.convert_xasset_to_xlm(projected_interest.amount)?;

        // Calculate interest in XLM
        let amount_in_xlm = self.convert_xasset_to_xlm(interest.amount)?;

        Ok(InterestDetail {
            amount: interest.amount,
            paid: interest.paid,
            amount_in_xlm,
            approval_amount,
            last_interest_time,
        })
    }

    fn pay_interest(
        &mut self,
        lender: Address,
        amount_in_xasset: i128,
    ) -> Result<CDPContract, Error> {
        lender.require_auth();

        if amount_in_xasset <= 0 {
            return Err(Error::InterestRepaidNotPositive);
        }
        self.apply_interest_payment(lender, amount_in_xasset, |s, lender, amount_in_xlm| {
            match s
                .native()
                .try_transfer(lender, &env().current_contract_address(), amount_in_xlm)
            {
                Ok(Ok(())) => Ok(()), // both contract invocation and logic succeeded
                Ok(Err(_)) => Err(Error::XLMTransferFailed), // invocation succeeded but logic failed
                Err(_) => Err(Error::XLMInvocationFailed),   // invocation (host error) failed
            }
        })
    }

    fn merge_cdps(&mut self, lenders: Vec<Address>) -> Result<(), Error> {
        if lenders.len() < 2 {
            return Err(Error::InvalidMerge);
        }

        let mut total_xlm = 0;
        let mut total_asset = 0;
        let mut total_interest: Interest = Interest::default();

        for lender in lenders.iter() {
            let cdp = self.cdp(lender.clone())?;
            if !matches!(cdp.status, CDPStatus::Frozen) {
                return Err(Error::InvalidMerge);
            }
            total_xlm += cdp.xlm_deposited;
            total_asset += cdp.asset_lent;
            total_interest.amount += cdp.accrued_interest.amount;
            total_interest.paid += cdp.accrued_interest.paid;
        }

        // Merge into the first CDP
        let merged_cdp = CDPInternal {
            xlm_deposited: total_xlm,
            asset_lent: total_asset,
            status: CDPStatus::Frozen,
            accrued_interest: total_interest,
            last_interest_time: env().ledger().timestamp(),
        };
        let first_lender = lenders.get(0).unwrap();
        self.cdps.set(first_lender.clone(), &merged_cdp);

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
        annual_interest_rate: u32,
    ) {
        self::Contract::require_auth();
        Token::init(
            xlm_sac,
            xlm_contract,
            asset_contract,
            pegged_asset,
            min_collat_ratio,
            name,
            symbol,
            decimals, // FIXME: we should use this instead of the data feed to get xasset decimals?
            annual_interest_rate,
        );
    }
    fn set_xlm_sac(&mut self, to: Address) {
        self::Contract::require_auth();
        self.xlm_sac.set(&to);
    }
    fn set_xlm_contract(&mut self, to: Address) {
        self::Contract::require_auth();
        self.xlm_contract.set(&to);
    }
    fn set_asset_contract(&mut self, to: Address) {
        self::Contract::require_auth();
        self.asset_contract.set(&to);
    }
    fn set_pegged_asset(&mut self, to: Symbol) {
        self::Contract::require_auth();
        self.pegged_asset.set(&to);
    }
    fn set_min_collat_ratio(&mut self, to: u32) -> u32 {
        self::Contract::require_auth();
        self.min_collat_ratio.set(&to);
        to
    }
    fn set_interest_rate(&mut self, new_rate: u32) -> u32 {
        self::Contract::require_auth();
        self.set_annual_interest_rate(new_rate);
        new_rate
    }

    fn get_interest_rate(&self) -> u32 {
        self.get_annual_interest_rate()
    }

    fn get_total_interest_collected(&self) -> i128 {
        self.get_total_interest_collected()
    }
}

impl IsStabilityPool for Token {
    fn deposit(&mut self, from: Address, amount: i128) -> Result<(), Error> {
        from.require_auth();
        // check if the user has sufficient xasset
        let balance = self.balance(from.clone());
        if balance < amount {
            return Err(Error::InsufficientBalance);
        }
        let current_position = self.get_staker_deposit_amount(from.clone())?;
        let mut position = self.get_deposit(from.clone()).unwrap_or(StakerPosition {
            xasset_deposit: 0,
            product_constant: self.get_product_constant(),
            compounded_constant: self.get_compounded_constant(),
            epoch: self.get_epoch(),
        });
        let xlm_reward = self.calculate_rewards(&position);
        if xlm_reward > 0 {
            return Err(Error::ClaimRewardsFirst);
        }
        // Collect 1 XLM fee for each new deposit
        let _ = self
            .native()
            .try_transfer(
                &from.clone(),
                &env().current_contract_address(),
                &self.get_deposit_fee(),
            )
            .map_err(|_| Error::XLMTransferFailed)?;
        self.add_fees_collected(self.get_deposit_fee());
        position.xasset_deposit = current_position + amount;
        position.compounded_constant = self.get_compounded_constant();
        position.product_constant = self.get_product_constant();
        // transfer xasset from address to pool
        self.transfer_internal(from.clone(), env().current_contract_address(), amount);
        self.set_deposit(from.clone(), position.clone(), 0);
        self.add_total_xasset(amount);
        Ok(())
    }

    fn withdraw(&mut self, to: Address, amount: i128) -> Result<(), Error> {
        to.require_auth();
        self.withdraw_internal(to, amount, false)
    }

    fn liquidate(&mut self, lender: Address) -> Result<(i128, i128, CDPStatus), Error> {
        let mut cdp = self.cdp(lender.clone())?;
        let principal_debt = cdp.asset_lent;
        let collateral = cdp.xlm_deposited;
        let mut interest = cdp.accrued_interest.clone();

        // Check if the CDP is frozen
        if !matches!(cdp.status, CDPStatus::Frozen) {
            return Err(Error::InvalidLiquidation);
        }

        // Ensure the debt and collateral are positive
        if principal_debt <= 0 || collateral <= 0 {
            return Err(Error::InvalidLiquidation);
        }

        let total_xasset = self.get_total_xasset();

        // Handle interest first - collect all accrued interest if possible
        let interest_to_liquidate_xasset = cmp::min(interest.amount, total_xasset);
        let interest_to_liquidate_xlm = self.convert_xasset_to_xlm(interest_to_liquidate_xasset)?;

        if interest_to_liquidate_xlm > 0 {
            interest.amount -= interest_to_liquidate_xasset;
            interest.paid += interest_to_liquidate_xlm;
            cdp.accrued_interest = interest;
            self.interest_collected
                .set(&(self.get_total_interest_collected() + &interest_to_liquidate_xlm));
            self.increment_interest_for_current_epoch(&interest_to_liquidate_xlm);
        }

        // if unable to cover all interest, go ahead and update rewards and return
        if interest.amount > 0 {
            self.set_cdp_from_decorated(lender, cdp);
            return Ok((0, 0, CDPStatus::Frozen));
        }
        // Now handle the principal debt with remaining available xasset
        let remaining_xasset = self.get_total_xasset();
        let liquidated_debt = cmp::min(principal_debt, remaining_xasset);

        // Calculate the proportional amount of collateral to withdraw based on principal repaid
        let liquidated_collateral = bankers_round(
            DEFAULT_PRECISION * collateral * liquidated_debt / principal_debt,
            DEFAULT_PRECISION,
        );

        // Update constants for the stability pool
        self.update_constants(liquidated_debt, liquidated_collateral);

        // Update the stability pool
        self.subtract_total_xasset(liquidated_debt);
        self.add_total_collateral(liquidated_collateral);

        // Burn the liquidated debt
        self.burn_internal(env().current_contract_address(), liquidated_debt);

        // Update the CDP
        cdp.xlm_deposited -= liquidated_collateral;
        cdp.asset_lent -= liquidated_debt;

        #[cfg(feature = "mercury")]
        crate::index_types::Liquidation {
            cdp_id: lender.clone(),
            collateral_liquidated: liquidated_collateral,
            principal_repaid: liquidated_debt,
            accrued_interest_repaid: interest_to_liquidate_xasset,
            collateral_applied_to_interest: interest_to_liquidate_xlm,
            collateralization_ratio: calculate_collateralization_ratio(
                cdp.asset_lent + liquidated_debt,
                self.lastprice_asset()?.price,
                cdp.xlm_deposited + liquidated_collateral,
                self.lastprice_xlm()?.price,
                self.decimals_xlm_feed()?,
                self.decimals_asset_feed()?,
                interest.amount + interest_to_liquidate_xasset,
            ),
            xlm_price: self.lastprice_xlm()?.price,
            xasset_price: self.lastprice_asset()?.price,
            ledger: env().ledger().sequence(),
            timestamp: env().ledger().timestamp(),
        }
        .emit(env());
        // If all debt is repaid, close the CDP
        if cdp.asset_lent == 0 {
            #[cfg(feature = "mercury")]
            crate::index_types::CDP {
                id: lender.clone(),
                xlm_deposited: cdp.xlm_deposited,
                asset_lent: cdp.asset_lent,
                accrued_interest: cdp.accrued_interest.amount,
                interest_paid: cdp.accrued_interest.paid,
                last_interest_time: cdp.last_interest_time,
                status: CDPStatus::Closed,
                ledger: env().ledger().sequence(),
                timestamp: env().ledger().timestamp(),
            }
            .emit(env());
            self.cdps.remove(lender);
            Ok((liquidated_debt, liquidated_collateral, CDPStatus::Closed))
        } else {
            // Otherwise, update the CDP
            self.set_cdp_from_decorated(lender, cdp);
            Ok((liquidated_debt, liquidated_collateral, CDPStatus::Frozen))
        }
    }

    fn claim_rewards(&mut self, to: Address) -> Result<i128, Error> {
        to.require_auth();
        let mut position = self
            .get_deposit(to.clone())
            .ok_or(Error::StakeDoesntExist)?;

        let xlm_reward = self.calculate_rewards(&position);

        let _ = self
            .native()
            .try_transfer(&env().current_contract_address(), &to, &xlm_reward)
            .map_err(|_| Error::XLMTransferFailed)?;
        self.subtract_total_collateral(xlm_reward);
        position.epoch = self.get_epoch();
        position.xasset_deposit = self.get_staker_deposit_amount(to.clone())?;
        position.compounded_constant = self.get_compounded_constant();
        position.product_constant = self.get_product_constant();
        self.set_deposit(to, position, xlm_reward);
        Ok(xlm_reward)
    }

    fn get_staker_deposit_amount(&self, address: Address) -> Result<i128, Error> {
        match self.get_deposit(address) {
            Some(position) => Ok(self.calculate_current_deposit(&position)),
            None => Err(Error::StakeDoesntExist),
        }
    }

    fn get_total_xasset(&self) -> i128 {
        self.get_total_xasset()
    }

    fn get_total_collateral(&self) -> i128 {
        self.get_total_collateral()
    }

    fn stake(&mut self, from: Address, amount: i128) -> Result<(), Error> {
        from.require_auth();

        // Check if the user already has a stake
        if self.get_deposit(from.clone()).is_some() {
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
                &self.get_stake_fee(),
            )
            .map_err(|_| Error::XLMTransferFailed)?;
        // Add stake fee
        self.add_fees_collected(self.get_stake_fee());

        // Create new position
        let position = StakerPosition {
            xasset_deposit: amount,
            product_constant: self.get_product_constant(),
            compounded_constant: self.get_compounded_constant(),
            epoch: self.get_epoch(),
        };
        // transfer xasset from address to pool
        self.transfer_internal(from.clone(), env().current_contract_address(), amount);

        // Set the new position in the stability pool
        self.set_deposit(from.clone(), position.clone(), 0);
        self.add_total_xasset(amount);
        Ok(())
    }

    fn unstake(&mut self, staker: Address) -> Result<(), Error> {
        staker.require_auth();
        self.withdraw_internal(staker, 0, true)
    }

    fn get_available_assets(&self, staker: Address) -> Result<AvailableAssets, Error> {
        match self.get_deposit(staker) {
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
        match self.get_deposit(staker) {
            Some(position) => Ok(position),
            None => Err(Error::StakeDoesntExist),
        }
    }

    fn get_constants(&self) -> StakerPosition {
        StakerPosition {
            compounded_constant: self.get_compounded_constant(),
            product_constant: self.get_product_constant(),
            epoch: self.get_epoch(),
            xasset_deposit: self.get_total_xasset(),
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
    ) -> CDPContract {
        // Update accrued interest first
        let (interest, last_interest_time) =
            self.get_updated_accrued_interest(&cdp).unwrap_or_default();

        let collateralization_ratio = calculate_collateralization_ratio(
            cdp.asset_lent,
            xasset_price,
            cdp.xlm_deposited,
            xlm_price,
            xlm_decimals,
            xasset_decimals,
            interest.amount,
        );

        CDPContract {
            lender,
            xlm_deposited: cdp.xlm_deposited,
            asset_lent: cdp.asset_lent,
            accrued_interest: interest,
            last_interest_time: last_interest_time,
            collateralization_ratio,
            status: if matches!(cdp.status, CDPStatus::Open)
                && collateralization_ratio < self.minimum_collateralization_ratio()
            {
                CDPStatus::Insolvent
            } else if matches!(cdp.status, CDPStatus::Insolvent)
                && collateralization_ratio >= self.minimum_collateralization_ratio()
            {
                CDPStatus::Open
            } else {
                cdp.status
            },
        }
    }

    fn set_cdp_from_decorated(&mut self, lender: Address, decorated_cdp: CDPContract) {
        #[cfg(feature = "mercury")]
        crate::index_types::CDP {
            id: lender.clone(),
            xlm_deposited: decorated_cdp.xlm_deposited,
            asset_lent: decorated_cdp.asset_lent,
            accrued_interest: decorated_cdp.accrued_interest.amount,
            interest_paid: decorated_cdp.accrued_interest.paid,
            last_interest_time: decorated_cdp.last_interest_time,
            status: decorated_cdp.status,
            ledger: env().ledger().sequence(),
            timestamp: env().ledger().timestamp(),
        }
        .emit(env());
        self.cdps.set(
            lender,
            &CDPInternal {
                xlm_deposited: decorated_cdp.xlm_deposited,
                asset_lent: decorated_cdp.asset_lent,
                status: decorated_cdp.status,
                last_interest_time: decorated_cdp.last_interest_time,
                accrued_interest: decorated_cdp.accrued_interest,
            },
        );
    }

    fn native(&self) -> token::Client {
        token::Client::new(
            env(),
            &self
                .xlm_sac
                .get()
                .expect("XLM Stellar Asset Contract should be initialized"),
        )
    }

    // convenience functions for internal minting / transfering of the ft asset
    fn mint_internal(&mut self, to: Address, amount: i128) {
        let balance = self.balance(to.clone()) + amount;
        self.balances.set(to, &balance);
    }

    fn transfer_internal(&mut self, from: Address, to: Address, amount: i128) {
        let from_balance = self.balance(from.clone()) - amount;
        let to_balance = self.balance(to.clone()) + amount;
        self.balances.set(from, &from_balance);
        self.balances.set(to, &to_balance);
    }

    fn burn_internal(&mut self, from: Address, amount: i128) {
        let balance = self.balance(from.clone()) - amount;
        self.balances.set(from, &balance);
    }

    // withdraw the amount specified unless full_withdrawal is true in which case withdraw remaining balance
    fn withdraw_internal(
        &mut self,
        to: Address,
        amount: i128,
        full_withdrawal: bool,
    ) -> Result<(), Error> {
        let position = self
            .get_deposit(to.clone())
            .ok_or_else(|| Error::StakeDoesntExist)?;
        let rewards = self.calculate_rewards(&position);
        if rewards > 0 {
            return Err(Error::ClaimRewardsFirst);
        }
        let xasset_owed = self.calculate_current_deposit(&position);
        let amount_to_withdraw = if full_withdrawal { xasset_owed } else { amount };
        if xasset_owed < amount_to_withdraw {
            return Err(Error::InsufficientStake);
        }
        if xasset_owed == amount_to_withdraw {
            //close the position

            // Return 2 XLM fee upon closing the SP account
            let _ = self
                .native()
                .try_transfer(
                    &env().current_contract_address(),
                    &to,
                    &self.get_unstake_return(),
                )
                .map_err(|_| Error::XLMTransferFailed)?;
            self.subtract_fees_collected(self.get_unstake_return());

            // transfer xasset to address from pool
            self.transfer_internal(
                env().current_contract_address(),
                to.clone(),
                amount_to_withdraw,
            );
            #[cfg(feature = "mercury")]
            crate::index_types::StakePosition {
                id: to.clone(),
                xasset_deposit: 0,
                product_constant: self.get_product_constant(),
                compounded_constant: self.get_compounded_constant(),
                rewards_claimed: 0,
                epoch: self.get_epoch(),
                ledger: env().ledger().sequence(),
                timestamp: env().ledger().timestamp(),
            }
            .emit(env());
            self.remove_deposit(to);
            self.add_total_xasset(-amount_to_withdraw);
            return Ok(());
        }
        let mut position = self.get_deposit(to.clone()).unwrap_or_default();

        position.xasset_deposit = xasset_owed - amount_to_withdraw;

        position.compounded_constant = self.get_compounded_constant();
        position.product_constant = self.get_product_constant();
        // transfer xasset from pool to address
        self.transfer_internal(
            env().current_contract_address(),
            to.clone(),
            amount_to_withdraw,
        );
        self.set_deposit(to, position, 0);
        self.add_total_xasset(-amount_to_withdraw);
        Ok(())
    }

    fn calculate_current_deposit(&self, position: &StakerPosition) -> i128 {
        if position.epoch == self.get_epoch() {
            let value = (DEFAULT_PRECISION * position.xasset_deposit * self.get_product_constant())
                / position.product_constant;
            bankers_round(value, DEFAULT_PRECISION)
        } else {
            0
        }
    }

    fn calculate_rewards(&self, position: &StakerPosition) -> i128 {
        if position.epoch == self.get_epoch() {
            let value = (DEFAULT_PRECISION
                * position.xasset_deposit
                * (self.get_compounded_constant() - position.compounded_constant))
                / position.product_constant;
            bankers_round(value, DEFAULT_PRECISION)
        } else {
            let value = (DEFAULT_PRECISION
                * position.xasset_deposit
                * (self
                    .get_compounded_epoch(position.epoch)
                    .expect("The historical compounded constant should always be recorded")
                    - position.compounded_constant))
                / position.product_constant;
            bankers_round(value, DEFAULT_PRECISION)
        }
    }

    pub fn update_constants(&mut self, xasset_debited: i128, xlm_earned: i128) {
        // Check if total_xasset is zero prior to calculation
        let total_xasset = self.get_total_xasset();
        let product_constant = self.get_product_constant();
        if total_xasset == 0 {
            self.increment_epoch();
            return;
        }

        // Proceed with updates if total_xasset is not zero
        let new_product_constant =
            (product_constant * (total_xasset - xasset_debited)) / total_xasset;
        let new_compounded_constant =
            self.get_compounded_constant() + (xlm_earned * product_constant) / total_xasset;

        self.set_product_constant(new_product_constant);
        self.set_compounded_constant(new_compounded_constant);
        if total_xasset == xasset_debited {
            self.increment_epoch();
        }
    }

    pub fn increment_epoch(&mut self) {
        let epoch = self.get_epoch();
        self.compound_record
            .set(epoch, &self.get_compounded_constant());
        self.epoch.set(&(epoch + 1));
        self.set_product_constant(PRODUCT_CONSTANT);
        self.set_compounded_constant(0);
    }

    pub fn get_deposit(&self, address: Address) -> Option<StakerPosition> {
        self.deposits.get(address)
    }

    pub fn set_deposit(&mut self, address: Address, position: StakerPosition, _rewards: i128) {
        #[cfg(feature = "mercury")]
        crate::index_types::StakePosition {
            id: address.clone(),
            xasset_deposit: position.xasset_deposit,
            product_constant: position.product_constant,
            compounded_constant: position.compounded_constant,
            rewards_claimed: _rewards,
            epoch: position.epoch,
            ledger: env().ledger().sequence(),
            timestamp: env().ledger().timestamp(),
        }
        .emit(env());
        self.deposits.set(address, &position);
    }

    pub fn get_total_xasset(&self) -> i128 {
        self.total_xasset
            .get()
            .expect("Total xasset should be initialized")
    }

    // todo: many of these function shouldnt be exposed
    pub fn add_total_xasset(&mut self, amount: i128) {
        self.total_xasset.set(&(self.get_total_xasset() + amount));
    }

    pub fn subtract_total_xasset(&mut self, amount: i128) {
        self.total_xasset.set(&(self.get_total_xasset() - amount));
    }

    pub fn get_total_collateral(&self) -> i128 {
        self.total_collateral
            .get()
            .expect("Total collateral should be initialized")
    }

    pub fn add_total_collateral(&mut self, amount: i128) {
        self.total_collateral
            .set(&(self.get_total_collateral() + amount));
    }

    pub fn subtract_total_collateral(&mut self, amount: i128) {
        self.total_collateral
            .set(&(self.get_total_collateral() - amount));
    }

    pub fn get_product_constant(&self) -> i128 {
        self.product_constant
            .get()
            .expect("Product constant should be intialized")
    }

    pub fn set_product_constant(&mut self, value: i128) {
        self.product_constant.set(&value);
    }

    pub fn get_compounded_constant(&self) -> i128 {
        self.compounded_constant
            .get()
            .expect("Compounded constant should be initialized")
    }

    pub fn set_compounded_constant(&mut self, value: i128) {
        self.compounded_constant.set(&value);
    }

    pub fn get_epoch(&self) -> u64 {
        self.epoch.get().expect("Epoch should be initialized")
    }

    pub fn get_compounded_epoch(&self, epoch: u64) -> Option<i128> {
        self.compound_record.get(epoch)
    }

    pub fn get_fees_collected(&self) -> i128 {
        self.fees_collected
            .get()
            .expect("Fees collected should be initialized")
    }

    pub fn add_fees_collected(&mut self, amount: i128) {
        self.fees_collected
            .set(&(self.get_fees_collected() + amount));
    }

    pub fn subtract_fees_collected(&mut self, amount: i128) {
        self.fees_collected
            .set(&(self.get_fees_collected() - amount));
    }

    pub fn get_stake_fee(&self) -> i128 {
        self.stake_fee
            .get()
            .expect("Stake fee should be initialized")
    }

    pub fn get_deposit_fee(&self) -> i128 {
        self.deposit_fee
            .get()
            .expect("Deposit fee should be initialized")
    }

    pub fn set_stake_fee(&mut self, value: i128) {
        self.stake_fee.set(&value);
    }

    pub fn get_unstake_return(&self) -> i128 {
        self.unstake_return
            .get()
            .expect("Unstake return should be initialized")
    }

    pub fn set_unstake_return(&mut self, value: i128) {
        self.unstake_return.set(&value);
    }

    pub fn remove_deposit(&mut self, address: Address) {
        self.deposits.remove(address);
    }

    pub fn get_annual_interest_rate(&self) -> u32 {
        self.interest_rate
            .get()
            .expect("Interest rate should be initialized")
    }

    pub fn set_annual_interest_rate(&mut self, rate: u32) {
        self.interest_rate.set(&rate);
    }

    pub fn get_updated_accrued_interest(
        &self,
        cdp: &CDPInternal,
    ) -> Result<(Interest, u64), Error> {
        let now = env().ledger().timestamp();
        let last_time = cdp.last_interest_time;

        // If this is a new CDP or first interest calculation
        if last_time == 0 {
            return Ok((Interest::default(), now));
        }

        // Do not accrue interest after it has been frozen
        if matches!(cdp.status, CDPStatus::Closed) || matches!(cdp.status, CDPStatus::Frozen) {
            return Ok((cdp.accrued_interest, now));
        }
        let interest = self.get_projected_interest(cdp, last_time, now)?;

        Ok((interest, now))
    }

    pub fn get_total_interest_collected(&self) -> i128 {
        self.interest_collected
            .get()
            .expect("Total interest collected should be initialized")
    }

    fn apply_interest_payment<F>(
        &mut self,
        lender: Address,
        amount_in_xasset: i128,
        pay_fn: F,
    ) -> Result<CDPContract, Error>
    where
        F: FnOnce(&Self, &Address, &i128) -> Result<(), Error>,
    {
        let cdp = self.cdp(lender.clone())?;
        let mut interest = cdp.accrued_interest;
        // if called with 0, it means we want to pay off all currently accrued interest
        let amount_to_pay = if amount_in_xasset == 0 {
            interest.amount
        } else {
            if interest.amount < amount_in_xasset {
                return Err(Error::PaymentExceedsInterestDue);
            }
            amount_in_xasset
        };
        if amount_to_pay == 0 {
            return Ok(cdp);
        }
        let price = self.lastprice_asset().unwrap();
        let xlmprice = self.lastprice_xlm().unwrap();
        let xasset_decimals = self.decimals_asset_feed()?;
        let xlm_decimals = self.decimals_xlm_feed()?;
        let amount_in_xlm = self.convert_xasset_to_xlm(amount_to_pay)?;
        if self.native().balance(&lender) < amount_in_xlm {
            return Err(Error::InsufficientXLMForInterest);
        }

        pay_fn(self, &lender, &amount_in_xlm)?;

        interest.amount -= amount_to_pay;
        interest.paid += amount_in_xlm;

        let decorated_cdp = self.decorate(
            CDPInternal {
                xlm_deposited: cdp.xlm_deposited,
                asset_lent: cdp.asset_lent,
                accrued_interest: interest,
                status: cdp.status,
                last_interest_time: cdp.last_interest_time,
            },
            lender.clone(),
            xlmprice.price,
            xlm_decimals,
            price.price,
            xasset_decimals,
        );

        self.set_cdp_from_decorated(lender, decorated_cdp.clone());
        self.interest_collected
            .set(&(self.get_total_interest_collected() + amount_in_xlm));
        self.increment_interest_for_current_epoch(&amount_in_xlm);

        Ok(decorated_cdp)
    }

    /// Internal-only, called with contract as spender. Doesn't require lender auth, uses xlm approve.
    fn pay_interest_from(&mut self, approver: Address) -> Result<CDPContract, Error> {
        self.apply_interest_payment(approver, 0, |s, from, amount_in_xlm| {
            match s.native().try_transfer_from(
                &env().current_contract_address(),
                from,
                &env().current_contract_address(),
                amount_in_xlm,
            ) {
                Ok(Ok(())) => Ok(()),
                Ok(Err(_)) => Err(Error::InsufficientApprovedXLMForInterestRepayment),
                Err(_) => Err(Error::XLMInvocationFailed),
            }
        })
    }

    fn convert_xasset_to_xlm(&self, amount_in_xasset: i128) -> Result<i128, Error> {
        let price = self.lastprice_asset().unwrap();
        let xlmprice = self.lastprice_xlm().unwrap();
        let xasset_decimals = self.decimals_asset_feed()?;
        let xlm_decimals = self.decimals_xlm_feed()?;
        Ok(bankers_round(
            (DEFAULT_PRECISION
                * amount_in_xasset
                * price.price
                * 10i128.pow(xlm_decimals - xasset_decimals))
                / (xlmprice.price),
            DEFAULT_PRECISION,
        ))
    }

    fn increment_interest_for_current_epoch(&mut self, amount: &i128) {
        let current_epoch = self.get_epoch();
        let current_interest = self.interest_record.get(current_epoch).unwrap_or_default();
        self.interest_record
            .set(current_epoch, &(current_interest + amount));
    }

    /*fn get_interest_for_epoch(&self, epoch: u64) -> i128 {
        self.interest_record.get(epoch).unwrap_or_default()
    }*/

    // Helper to calculate projected interest at a future timestamp
    fn get_projected_interest(
        &self,
        cdp: &CDPInternal,
        from_time: u64,
        to_time: u64,
    ) -> Result<Interest, Error> {
        if from_time == 0 {
            return Ok(Interest::default());
        }

        let annual_rate = self.get_annual_interest_rate() as i128;
        let time_elapsed = to_time.saturating_sub(from_time);
        if time_elapsed == 0 {
            return Ok(cdp.accrued_interest);
        }

        let interest_amount = bankers_round(
            cdp.asset_lent * annual_rate * (time_elapsed as i128) * INTEREST_PRECISION
                / (BASIS_POINTS * (SECONDS_PER_YEAR as i128)),
            INTEREST_PRECISION,
        );
        Ok(Interest {
            amount: cdp.accrued_interest.amount + interest_amount,
            paid: cdp.accrued_interest.paid,
        })
    }
}
