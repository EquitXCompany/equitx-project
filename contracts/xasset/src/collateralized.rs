use loam_sdk::{
    soroban_sdk::{self, Lazy},
    subcontract,
};

#[loam_sdk::soroban_sdk::contracttype]
/// Descriptions of these on page 5 of Indigo white paper
pub enum CDPStatus {
    Open,
    Insolvent, // not sure if `Insolvent` needs to be hard-coded or if it can be calculated on-demand while data's small and as part of our eventual indexing layer once data's big
    Frozen,
    Closed,
}

#[loam_sdk::soroban_sdk::contracttype]
/// Collateralized Debt Position for a specific account
pub struct CDP {
    pub xlm_deposited: u128,
    pub usd_lent: u128,
    pub status: CDPStatus,
}

#[subcontract]
/// Interface-only subcontract for a contract that implements an asset which can have
/// Collateralized Debt Positions taken out against it.
pub trait IsCollateralized {
    /// Oracle ID & which asset from Oracle this tracks. Might be worth storing these as separate fields?
    fn pegged_to(&self) -> loam_sdk::soroban_sdk::String;

    /// Basis points. Default: 110%
    ///
    /// # Considerations
    ///
    /// u16 would suffice, but Soroban SDK doesn't support it 🥴
    fn minimum_collateralization_ratio(&self) -> u32;

    // /// each Address can only have one CDP per Asset. Given that you can adjust your CDPs freely, that seems fine?
    // fn get_cdp(&self, loam_sdk::soroban_sdk::Address) -> CDP;

    // fn add_collateral(&self, loam_sdk::soroban_sdk::Address, CDP);
}

#[subcontract]
/// Interface-only subcontract for a contract that implements an asset which can have
/// Collateralized Debt Positions taken out against it.
pub trait IsCollateralizedAdmin {
    /// Only callable by admin.
    ///
    /// # Considerations
    ///
    /// Should we pass the old value and new and only update if `old` is same as current value, to
    /// avoid race conditions?
    ///
    /// Should we return anything? Right now it just returns `new_ratio` which seems... maybe
    /// useless?
    fn set_minimum_collateralization_ratio(&mut self, new_ratio: u32) -> u32;
}
