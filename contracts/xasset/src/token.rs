use loam_sdk::{
    soroban_sdk::{self, contracttype, env, Map, String},
    IntoKey,
};

use crate::collateralized::{IsCollateralized, IsCollateralizedAdmin, CDP};
use crate::Contract;

#[contracttype]
#[derive(IntoKey)]
pub struct Token {
    /// Oracle ID & which asset from Oracle this tracks. Might be worth storing these as separate fields?
    pegged_to: String,
    /// basis points; default 110%; updateable by admin
    min_collat_ratio: u32,
    /// each Address can only have one CDP per Asset. Given that you can adjust your CDPs freely, that seems fine?
    cdps: Map<String, CDP>,
}

/// Loam SDK currently requires us to implement `Default`. This is nonsense and will be fixed in
/// https://github.com/loambuild/loam/issues/92
impl Default for Token {
    fn default() -> Self {
        let env = env();
        Token {
            pegged_to: String::from_str(env, ""),
            min_collat_ratio: 110,
            cdps: Map::new(env),
        }
    }
}

impl IsCollateralized for Token {
    fn pegged_to(&self) -> String {
        self.pegged_to.clone()
    }
    fn minimum_collateralization_ratio(&self) -> u32 {
        self.min_collat_ratio
    }
    // fn cdp(&self, address: Address) -> CDP {
    //     self.cdps.get(env(), address)
    // }
}

impl IsCollateralizedAdmin for Token {
    fn set_minimum_collateralization_ratio(&mut self, new_ratio: u32) -> u32 {
        Contract::require_auth();
        self.min_collat_ratio = new_ratio;
        new_ratio
    }
}
