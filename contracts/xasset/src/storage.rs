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
    pub fn new(xlm_deposited: i128, asset_lent: i128) -> Self {
        CDPInternal {
            xlm_deposited,
            asset_lent,
            status: CDPStatus::Open,
        }
    }
}