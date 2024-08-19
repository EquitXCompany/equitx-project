# xAsset Contract

This is mostly just a Fungible Token ([example implementation](https://github.com/loambuild/loam-sdk/tree/main/examples/soroban/ft)), but will also contain most of the other logic described in the Indigo white paper. This includes Stability Pool functionality, and the iAsset/xAsset functionality. We need to come up with a better name for this one. Maybe "BorrowableAsset" or "CollateralizedAsset" or "CDPAsset". These will each be implemented as Loam subcontracts, which will 1. make them easy to split out to separate contracts later if needed and 2. make them easy to publish and share, which means they need understandable names that don't make them sound app-specific. This "asset that wraps another, which people can borrow using CDPs, where these CDPs get liquidated if the collateralization ratio falls below some minimum" is a fairly common pattern across the blockchain space at this point, and it would be nice to give it a recognizable name.

Let's call this subcontract CollateralizedAsset for now. Here's the data managed by this subcontract:

```rs
struct CollateralizedAsset {
    /// Oracle ID & which asset from Oracle this tracks. Might be worth storing these as separate fields?
    pegged_to: String;
    /// basis points; default 110%; updateable by admin
    minimum_collateralization_ratio: u16;
    /// each Address can only have one CDP per Asset. Given that you can adjust your CDPs freely, that seems fine?
    cdps: Map<Address, CDP>;
}
```

Where CDP needs to have:

```rs
struct CDP {
    xlm_deposited: u128,
    usd_lent: u128,
    status: CDPStatus,
}

/// Descriptions of these on page 5 of Indigo white paper
enum CDPStatus {
    Open,
    Insolvent, // not sure if `Insolvent` needs to be hard-coded or if it can be calculated on-demand while data's small and as part of our eventual indexing layer once data's big
    Frozen,
    Closed,
}
```


Ok, onto the StabilityPool subcontract.

```
/// all attributes listed here are described in the Indigo white paper
struct StabilityPool {
    product_constant: u32; // maybe u64? not sure it will ever get that big
    compounded_constant: u32; // or u64! or float??
}
```

I think that might be it, for xAsset contracts. It's at least a good starting point and already gives us lots of functionality to implement and play with. 
