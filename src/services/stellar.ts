import { Horizon, TransactionBuilder, Networks, Operation, Asset, Memo } from "@stellar/stellar-sdk";
import { isConnected, requestAccess, getNetwork, signTransaction } from "@stellar/freighter-api";

// Horizon server configured for Stellar Testnet
const HORIZON_URL = "https://horizon-testnet.stellar.org";
const server = new Horizon.Server(HORIZON_URL);

export interface PaymentHistoryItem {
  id: string;
  type: string;
  transactionHash: string;
  createdAt: string;
  from: string;
  to: string;
  amount: string;
  assetCode: string;
  successful: boolean;
}

export const stellarService = {
  /**
   * Check if Freighter extension is installed in the browser.
   */
  async isFreighterInstalled(): Promise<boolean> {
    try {
      const res = await isConnected();
      return !!res?.isConnected;
    } catch (err) {
      console.error("Error checking Freighter connection:", err);
      return false;
    }
  },

  /**
   * Connect to Freighter wallet. Prompts user for access and returns the active public key.
   */
  async connect(): Promise<string> {
    const installed = await this.isFreighterInstalled();
    if (!installed) {
      throw new Error("Freighter wallet is not installed. Please install the extension first.");
    }

    try {
      const res = await requestAccess();
      if (res?.error) {
        throw new Error(res.error);
      }
      if (res?.address) {
        return res.address;
      }
      throw new Error("Failed to retrieve public key from Freighter.");
    } catch (err: any) {
      throw new Error(err?.message || "Failed to connect to Freighter wallet.");
    }
  },

  /**
   * Get the active network in Freighter.
   * Helps verify if the user is on the TESTNET.
   */
  async getNetwork(): Promise<string> {
    try {
      const res = await getNetwork();
      if (res && typeof res === "object" && "network" in res) {
        return res.network || "UNKNOWN";
      }
      return (res as any) || "UNKNOWN";
    } catch (err) {
      console.error("Error getting network from Freighter:", err);
      return "UNKNOWN";
    }
  },

  /**
   * Fetch XLM balance for a given address.
   * If the account is not funded (404), returns "0" and sets the funded flag to false.
   */
  async fetchAccountDetails(address: string): Promise<{ balance: string; isFunded: boolean }> {
    try {
      const account = await server.loadAccount(address);
      const nativeBalance = account.balances.find((b: any) => b.asset_type === "native");
      return {
        balance: nativeBalance ? nativeBalance.balance : "0.0000000",
        isFunded: true,
      };
    } catch (err: any) {
      // 404 means the account does not exist/is not funded yet on the network
      if (err?.response?.status === 404) {
        return { balance: "0.0000000", isFunded: false };
      }
      throw new Error(err?.message || "Failed to fetch account balance.");
    }
  },

  /**
   * Request testnet XLM for a given address using Stellar Friendbot.
   */
  async requestTestnetFaucet(address: string): Promise<void> {
    try {
      const response = await fetch(`https://friendbot.stellar.org/?addr=${encodeURIComponent(address)}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Friendbot error: status ${response.status}`);
      }
    } catch (err: any) {
      throw new Error(err?.message || "Failed to request testnet faucet.");
    }
  },

  /**
   * Fetch recent payment operations for a given address.
   * Maps Horizon payment-like operations into a unified interface.
   */
  async fetchPayments(address: string): Promise<PaymentHistoryItem[]> {
    try {
      const response = await server.payments().forAccount(address).order("desc").limit(15).call();
      
      const records = response.records || [];
      return records.map((record: any) => {
        let from = record.source_account || "";
        let to = "";
        let amount = "0";
        let assetCode = "XLM";

        switch (record.type) {
          case "payment":
            from = record.from;
            to = record.to;
            amount = record.amount;
            assetCode = record.asset_type === "native" ? "XLM" : record.asset_code || "Unknown";
            break;
          case "create_account":
            from = record.funder;
            to = record.account;
            amount = record.starting_balance;
            assetCode = "XLM";
            break;
          case "account_merge":
            from = record.source_account;
            to = record.into;
            // Account merge doesn't output the actual merged amount in the payment log
            amount = "Merged";
            assetCode = "XLM";
            break;
          default:
            to = record.to || "";
            amount = record.amount || "0";
            break;
        }

        return {
          id: record.id,
          type: record.type,
          transactionHash: record.transaction_hash,
          createdAt: record.created_at,
          from,
          to,
          amount,
          assetCode,
          successful: record.transaction_successful !== false, // default to true
        };
      });
    } catch (err: any) {
      // If the account has not been funded yet, it has no transaction history.
      if (err?.response?.status === 404) {
        return [];
      }
      console.error("Error fetching payments:", err);
      throw new Error(err?.message || "Failed to fetch transaction history.");
    }
  },

  /**
   * Send an XLM payment transaction on the testnet.
   * Loads sender account details, builds transaction, requests signature from Freighter,
   * and submits the signed transaction to Horizon.
   */
  async sendXlmPayment(
    senderAddress: string,
    recipientAddress: string,
    amount: string,
    memo?: string
  ): Promise<{ hash: string }> {
    try {
      // 1. Load sender account to get current sequence number
      const senderAccount = await server.loadAccount(senderAddress);

      // 2. Fetch current base fee from network
      let baseFee = 100;
      try {
        baseFee = await server.fetchBaseFee();
      } catch (feeErr) {
        console.warn("Could not fetch base fee, defaulting to 100 stroops", feeErr);
      }

      // 3. Build the transaction
      let builder = new TransactionBuilder(senderAccount, {
        fee: baseFee.toString(),
        networkPassphrase: Networks.TESTNET,
      })
      .addOperation(
        Operation.payment({
          destination: recipientAddress,
          asset: Asset.native(),
          amount: amount,
        })
      )
      .setTimeout(180); // 3 minutes timeout

      // 4. Add memo if provided
      if (memo && memo.trim() !== "") {
        builder = builder.addMemo(Memo.text(memo.trim()));
      }

      const transaction = builder.build();
      const xdr = transaction.toXDR();

      // 5. Prompt Freighter to sign the transaction
      const signRes = await signTransaction(xdr, {
        networkPassphrase: Networks.TESTNET,
      });

      if (signRes.error) {
        throw new Error(signRes.error);
      }

      if (!signRes.signedTxXdr) {
        throw new Error("No signed transaction XDR returned from Freighter.");
      }

      // 6. Submit the signed transaction to Horizon
      const signedTransaction = TransactionBuilder.fromXDR(signRes.signedTxXdr, Networks.TESTNET);
      const submitRes = await server.submitTransaction(signedTransaction);

      return {
        hash: submitRes.hash,
      };
    } catch (err: any) {
      console.error("Transaction failed:", err);
      throw new Error(err?.message || "Transaction failed or was rejected.");
    }
  },
};
