use loam_sdk::soroban_sdk::{self, contracterror};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    // "Orchestrator contract not initialized with necessary values"
    ContractNotInitalized = 1,

    // "Failed to deploy xasset contract"
    XAssetDeployFailed = 2,

    // "Asset contract already deployed"
    AssetAlreadyDeployed = 3,

    // "Failed to set asset contract admin"
    AssetAdminSetFailed = 4,

    // "No such asset deployed"
    NoSuchAsset = 5,
}
