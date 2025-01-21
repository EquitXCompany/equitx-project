use retroshade_sdk::Retroshade;
use loam_sdk::soroban_sdk::{self, contracttype, Address, Symbol};
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
