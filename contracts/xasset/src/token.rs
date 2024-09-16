use loam_sdk::{
    soroban_sdk::{self, contracttype, env, token, Address, Map, Symbol, Vec},
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
    /// XLM Address
    xlm_address: Address,
    /// Oracle contract ID this asset tracks.
    pegged_contract: Address,
    /// Oracle asset ID this asset tracks.
    pegged_asset: Symbol,
    /// basis points; default 110%; updateable by admin
    min_collat_ratio: u32,
    /// each Address can only have one CDP per Asset. Given that you can adjust your CDPs freely, that seems fine?
    cdps: Map<Address, CDPInternal>,
}

/// Loam SDK currently requires us to implement `Default`. This is nonsense and will be fixed in
/// https://github.com/loambuild/loam/issues/92
impl Default for Token {
    fn default() -> Self {
        Token {
            xlm_address: env().current_contract_address(),
            pegged_contract: env().current_contract_address(),
            pegged_asset: Symbol::new(env(), "XLM"),
            min_collat_ratio: 11000,
            cdps: Map::new(env()),
        }
    }
}

impl IsCollateralized for Token {
    fn pegged_contract(&self) -> Address {
        self.pegged_contract.clone()
    }
    fn pegged_asset(&self) -> Symbol {
        self.pegged_asset.clone()
    }
    fn minimum_collateralization_ratio(&self) -> u32 {
        self.min_collat_ratio
    }

    fn lastprice(&self) -> Option<PriceData> {
        let env = env();
        let contract = &self.pegged_contract;
        let asset = &self.pegged_asset;
        let client = data_feed::Client::new(env, contract);
        let data_feed::PriceData { price, timestamp } =
            client.lastprice(&data_feed::Asset::Other(asset.clone()))?;
        Some(PriceData { price, timestamp })
    }

    fn decimals_oracle(&self) -> u32 {
        let env = env();
        let contract = &self.pegged_contract;
        let client = data_feed::Client::new(env, contract);
        client.decimals()
    }
    // fn add_collateral(&self, cdp: CDP) -> CDP {
    //     self.cdps.get(address)
    // }
    //
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
        let client = token::Client::new(env, &self.xlm_address);
        client.transfer(&lender, &env.current_contract_address(), &collateral);

        // 4. FIXME mint `asset_lent` of this token to `address`

        // 5. create CDP
        self.cdps
            .set(lender, CDPInternal::new(collateral, asset_lent));
    }

    fn cdp(&self, lender: Address) -> CDP {
        let cdp = self.cdps.get(lender.clone()).expect("CDP not found");
        let lastprice = self.lastprice().expect("No price data");
        let decimals = self.decimals_oracle();
        self.decorate(cdp, lender, lastprice.price, decimals)
    }

    fn cdps(&self) -> Vec<CDP> {
        let mut cdps: Vec<CDP> = Vec::new(env());
        let lastprice = self.lastprice().expect("No price data");
        let decimals = self.decimals_oracle();
        self.cdps
            .iter()
            .for_each(|(k, v)| cdps.push_back(self.decorate(v, k, lastprice.price, decimals)));
        cdps
    }

    fn freeze_cdp(&mut self, lender: Address) {
        let cdp = self.cdp(lender.clone()).expect("CDP not found");
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
    fn set_xlm_address(&mut self, to: Address) {
        Contract::require_auth();
        self.xlm_address = to;
    }
    fn set_pegged_contract(&mut self, to: Address) {
        Contract::require_auth();
        self.pegged_contract = to;
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
        owner: Address,
        price_from_oracle: i128,
        decimals_oracle: u32,
    ) -> CDP {
        // Need to divide in a way that never has a decimal, so decimals don't get truncated (or
        // that has only truncatable decimals as of the final operation).
        //
        // ratio = BASIS_POINTS * XLM locked / (USD minted * XLM price)
        //
        //   and: XLM price = price_from_oracle / decimals_oracle
        //   so that:
        //
        // ratio = BASIS_POINTS * XLM locked * decimals_oracle / (USD minted * price_from_oracle)
        // ratio = BASIS_POINTS * XLM locked * decimals_oracle / USD minted / price_from_oracle
        let collateralization_ratio =
            (BASIS_POINTS * cdp.xlm_deposited * 10i128.pow(decimals_oracle)
                / cdp.asset_lent
                / price_from_oracle) as u32;

        CDP {
            owner,
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
