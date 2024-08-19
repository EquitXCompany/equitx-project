# EquitX

## Project Structure

This repository uses the recommended structure for a stellar-cli project:

```text
.
├── contracts
│   └── hello_world
│       ├── src
│       │   ├── lib.rs
│       │   └── test.rs
│       └── Cargo.toml
├── Cargo.toml
└── README.md
```

- New stellar-cli contracts can be put in `contracts`, each in their own directory. There is already a `hello_world` contract in there to get you started.
- If you initialized this project with any other example contracts via `--with-example`, those contracts will be in the `contracts` directory as well.
- Contracts should have their own `Cargo.toml` files that rely on the top-level `Cargo.toml` workspace for their dependencies.
- Frontend libraries can be added to the top-level directory as well. If you initialized this project with a frontend template via `--frontend-template` you will have those files already included.

---

<!-- The following is the Frontend Template's README.md -->

# Loam's Frontend Template for stellar-cli, using Astro

Under active development.

Goals:

- [x] For all contracts in `contracts/*`, automatically deploy to testnet, generate bindings, and import in `src/contracts/*`.
- [ ] Make it just as easy to rely on 3rd-party, already-deployed contracts
- [ ] Support multiple contract environments
  - [x] development/local ("standalone")
  - [ ] testing/local
  - [ ] staging/testnet
  - [ ] production/mainnet

# Getting Started

- `cp .env.example .env`
- `npm install`
- `npm run dev`
