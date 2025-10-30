use soroban_sdk::{Address, Env, String, Symbol, Vec, contracttype};

use crate::{
    Error, PriceData,
    storage::{Interest, InterestDetail},
};

#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq)]
/// Descriptions of these on page 5 of Indigo white paper
pub enum CDPStatus {
    /// A CDP that is fully collateralized, with its CR value above the xAsset’s MCR. Open CDPs remain fully usable by their lenders.
    Open,
    /// A CDP that is undercollateralized, with its CR value below the xAsset’s MCR. Insolvent CDPs remain fully usable by their lenders but eligible to be frozen by any user.
    /// Consideration: does `Insolvent` need to be hard-coded? Or can it be calculated on-demand while data's small and as part of our eventual indexing layer once data's big?
    Insolvent,
    /// A CDP that has been confiscated by the protocol and no longer has an lender. A CDP becomes frozen after a user successfully submits a request against an insolvent CDP. Frozen CDPs cannot be used by their former lenders.
    Frozen,
    /// A CDP whose CR value is zero, no longer having any collateral or debt. A CDP is closed after all its debt is repaid and its collateral is withdrawn.
    Closed,
}

#[contracttype]
#[derive(Clone)]
/// Collateralized Debt Position for a specific account
pub struct CDPContract {
    pub lender: Address,
    pub xlm_deposited: i128,
    pub asset_lent: i128,
    pub status: CDPStatus,
    pub collateralization_ratio: u32,
    pub accrued_interest: Interest,
    pub last_interest_time: u64,
}

// TODO was a subcontract
/// Interface-only subcontract for a contract that implements an asset which can have
/// Collateralized Debt Positions taken out against it.
pub trait IsCollateralized {
    /// Oracle contract used for this contract's XLM price feed. Example: `CBJSHY5PQQ4LS7VMHI4BJODEDP5MLANRNUSHKNSVKK7BQ4Y6LSTBDGMR`
    fn xlm_contract(env: &Env) -> Address;

    /// Stellar asset contract address
    fn xlm_sac(env: &Env) -> Address;

    /// Oracle contract used for this contract's pegged asset. Example: `CBJSHY5PQQ4LS7VMHI4BJODEDP5MLANRNUSHKNSVKK7BQ4Y6LSTBDGMR`
    fn asset_contract(env: &Env) -> Address;

    /// Which asset from Oracle this tracks. For `--asset '{"Other":"USD"}'` on asset contract, set to `USD`
    fn pegged_asset(env: &Env) -> Symbol;

    /// Basis points. Default: 110%
    fn minimum_collateralization_ratio(env: &Env) -> u32;

    /// Get the most recent price for XLM
    fn lastprice_xlm(env: &Env) -> Result<PriceData, Error>;

    /// Get the most recent price for the pegged asset
    fn lastprice_asset(env: &Env) -> Result<PriceData, Error>;

    /// Get the number of decimals used by the xlm oracle contract. This is NOT the same as the number of decimals used by the XLM Stellar Asset Contract.
    fn decimals_xlm_feed(env: &Env) -> Result<u32, Error>;

    /// Get the number of decimals used by the asset oracle contract. This is NOT the same as the number of decimals used by the xAsset Fungible Token contract.
    fn decimals_asset_feed(env: &Env) -> Result<u32, Error>;

    /// Open a new Collateralized Debt Position (CDP) by depositing collateral and minting xAsset.
    /// The user who creates the CDP becomes the CDP's owner.
    fn open_cdp(
        env: &Env,
        lender: Address,
        collateral: i128,
        asset_lent: i128,
    ) -> Result<(), Error>;

    /// Retrieves the CDP information for a specific lender
    fn cdp(env: &Env, lender: Address) -> Result<CDPContract, Error>;

    /// Freeze a CDP if its Collateralization Ratio (CR) is below the xAsset's Minimum Collateralization Ratio (MCR).
    /// A frozen CDP is no longer usable or interactable by its former owner.
    fn freeze_cdp(env: &Env, lender: Address) -> Result<(), Error>;

    /// Increase the Collateralization Ratio (CR) by depositing more collateral to an existing CDP.
    fn add_collateral(env: &Env, lender: Address, amount: i128) -> Result<(), Error>;

    /// Lower the Collateralization Ratio (CR) by withdrawing part or all of the collateral from a CDP.
    /// Collateral cannot be withdrawn if it brings CR below the xAsset's MCR.
    fn withdraw_collateral(env: &Env, lender: Address, amount: i128) -> Result<(), Error>;

    /// Lowers the Collateralization Ratio (CR) by minting additional xAsset against existing collateral.
    /// More xAsset cannot be minted if it brings CR below the xAsset's MCR.
    fn borrow_xasset(env: &Env, lender: Address, amount: i128) -> Result<(), Error>;

    /// Increase the Collateralization Ratio (CR) by repaying debt in the form of xAsset
    /// When the debt is repaid, the xAsset is burned (i.e., destroyed).
    /// More xAsset cannot be burned than debt owed by the CDP.
    ///
    /// **Repayment Workflow:**
    /// 1. Call [`get_accrued_interest`] to get the latest accrued interest, including `approval_amount`.
    /// 2. Call the XLM SAC's `approve` function to approve spending the required XLM:
    ///    ```
    ///    stellar contract invoke \
    ///      --id <xlm_sac_contract_id> \
    ///      -- approve \
    ///      --from <your_id> \
    ///      --spender <token_contract_id> \
    ///      --amount <approval_amount> \
    ///      --expiration_ledger <current_ledger_seq_plus_x>
    ///    ```
    ///    - `--from` is your account.
    ///    - `--spender` is this token contract's ID.
    ///    - `--amount` is the `approval_amount` returned by `get_accrued_interest`.
    ///    - `--expiration_ledger` should be a value a few ledgers into the future (e.g., `current sequence + 100` ~ 5 minutes).
    /// 3. Call this function [`repay_debt`] within 5 minutes to finalize repayment and burn xAsset.
    ///
    /// This ensures the proper interest payment is authorized and prevents race conditions.
    fn repay_debt(env: &Env, lender: Address, amount: i128) -> Result<(), Error>;

    /// Liquidates a frozen CDP. Upon liquidation, CDP debt is repaid by withdrawing xAsset from a Stability Pool.
    /// As debt is repaid, collateral is withdrawn from the CDP.
    /// If all debt is repaid, then all collateral is withdrawn, and the CDP is closed.
    fn liquidate_cdp(env: &Env, lender: Address) -> Result<(i128, i128, CDPStatus), Error>;

    /// Merge two or more frozen CDPs into one CDP.
    /// Upon merging, all but one of the CDPs are closed, and their debt and collateral are transferred into a single CDP.
    fn merge_cdps(env: &Env, lenders: Vec<Address>) -> Result<(), Error>;

    /// Close a CDP when its Collateralization Ratio (CR) value is zero, having no collateral or debt.
    /// A CDP is closed after all its debt is repaid and its collateral is withdrawn.
    fn close_cdp(env: &Env, lender: Address) -> Result<(), Error>;

    /// Update and returns the accrued interest on a CDP.
    ///
    /// Returns an [`InterestDetail`] struct, including:
    /// - `amount`: total interest accrued;
    /// - `paid`: total interest paid;
    /// - `amount_in_xlm`: interest amount expressed in XLM;
    /// - `approval_amount`: the amount of XLM that needs to be approved for repayment if repaid within five minutes;
    /// - `last_interest_time`: timestamp of last calculation.
    fn get_accrued_interest(env: &Env, lender: Address) -> Result<InterestDetail, Error>;

    /// Pay the accrued interest (but not principal) on a CDP.
    ///
    /// - Interest is paid in XLM, not in the principal token.
    /// - To determine the current interest due (in both principal token and XLM),
    ///   call [`get_accrued_interest`], which returns both values.
    /// - Use the `amount_in_xlm` and/or `approval_amount` from that result when
    ///   approving and paying interest.
    ///
    /// Note: This function is for paying only the interest; to repay principal, use [`repay_debt`].
    fn pay_interest(env: &Env, lender: Address, amount: i128) -> Result<CDPContract, Error>;
}

/// Interface-only subcontract for a contract that implements an asset which can have
/// Collateralized Debt Positions taken out against it.
pub trait IsCDPAdmin {
    /// Set the address of the XLM contract
    fn set_xlm_sac(env: &Env, to: Address);

    /// Set the oracle price feed contract for xlm. Only callable by admin.
    fn set_xlm_contract(env: &Env, to: Address);

    /// Set the oracle price feed contract for xAsset. Only callable by admin.
    fn set_asset_contract(env: &Env, to: Address);

    /// Set the asset the xAsset is pegged to. Only callable by admin.
    fn set_pegged_asset(env: &Env, to: Symbol);

    /// Set minimum collateralization ration. Only callable by admin.
    fn set_min_collat_ratio(env: &Env, to: u32) -> u32;

    /// Set annual interest rate
    fn set_interest_rate(env: &Env, new_rate: u32) -> u32;

    /// Get annual interest rate
    fn get_interest_rate(env: &Env) -> u32;

    /// Get total interest collected
    fn get_total_interest_collected(env: &Env) -> i128;

    /// Report the version of this contract
    fn version(env: &Env) -> String;
}
