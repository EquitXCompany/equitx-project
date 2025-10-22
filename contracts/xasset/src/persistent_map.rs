use core::marker::PhantomData;
use soroban_sdk::{Env, IntoVal, TryFromVal, Val};

pub trait MapKey<Key: IntoVal<Env, Val> + Clone> {
    fn to_key(env: &Env, k: &Key) -> Val;
}

#[derive(Clone)]
pub struct PersistentMap<K, V, W>
where
    K: IntoVal<Env, Val> + Clone,
    W: MapKey<K>,
    V: IntoVal<Env, Val> + TryFromVal<Env, Val>,
{
    env: Env,
    k: PhantomData<K>,
    v: PhantomData<V>,
    w: PhantomData<W>,
}

impl<K, V, W> PersistentMap<K, V, W>
where
    K: IntoVal<Env, Val> + Clone,
    W: MapKey<K>,
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
        self.env.storage().persistent().get(&k)
    }

    pub fn set(&mut self, key: &K, value: &V) {
        let k = W::to_key(&self.env, key);
        self.env.storage().persistent().set(&k, value);
    }

    pub fn has(&self, key: &K) -> bool {
        let k = W::to_key(&self.env, key);
        self.env.storage().persistent().has(&k)
    }

    pub fn extend_ttl(&self, key: &K, threshold: u32, extend_to: u32) {
        let k = W::to_key(&self.env, key);
        self.env
            .storage()
            .persistent()
            .extend_ttl(&k, threshold, extend_to);
    }

    fn set_and_extend(&mut self, key: K, value: &V) {
        if self.has(&key) {
            let ttl = self.env.storage().max_ttl();
            self.extend_ttl(&key, ttl, ttl);
        }
        self.set(&key, value);
    }
}