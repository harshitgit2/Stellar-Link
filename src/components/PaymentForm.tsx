import React, { useState, useEffect } from "react";
import { Send, CheckCircle2, XCircle, ArrowLeftRight, ExternalLink, Info } from "lucide-react";
import { stellarService } from "../services/stellar";

interface PaymentFormProps {
  senderAddress: string | null;
  balance: string;
  isFunded: boolean;
  onPaymentSuccess: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

type TxState = "idle" | "building" | "signing" | "submitting" | "success" | "error";

export const PaymentForm: React.FC<PaymentFormProps> = ({
  senderAddress,
  balance,
  isFunded,
  onPaymentSuccess,
  showToast,
}) => {
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  
  // Validation States
  const [recipientError, setRecipientError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [memoError, setMemoError] = useState("");
  const [isValid, setIsValid] = useState(false);

  // Transaction States
  const [txState, setTxState] = useState<TxState>("idle");
  const [txHash, setTxHash] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Clean form
  const resetForm = () => {
    setRecipient("");
    setAmount("");
    setMemo("");
    setTxState("idle");
    setTxHash("");
    setErrorMessage("");
  };

  // Live validation
  useEffect(() => {
    let valid = true;

    // Recipient check
    if (recipient) {
      const stellarAddrRegex = /^G[A-D2-7][A-Z2-7]{54}$/;
      if (!stellarAddrRegex.test(recipient)) {
        setRecipientError("Invalid Stellar public key format (Must be 56 characters starting with G).");
        valid = false;
      } else if (recipient === senderAddress) {
        setRecipientError("Recipient address cannot be the same as the sender address.");
        valid = false;
      } else {
        setRecipientError("");
      }
    } else {
      setRecipientError("");
      valid = false;
    }

    // Amount check
    if (amount) {
      const parsedAmount = parseFloat(amount);
      const parsedBalance = parseFloat(balance);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        setAmountError("Amount must be a positive number.");
        valid = false;
      } else if (parsedAmount >= parsedBalance - 0.0001) {
        // Leave a tiny buffer for base transaction fee
        setAmountError(`Insufficient balance. Maximum send limit is ${(parsedBalance - 0.0001).toFixed(7)} XLM (allowing for transaction fee).`);
        valid = false;
      } else {
        setAmountError("");
      }
    } else {
      setAmountError("");
      valid = false;
    }

    // Memo check (Stellar Text Memo is max 28 bytes)
    if (memo) {
      if (new Blob([memo]).size > 28) {
        setMemoError("Text memo exceeds limit (maximum 28 bytes/characters).");
        valid = false;
      } else {
        setMemoError("");
      }
    } else {
      setMemoError("");
    }

    setIsValid(valid);
  }, [recipient, amount, memo, balance, senderAddress]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderAddress || !isValid) return;

    if (!isFunded) {
      showToast("Cannot send payment from an unfunded account. Please request faucet funds first.", "error");
      return;
    }

    try {
      // Begin sequence
      setTxState("building");
      
      // Artificial short delay to give users a sense of progress/steps
      await new Promise((r) => setTimeout(r, 800));
      setTxState("signing");
      
      // Triggers freighter popup
      const result = await stellarService.sendXlmPayment(
        senderAddress,
        recipient,
        amount,
        memo
      );

      setTxState("submitting");
      await new Promise((r) => setTimeout(r, 500));
      
      setTxHash(result.hash);
      setTxState("success");
      showToast("Transaction submitted successfully!", "success");
      onPaymentSuccess(); // trigger parent refresh of balance
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || "Transaction failed. Please try again.");
      setTxState("error");
      showToast("Transaction failed.", "error");
    }
  };

  if (!senderAddress) {
    return (
      <div className="glass-card flex-center animate-fade-in" style={{ padding: "40px", flexDirection: "column", gap: "16px" }}>
        <Info size={36} color="var(--color-primary)" />
        <h2>Connect Wallet to Send XLM</h2>
        <p>You need to connect your Freighter wallet to execute transfers on the Stellar Testnet.</p>
      </div>
    );
  }

  return (
    <div className="glass-card animate-fade-in" style={{ maxWidth: "600px", margin: "0 auto" }}>
      <h2 style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "1.5rem" }}>
        <ArrowLeftRight size={24} color="var(--color-primary)" />
        Send XLM Payment
      </h2>
      
      {txState === "idle" && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "16px" }}>
          {/* Recipient Address */}
          <div className="form-group">
            <label className="form-label">Recipient Address</label>
            <input 
              type="text" 
              className={`form-input ${recipientError ? "form-input-error" : ""}`}
              placeholder="e.g. GBRI... (Stellar G Address)"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value.trim())}
            />
            {recipientError && <div className="error-text">{recipientError}</div>}
          </div>

          {/* Amount */}
          <div className="form-group">
            <div className="flex-row-between" style={{ marginBottom: "8px" }}>
              <label className="form-label" style={{ margin: 0 }}>Amount (XLM)</label>
              <span 
                style={{ fontSize: "0.75rem", color: "var(--text-secondary)", cursor: "pointer", textDecoration: "underline" }}
                onClick={() => {
                  const maxAmount = parseFloat(balance) - 0.0001;
                  if (maxAmount > 0) setAmount(maxAmount.toFixed(7));
                }}
              >
                Max: {parseFloat(balance).toFixed(7)} XLM
              </span>
            </div>
            <div className="input-container">
              <input 
                type="number" 
                step="any"
                className={`form-input ${amountError ? "form-input-error" : ""}`}
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
              <span style={{ position: "absolute", right: "16px", top: "12px", fontSize: "0.95rem", fontWeight: 600, color: "var(--text-muted)" }}>
                XLM
              </span>
            </div>
            {amountError && <div className="error-text">{amountError}</div>}
          </div>

          {/* Memo */}
          <div className="form-group">
            <label className="form-label">Memo (Optional text, max 28 chars)</label>
            <input 
              type="text" 
              className={`form-input ${memoError ? "form-input-error" : ""}`}
              placeholder="e.g. Thank you!"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
            {memoError && <div className="error-text">{memoError}</div>}
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={!isValid || !isFunded}
            style={{ width: "100%", marginTop: "8px" }}
          >
            <Send size={16} />
            <span>Send Transaction</span>
          </button>
        </form>
      )}

      {/* Transaction Progress States */}
      {txState !== "idle" && (
        <div className="flex-center animate-fade-in" style={{ flexDirection: "column", padding: "32px 16px", textAlign: "center", gap: "24px" }}>
          
          {/* Loaders and Status Icons */}
          {["building", "signing", "submitting"].includes(txState) && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
              <div className="spinner" style={{ width: "50px", height: "50px", borderWidth: "4px" }} />
              <div>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "4px" }}>
                  {txState === "building" && "Building Transaction..."}
                  {txState === "signing" && "Awaiting Freighter Signature..."}
                  {txState === "submitting" && "Submitting to Horizon Network..."}
                </h3>
                <p style={{ fontSize: "0.85rem" }}>
                  {txState === "building" && "Fetching sequence number and base fee from network."}
                  {txState === "signing" && "Please review and sign the transaction in the Freighter extension popup."}
                  {txState === "submitting" && "Waiting for ledger consensus and transaction validation."}
                </p>
              </div>
            </div>
          )}

          {/* Success State */}
          {txState === "success" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
              <CheckCircle2 size={60} color="var(--color-success)" />
              <div>
                <h3 style={{ fontSize: "1.3rem", color: "var(--color-success)", marginBottom: "8px" }}>Payment Sent Successfully!</h3>
                <p style={{ fontSize: "0.9rem", maxWidth: "400px", margin: "0 auto 20px" }}>
                  You sent <strong>{amount} XLM</strong> to <strong>{recipient.substring(0, 8)}...{recipient.substring(recipient.length - 8)}</strong>.
                </p>
                
                {/* Transaction details card */}
                <div 
                  style={{ 
                    background: "rgba(255,255,255,0.03)", 
                    border: "1px solid var(--border-color)", 
                    borderRadius: "10px", 
                    padding: "16px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "0.75rem",
                    textAlign: "left",
                    wordBreak: "break-all",
                    marginBottom: "20px"
                  }}
                >
                  <div style={{ color: "var(--text-secondary)", marginBottom: "4px", textTransform: "uppercase", fontSize: "0.65rem", fontWeight: 600 }}>
                    Transaction Hash
                  </div>
                  <div style={{ color: "var(--text-primary)" }}>{txHash}</div>
                </div>

                <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                  <a 
                    href={`https://stellar.expert/explorer/testnet/tx/${txHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn-secondary"
                    style={{ fontSize: "0.85rem", padding: "8px 16px" }}
                  >
                    <span>View on Explorer</span>
                    <ExternalLink size={14} />
                  </a>
                  <button 
                    onClick={resetForm} 
                    className="btn-primary"
                    style={{ fontSize: "0.85rem", padding: "8px 16px" }}
                  >
                    <span>Send Another</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {txState === "error" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
              <XCircle size={60} color="var(--color-error)" />
              <div>
                <h3 style={{ fontSize: "1.3rem", color: "var(--color-error)", marginBottom: "8px" }}>Transaction Failed</h3>
                <p style={{ fontSize: "0.9rem", maxWidth: "420px", color: "var(--text-secondary)", marginBottom: "20px", wordBreak: "break-word" }}>
                  {errorMessage}
                </p>

                <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
                  <button 
                    onClick={() => setTxState("idle")} 
                    className="btn-primary"
                    style={{ fontSize: "0.85rem", padding: "8px 16px" }}
                  >
                    <span>Try Again</span>
                  </button>
                  <button 
                    onClick={resetForm} 
                    className="btn-secondary"
                    style={{ fontSize: "0.85rem", padding: "8px 16px" }}
                  >
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
