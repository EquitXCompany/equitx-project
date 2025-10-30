#![no_std]

use soroban_sdk::{self, Address, Symbol, contracttype};

pub mod data_feed;
mod sep40;

/// Quoted asset definition
#[contracttype]
#[derive(Clone, Debug, PartialEq)]
pub enum Asset {
    /// Can be a Stellar Classic or Soroban asset
    Stellar(Address),
    /// For any external tokens/assets/symbols
    Other(Symbol),
}

/// Price record definition
#[contracttype]
#[derive(Debug)]
pub struct PriceData {
    pub price: i128,    //asset price at given point in time
    pub timestamp: u64, //recording timestamp
}

mod test;
