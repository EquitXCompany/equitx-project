use loam_sdk::soroban_sdk::{env, Env, IntoVal, LoamKey, PersistentMap, TryFromVal, Val};

pub trait PersistentMapExt<K, V> {
    fn set_and_extend(&mut self, k: K, v: &V);
}

impl<K, V, W> PersistentMapExt<K, V> for PersistentMap<K, V, W>
where
    K: Into<W> + Clone,
    W: LoamKey,
    V: IntoVal<Env, Val> + TryFromVal<Env, Val>,
{
    fn set_and_extend(&mut self, key: K, value: &V) {
        if self.get(key.clone()).is_some() {
            let ttl = env().storage().max_ttl();
            self.extend_ttl(key.clone(), ttl, ttl);
        }
        self.set(key, value);
    }
}
