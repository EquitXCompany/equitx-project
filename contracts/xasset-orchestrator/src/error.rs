use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    // "Failed to deploy xasset contract"
    XAssetDeployFailed = 1,

    // "Asset contract already deployed"
    AssetAlreadyDeployed = 2,

    // "Failed to set asset contract admin"
    AssetAdminSetFailed = 3,

    // "No such asset deployed"
    NoSuchAsset = 4,

    // "Failed to upgrade asset contract"
    AssetUpgradeFailed = 5,
}
