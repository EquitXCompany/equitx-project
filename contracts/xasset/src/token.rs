use loam_sdk::{
    soroban_sdk::{self, contracttype, env, token, Address, Lazy, Map, Symbol, Vec},
    IntoKey,
};

use crate::Contract;
use crate::{collateralized::CDPStatus, data_feed};
use crate::{
    collateralized::{IsCDPAdmin, IsCollateralized, CDP},
    PriceData,
};

const BASIS_POINTS: i128 = 10_000;

#[contracttype]
#[derive(Clone)]
pub struct CDPInternal {
    pub xlm_deposited: i128,
    pub asset_lent: i128,
    pub status: CDPStatus,
}

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

#[contracttype]
#[derive(IntoKey)]
pub struct Token {
    /// XLM Stellar Asset Contract address, for XLM transfers
    xlm_sac: Address,
    /// Oracle contract ID for XLM price feed
    xlm_contract: Address,
    /// Oracle contract ID for asset price feed
    asset_contract: Address,
    /// Oracle asset ID this asset tracks.
    pegged_asset: Symbol,
    /// basis points; default 110%; updateable by admin
    min_collat_ratio: u32,
    /// each Address can only have one CDP per Asset. Given that you can adjust your CDPs freely, that seems fine?
    cdps: Map<Address, CDPInternal>,
}

impl Token {
    #[must_use]
    pub fn new(
        xlm_sac: Address,
        xlm_contract: Address,
        asset_contract: Address,
        pegged_asset: Symbol,
        min_collat_ratio: u32,
    ) -> Self {
        Token {
            xlm_sac,
            xlm_contract,
            asset_contract,
            pegged_asset,
            min_collat_ratio,
            cdps: Map::new(env()),
        }
    }
}

/// Loam SDK currently requires us to implement `Default`. This is nonsense and will be fixed in
/// https://github.com/loambuild/loam/issues/92
impl Default for Token {
    fn default() -> Self {
        Token {
            xlm_sac: env().current_contract_address(),
            xlm_contract: env().current_contract_address(),
            asset_contract: env().current_contract_address(),
            pegged_asset: Symbol::new(env(), "XLM"),
            min_collat_ratio: 11000,
            cdps: Map::new(env()),
        }
    }
}

impl IsCollateralized for Token {
    fn xlm_contract(&self) -> Address {
        self.xlm_contract.clone()
    }
    fn asset_contract(&self) -> Address {
        self.xlm_contract.clone()
    }
    fn pegged_asset(&self) -> Symbol {
        self.pegged_asset.clone()
    }
    fn minimum_collateralization_ratio(&self) -> u32 {
        self.min_collat_ratio
    }

    fn lastprice_xlm(&self) -> PriceData {
        let env = env();
        let contract = &self.xlm_contract;
        let client = data_feed::Client::new(env, contract);
        let data_feed::PriceData { price, timestamp } = client
            .lastprice(&data_feed::Asset::Other(Symbol::new(env, "XLM")))
            .expect("No XLM price data from Oracle");
        PriceData { price, timestamp }
    }

    fn lastprice_asset(&self) -> PriceData {
        let env = env();
        let contract = &self.asset_contract;
        let asset = &self.pegged_asset;
        let client = data_feed::Client::new(env, contract);
        let data_feed::PriceData { price, timestamp } = client
            .lastprice(&data_feed::Asset::Other(asset.clone()))
            .expect("No asset price data from Oracle");
        PriceData { price, timestamp }
    }

    fn decimals_xlm_feed(&self) -> u32 {
        let contract = &self.xlm_contract;
        let client = data_feed::Client::new(env(), contract);
        client.decimals()
    }

    fn decimals_asset_feed(&self) -> u32 {
        let contract = &self.asset_contract;
        let client = data_feed::Client::new(env(), contract);
        client.decimals()
    }

    fn open_cdp(&mut self, lender: Address, collateral: i128, asset_lent: i128) {
        lender.require_auth();

        let env = env();

        // 1. check if lender already has a CDP
        if self.cdps.contains_key(lender.clone()) {
            panic!("CDP already exists for this lender");
        }

        // 2. check that `lastprice` gives collateralization ratio over `min_collat_ratio`
        // FIXME: do we need a Client and cross-contract call to self?
        // let PriceData { price, .. } = self.lastprice().expect("No price data");
        // let ratio = collateral / (asset_lent * price);
        // if ratio < self.min_collat_ratio as i128 {
        //     panic!("Insufficient collateralization ratio");
        // }

        // 3. transfer attached XLM to this contract
        let client = token::Client::new(env, &self.xlm_sac);
        client.transfer(&lender, &env.current_contract_address(), &collateral);

        // 4. FIXME mint `asset_lent` of this token to `address`

        // 5. create CDP
        self.cdps
            .set(lender, CDPInternal::new(collateral, asset_lent));
    }

    fn cdp(&self, lender: Address) -> CDP {
        let cdp = self.cdps.get(lender.clone()).expect("CDP not found");
        let xlm_price = self.lastprice_xlm();
        let xlm_decimals = self.decimals_xlm_feed();
        let xasset_price = self.lastprice_asset();
        let xasset_decimals = self.decimals_asset_feed();
        self.decorate(
            cdp,
            lender,
            xlm_price.price,
            xlm_decimals,
            xasset_price.price,
            xasset_decimals,
        )
    }

    fn cdps(&self) -> Vec<CDP> {
        let mut cdps: Vec<CDP> = Vec::new(env());
        let xlm_price = self.lastprice_xlm();
        let xlm_decimals = self.decimals_xlm_feed();
        let xasset_price = self.lastprice_asset();
        let xasset_decimals = self.decimals_asset_feed();
        self.cdps.iter().for_each(|(lender, cdp)| {
            cdps.push_back(self.decorate(
                cdp,
                lender,
                xlm_price.price,
                xlm_decimals,
                xasset_price.price,
                xasset_decimals,
            ))
        });
        cdps
    }

    fn freeze_cdp(&mut self, lender: Address) {
        let cdp = self.cdp(lender.clone());
        if matches!(cdp.status, CDPStatus::Insolvent) {
            self.cdps.set(
                lender,
                CDPInternal {
                    xlm_deposited: cdp.xlm_deposited,
                    asset_lent: cdp.asset_lent,
                    status: CDPStatus::Frozen,
                },
            );
        } else {
            panic!("CDP not insolvent");
        }
    }
}

impl IsCDPAdmin for Token {
    fn cdp_init(
        &self,
        xlm_sac: Address,
        xlm_contract: Address,
        asset_contract: Address,
        pegged_asset: Symbol,
        min_collat_ratio: u32,
    ) {
        Contract::require_auth();
        Token::set_lazy(Token::new(
            xlm_sac,
            xlm_contract,
            asset_contract,
            pegged_asset,
            min_collat_ratio,
        ));
    }
    fn set_xlm_sac(&mut self, to: Address) {
        Contract::require_auth();
        self.xlm_sac = to;
    }
    fn set_xlm_contract(&mut self, to: Address) {
        Contract::require_auth();
        self.xlm_contract = to;
    }
    fn set_asset_contract(&mut self, to: Address) {
        Contract::require_auth();
        self.asset_contract = to;
    }
    fn set_pegged_asset(&mut self, to: Symbol) {
        Contract::require_auth();
        self.pegged_asset = to;
    }
    fn set_min_collat_ratio(&mut self, to: u32) -> u32 {
        Contract::require_auth();
        self.min_collat_ratio = to;
        to
    }
}

impl Token {
    /// Decorate a CDPInternal with the collateralization ratio. Also check if the CDP is insolvent.
    fn decorate(
        &self,
        cdp: CDPInternal,
        lender: Address,
        xlm_price: i128,
        xlm_decimals: u32,
        xasset_price: i128,
        xasset_decimals: u32,
    ) -> CDP {
        // Need to divide in a way that never has a decimal, so decimals don't get truncated (or
        // that has only truncatable decimals as of the final operation).
        //
        // ratio = BASIS_POINTS * XLM locked * XLM's USD price / (xAsset minted * xAsset's USD price)
        //
        //   and: a price = multiplied price from oracle / oracle's number of decimals multiplier
        //   so that:
        //
        // ratio = BASIS_POINTS * XLM locked * (XLM's multiplied USD price / XLM's multiplier)
        //           / (xAsset minted * (xAsset's multiplied USD price / xAsset's USD multiplier)
        // ratio = BASIS_POINTS * XLM locked * XLM's multiplied USD price * xAsset's USD multiplier
        //           / (xAsset minted * XLM's multiplier * xAsset's multiplied USD price)
        //
        // Need to prevent exceeding i128 limit. Multiply the numerator OR denom by min multiplier.
        let (numer_decimals, denom_decimals) = if xlm_decimals == xasset_decimals {
            (0, 0)
        } else if xlm_decimals > xasset_decimals {
            (0, xlm_decimals - xasset_decimals)
        } else {
            (xasset_decimals - xlm_decimals, 0)
        };
        let collateralization_ratio =
            (BASIS_POINTS * cdp.xlm_deposited * xlm_price * 10i128.pow(numer_decimals)
                / cdp.asset_lent
                / 10i128.pow(denom_decimals)
                / xasset_price) as u32;

        CDP {
            lender,
            xlm_deposited: cdp.xlm_deposited,
            asset_lent: cdp.asset_lent,
            collateralization_ratio,
            status: if matches!(cdp.status, CDPStatus::Open)
                && collateralization_ratio < self.min_collat_ratio
            {
                CDPStatus::Insolvent
            } else {
                cdp.status
            },
        }
    }
}
