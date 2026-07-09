import React, { useState, useEffect } from "react";
import { ArrowDownLeft, ArrowUpRight, RefreshCw, ExternalLink, Info, XCircle } from "lucide-react";
import { stellarService } from "../services/stellar";
import type { PaymentHistoryItem } from "../services/stellar";

interface TransactionHistoryProps {
  address: string | null;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ address, showToast }) => {
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadHistory = async (addr: string) => {
    setLoading(true);
    setError("");
    try {
      const history = await stellarService.fetchPayments(addr);
      setPayments(history);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to load transaction history.");
      showToast("Failed to load transaction history.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address) {
      loadHistory(address);
    } else {
      setPayments([]);
    }
  }, [address]);

  const truncateAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const formatDateTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString();
    } catch (e) {
      return isoString;
    }
  };

  if (!address) {
    return (
      <div className="glass-card flex-center animate-fade-in" style={{ padding: "40px", flexDirection: "column", gap: "16px", textAlign: "center" }}>
        <Info size={36} color="var(--color-primary)" />
        <h2>Connect Wallet to View History</h2>
        <p>You need to connect your Freighter wallet to view your transaction log.</p>
      </div>
    );
  }

  return (
    <div className="glass-card animate-fade-in">
      <div className="history-header-row">
        <h2 style={{ margin: 0, fontSize: "1.5rem", display: "flex", alignItems: "center", gap: "10px" }}>
          Recent Transactions
        </h2>
        <button 
          className="btn-secondary" 
          onClick={() => loadHistory(address)} 
          disabled={loading}
          style={{ padding: "8px 14px", fontSize: "0.85rem" }}
        >
          <RefreshCw size={14} className={loading ? "spinner" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {loading && (
        <div className="flex-center" style={{ padding: "60px 0", flexDirection: "column", gap: "16px" }}>
          <div className="spinner" />
          <p style={{ color: "var(--text-secondary)" }}>Loading transactions from Horizon...</p>
        </div>
      )}

      {!loading && error && (
        <div className="flex-center" style={{ padding: "40px", flexDirection: "column", gap: "12px", textAlign: "center" }}>
          <XCircle size={32} color="var(--color-error)" />
          <p style={{ color: "var(--color-error)" }}>{error}</p>
          <button className="btn-primary" onClick={() => loadHistory(address)} style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && payments.length === 0 && (
        <div className="flex-center" style={{ padding: "50px 20px", flexDirection: "column", gap: "12px", opacity: 0.6, textAlign: "center" }}>
          <Info size={32} />
          <p>No transactions found for this account.</p>
          <p style={{ fontSize: "0.8rem", maxWidth: "300px" }}>
            Once you request faucet funds or send a payment, it will show up here.
          </p>
        </div>
      )}

      {!loading && !error && payments.length > 0 && (
        <div className="history-records-list">
          {payments.map((tx) => {
            const isOutgoing = tx.from === address;
            const isCreatedAccount = tx.type === "create_account";
            const isAccountMerge = tx.type === "account_merge";
            
            let amountDisplay = "";
            let amountColor = "";
            let directionIcon = null;

            if (isCreatedAccount) {
              amountDisplay = `+${parseFloat(tx.amount).toLocaleString()} ${tx.assetCode}`;
              amountColor = "var(--color-success)";
              directionIcon = <ArrowDownLeft size={18} color="var(--color-success)" />;
            } else if (isAccountMerge) {
              amountDisplay = "Merged";
              amountColor = isOutgoing ? "var(--color-primary)" : "var(--color-success)";
              directionIcon = isOutgoing ? <ArrowUpRight size={18} color="var(--color-primary)" /> : <ArrowDownLeft size={18} color="var(--color-success)" />;
            } else {
              // Standard payment
              if (isOutgoing) {
                amountDisplay = `-${parseFloat(tx.amount).toLocaleString(undefined, { maximumFractionDigits: 7 })} ${tx.assetCode}`;
                amountColor = "var(--text-primary)";
                directionIcon = <ArrowUpRight size={18} color="var(--color-primary)" />;
              } else {
                amountDisplay = `+${parseFloat(tx.amount).toLocaleString(undefined, { maximumFractionDigits: 7 })} ${tx.assetCode}`;
                amountColor = "var(--color-success)";
                directionIcon = <ArrowDownLeft size={18} color="var(--color-success)" />;
              }
            }

            return (
              <div key={tx.id} className="history-record-card glass-card interactive">
                {/* Transaction Icon and details */}
                <div className="record-card-icon-info">
                  <div 
                    style={{ 
                      width: "40px", 
                      height: "40px", 
                      borderRadius: "50%", 
                      background: isOutgoing ? "rgba(59, 130, 246, 0.08)" : "rgba(16, 185, 129, 0.08)",
                      border: `1px solid ${isOutgoing ? "rgba(59, 130, 246, 0.15)" : "rgba(16, 185, 129, 0.15)"}`,
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center",
                      flexShrink: 0
                    }}
                  >
                    {directionIcon}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>
                        {isCreatedAccount ? "Account Created" : isAccountMerge ? "Account Merged" : isOutgoing ? "Payment Sent" : "Payment Received"}
                      </span>
                      {!tx.successful && (
                        <span 
                          style={{ 
                            fontSize: "0.7rem", 
                            background: "rgba(244, 63, 94, 0.1)", 
                            border: "1px solid rgba(244, 63, 94, 0.2)",
                            color: "var(--color-error)",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            fontWeight: 600,
                            display: "flex",
                            alignItems: "center",
                            gap: "2px"
                          }}
                        >
                          Failed
                        </span>
                      )}
                    </div>
                    
                    {/* Senders and Receivers */}
                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "4px", marginTop: "2px" }}>
                      <span>{isOutgoing ? "To:" : "From:"}</span>
                      <span style={{ fontFamily: "var(--font-mono)" }} title={isOutgoing ? tx.to : tx.from}>
                        {truncateAddress(isOutgoing ? tx.to : tx.from)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Amount, Timestamp and Link Column */}
                <div className="record-card-balance-time">
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <div style={{ fontSize: "1.05rem", fontWeight: 700, color: amountColor, textAlign: "right" }}>
                      {amountDisplay}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textAlign: "right" }}>
                      {formatDateTime(tx.createdAt)}
                    </div>
                  </div>

                  <a 
                    href={`https://stellar.expert/explorer/testnet/tx/${tx.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-icon"
                    title="View on Explorer"
                    style={{ flexShrink: 0 }}
                  >
                    <ExternalLink size={16} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
