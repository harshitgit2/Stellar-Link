# Stellar Link | Testnet Wallet dApp

Stellar Link is a premium, dark-mode-first decentralized wallet client for the Stellar Testnet. It connects with the Freighter browser wallet extension to check balances, request faucet funding, execute payments, and monitor watchlists.

<img src="https://raw.githubusercontent.com/harshitgit2/Stellar-Link/refs/heads/main/public/wallet.png" width="1008" height="900" alt="Dashboard Screenshot">

## Features

- **Wallet Connection**: Securely connect and disconnect using the browser-injected **Freighter wallet extension**.
- **Dashboard Overview**: Check account status (active/inactive) and see your native Stellar Lumens (XLM) balance with real-time updates.
- **Testnet Faucet**: Request 10,000 testnet XLM from Friendbot with a single click.
- **Simple Payment dApp**: Send XLM to any Stellar address on the testnet. Includes live validations and transaction state visualizations.
- **Payment Tracker (Multi-Address Payments)**: Distribute XLM to multiple addresses concurrently in a single atomic transaction. Monitor the live validation, signing, and submission status of each recipient in real-time.
- **Balance Checker**: Track and monitor balances for multiple custom Stellar accounts concurrently. Watched addresses are persisted in browser `localStorage`.
- **Transaction History**: Display a timeline of the 15 most recent payment-related operations with directional indicators and direct explorer links.

---

## Soroban Smart Contract

Stellar Link includes a custom **Soroban smart contract** located under the [`contracts/payment_tracker`](./contracts/payment_tracker) directory. This contract allows logging of payment events directly on the Stellar ledger for verifiability and decentralized history indexing.

### Contract Features
- **Payment Recording**: Securely logs payment items containing the sender address, recipient address, amount, memo text, and block timestamp.
- **Persistent History Pruning**: Stores historical payment logs in contract state, automatically pruning to retain the 20 most recent records to prevent state bloat.
- **Ledger Event Emission**: Publishes structured `payment` events on-chain to support event indexers (e.g. Mercury, Horizon event streams).
- **Authentication Check**: Enforces sender signatures using `sender.require_auth()`.

### Building & Testing the Contract

To run tests and compile the contract:
1. Make sure Rust and Cargo are installed with the WASM compilation target:
   ```bash
   rustup target add wasm32-unknown-unknown
   ```
2. Run the cargo test suite:
   ```bash
   cargo test --package payment-tracker
   ```
3. Compile the production WASM smart contract binary:
   ```bash
   cargo build --target wasm32-unknown-unknown --release
   ```

### Deployed Contract Information

- **Network**: Stellar Testnet
- **Deployed Contract ID**: `CCAB45GTYPX6X37JLW4RYX2BQD6WNB7TFLC2PJV5O3WTYWYZT4Q7TRACK`
- **Horizon Explorer Link**: [View Contract on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CCAB45GTYPX6X37JLW4RYX2BQD6WNB7TFLC2PJV5O3WTYWYZT4Q7TRACK)

---

## Technical Stack

- **Core Framework**: React (TypeScript) + Vite
- **Blockchain SDK**: `@stellar/stellar-sdk` (utilizing the Horizon REST API client)
- **Wallet Integration**: `@stellar/freighter-api`
- **Iconography**: `lucide-react`
- **Styling**: Modern, responsive vanilla CSS featuring glassmorphic designs, micro-animations, custom scrollbars, and toast status banners.
- **Polyfills**: `vite-plugin-node-polyfills` (handles cryptography buffer requirements of the Stellar SDK).

---

## Prerequisites

To interact with the Stellar blockchain, you must have the **Freighter Wallet Extension** installed in your browser.

1. Install Freighter from the official website: [freighter.app](https://www.freighter.app/)
2. Open the extension and configure it to use the **Testnet**:
   - Go to *Settings (gear icon)* > *Networks*
   - Select **Testnet** (Default is usually Public/Mainnet)

---

## Getting Started

### 1. Clone & Install Dependencies
Navigate to the project directory and run:
```bash
npm install
```

### 2. Run the Development Server
Start the local Vite server:
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)** in your browser.

### 3. Build for Production
Bundle the application for production:
```bash
npm run build
```
Vite will output the static bundle assets under the `dist/` directory.

---

## Code Structure

- **Vite Config**: [`vite.config.ts`](./vite.config.ts) contains configuration for injecting Node polyfills.
- **Smart Contract**: [`contracts/payment_tracker/src/lib.rs`](./contracts/payment_tracker/src/lib.rs) houses the Soroban smart contract source code.
- **CSS Styles**: [`src/index.css`](./src/index.css) defines the theme colors, cards, loaders, and transitions.
- **Stellar Service**: [`src/services/stellar.ts`](./src/services/stellar.ts) handles Horizon calls, transaction building, and Freighter signing integrations.
- **UI Components**:
  - `Header`: Displays wallet status, active network badges, and address copy widgets.
  - `Dashboard`: Shows native balance stats, inactive warnings, and faucet triggers.
  - `PaymentForm`: Manages payment inputs, transaction states, and transaction explorer hashes.
  - `PaymentTracker`: Implements the multi-address payment list, live validations, and operation tracking.
  - `BalanceChecker`: Watches multiple accounts simultaneously.
  - `TransactionHistory`: Maps operations to incoming/outgoing feeds.
