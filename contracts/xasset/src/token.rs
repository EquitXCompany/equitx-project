use core::cmp;

use soroban_sdk::{
    self, assert_with_error, contract, contractimpl, contracttype, panic_with_error, symbol_short,
    token::{TokenClient, TokenInterface},
    Address, BytesN, Env, MuxedAddress, String, Symbol, Vec,
};

use crate::{
    collateralized::{CDPContract, CDPStatus, IsCDPAdmin, IsCollateralized},
    data_feed,
    stability_pool::{AvailableAssets, IsStabilityPool, StakerPosition},
    storage::{Allowance, CDPInternal, Interest, InterestDetail, Txn},
    Error, PriceData,
};
const VERSION_STRING: &str = concat!(
    env!("CARGO_PKG_VERSION_MAJOR"),
    ".",
    env!("CARGO_PKG_VERSION_MINOR"),
    ".",
    env!("CARGO_PKG_VERSION_PATCH")
);
const BASIS_POINTS: i128 = 10_000;
const PRODUCT_CONSTANT: i128 = 1_000_000_000;
const DEPOSIT_FEE: i128 = 10_000_000;
const STAKE_FEE: i128 = 70_000_000;
const UNSTAKE_RETURN: i128 = 20_000_000;
// Constants for interest calculation
const SECONDS_PER_YEAR: u64 = 31_536_000; // 365 days
const INTEREST_PRECISION: i128 = 1_000_000_000; // 9 decimal places for precision
const DEFAULT_PRECISION: i128 = 10_000_000; // 7 decimal places for precision

fn assert_positive(env: &Env, value: i128) {
    assert_with_error!(env, value > 0, Error::ValueNotPositive);
}

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

// Persistent storage keys
#[contracttype]
pub enum DataKey {
    /// Mapping of account addresses to their token balances
    Balance(Address),
    /// Mapping of transactions to their associated allowances
    Allowance(Txn),
    /// Mapping of addresses to their authorization status
    Authorized(Address),
    /// Mapping of addresses to their CDP; each address can only have one CDP
    CDP(Address),
    /* Stability pool fields */
    /// Stability pool deposits
    StakerPosition(Address), // deposits: PersistentMap<Address, StakerPosition>,
    /// Stability pool compound records
    CompoundRecord(u64), // compound_record: PersistentMap<u64, i128>,
    /// Stability pool interest collected records
    InterestRecord(u64), // interest_record: PersistentMap<u64, i128>,
}

const ADMIN_KEY: Symbol = symbol_short!("ADMIN");

// Instance storage
const STORAGE: Symbol = symbol_short!("STORAGE");

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenStorage {
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
    /// total xasset in the stability pool
    total_xasset: i128,
    /// total collateral in the stability pool
    total_collateral: i128,
    /// current product constant of the stability pool
    product_constant: i128,
    /// current compounded constant of the stability pool
    compounded_constant: i128,
    /// current epoch of the stability pool
    epoch: u64,
    /// current total of collected fees for stability pool
    fees_collected: i128,
    /// stability pool deposit fee
    deposit_fee: i128,
    /// stability pool stake fee
    stake_fee: i128,
    /// stability pool fee amount returned upon unstaking
    unstake_return: i128,
    /// Annual interest rate in basis points (e.g., 500 = 5%)
    interest_rate: u32,
    /// Total interest collected (in XLM) by the protocol
    interest_collected: i128,
}

impl TokenStorage {
    /// Get current state of the contract
    fn get_state(env: &Env) -> TokenStorage {
        env.storage().instance().get(&STORAGE).unwrap()
    }

    fn set_state(env: &Env, storage: &TokenStorage) {
        env.storage().instance().set(&STORAGE, &storage);
    }

    // Get internal CDP for a given lender
    fn get_cdp(env: &Env, lender: Address) -> Option<CDPInternal> {
        env.storage()
            .persistent()
            .get(&DataKey::CDP(lender.clone()))
    }

    fn set_cdp(env: &Env, lender: Address, cdp: CDPInternal) {
        env.events().publish(
            (Symbol::new(env, "CDP"), lender.clone()),
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
            },
        );

        // Set CDP
        env.storage()
            .persistent()
            .set(&DataKey::CDP(lender.clone()), &cdp);

        // Extend TTL
        let ttl = env.storage().max_ttl();
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::CDP(lender.clone()), ttl, ttl);
    }

    fn remove_cdp(env: &Env, lender: Address) {
        env.storage()
            .persistent()
            .remove(&DataKey::CDP(lender.clone()));
    }

    fn set_interest_collected(env: &Env, amount: i128) {
        let mut state = TokenStorage::get_state(env);
        state.interest_collected = amount;
        TokenStorage::set_state(env, &state);
    }
}

#[contract]
pub struct TokenContract;

#[contractimpl]
impl TokenContract {
    #[allow(clippy::too_many_arguments)]
    pub fn __constructor(
        env: &Env,
        admin: Address,
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
        Self::set_admin(env, &admin);
        let token = TokenStorage {
            name,
            symbol,
            decimals,
            xlm_sac,
            xlm_contract,
            asset_contract,
            pegged_asset,
            min_collat_ratio,
            total_xasset: 0,
            total_collateral: 0,
            product_constant: PRODUCT_CONSTANT,
            compounded_constant: 0,
            epoch: 0,
            fees_collected: 0,
            deposit_fee: DEPOSIT_FEE,
            stake_fee: STAKE_FEE,
            unstake_return: UNSTAKE_RETURN,
            interest_rate: annual_interest_rate,
            interest_collected: 0,
        };
        TokenStorage::set_state(env, &token);
    }

    /// Upgrade the contract to new wasm. Admin-only.
    pub fn upgrade(env: &Env, new_wasm_hash: BytesN<32>) {
        Self::require_admin(env);
        env.deployer().update_current_contract_wasm(new_wasm_hash);
    }

    /// Get the admin address
    fn admin(env: &Env) -> Option<Address> {
        env.storage().instance().get(&ADMIN_KEY)
    }

    /// Set the admin address. Can only be called once.
    fn set_admin(env: &Env, admin: &Address) {
        // Check if admin is already set
        if env.storage().instance().has(&ADMIN_KEY) {
            panic!("admin already set");
        }
        env.storage().instance().set(&ADMIN_KEY, admin);
    }

    fn require_admin(env: &Env) {
        let admin = Self::admin(env).expect("admin not set");
        admin.require_auth();
    }

    // Fungible implementation. Implemented in a second impl block to reduce code diff in loam-migration
    fn set_and_extend_allowance(
        env: &Env,
        from: Address,
        spender: Address,
        amount: i128,
        live_until_ledger: u32,
    ) {
        assert_positive(env, amount);
        let current_ledger = env.ledger().sequence();
        assert_with_error!(
            env,
            live_until_ledger >= current_ledger,
            Error::InvalidLedgerSequence
        );
        let max_ttl = env.storage().max_ttl();
        env.storage().persistent().set(
            &Txn(from.clone(), spender.clone()),
            &Allowance {
                amount,
                live_until_ledger,
            },
        );
        env.storage()
            .persistent()
            .extend_ttl(&Txn(from, spender), max_ttl, max_ttl);
    }

    /// Increase the allowance that one address can spend on behalf of another address.
    pub fn increase_allowance(env: &Env, from: Address, spender: Address, amount: i128) {
        from.require_auth();
        assert_positive(env, amount);
        let current_allowance = Self::allowance(env.clone(), from.clone(), spender.clone());
        let Some(new_amount) = current_allowance.checked_add(amount) else {
            panic_with_error!(env, Error::ArithmeticError);
        };
        let current_ledger = env.ledger().sequence();
        Self::set_and_extend_allowance(
            env,
            from,
            spender,
            new_amount,
            current_ledger + 1000, // Example: set to expire after 1000 ledgers
        );
    }

    /// Decrease the allowance that one address can spend on behalf of another address.
    pub fn decrease_allowance(env: &Env, from: Address, spender: Address, amount: i128) {
        from.require_auth();
        assert_positive(env, amount);
        let current_allowance = Self::allowance(env.clone(), from.clone(), spender.clone());
        let new_amount = current_allowance.checked_sub(amount).unwrap_or(0);
        let current_ledger = env.ledger().sequence();
        Self::set_and_extend_allowance(
            env,
            from,
            spender,
            new_amount,
            current_ledger + 1000, // Example: set to expire after 1000 ledgers
        );
    }

    /// Internal form of decrease_allowance that does not require auth
    fn decrease_allowance_internal(env: &Env, from: Address, spender: Address, amount: i128) {
        assert_positive(env, amount);
        let current_allowance = Self::allowance(env.clone(), from.clone(), spender.clone());
        let new_amount = current_allowance.checked_sub(amount).unwrap_or(0);
        let current_ledger = env.ledger().sequence();
        Self::set_and_extend_allowance(
            env,
            from,
            spender,
            new_amount,
            current_ledger + 1000, // Example: set to expire after 1000 ledgers
        );
    }

    /// Return the spendable balance of tokens for a specific address
    pub fn spendable_balance(env: &Env, id: Address) -> i128 {
        Self::balance(env.clone(), id)
    }

    /// Check if a specific address is authorized
    pub fn authorized(env: &Env, id: Address) -> bool {
        env.storage()
            .persistent()
            .get(&DataKey::Authorized(id))
            .unwrap_or_default()
    }

    fn set_and_extend_authorized(env: &Env, id: Address, authorize: bool) {
        let max_ttl = env.storage().max_ttl();
        env.storage()
            .persistent()
            .set(&DataKey::Authorized(id.clone()), &authorize);
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Authorized(id), max_ttl, max_ttl);
    }

    pub fn set_authorized(env: &Env, id: Address, authorize: bool) {
        Self::require_admin(env);
        Self::set_and_extend_authorized(env, id, authorize);
    }

    pub fn clawback(env: &Env, from: Address, amount: i128) {
        assert_positive(env, amount);
        Self::require_admin(env);
        let Some(new_balance) = Self::balance(env.clone(), from.clone()).checked_sub(amount) else {
            panic_with_error!(env, Error::ArithmeticError);
        };
        env.storage()
            .persistent()
            .set(&DataKey::Balance(from.clone()), &new_balance);
        let ttl = env.storage().max_ttl();
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::Balance(from), ttl, ttl);
    }

    // From second impl block
    /// Decorate a CDPInternal with the collateralization ratio. Also check if the CDP is insolvent.
    fn decorate(
        env: &Env,
        cdp: CDPInternal,
        lender: Address,
        xlm_price: i128,
        xlm_decimals: u32,
        xasset_price: i128,
        xasset_decimals: u32,
    ) -> CDPContract {
        // Update accrued interest first
        let (interest, last_interest_time) =
            Self::get_updated_accrued_interest(env, &cdp).unwrap_or_default();

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
            last_interest_time,
            collateralization_ratio,
            status: if matches!(cdp.status, CDPStatus::Open)
                && collateralization_ratio < Self::minimum_collateralization_ratio(env)
            {
                CDPStatus::Insolvent
            } else if matches!(cdp.status, CDPStatus::Insolvent)
                && collateralization_ratio >= Self::minimum_collateralization_ratio(env)
            {
                CDPStatus::Open
            } else {
                cdp.status
            },
        }
    }

    fn set_cdp_from_decorated(env: &Env, lender: Address, decorated_cdp: CDPContract) {
        env.events().publish(
            (Symbol::new(env, "CDP"), lender.clone()),
            crate::index_types::CDP {
                id: lender.clone(),
                xlm_deposited: decorated_cdp.xlm_deposited,
                asset_lent: decorated_cdp.asset_lent,
                accrued_interest: decorated_cdp.accrued_interest.amount,
                interest_paid: decorated_cdp.accrued_interest.paid,
                last_interest_time: decorated_cdp.last_interest_time,
                status: decorated_cdp.status,
                ledger: env.ledger().sequence(),
                timestamp: env.ledger().timestamp(),
            },
        );

        // Set CDP
        env.storage().persistent().set(
            &DataKey::CDP(lender.clone()),
            &CDPInternal {
                xlm_deposited: decorated_cdp.xlm_deposited,
                asset_lent: decorated_cdp.asset_lent,
                status: decorated_cdp.status,
                last_interest_time: decorated_cdp.last_interest_time,
                accrued_interest: decorated_cdp.accrued_interest,
            },
        );

        // Extend TTL
        let ttl = env.storage().max_ttl();
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::CDP(lender.clone()), ttl, ttl);
    }

    fn native(env: &Env) -> TokenClient<'_> {
        TokenClient::new(env, &Self::xlm_sac(env))
    }

    /// Mint a specified amount of tokens to a specific address
    pub fn mint(env: &Env, to: Address, amount: i128) {
        Self::require_admin(env);
        assert_positive(env, amount);
        Self::mint_internal(env, to, amount);
    }

    // convenience functions for internal minting / transfering of the ft asset
    fn mint_internal(env: &Env, to: Address, amount: i128) {
        let balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(to.clone()))
            .unwrap_or(0);
        let Some(new_balance) = balance.checked_add(amount) else {
            panic_with_error!(env, Error::ArithmeticError);
        };
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to.clone()), &new_balance);
    }

    fn transfer_internal(env: &Env, from: Address, to: Address, amount: i128) {
        let curr_from_balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(from.clone()))
            .unwrap_or(0);
        let Some(from_balance) = curr_from_balance.checked_sub(amount) else {
            panic_with_error!(env, Error::ArithmeticError);
        };
        let curr_to_balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(to.clone()))
            .unwrap_or(0);
        let Some(to_balance) = curr_to_balance.checked_add(amount) else {
            panic_with_error!(env, Error::ArithmeticError);
        };
        env.storage()
            .persistent()
            .set(&DataKey::Balance(from.clone()), &from_balance);
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to.clone()), &to_balance);
    }

    fn burn_internal(env: &Env, from: Address, amount: i128) {
        let balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(from.clone()))
            .unwrap_or(0);
        let Some(new_balance) = balance.checked_sub(amount) else {
            panic_with_error!(env, Error::ArithmeticError);
        };
        env.storage()
            .persistent()
            .set(&DataKey::Balance(from.clone()), &new_balance);
    }

    // withdraw the amount specified unless full_withdrawal is true in which case withdraw remaining balance
    fn withdraw_internal(
        env: &Env,
        to: Address,
        amount: i128,
        full_withdrawal: bool,
    ) -> Result<(), Error> {
        let position = Self::get_deposit(env, to.clone())
            .unwrap_or_else(|| panic_with_error!(env, Error::StakeDoesntExist));
        let rewards = Self::calculate_rewards(env, &position);
        if rewards > 0 {
            return Err(Error::ClaimRewardsFirst);
        }
        let xasset_owed = Self::calculate_current_deposit(env, &position);
        let amount_to_withdraw = if full_withdrawal { xasset_owed } else { amount };
        if xasset_owed < amount_to_withdraw {
            return Err(Error::InsufficientStake);
        }
        if xasset_owed == amount_to_withdraw {
            //close the position

            // Return 2 XLM fee upon closing the SP account
            let _ = Self::native(env)
                .try_transfer(
                    &env.current_contract_address(),
                    &to,
                    &Self::get_unstake_return(env),
                )
                .map_err(|_| Error::XLMTransferFailed)?;
            Self::subtract_fees_collected(env, Self::get_unstake_return(env));

            // transfer xasset to address from pool
            Self::transfer_internal(
                env,
                env.current_contract_address(),
                to.clone(),
                amount_to_withdraw,
            );
            env.events().publish(
                (Symbol::new(env, "StakePosition"), to.clone()),
                crate::index_types::StakePosition {
                    id: to.clone(),
                    xasset_deposit: 0,
                    product_constant: Self::get_product_constant(env),
                    compounded_constant: Self::get_compounded_constant(env),
                    ledger: env.ledger().sequence(),
                    timestamp: env.ledger().timestamp(),
                    epoch: Self::get_epoch(env),
                    rewards_claimed: 0,
                },
            );

            Self::remove_deposit(env, to);
            Self::add_total_xasset(env, -amount_to_withdraw);
            return Ok(());
        }

        let mut position = Self::get_deposit(env, to.clone()).unwrap_or_default();

        position.xasset_deposit = xasset_owed - amount_to_withdraw;

        position.compounded_constant = Self::get_compounded_constant(env);
        position.product_constant = Self::get_product_constant(env);
        // transfer xasset from pool to address
        Self::transfer_internal(
            env,
            env.current_contract_address(),
            to.clone(),
            amount_to_withdraw,
        );
        Self::set_deposit(env, to, position, 0);
        Self::add_total_xasset(env, -amount_to_withdraw);
        Ok(())
    }

    fn calculate_current_deposit(env: &Env, position: &StakerPosition) -> i128 {
        if position.epoch == Self::get_epoch(env) {
            let value =
                (DEFAULT_PRECISION * position.xasset_deposit * Self::get_product_constant(env))
                    / position.product_constant;
            bankers_round(value, DEFAULT_PRECISION)
        } else {
            0
        }
    }

    fn calculate_rewards(env: &Env, position: &StakerPosition) -> i128 {
        if position.epoch == Self::get_epoch(env) {
            let value = (DEFAULT_PRECISION
                * position.xasset_deposit
                * (Self::get_compounded_constant(env) - position.compounded_constant))
                / position.product_constant;
            bankers_round(value, DEFAULT_PRECISION)
        } else {
            let value = (DEFAULT_PRECISION
                * position.xasset_deposit
                * (Self::get_compounded_epoch(env, position.epoch)
                    .expect("The historical compounded constant should always be recorded")
                    - position.compounded_constant))
                / position.product_constant;
            bankers_round(value, DEFAULT_PRECISION)
        }
    }

    fn update_constants(env: &Env, xasset_debited: i128, xlm_earned: i128) {
        // Check if total_xasset is zero prior to calculation
        let total_xasset = Self::get_total_xasset(env);
        let product_constant = Self::get_product_constant(env);
        if total_xasset == 0 {
            Self::increment_epoch(env);
            return;
        }

        // Proceed with updates if total_xasset is not zero
        let new_product_constant =
            (product_constant * (total_xasset - xasset_debited)) / total_xasset;
        let new_compounded_constant =
            Self::get_compounded_constant(env) + (xlm_earned * product_constant) / total_xasset;

        Self::set_product_constant(env, new_product_constant);
        Self::set_compounded_constant(env, new_compounded_constant);
        if total_xasset == xasset_debited {
            Self::increment_epoch(env);
        }
    }

    fn increment_epoch(env: &Env) {
        let epoch = Self::get_epoch(env);
        Self::set_compound_record(env, epoch, &Self::get_compounded_constant(env));
        Self::set_epoch(env, epoch + 1);
        // reset constants
        Self::set_product_constant(env, PRODUCT_CONSTANT);
        Self::set_compounded_constant(env, 0);
    }

    fn get_deposit(env: &Env, address: Address) -> Option<StakerPosition> {
        env.storage()
            .persistent()
            .get(&DataKey::StakerPosition(address))
    }

    fn set_deposit(env: &Env, address: Address, position: StakerPosition, _rewards: i128) {
        env.events().publish(
            (Symbol::new(env, "StakePosition"), address.clone()),
            crate::index_types::StakePosition {
                id: address.clone(),
                xasset_deposit: position.xasset_deposit,
                product_constant: position.product_constant,
                compounded_constant: position.compounded_constant,
                rewards_claimed: _rewards,
                epoch: position.epoch,
                ledger: env.ledger().sequence(),
                timestamp: env.ledger().timestamp(),
            },
        );
        env.storage()
            .persistent()
            .set(&DataKey::StakerPosition(address.clone()), &position);
        let ttl = env.storage().max_ttl();
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::StakerPosition(address), ttl, ttl);
    }

    fn get_compound_record(env: &Env, epoch: u64) -> Option<i128> {
        env.storage()
            .persistent()
            .get(&DataKey::CompoundRecord(epoch))
    }

    fn set_compound_record(env: &Env, epoch: u64, amount: &i128) {
        env.storage()
            .persistent()
            .set(&DataKey::CompoundRecord(epoch), amount);
        let ttl = env.storage().max_ttl();
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::CompoundRecord(epoch), ttl, ttl);
    }

    fn get_interest_record(env: &Env, epoch: u64) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::InterestRecord(epoch))
            .unwrap_or(0)
    }

    fn set_and_extend_interest_record(env: &Env, epoch: u64, amount: &i128) {
        env.storage()
            .persistent()
            .set(&DataKey::InterestRecord(epoch), amount);
        let ttl = env.storage().max_ttl();
        env.storage()
            .persistent()
            .extend_ttl(&DataKey::InterestRecord(epoch), ttl, ttl);
    }

    // todo: many of these function shouldnt be exposed
    fn add_total_xasset(env: &Env, amount: i128) {
        let mut state = TokenStorage::get_state(env);
        let Some(new_total) = state.total_xasset.checked_add(amount) else {
            panic_with_error!(env, Error::ArithmeticError);
        };
        state.total_xasset = new_total;
        TokenStorage::set_state(env, &state);
    }

    fn subtract_total_xasset(env: &Env, amount: i128) {
        let mut state = TokenStorage::get_state(env);
        let Some(new_total) = state.total_xasset.checked_sub(amount) else {
            panic_with_error!(env, Error::ArithmeticError);
        };
        state.total_xasset = new_total;
        TokenStorage::set_state(env, &state);
    }

    fn add_total_collateral(env: &Env, amount: i128) {
        let mut state = TokenStorage::get_state(env);
        let Some(new_total) = state.total_collateral.checked_add(amount) else {
            panic_with_error!(env, Error::ArithmeticError);
        };
        state.total_collateral = new_total;
        TokenStorage::set_state(env, &state);
    }

    fn subtract_total_collateral(env: &Env, amount: i128) {
        let mut state = TokenStorage::get_state(env);
        let Some(new_total) = state.total_collateral.checked_sub(amount) else {
            panic_with_error!(env, Error::ArithmeticError);
        };
        state.total_collateral = new_total;
        TokenStorage::set_state(env, &state);
    }

    fn get_product_constant(env: &Env) -> i128 {
        TokenStorage::get_state(env).product_constant
    }

    fn set_product_constant(env: &Env, value: i128) {
        let mut state = TokenStorage::get_state(env);
        state.product_constant = value;
        TokenStorage::set_state(env, &state);
    }

    fn get_compounded_constant(env: &Env) -> i128 {
        TokenStorage::get_state(env).compounded_constant
    }

    fn set_compounded_constant(env: &Env, value: i128) {
        let mut state = TokenStorage::get_state(env);
        state.compounded_constant = value;
        TokenStorage::set_state(env, &state);
    }

    fn get_epoch(env: &Env) -> u64 {
        TokenStorage::get_state(env).epoch
    }

    fn set_epoch(env: &Env, value: u64) {
        let mut state = TokenStorage::get_state(env);
        state.epoch = value;
        TokenStorage::set_state(env, &state);
    }

    fn get_compounded_epoch(env: &Env, epoch: u64) -> Option<i128> {
        env.storage()
            .persistent()
            .get(&DataKey::CompoundRecord(epoch))
    }

    fn get_fees_collected(env: &Env) -> i128 {
        TokenStorage::get_state(env).fees_collected
    }

    fn add_fees_collected(env: &Env, amount: i128) {
        let mut state = TokenStorage::get_state(env);
        let Some(new_total) = state.fees_collected.checked_add(amount) else {
            panic_with_error!(env, Error::ArithmeticError);
        };
        state.fees_collected = new_total;
        TokenStorage::set_state(env, &state);
    }

    fn subtract_fees_collected(env: &Env, amount: i128) {
        let mut state = TokenStorage::get_state(env);
        let Some(new_total) = state.fees_collected.checked_sub(amount) else {
            panic_with_error!(env, Error::ArithmeticError);
        };
        state.fees_collected = new_total;
        TokenStorage::set_state(env, &state);
    }

    // fn get_stake_fee(env: &Env) -> i128 {
    //     TokenStorage::get_state(env).stake_fee
    // }

    fn get_deposit_fee(env: &Env) -> i128 {
        TokenStorage::get_state(env).deposit_fee
    }

    fn get_unstake_return(env: &Env) -> i128 {
        TokenStorage::get_state(env).unstake_return
    }

    fn remove_deposit(env: &Env, address: Address) {
        env.storage()
            .persistent()
            .remove(&DataKey::StakerPosition(address.clone()));
    }

    fn get_annual_interest_rate(env: &Env) -> u32 {
        TokenStorage::get_state(env).interest_rate
    }

    fn set_annual_interest_rate(env: &Env, rate: u32) {
        let mut state = TokenStorage::get_state(env);
        state.interest_rate = rate;
        TokenStorage::set_state(env, &state);
    }

    fn get_updated_accrued_interest(
        env: &Env,
        cdp: &CDPInternal,
    ) -> Result<(Interest, u64), Error> {
        let now = env.ledger().timestamp();
        let last_time = cdp.last_interest_time;

        // If this is a new CDP or first interest calculation
        if last_time == 0 {
            return Ok((Interest::default(), now));
        }

        // Do not accrue interest after it has been frozen
        if matches!(cdp.status, CDPStatus::Closed) || matches!(cdp.status, CDPStatus::Frozen) {
            return Ok((cdp.accrued_interest, now));
        }
        let interest = Self::get_projected_interest(env, cdp, last_time, now)?;

        Ok((interest, now))
    }

    fn apply_interest_payment<F>(
        env: &Env,
        lender: Address,
        amount_in_xasset: i128,
        pay_fn: F,
    ) -> Result<CDPContract, Error>
    where
        F: FnOnce(&Address, &i128) -> Result<(), Error>,
    {
        let cdp = Self::cdp(env, lender.clone()).unwrap();
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
        let price = Self::lastprice_asset(env).unwrap();
        let xlmprice = Self::lastprice_xlm(env).unwrap();
        let xasset_decimals = Self::decimals_asset_feed(env)?;
        let xlm_decimals = Self::decimals_xlm_feed(env)?;
        let amount_in_xlm = Self::convert_xasset_to_xlm(env, amount_to_pay)?;
        if Self::native(env).balance(&lender) < amount_in_xlm {
            return Err(Error::InsufficientXLMForInterest);
        }

        pay_fn(&lender, &amount_in_xlm)?;

        let Some(new_interest) = interest.amount.checked_sub(amount_to_pay) else {
            return Err(Error::ArithmeticError);
        };
        interest.amount = new_interest;

        let Some(new_paid) = interest.paid.checked_add(amount_in_xlm) else {
            return Err(Error::ArithmeticError);
        };
        interest.paid = new_paid;

        let decorated_cdp = Self::decorate(
            env,
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

        Self::set_cdp_from_decorated(env, lender, decorated_cdp.clone());
        TokenStorage::set_interest_collected(
            env,
            Self::get_total_interest_collected(env) + amount_in_xlm,
        );
        Self::increment_interest_for_current_epoch(env, &amount_in_xlm);

        Ok(decorated_cdp)
    }

    fn convert_xasset_to_xlm(env: &Env, amount_in_xasset: i128) -> Result<i128, Error> {
        let price = Self::lastprice_asset(env).unwrap();
        let xlmprice = Self::lastprice_xlm(env).unwrap();
        let xasset_decimals = Self::decimals_asset_feed(env)?;
        let xlm_decimals = Self::decimals_xlm_feed(env)?;
        Ok(bankers_round(
            (DEFAULT_PRECISION
                * amount_in_xasset
                * price.price
                * 10i128.pow(xlm_decimals - xasset_decimals))
                / (xlmprice.price),
            DEFAULT_PRECISION,
        ))
    }

    fn increment_interest_for_current_epoch(env: &Env, amount: &i128) {
        let current_epoch = Self::get_epoch(env);
        let current_interest = Self::get_interest_record(env, current_epoch);
        Self::set_and_extend_interest_record(env, current_epoch, &(current_interest + amount));
    }

    // Helper to calculate projected interest at a future timestamp
    fn get_projected_interest(
        env: &Env,
        cdp: &CDPInternal,
        from_time: u64,
        to_time: u64,
    ) -> Result<Interest, Error> {
        if from_time == 0 {
            return Ok(Interest::default());
        }

        let annual_rate = Self::get_annual_interest_rate(env) as i128;
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

#[contractimpl]
impl TokenInterface for TokenContract {
    /// Return the allowance for `spender` to transfer from `from`.
    fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        let allowance: Option<Allowance> = env.storage().persistent().get(&Txn(from, spender));
        match allowance {
            Some(a) => {
                if env.ledger().sequence() <= a.live_until_ledger {
                    a.amount
                } else {
                    0
                }
            }
            None => 0,
        }
    }

    /// Set the allowance by `amount` for `spender` to transfer/burn from `from`
    fn approve(env: Env, from: Address, spender: Address, amount: i128, live_until_ledger: u32) {
        from.require_auth();
        let current_ledger = env.ledger().sequence();
        assert_positive(&env, amount);
        assert_with_error!(
            env,
            live_until_ledger >= current_ledger,
            Error::InvalidLedgerSequence
        );
        let max_ttl = env.storage().max_ttl();
        env.storage().persistent().set(
            &Txn(from.clone(), spender.clone()),
            &Allowance {
                amount,
                live_until_ledger,
            },
        );
        env.storage()
            .persistent()
            .extend_ttl(&Txn(from, spender), max_ttl, max_ttl);
    }

    /// Return the balance of `id`
    fn balance(env: Env, id: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(id))
            .unwrap_or(0)
    }

    /// Transfer `amount` from `from` to `to`
    fn transfer(env: Env, from: Address, to: MuxedAddress, amount: i128) {
        from.require_auth();
        assert_with_error!(env.clone(), amount > 0, Error::ValueNotPositive);
        assert_with_error!(
            env.clone(),
            to.address() != from,
            Error::CannotTransferToSelf
        );
        let balance = Self::balance(env.clone(), from.clone());
        assert_with_error!(env, balance >= amount, Error::InsufficientBalance);
        Self::transfer_internal(&env, from, to.address(), amount);
    }

    /// Transfer `amount` from `from` to `to`, consuming the allowance of `spender`
    fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        assert_with_error!(env.clone(), amount > 0, Error::ValueNotPositive);
        let allowance = Self::allowance(env.clone(), from.clone(), spender.clone());
        assert_with_error!(
            env.clone(),
            allowance >= amount,
            Error::InsufficientAllowance
        );
        assert_with_error!(
            env.clone(),
            Self::balance(env.clone(), from.clone()) >= amount,
            Error::InsufficientBalance
        );
        Self::transfer_internal(&env, from.clone(), to, amount);
        Self::decrease_allowance_internal(&env, from, spender, amount);
    }

    /// Burn `amount` from `from`
    fn burn(env: Env, from: Address, amount: i128) {
        from.require_auth();
        assert_with_error!(env.clone(), amount > 0, Error::ValueNotPositive);
        let balance = Self::balance(env.clone(), from.clone());
        assert_with_error!(env.clone(), balance >= amount, Error::InsufficientBalance);
        Self::burn_internal(&env, from, amount);
    }

    /// Burn `amount` from `from`, consuming the allowance of `spender`
    fn burn_from(env: Env, spender: Address, from: Address, amount: i128) {
        spender.require_auth();
        assert_with_error!(env.clone(), amount > 0, Error::ValueNotPositive);
        let allowance = Self::allowance(env.clone(), from.clone(), spender.clone());
        assert_with_error!(&env, allowance >= amount, Error::InsufficientAllowance);
        Self::burn(env.clone(), from.clone(), amount);
        Self::decrease_allowance_internal(&env, from, spender, amount);
    }

    /// Return the number of decimals used to represent amounts of this token
    fn decimals(env: Env) -> u32 {
        TokenStorage::get_state(&env).decimals
    }

    /// Return the name for this token
    fn name(env: Env) -> String {
        TokenStorage::get_state(&env).name
    }

    /// Return the symbol for this token
    fn symbol(env: Env) -> String {
        TokenStorage::get_state(&env).symbol
    }
}

#[contractimpl]
impl IsCollateralized for TokenContract {
    /// Oracle contract used for this contract's XLM price feed. Example: `CBJSHY5PQQ4LS7VMHI4BJODEDP5MLANRNUSHKNSVKK7BQ4Y6LSTBDGMR`
    fn xlm_contract(env: &Env) -> Address {
        // Get XLM contract out of storage
        TokenStorage::get_state(env).xlm_contract.clone()
    }

    /// Stellar asset contract address
    fn xlm_sac(env: &Env) -> Address {
        TokenStorage::get_state(env).xlm_sac.clone()
    }

    /// Oracle contract used for this contract's pegged asset. Example: `CBJSHY5PQQ4LS7VMHI4BJODEDP5MLANRNUSHKNSVKK7BQ4Y6LSTBDGMR`
    fn asset_contract(env: &Env) -> Address {
        // Access Storage
        TokenStorage::get_state(env).asset_contract.clone()
    }

    /// Which asset from Oracle this tracks. For `--asset '{"Other":"USD"}'` on asset contract, set to `USD`
    fn pegged_asset(env: &Env) -> Symbol {
        TokenStorage::get_state(env).pegged_asset.clone()
    }

    /// Basis points. Default: 110%
    fn minimum_collateralization_ratio(env: &Env) -> u32 {
        TokenStorage::get_state(env).min_collat_ratio
    }

    /// Get the most recent price for XLM
    fn lastprice_xlm(env: &Env) -> Result<PriceData, Error> {
        let contract = &Self::xlm_contract(env);
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

    /// Get the most recent price for the pegged asset
    fn lastprice_asset(env: &Env) -> Result<PriceData, Error> {
        let contract = Self::asset_contract(env);
        let asset = Self::pegged_asset(env);
        let client = data_feed::Client::new(env, &contract);

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

    /// Get the number of decimals used by the xlm oracle contract. This is NOT the same as the number of decimals used by the XLM Stellar Asset Contract.
    fn decimals_xlm_feed(env: &Env) -> Result<u32, Error> {
        let contract = &Self::xlm_contract(env);
        let client = data_feed::Client::new(env, contract);

        match client.try_decimals() {
            Ok(decimals_result) => match decimals_result {
                core::prelude::v1::Ok(decimals) => Ok(decimals),
                Err(_) => Err(Error::OracleDecimalsFetchFailed),
            },
            Err(_) => Err(Error::OracleDecimalsFetchFailed),
        }
    }

    /// Get the number of decimals used by the asset oracle contract. This is NOT the same as the number of decimals used by the xAsset Fungible Token contract.
    fn decimals_asset_feed(env: &Env) -> Result<u32, Error> {
        let contract = &Self::asset_contract(env);
        let client = data_feed::Client::new(env, contract);

        match client.try_decimals() {
            Ok(decimals_result) => match decimals_result {
                core::prelude::v1::Ok(decimals) => Ok(decimals),
                Err(_) => Err(Error::OracleDecimalsFetchFailed),
            },
            Err(_) => Err(Error::OracleDecimalsFetchFailed),
        }
    }

    /// Open a new Collateralized Debt Position (CDP) by depositing collateral and minting xAsset
    fn open_cdp(
        env: &Env,
        lender: Address,
        collateral: i128,
        asset_lent: i128,
    ) -> Result<(), Error> {
        assert_positive(env, collateral);
        assert_positive(env, asset_lent);
        lender.require_auth();

        let cdp: Option<CDPInternal> = env
            .storage()
            .persistent()
            .get(&DataKey::CDP(lender.clone()));
        // 1. check if lender already has a CDP
        if cdp.is_some() {
            return Err(Error::CDPAlreadyExists);
        }

        // 2. check that `lastprice` gives collateralization ratio over `min_collat_ratio`
        let cdp = CDPInternal::new(collateral, asset_lent, env.ledger().timestamp());
        let xlm_price = Self::lastprice_xlm(env)?;
        let xlm_decimals = Self::decimals_xlm_feed(env)?;
        let xasset_price = Self::lastprice_asset(env)?;
        let xasset_decimals = Self::decimals_asset_feed(env)?;
        let CDPContract {
            collateralization_ratio,
            ..
        } = Self::decorate(
            env,
            cdp,
            lender.clone(),
            xlm_price.price,
            xlm_decimals,
            xasset_price.price,
            xasset_decimals,
        );
        if collateralization_ratio < Self::minimum_collateralization_ratio(env) {
            return Err(Error::InsufficientCollateralization);
        }

        // 3. transfer attached XLM to this contract
        let _ = Self::native(env)
            .try_transfer(&lender, &env.current_contract_address(), &collateral)
            .map_err(|_| Error::XLMTransferFailed)?;

        // 4. mint `asset_lent` of this token to `address`
        Self::mint_internal(env, lender.clone(), asset_lent);

        // 5. create CDP
        env.storage()
            .persistent()
            .set(&DataKey::CDP(lender.clone()), &cdp);

        env.events().publish(
            (Symbol::new(env, "CDP"), lender.clone()),
            crate::index_types::CDP {
                id: lender.clone(),
                xlm_deposited: cdp.xlm_deposited, // From your existing cdp
                asset_lent: cdp.asset_lent,
                accrued_interest: cdp.accrued_interest.amount,
                interest_paid: cdp.accrued_interest.paid,
                last_interest_time: cdp.last_interest_time,
                status: cdp.status,
                ledger: env.ledger().sequence(),
                timestamp: env.ledger().timestamp(),
            },
        );
        Ok(())
    }

    /// Retrieve the CDP information for a specific lender
    fn cdp(env: &Env, lender: Address) -> Result<CDPContract, Error> {
        let cdp = TokenStorage::get_cdp(env, lender.clone())
            .unwrap_or_else(|| panic_with_error!(env, Error::CDPNotFound));
        let xlm_price = Self::lastprice_xlm(env)?;
        let xlm_decimals = Self::decimals_xlm_feed(env)?;
        let xasset_price = Self::lastprice_asset(env)?;
        let xasset_decimals = Self::decimals_asset_feed(env)?;
        Ok(Self::decorate(
            env,
            cdp,
            lender,
            xlm_price.price,
            xlm_decimals,
            xasset_price.price,
            xasset_decimals,
        ))
    }

    /// Freeze a CDP if its Collateralization Ratio (CR) is below the xAsset's Minimum Collateralization Ratio (MCR).
    /// A frozen CDP is no longer usable or interactable by its former owner.
    fn freeze_cdp(env: &Env, lender: Address) -> Result<(), Error> {
        let mut cdp = Self::cdp(env, lender.clone())?;
        if matches!(cdp.status, CDPStatus::Insolvent) {
            cdp.status = CDPStatus::Frozen;
            Self::set_cdp_from_decorated(env, lender, cdp);
            Ok(())
        } else {
            Err(Error::CDPNotInsolvent)
        }
    }

    /// Increase the Collateralization Ratio (CR) by depositing more collateral to an existing CDP.
    fn add_collateral(env: &Env, lender: Address, amount: i128) -> Result<(), Error> {
        assert_positive(env, amount);
        lender.require_auth();
        let mut cdp: CDPInternal = TokenStorage::get_cdp(env, lender.clone())
            .unwrap_or_else(|| panic_with_error!(env, Error::CDPNotFound));

        if matches!(cdp.status, CDPStatus::Closed) || matches!(cdp.status, CDPStatus::Frozen) {
            return Err(Error::CDPNotOpenOrInsolvent);
        }

        // Calculate the new deposit amount and check for overflow before we transfer
        let Some(new_deposit) = cdp.xlm_deposited.checked_add(amount) else {
            return Err(Error::ArithmeticError);
        };

        // Transfer XLM from lender to contract
        let _ = Self::native(env)
            .try_transfer(&lender, env.current_contract_address(), &amount)
            .map_err(|_| Error::XLMTransferFailed)?;

        cdp.xlm_deposited = new_deposit;
        TokenStorage::set_cdp(env, lender, cdp);
        Ok(())
    }

    /// Lower the Collateralization Ratio (CR) by withdrawing part or all of the collateral from a CDP.
    /// Collateral cannot be withdrawn if it brings CR below the xAsset's MCR.
    fn withdraw_collateral(env: &Env, lender: Address, amount: i128) -> Result<(), Error> {
        assert_positive(env, amount);
        lender.require_auth();
        let mut cdp = TokenStorage::get_cdp(env, lender.clone())
            .unwrap_or_else(|| panic_with_error!(env, Error::CDPNotFound));

        if matches!(cdp.status, CDPStatus::Closed) || matches!(cdp.status, CDPStatus::Frozen) {
            return Err(Error::CDPNotOpenOrInsolvent);
        }

        if cdp.xlm_deposited < amount {
            return Err(Error::InsufficientCollateral);
        }

        let new_cdp = Self::decorate(
            env,
            CDPInternal {
                xlm_deposited: cdp.xlm_deposited - amount,
                asset_lent: cdp.asset_lent,
                status: cdp.status,
                accrued_interest: cdp.accrued_interest,
                last_interest_time: cdp.last_interest_time,
            },
            lender.clone(),
            Self::lastprice_xlm(env)?.price,
            Self::decimals_xlm_feed(env)?,
            Self::lastprice_asset(env)?.price,
            Self::decimals_asset_feed(env)?,
        );

        if new_cdp.collateralization_ratio < Self::minimum_collateralization_ratio(env) {
            return Err(Error::InvalidWithdrawal);
        }

        // Calculate the new deposit amount and check for overflow before transfer
        let Some(new_deposit) = cdp.xlm_deposited.checked_sub(amount) else {
            return Err(Error::ArithmeticError);
        };

        // Transfer XLM from contract to lender
        let _ = Self::native(env)
            .try_transfer(&env.current_contract_address(), &lender, &amount)
            .map_err(|_| Error::XLMTransferFailed)?;

        cdp.xlm_deposited = new_deposit;
        TokenStorage::set_cdp(env, lender, cdp);
        Ok(())
    }

    /// Lower the Collateralization Ratio (CR) by minting additional xAsset against existing collateral
    fn borrow_xasset(env: &Env, lender: Address, amount: i128) -> Result<(), Error> {
        assert_positive(env, amount);
        lender.require_auth();
        let cdp = TokenStorage::get_cdp(env, lender.clone())
            .unwrap_or_else(|| panic_with_error!(env, Error::CDPNotFound));

        if matches!(cdp.status, CDPStatus::Closed) || matches!(cdp.status, CDPStatus::Frozen) {
            return Err(Error::CDPNotOpenOrInsolvent);
        }

        let Some(asset_lent) = cdp.asset_lent.checked_add(amount) else {
            return Err(Error::ArithmeticError);
        };

        let new_cdp = Self::decorate(
            env,
            CDPInternal {
                xlm_deposited: cdp.xlm_deposited,
                asset_lent,
                status: cdp.status,
                accrued_interest: cdp.accrued_interest,
                last_interest_time: cdp.last_interest_time,
            },
            lender.clone(),
            Self::lastprice_xlm(env)?.price,
            Self::decimals_xlm_feed(env)?,
            Self::lastprice_asset(env)?.price,
            Self::decimals_asset_feed(env)?,
        );

        if new_cdp.collateralization_ratio < Self::minimum_collateralization_ratio(env) {
            return Err(Error::InsufficientCollateralization);
        }

        // mint xasset
        Self::mint_internal(env, lender.clone(), amount);

        Self::set_cdp_from_decorated(env, lender, new_cdp);
        Ok(())
    }

    /// Increase the Collateralization Ratio (CR) by repaying debt in the form of xAsset
    fn repay_debt(env: &Env, lender: Address, amount: i128) -> Result<(), Error> {
        assert_positive(env, amount);
        lender.require_auth();
        let mut cdp = TokenStorage::get_cdp(env, lender.clone())
            .unwrap_or_else(|| panic_with_error!(env, Error::CDPNotFound));

        if matches!(cdp.status, CDPStatus::Closed) || matches!(cdp.status, CDPStatus::Frozen) {
            return Err(Error::CDPNotOpenOrInsolventForRepay);
        }

        // Pay off any interest first
        // cdp = Self::pay_interest_from(env, lender.clone())?;
        Self::apply_interest_payment(env, lender.clone(), 0, |from, amount_in_xlm| {
            match Self::native(env).try_transfer_from(
                &env.current_contract_address(),
                from,
                &env.current_contract_address(),
                amount_in_xlm,
            ) {
                Ok(Ok(())) => Ok(()),
                Ok(Err(_)) => Err(Error::InsufficientApprovedXLMForInterestRepayment),
                Err(_) => Err(Error::XLMInvocationFailed),
            }
        })?;

        // Now continue with debt repayment
        if cdp.asset_lent < amount {
            return Err(Error::RepaymentExceedsDebt);
        }

        // Check to ensure enough xasset is available
        if Self::balance(env.clone(), lender.clone()) < amount {
            return Err(Error::InsufficientBalance);
        }

        // Calculate the new asset lent amount and check for overflow before we burn
        let Some(asset_lent) = cdp.asset_lent.checked_sub(amount) else {
            return Err(Error::ArithmeticError);
        };

        // Burn the xasset
        Self::burn_internal(env, lender.clone(), amount);

        cdp.asset_lent = asset_lent;

        if cdp.asset_lent == 0 && cdp.xlm_deposited == 0 {
            Self::close_cdp(env, lender)?;
        } else {
            TokenStorage::set_cdp(env, lender, cdp);
        }
        Ok(())
    }

    /// Liquidate a frozen CDP. Upon liquidation, CDP debt is repaid by withdrawing xAsset from a Stability Pool
    fn liquidate_cdp(env: &Env, lender: Address) -> Result<(i128, i128, CDPStatus), Error> {
        Self::liquidate(env, lender)
    }

    /// Merge two or more frozen CDPs into one CDP
    fn merge_cdps(env: &Env, lenders: Vec<Address>) -> Result<(), Error> {
        if lenders.len() < 2 {
            return Err(Error::InvalidMerge);
        }

        let mut total_xlm: i128 = 0;
        let mut total_asset: i128 = 0;
        let mut total_interest: Interest = Interest::default();

        for lender in lenders.iter() {
            let cdp = TokenStorage::get_cdp(env, lender.clone())
                .unwrap_or_else(|| panic_with_error!(env, Error::CDPNotFound));
            if !matches!(cdp.status, CDPStatus::Frozen) {
                return Err(Error::InvalidMerge);
            }

            let Some(new_total_xlm) = total_xlm.checked_add(cdp.xlm_deposited) else {
                return Err(Error::ArithmeticError);
            };
            let Some(new_total_asset) = total_asset.checked_add(cdp.asset_lent) else {
                return Err(Error::ArithmeticError);
            };
            let Some(new_total_interest_amount) = total_interest
                .amount
                .checked_add(cdp.accrued_interest.amount)
            else {
                return Err(Error::ArithmeticError);
            };
            let Some(new_total_interest_paid) =
                total_interest.paid.checked_add(cdp.accrued_interest.paid)
            else {
                return Err(Error::ArithmeticError);
            };
            total_xlm = new_total_xlm;
            total_asset = new_total_asset;
            total_interest.amount = new_total_interest_amount;
            total_interest.paid = new_total_interest_paid;
        }

        // Merge into the first CDP
        let merged_cdp = CDPInternal {
            xlm_deposited: total_xlm,
            asset_lent: total_asset,
            status: CDPStatus::Frozen,
            accrued_interest: total_interest,
            last_interest_time: env.ledger().timestamp(),
        };
        let first_lender = lenders.get(0).unwrap();
        TokenStorage::set_cdp(env, first_lender.clone(), merged_cdp);

        // Remove other CDPs
        for lender in lenders.iter().skip(1) {
            TokenStorage::remove_cdp(env, lender.clone());
        }
        Ok(())
    }

    /// Close a CDP when its Collateralization Ratio (CR) value is zero, having no collateral or debt
    fn close_cdp(env: &Env, lender: Address) -> Result<(), Error> {
        let cdp = TokenStorage::get_cdp(env, lender.clone())
            .unwrap_or_else(|| panic_with_error!(env, Error::CDPNotFound));
        if cdp.asset_lent > 0 {
            return Err(Error::OutstandingDebt);
        }

        // If there's any remaining collateral, return it to the lender
        if cdp.xlm_deposited > 0 {
            let _ = Self::native(env)
                .try_transfer(&env.current_contract_address(), &lender, &cdp.xlm_deposited)
                .map_err(|_| Error::XLMTransferFailed)?;
        }
        env.events().publish(
            (Symbol::new(env, "CDP"), lender.clone()),
            crate::index_types::CDP {
                id: lender.clone(),
                xlm_deposited: cdp.xlm_deposited,
                asset_lent: cdp.asset_lent,
                accrued_interest: cdp.accrued_interest.amount,
                interest_paid: cdp.accrued_interest.paid,
                last_interest_time: cdp.last_interest_time,
                status: CDPStatus::Closed,
                ledger: env.ledger().sequence(),
                timestamp: env.ledger().timestamp(),
            },
        );
        TokenStorage::remove_cdp(env, lender);
        Ok(())
    }

    /// Update and return the accrued interest on a CDP
    fn get_accrued_interest(env: &Env, lender: Address) -> Result<InterestDetail, Error> {
        let cdp = TokenStorage::get_cdp(env, lender.clone())
            .unwrap_or_else(|| panic_with_error!(env, Error::CDPNotFound));
        let (interest, last_interest_time) = Self::get_updated_accrued_interest(env, &cdp)?;

        // Calculate approvalAmount: Projected interest 5 minutes ahead
        let now = env.ledger().timestamp();
        let five_min_later = now + 300; // 5 minutes in seconds

        // Project interest 5 minutes ahead
        let projected_interest =
            Self::get_projected_interest(env, &cdp, cdp.last_interest_time, five_min_later)?;
        let approval_amount = Self::convert_xasset_to_xlm(env, projected_interest.amount)?;

        // Calculate interest in XLM
        let amount_in_xlm = Self::convert_xasset_to_xlm(env, interest.amount)?;

        Ok(InterestDetail {
            amount: interest.amount,
            paid: interest.paid,
            amount_in_xlm,
            approval_amount,
            last_interest_time,
        })
    }

    /// Pay the accrued interest (but not principal) on a CDP.
    fn pay_interest(
        env: &Env,
        lender: Address,
        amount_in_xasset: i128,
    ) -> Result<CDPContract, Error> {
        assert_positive(env, amount_in_xasset);
        lender.require_auth();

        if amount_in_xasset <= 0 {
            return Err(Error::ValueNotPositive);
        }
        Self::apply_interest_payment(env, lender, amount_in_xasset, |lender, amount_in_xlm| {
            match Self::native(env).try_transfer(
                lender,
                &env.current_contract_address(),
                amount_in_xlm,
            ) {
                Ok(Ok(())) => Ok(()), // both contract invocation and logic succeeded
                Ok(Err(_)) => Err(Error::XLMTransferFailed), // invocation succeeded but logic failed
                Err(_) => Err(Error::XLMInvocationFailed),   // invocation (host error) failed
            }
        })
    }
}

#[contractimpl]
impl IsCDPAdmin for TokenContract {
    /// Set the address of the XLM contract
    fn set_xlm_sac(env: &Env, to: Address) {
        Self::require_admin(env);
        let mut state = TokenStorage::get_state(env);
        state.xlm_sac = to;
        TokenStorage::set_state(env, &state);
    }

    /// Set the oracle price feed contract for xlm
    fn set_xlm_contract(env: &Env, to: Address) {
        Self::require_admin(env);
        let mut state = TokenStorage::get_state(env);
        state.xlm_sac = to;
        TokenStorage::set_state(env, &state);
    }

    /// Set the oracle price feed contract for xAsset
    fn set_asset_contract(env: &Env, to: Address) {
        Self::require_admin(env);
        let mut state = TokenStorage::get_state(env);
        state.asset_contract = to;
        TokenStorage::set_state(env, &state);
    }

    /// Set the asset the xAsset is pegged to
    fn set_pegged_asset(env: &Env, to: Symbol) {
        Self::require_admin(env);
        let mut state = TokenStorage::get_state(env);
        state.pegged_asset = to;
        TokenStorage::set_state(env, &state);
    }

    /// Set minimum collateralization ratio
    fn set_min_collat_ratio(env: &Env, to: u32) -> u32 {
        Self::require_admin(env);
        let mut state = TokenStorage::get_state(env);
        state.min_collat_ratio = to;
        TokenStorage::set_state(env, &state);
        to
    }

    /// Set annual interest rate
    fn set_interest_rate(env: &Env, new_rate: u32) -> u32 {
        Self::require_admin(env);
        Self::set_annual_interest_rate(env, new_rate);
        new_rate
    }

    /// Get annual interest rate
    fn get_interest_rate(env: &Env) -> u32 {
        Self::get_annual_interest_rate(env)
    }

    /// Get total interest collected
    fn get_total_interest_collected(env: &Env) -> i128 {
        TokenStorage::get_state(env).interest_collected
    }

    /// Report the version of this contract
    fn version(env: &Env) -> String {
        String::from_str(env, VERSION_STRING)
    }
}

#[contractimpl]
impl IsStabilityPool for TokenContract {
    /// Deposit xasset tokens into the Stability Pool
    fn deposit(env: &Env, from: Address, amount: i128) -> Result<(), Error> {
        assert_positive(env, amount);
        from.require_auth();
        // check if the user has sufficient xasset
        let balance = Self::balance(env.clone(), from.clone());
        if balance < amount {
            return Err(Error::InsufficientBalance);
        }
        let current_position = Self::get_staker_deposit_amount(env, from.clone())?;
        let mut position = Self::get_deposit(env, from.clone()).unwrap_or(StakerPosition {
            xasset_deposit: 0,
            product_constant: Self::get_product_constant(env),
            compounded_constant: Self::get_compounded_constant(env),
            epoch: Self::get_epoch(env),
        });
        let xlm_reward = Self::calculate_rewards(env, &position);
        if xlm_reward > 0 {
            return Err(Error::ClaimRewardsFirst);
        }
        // Collect 1 XLM fee for each new deposit
        let _ = Self::native(env)
            .try_transfer(
                &from.clone(),
                &env.current_contract_address(),
                &Self::get_deposit_fee(env),
            )
            .map_err(|_| Error::XLMTransferFailed)?;
        Self::add_fees_collected(env, Self::get_deposit_fee(env));
        let Some(xasset_deposit) = current_position.checked_add(amount) else {
            return Err(Error::ArithmeticError);
        };
        position.xasset_deposit = xasset_deposit;
        position.compounded_constant = Self::get_compounded_constant(env);
        position.product_constant = Self::get_product_constant(env);
        // transfer xasset from address to pool
        Self::transfer_internal(env, from.clone(), env.current_contract_address(), amount);
        Self::set_deposit(env, from.clone(), position.clone(), 0);
        Self::add_total_xasset(env, amount);
        Ok(())
    }

    /// Withdraw xasset tokens from the Stability Pool
    fn withdraw(env: &Env, to: Address, amount: i128) -> Result<(), Error> {
        assert_positive(env, amount);
        to.require_auth();
        Self::withdraw_internal(env, to, amount, false)
    }

    /// Process a liquidation event for a CDP
    fn liquidate(env: &Env, lender: Address) -> Result<(i128, i128, CDPStatus), Error> {
        let mut cdp = TokenStorage::get_cdp(env, lender.clone())
            .unwrap_or_else(|| panic_with_error!(env, Error::CDPNotFound));
        let principal_debt = cdp.asset_lent;
        let collateral = cdp.xlm_deposited;
        let mut interest = cdp.accrued_interest;

        // Check if the CDP is frozen
        if !matches!(cdp.status, CDPStatus::Frozen) {
            return Err(Error::InvalidLiquidation);
        }

        // Ensure the debt and collateral are positive
        if principal_debt <= 0 || collateral <= 0 {
            return Err(Error::InvalidLiquidation);
        }

        let total_xasset = Self::get_total_xasset(env);

        // Handle interest first - collect all accrued interest if possible
        let interest_to_liquidate_xasset = cmp::min(interest.amount, total_xasset);
        let interest_to_liquidate_xlm =
            Self::convert_xasset_to_xlm(env, interest_to_liquidate_xasset)?;

        if interest_to_liquidate_xlm > 0 {
            let Some(interest_amount) = interest.amount.checked_sub(interest_to_liquidate_xasset)
            else {
                return Err(Error::ArithmeticError);
            };
            let Some(interest_paid) = interest.paid.checked_add(interest_to_liquidate_xlm) else {
                return Err(Error::ArithmeticError);
            };
            interest.amount = interest_amount;
            interest.paid = interest_paid;
            cdp.accrued_interest = interest;
            TokenStorage::set_interest_collected(
                env,
                Self::get_total_interest_collected(env) + interest_to_liquidate_xlm,
            );
            Self::increment_interest_for_current_epoch(env, &interest_to_liquidate_xlm);
        }

        // if unable to cover all interest, go ahead and update rewards and return
        if interest.amount > 0 {
            TokenStorage::set_cdp(env, lender, cdp);
            return Ok((0, 0, CDPStatus::Frozen));
        }
        // Now handle the principal debt with remaining available xasset
        let remaining_xasset = Self::get_total_xasset(env);
        let liquidated_debt = cmp::min(principal_debt, remaining_xasset);

        // Calculate the proportional amount of collateral to withdraw based on principal repaid
        let liquidated_collateral = bankers_round(
            DEFAULT_PRECISION * collateral * liquidated_debt / principal_debt,
            DEFAULT_PRECISION,
        );

        // Update constants for the stability pool
        Self::update_constants(env, liquidated_debt, liquidated_collateral);

        // Update the stability pool
        Self::subtract_total_xasset(env, liquidated_debt);
        Self::add_total_collateral(env, liquidated_collateral);

        // Burn the liquidated debt
        Self::burn_internal(env, env.current_contract_address(), liquidated_debt);

        // Update the CDP
        let Some(xlm_deposited) = cdp.xlm_deposited.checked_sub(liquidated_collateral) else {
            return Err(Error::ArithmeticError);
        };
        let Some(asset_lent) = cdp.asset_lent.checked_sub(liquidated_debt) else {
            return Err(Error::ArithmeticError);
        };
        cdp.xlm_deposited = xlm_deposited;
        cdp.asset_lent = asset_lent;

        env.events().publish(
            (Symbol::new(env, "Liquidation"), lender.clone()),
            crate::index_types::Liquidation {
                cdp_id: lender.clone(),
                collateral_liquidated: liquidated_collateral,
                principal_repaid: liquidated_debt,
                accrued_interest_repaid: interest_to_liquidate_xasset,
                collateral_applied_to_interest: interest_to_liquidate_xlm,
                collateralization_ratio: calculate_collateralization_ratio(
                    cdp.asset_lent + liquidated_debt,
                    Self::lastprice_asset(env)?.price,
                    cdp.xlm_deposited + liquidated_collateral,
                    Self::lastprice_xlm(env)?.price,
                    Self::decimals_xlm_feed(env)?,
                    Self::decimals_asset_feed(env)?,
                    interest.amount + interest_to_liquidate_xasset,
                ),
                xlm_price: Self::lastprice_xlm(env)?.price,
                xasset_price: Self::lastprice_asset(env)?.price,
                ledger: env.ledger().sequence(),
                timestamp: env.ledger().timestamp(),
            },
        );

        // If all debt is repaid, close the CDP
        if cdp.asset_lent == 0 {
            env.events().publish(
                (Symbol::new(env, "CDP"), lender.clone()),
                crate::index_types::CDP {
                    id: lender.clone(),
                    xlm_deposited: cdp.xlm_deposited,
                    asset_lent: cdp.asset_lent,
                    accrued_interest: cdp.accrued_interest.amount,
                    interest_paid: cdp.accrued_interest.paid,
                    last_interest_time: cdp.last_interest_time,
                    status: CDPStatus::Closed,
                    ledger: env.ledger().sequence(),
                    timestamp: env.ledger().timestamp(),
                },
            );

            // Remove CDP from storage
            env.storage()
                .persistent()
                .remove(&DataKey::CDP(lender.clone()));

            Ok((liquidated_debt, liquidated_collateral, CDPStatus::Closed))
        } else {
            // Otherwise, update the CDP
            TokenStorage::set_cdp(env, lender, cdp);
            Ok((liquidated_debt, liquidated_collateral, CDPStatus::Frozen))
        }
    }

    /// Claim a user's share of collateral rewards
    fn claim_rewards(env: &Env, to: Address) -> Result<i128, Error> {
        to.require_auth();
        let mut position = Self::get_deposit(env, to.clone())
            .unwrap_or_else(|| panic_with_error!(env, Error::StakeDoesntExist));

        let xlm_reward = Self::calculate_rewards(env, &position);

        let _ = Self::native(env)
            .try_transfer(&env.current_contract_address(), &to, &xlm_reward)
            .map_err(|_| Error::XLMTransferFailed)?;
        Self::subtract_total_collateral(env, xlm_reward);
        position.epoch = Self::get_epoch(env);
        position.xasset_deposit = Self::get_staker_deposit_amount(env, to.clone())?;
        position.compounded_constant = Self::get_compounded_constant(env);
        position.product_constant = Self::get_product_constant(env);
        Self::set_deposit(env, to, position, xlm_reward);
        Ok(xlm_reward)
    }

    /// Retrieve the current deposit amount for a given address
    fn get_staker_deposit_amount(env: &Env, address: Address) -> Result<i128, Error> {
        match Self::get_deposit(env, address) {
            Some(position) => Ok(Self::calculate_current_deposit(env, &position)),
            None => Err(Error::StakeDoesntExist),
        }
    }

    /// Retrieve the total amount of xasset tokens in the Stability Pool
    fn get_total_xasset(env: &Env) -> i128 {
        TokenStorage::get_state(env).total_xasset
    }

    /// Retrieve the total amount of collateral rewards in the Stability Pool
    fn get_total_collateral(env: &Env) -> i128 {
        TokenStorage::get_state(env).total_collateral
    }

    /// Add a stake to the pool
    fn stake(env: &Env, from: Address, amount: i128) -> Result<(), Error> {
        from.require_auth();

        // Get current state, and use sub keys throughout
        let current_state = TokenStorage::get_state(env);

        assert_positive(env, amount);

        // Check if the user already has a stake
        if Self::get_deposit(env, from.clone()).is_some() {
            return Err(Error::StakeAlreadyExists);
        }
        // check if the user has sufficient xasset
        let balance = Self::balance(env.clone(), from.clone());
        if balance < amount {
            return Err(Error::InsufficientBalance);
        }

        let _ = Self::native(env)
            .try_transfer(
                &from.clone(),
                &env.current_contract_address(),
                &current_state.stake_fee,
            )
            .map_err(|_| Error::XLMTransferFailed)?;
        // Add stake fee
        Self::add_fees_collected(env, current_state.stake_fee);

        // Create new position
        let position = StakerPosition {
            xasset_deposit: amount,
            product_constant: current_state.product_constant,
            compounded_constant: current_state.compounded_constant,
            epoch: current_state.epoch,
        };
        // transfer xasset from address to pool
        Self::transfer_internal(env, from.clone(), env.current_contract_address(), amount);

        // Set the new position in the stability pool
        Self::set_deposit(env, from.clone(), position.clone(), 0);
        Self::add_total_xasset(env, amount);
        Ok(())
    }

    /// Remove a user's stake from the pool
    fn unstake(env: &Env, staker: Address) -> Result<(), Error> {
        staker.require_auth();
        Self::withdraw_internal(env, staker, 0, true)
    }

    /// View a user's available xasset and rewards
    fn get_available_assets(env: &Env, staker: Address) -> Result<AvailableAssets, Error> {
        match Self::get_deposit(env, staker) {
            Some(position) => {
                let d = Self::calculate_current_deposit(env, &position);
                let xlm_reward = Self::calculate_rewards(env, &position);
                Ok(AvailableAssets {
                    available_xasset: d,
                    available_rewards: xlm_reward,
                })
            }
            None => Err(Error::StakeDoesntExist),
        }
    }

    /// View a user's current position
    fn get_position(env: &Env, staker: Address) -> Result<StakerPosition, Error> {
        let deposit = env
            .storage()
            .persistent()
            .get(&DataKey::StakerPosition(staker.clone()));
        match deposit {
            Some(position) => Ok(position),
            None => Err(Error::StakeDoesntExist),
        }
    }

    /// View the stability pool's current constants
    fn get_constants(env: &Env) -> StakerPosition {
        let current_state = TokenStorage::get_state(env);
        StakerPosition {
            compounded_constant: current_state.compounded_constant,
            product_constant: current_state.product_constant,
            epoch: current_state.epoch,
            xasset_deposit: current_state.total_xasset,
        }
    }
}
