use loam_sdk::soroban_sdk::{self, contracterror};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    // "Insufficient collateralization ratio"
    InsufficientCollateralization = 1,

    // "CDP already exists for this lender"
    CDPAlreadyExists = 2,

    // "CDP not found"
    CDPNotFound = 3,

    // "CDP not insolvent"
    CDPNotInsolvent = 4,

    // "CDP must be Open to borrow asset"
    CDPNotOpen = 5,

    // "Insufficient collateral"
    InsufficientCollateral = 6,

    // "Insufficient balance"
    InsufficientBalance = 7,

    // "Repayment amount exceeds debt"
    RepaymentExceedsDebt = 8,

    // "Cannot close CDP with outstanding debt"
    OutstandingDebt = 9,

    // "At least two CDPs are required for merging" or "All CDPs must be frozen to merge"
    InvalidMerge = 10,

    // "CDP must be frozen to be liquidated" or "Debt and collateral must be positive"
    InvalidLiquidation = 11,

    // "Withdrawal would cause undercollateralization"
    InvalidWithdrawal = 12,

    // "CDP must be Open or Insolvent to add collateral"
    CDPNotOpenOrInsolvent = 13,

    // "CDP must be Open or Insolvent to repay debt"
    CDPNotOpenOrInsolventForRepay = 14,

    // "User already has a stake. Use deposit function to add to existing stake."
    StakeAlreadyExists = 15,

    // "Must unstake all xAsset to close SP account"
    PartialUnstakeNotAllowed = 16,

    // "live_until_ledger must be greater than or equal to the current ledger number"
    InvalidLedgerSequence = 17,

    // "Failed to fetch price data from the Oracle"
    OraclePriceFetchFailed = 18,

    // "Failed to fetch decimals from the Oracle"
    OracleDecimalsFetchFailed = 19,

    // "Failed to transfer XLM"
    XLMTransferFailed = 20,
}
