use crate::collateralized::CDPStatus;
use soroban_sdk::{Address, contracttype};

#[contracttype]
pub struct CDP {
    pub id: Address,
    pub xlm_deposited: i128,
    pub asset_lent: i128,
    pub status: CDPStatus,
    pub ledger: u32,
    pub timestamp: u64,
    pub accrued_interest: i128,
    pub interest_paid: i128,
    pub last_interest_time: u64,
}

#[contracttype]
pub struct StakePosition {
    pub id: Address,
    pub xasset_deposit: i128,
    pub product_constant: i128,
    pub compounded_constant: i128,
    pub rewards_claimed: i128,
    pub epoch: u64,
    pub ledger: u32,
    pub timestamp: u64,
}

#[contracttype]
pub struct Liquidation {
    pub cdp_id: Address,
    pub collateral_liquidated: i128,
    pub principal_repaid: i128,
    pub accrued_interest_repaid: i128,
    pub collateral_applied_to_interest: i128,
    pub collateralization_ratio: u32,
    pub xlm_price: i128,
    pub xasset_price: i128,
    pub ledger: u32,
    pub timestamp: u64,
}
