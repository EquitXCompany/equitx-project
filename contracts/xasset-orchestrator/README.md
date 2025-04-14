# EquitX Orchestrator Contract

This contract will have:

- a map of asset names ("xUSD") to contract addresses ("C123…")
- a method to deploy new xAsset contract (so it will need to store the wasm of the xAsset contract, or a reference to it by name on the Loam Registry), which is only callable by admin.