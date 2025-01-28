use retroshade_sdk::Retroshade;
use loam_sdk::soroban_sdk::{self, contracttype, Address };
use crate::collateralized::CDPStatus;

#[derive(Retroshade)]
#[contracttype]
pub struct CDP {
    pub id: Address,
    pub xlm_deposited: i128,
    pub asset_lent: i128,
    pub status: CDPStatus,
    pub ledger: u32,
    pub timestamp: u64,
}

#[derive(Retroshade)]
#[contracttype]
pub struct StakePosition {
    pub id: Address,
    pub xasset_deposit: i128,
    pub product_constant: i128,
    pub compounded_constant: i128,
    pub epoch: u64,
    pub ledger: u32,
    pub timestamp: u64,
}

