use loam_sdk::soroban_sdk::{self, contracterror};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AssetAlreadyDeployed = 1,
    InvalidAssetContract = 2,
    NoSuchAsset = 3,
    InitFailed = 4,
}
