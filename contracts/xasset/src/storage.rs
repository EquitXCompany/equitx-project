use loam_sdk::soroban_sdk::{self, contracttype, Address};

use crate::collateralized::CDPStatus;

#[contracttype]
#[derive(Clone)]
pub struct Txn(pub Address, pub Address);

#[contracttype]
#[derive(Clone)]
pub struct Allowance {
    pub amount: i128,
    pub live_until_ledger: u32,
}

#[contracttype]
#[derive(Clone, Copy)]
pub struct CDPInternal {
    pub xlm_deposited: i128,
    pub asset_lent: i128,
    pub status: CDPStatus,
    /// Last time (in seconds) interest was calculated for each CDP
    pub last_interest_time: u64,
    pub accrued_interest: Interest,
}

#[contracttype]
pub struct AllowanceValue {
    pub amount: i128,
    pub expiration_ledger: u32,
}

#[contracttype]
pub struct Balance(Address);

impl CDPInternal {
    #[must_use]
    pub fn new(xlm_deposited: i128, asset_lent: i128, timestamp: u64) -> Self {
        CDPInternal {
            xlm_deposited,
            asset_lent,
            status: CDPStatus::Open,
            accrued_interest: Interest::default(),
            last_interest_time: timestamp, 
        }
    }
}

#[contracttype]
#[derive(Clone, Copy, Default)]
pub struct Interest {
    /// Amount of interest accrued
    pub amount: i128,
    /// Amount of interest paid
    pub paid: i128,
}