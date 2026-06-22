# Stellar Wallet — Testnet dApp

<img src ="https://raw.githubusercontent.com/harshitgit2/Stellar-Link/refs/heads/main/public/pay-track.png" height="700" width="900">

<img src ="https://raw.githubusercontent.com/harshitgit2/Stellar-Link/refs/heads/main/public/wallet-balance.png" height="700" width="900">

<img src ="https://raw.githubusercontent.com/harshitgit2/Stellar-Link/refs/heads/main/public/pay-track-map.png" height="700" width="900">

## Tech Stack

- Frontend: React (TypeScript) + Vite
- Blockchain: Stellar SDK (`@stellar/stellar-sdk`) + Freighter
- Smart Contract: Soroban (Rust) — located at `contracts/payment_tracker`

## Quick Start

Prerequisites:
- Node.js (16+ recommended)
- npm or yarn
- Rust & Cargo (for building/testing the Soroban contract)
- Freighter browser extension (set to Testnet)

Install and run the frontend:

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

Build for production:

```bash
npm run build
```

## Environment

Create a `.env` or set environment variables for the frontend where applicable (example variables used by the app):

```
VITE_HORIZON_URL=https://horizon-testnet.stellar.org
VITE_NETWORK_PASSPHRASE=Test SDF Network ; September 2015
```

Do not commit secrets to the repository.

## Soroban Smart Contract

The Soroban contract is in `contracts/payment_tracker`. To compile and test locally:

```bash
# add wasm target if needed
rustup target add wasm32-unknown-unknown

# run tests
cd contracts/payment_tracker
cargo test

# build release wasm
cargo build --target wasm32-unknown-unknown --release
```

## Project Structure (important files)

- `src/` — React app source
- `src/components/` — UI components (`PaymentForm`, `PaymentTracker`, `BalanceChecker`, `TransactionHistory`, etc.)
- `src/services/stellar.ts` — Horizon, transaction building, and Freighter helpers
- `contracts/payment_tracker/` — Soroban smart contract (Rust)


## Contributing

Contributions are welcome. Please open issues or PRs describing the change and include screenshots when relevant.



If you'd like, I can also add a `docs/` folder with the three placeholder images and a `.gitkeep` file to make committing easier. Want me to add those now?
