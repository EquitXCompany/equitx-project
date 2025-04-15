use loam_sdk::soroban_sdk::{self, contracterror};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    InitFailed = 1,
    InvalidAssetContract = 2,
    AssetAlreadyDeployed = 3,
    NoSuchAsset = 4,
}
