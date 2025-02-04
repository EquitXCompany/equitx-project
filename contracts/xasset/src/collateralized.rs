use loam_sdk::{
    soroban_sdk::{self, Address, Lazy, String, Symbol, Vec},
    subcontract,
};

use crate::{Error, PriceData};

#[loam_sdk::soroban_sdk::contracttype]
#[derive(Clone, Copy)]
/// Descriptions of these on page 5 of Indigo white paper
pub enum CDPStatus {
    /// A CDP that is fully collateralized, with its CR value above the xAsset’s MCR. Open CDPs remain fully usable by their lenders.
    Open,
    /// A CDP that is undercollateralized, with its CR value below the xAsset’s MCR. Insolvent CDPs remain fully usable by their lenders but eligible to be frozen by any user.
    /// Consideration: does `Insolvent` need to be hard-coded? Or can it be calculated on-demand while data's small and as part of our eventual indexing layer once data's big?
    Insolvent,
    /// A CDP that has been confiscated by the protocol and no longer has an lender. A CDP becomes frozen after a user successfully submits a request against an insolvent CDP. Frozen CDPs cannot be used by their former lenders.
    Frozen,
    /// A CDP whose CR value is zero, no longer having any collateral or debt. A CDP is closed after all its debt is repaid and its collateral is withdrawn.
    Closed,
}

#[loam_sdk::soroban_sdk::contracttype]
#[derive(Clone)]
/// Collateralized Debt Position for a specific account
pub struct CDP {
    pub lender: Address,
    pub xlm_deposited: i128,
    pub asset_lent: i128,
    pub status: CDPStatus,
    pub collateralization_ratio: u32,
}

#[subcontract]
/// Interface-only subcontract for a contract that implements an asset which can have
/// Collateralized Debt Positions taken out against it.
pub trait IsCollateralized {
    /// Oracle contract used for this contract's XLM price feed. Example: `CBJSHY5PQQ4LS7VMHI4BJODEDP5MLANRNUSHKNSVKK7BQ4Y6LSTBDGMR`
    fn xlm_contract(&self) -> loam_sdk::soroban_sdk::Address;

    /// Stellar asset contract address
    fn xlm_sac(&self) -> loam_sdk::soroban_sdk::Address;

    /// Oracle contract used for this contract's pegged asset. Example: `CBJSHY5PQQ4LS7VMHI4BJODEDP5MLANRNUSHKNSVKK7BQ4Y6LSTBDGMR`
    fn asset_contract(&self) -> loam_sdk::soroban_sdk::Address;

    /// Which asset from Oracle this tracks. For `--asset '{"Other":"USD"}'` on asset contract, set to `USD`
    fn pegged_asset(&self) -> Symbol;

    /// Basis points. Default: 110%
    ///
    /// # Considerations
    ///
    /// u16 would suffice, but Soroban SDK doesn't support it 🥴
    fn minimum_collateralization_ratio(&self) -> u32;

    /// Get the most recent price for XLM
    fn lastprice_xlm(&self) -> Result<PriceData, Error>;

    /// Get the most recent price for the pegged asset
    fn lastprice_asset(&self) -> Result<PriceData, Error>;

    /// Get the number of decimals used by the xlm oracle contract. This is NOT the same as the number of decimals used by the XLM Stellar Asset Contract.
    fn decimals_xlm_feed(&self) -> Result<u32, Error>;

    /// Get the number of decimals used by the asset oracle contract. This is NOT the same as the number of decimals used by the xAsset Fungible Token contract.
    fn decimals_asset_feed(&self) -> Result<u32, Error>;

    /// Opens a new Collateralized Debt Position (CDP) by depositing collateral and minting xAsset.
    /// The user who creates the CDP becomes the CDP's owner.
    fn open_cdp(
        &mut self,
        lender: Address,
        collateral: i128,
        asset_lent: i128,
    ) -> Result<(), Error>;

    /// Retrieves the CDP information for a specific lender
    fn cdp(&self, lender: Address) -> Result<CDP, Error>;

    /// Freezes a CDP if its Collateralization Ratio (CR) is below the xAsset's Minimum Collateralization Ratio (MCR).
    /// A frozen CDP is no longer usable or interactable by its former owner.
    fn freeze_cdp(&mut self, lender: Address) -> Result<(), Error>;

    /// Increases the Collateralization Ratio (CR) by depositing more collateral to an existing CDP.
    fn add_collateral(&mut self, lender: Address, amount: i128) -> Result<(), Error>;

    /// Lowers the Collateralization Ratio (CR) by withdrawing part or all of the collateral from a CDP.
    /// Collateral cannot be withdrawn if it brings CR below the xAsset's MCR.
    fn withdraw_collateral(&mut self, lender: Address, amount: i128) -> Result<(), Error>;

    /// Lowers the Collateralization Ratio (CR) by minting additional xAsset against existing collateral.
    /// More xAsset cannot be minted if it brings CR below the xAsset's MCR.
    fn borrow_xasset(&mut self, lender: Address, amount: i128) -> Result<(), Error>;

    /// Increases the Collateralization Ratio (CR) by repaying debt in the form of xAsset.
    /// When the debt is repaid, the xAsset is burned (i.e., destroyed).
    /// More xAsset cannot be burned than debt owed by the CDP.
    fn repay_debt(&mut self, lender: Address, amount: i128) -> Result<(), Error>;

    /// Liquidates a frozen CDP. Upon liquidation, CDP debt is repaid by withdrawing xAsset from a Stability Pool.
    /// As debt is repaid, collateral is withdrawn from the CDP.
    /// If all debt is repaid, then all collateral is withdrawn, and the CDP is closed.
    fn liquidate_cdp(&mut self, lender: Address) -> Result<(i128, i128, CDPStatus), Error>;

    /// Merges two or more frozen CDPs into one CDP.
    /// Upon merging, all but one of the CDPs are closed, and their debt and collateral are transferred into a single CDP.
    fn merge_cdps(&mut self, lenders: Vec<Address>) -> Result<(), Error>;

    /// Closes a CDP when its Collateralization Ratio (CR) value is zero, having no collateral or debt.
    /// A CDP is closed after all its debt is repaid and its collateral is withdrawn.
    fn close_cdp(&mut self, lender: Address) -> Result<(), Error>;
}

#[subcontract]
/// Interface-only subcontract for a contract that implements an asset which can have
/// Collateralized Debt Positions taken out against it.
pub trait IsCDPAdmin {
    /// Initialize the subcontract with the given configuration.
    ///
    /// This assumes that you have already:
    ///
    /// - instantiated the Core subcontract with `admin_set`
    ///
    /// # Panics
    ///
    /// - if `cdp_init` has already been called
    /// - if `admin_set` has not yet been called and there is therefore not yet an admin
    /// - if admin did not sign the transaction envelope
    fn cdp_init(
        &self,
        xlm_sac: Address,
        xlm_contract: Address,
        asset_contract: Address,
        pegged_asset: Symbol,
        min_collat_ratio: u32,
        name: String,
        symbol: String,
        decimals: u32,
    );

    /// Set the address of the XLM contract
    fn set_xlm_sac(&mut self, to: loam_sdk::soroban_sdk::Address);

    /// Set the oracle price feed contract for xlm. Only callable by admin.
    fn set_xlm_contract(&mut self, to: loam_sdk::soroban_sdk::Address);

    /// Set the oracle price feed contract for xAsset. Only callable by admin.
    fn set_asset_contract(&mut self, to: loam_sdk::soroban_sdk::Address);

    /// Set the asset the xAsset is pegged to. Only callable by admin.
    fn set_pegged_asset(&mut self, to: Symbol);

    /// Only callable by admin.
    ///
    /// # Considerations
    ///
    /// Should we pass the old value and new and only update if `old` is same as current value, to
    /// avoid race conditions?
    ///
    /// Should we return anything? Right now it just returns `new_ratio` which seems... maybe
    /// useless?
    fn set_min_collat_ratio(&mut self, to: u32) -> u32;
}
