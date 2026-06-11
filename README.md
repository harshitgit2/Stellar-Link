# Stellar Link | Testnet Wallet dApp

Stellar Link is a premium, dark-mode-first decentralized wallet client for the Stellar Testnet. It connects with the Freighter browser wallet extension to check balances, request faucet funding, execute payments, and monitor watchlists.

## Features

- **Wallet Connection**: Securely connect and disconnect using the browser-injected **Freighter wallet extension**.
- **Dashboard Overview**: Check account status (active/inactive) and see your native Stellar Lumens (XLM) balance with real-time updates.
- **Testnet Faucet**: Request 10,000 testnet XLM from Friendbot with a single click.
- **Simple Payment dApp**: Send XLM to any Stellar address on the testnet. Includes live validations (recipient format, sufficient balances, and text memo byte-limits) and interactive step-by-step transaction state visualization (building -> signing -> submitting -> success/error).
- **Balance Checker**: Track and monitor balances for multiple custom Stellar accounts concurrently. Watched addresses are persisted in browser `localStorage`.
- **Transaction History**: Display a timeline of the 15 most recent payment-related operations (payments sent, payments received, account creations, and account merges) complete with directional indicators and direct explorer links.

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
- **CSS Styles**: [`src/index.css`](./src/index.css) defines the theme colors, cards, loaders, and transitions.
- **Stellar Service**: [`src/services/stellar.ts`](./src/services/stellar.ts) handles Horizon calls, transaction building, and Freighter signing integrations.
- **UI Components**:
  - `Header`: Displays wallet status, active network badges, and address copy widgets.
  - `Dashboard`: Shows native balance stats, inactive warnings, and faucet triggers.
  - `PaymentForm`: Manages payment inputs, transaction states, and transaction explorer hashes.
  - `BalanceChecker`: Watches multiple accounts simultaneously.
  - `TransactionHistory`: Maps operations to incoming/outgoing feeds.
