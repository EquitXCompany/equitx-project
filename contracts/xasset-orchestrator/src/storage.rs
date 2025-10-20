#![allow(clippy::must_use_candidate, clippy::missing_errors_doc)]
use core::marker::PhantomData;

use soroban_sdk::{symbol_short, Address, BytesN, Env, IntoVal, String, TryFromVal, Val};

pub struct Storage {
    /// Wasm hash of the xasset contract
    pub wasm_hash: BytesN<32>,
    /// XLM SAC contract address; initialized and then passed
    /// to deployed xasset contracts
    pub xlm_sac: Address,
    /// XLM oracle contract, initialized and then passed
    /// to deployed xasset contracts
    pub xlm_contract: Address,
    /// A map of deployed asset contracts to their asset symbol.
    /// This is used to check if a contract is a valid asset contract
    /// and to get the asset symbol from the contract address.
    /// The key is the asset symbol, the value is the asset contract address.
    pub assets: InstanceMap<String, Address, AssetKey>,
}

impl Storage {
    pub fn new(env: &Env, wasm_hash: BytesN<32>, xlm_sac: Address, xlm_contract: Address) -> Self {
        Self {
            wasm_hash,
            xlm_sac,
            xlm_contract,
            assets: InstanceMap::new(env),
        }
    }
}

pub struct AssetKey;

impl StorageKey<String> for AssetKey {
    fn to_key(env: &Env, k: &String) -> Val {
        (symbol_short!("AS"), k.clone()).into_val(env)
    }
}

pub trait StorageKey<Key: IntoVal<Env, Val> + Clone> {
    fn to_key(env: &Env, k: &Key) -> Val;
}

#[derive(Clone)]
pub struct InstanceMap<K, V, W>
where
    K: IntoVal<Env, Val> + Clone,
    W: StorageKey<K>,
    V: IntoVal<Env, Val> + TryFromVal<Env, Val>,
{
    env: Env,
    k: PhantomData<K>,
    v: PhantomData<V>,
    w: PhantomData<W>,
}

impl<K, V, W> InstanceMap<K, V, W>
where
    K: IntoVal<Env, Val> + Clone,
    W: StorageKey<K>,
    V: IntoVal<Env, Val> + TryFromVal<Env, Val>,
{
    pub fn new(env: &Env) -> Self {
        Self {
            env: env.clone(),
            k: PhantomData,
            v: PhantomData,
            w: PhantomData,
        }
    }

    pub fn get(&self, key: &K) -> Option<V> {
        let k = W::to_key(&self.env, key);
        self.env.storage().instance().get(&k)
    }

    pub fn set(&mut self, key: &K, value: &V) {
        let k = W::to_key(&self.env, key);
        self.env.storage().instance().set(&k, value);
    }

    pub fn has(&self, key: &K) -> bool {
        let k = W::to_key(&self.env, key);
        self.env.storage().instance().has(&k)
    }
}
