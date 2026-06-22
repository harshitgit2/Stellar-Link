import React, { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Send, 
  CheckCircle2, 
  XCircle, 
  Layers, 
  ExternalLink, 
  Info,
  Clock,
  UserCheck,
  AlertCircle
} from "lucide-react";
import { stellarService } from "../services/stellar";

interface PaymentTrackerProps {
  senderAddress: string | null;
  balance: string;
  isFunded: boolean;
  onPaymentSuccess: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

interface Recipient {
  id: string;
  address: string;
  amount: string;
  addressError: string;
  amountError: string;
  status: "idle" | "validating" | "ready" | "processing" | "success" | "error";
}

type TxState = "idle" | "validating" | "building" | "signing" | "submitting" | "success" | "error";

export const PaymentTracker: React.FC<PaymentTrackerProps> = ({
  senderAddress,
  balance,
  isFunded,
  onPaymentSuccess,
  showToast,
}) => {
  const [recipients, setRecipients] = useState<Recipient[]>([
    { id: "1", address: "", amount: "", addressError: "", amountError: "", status: "idle" }
  ]);
  const [memo, setMemo] = useState("");
  const [memoError, setMemoError] = useState("");
  
  // Transaction States
  const [txState, setTxState] = useState<TxState>("idle");
  const [txHash, setTxHash] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Calculate totals
  const totalAmount = recipients.reduce((sum, r) => {
    const amt = parseFloat(r.amount);
    return isNaN(amt) ? sum : sum + amt;
  }, 0);

  // Estimating network fee in stroops -> XLM (1 operation = 100 stroops = 0.00001 XLM)
  const estimatedFee = recipients.length * 0.00001; 
  const totalCost = totalAmount + estimatedFee;

  // Check if balance is sufficient
  const parsedBalance = parseFloat(balance);
  const isBalanceSufficient = parsedBalance >= totalCost;

  // Add recipient row
  const addRecipient = () => {
    const newId = (Date.now() + Math.random()).toString();
    setRecipients([
      ...recipients,
      { id: newId, address: "", amount: "", addressError: "", amountError: "", status: "idle" }
    ]);
  };

  // Remove recipient row
  const removeRecipient = (id: string) => {
    if (recipients.length === 1) {
      showToast("At least one recipient is required.", "info");
      return;
    }
    setRecipients(recipients.filter((r) => r.id !== id));
  };

  // Update row fields
  const updateRecipient = (id: string, field: "address" | "amount", value: string) => {
    setRecipients(
      recipients.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          [field]: value.trim(),
          status: "idle" // reset status on edit
        };
      })
    );
  };

  // Row live validation
  useEffect(() => {
    const stellarAddrRegex = /^G[A-D2-7][A-Z2-7]{54}$/;
    
    setRecipients((prev) =>
      prev.map((r) => {
        let addrErr = "";
        let amtErr = "";
        let status = r.status;

        // Address Validation
        if (r.address) {
          if (!stellarAddrRegex.test(r.address)) {
            addrErr = "Invalid address format.";
            status = "error";
          } else if (r.address === senderAddress) {
            addrErr = "Cannot send to sender address.";
            status = "error";
          } else {
            addrErr = "";
            if (status === "error" || status === "idle") status = "ready";
          }
        } else {
          addrErr = "";
        }

        // Amount Validation
        if (r.amount) {
          const amt = parseFloat(r.amount);
          if (isNaN(amt) || amt <= 0) {
            amtErr = "Must be a positive number.";
            status = "error";
          } else {
            amtErr = "";
            if (r.address && addrErr === "") status = "ready";
          }
        } else {
          amtErr = "";
        }

        return {
          ...r,
          addressError: addrErr,
          amountError: amtErr,
          status: (r.address || r.amount) ? status : "idle"
        };
      })
    );
  }, [senderAddress]); // Re-run if senderAddress changes

  // Validate Memo
  useEffect(() => {
    if (memo) {
      if (new Blob([memo]).size > 28) {
        setMemoError("Memo exceeds 28 bytes limit.");
      } else {
        setMemoError("");
      }
    } else {
      setMemoError("");
    }
  }, [memo]);

  // Overall form validity
  const isFormValid = 
    recipients.length > 0 &&
    recipients.every((r) => r.address && r.amount && !r.addressError && !r.amountError) &&
    !memoError &&
    isBalanceSufficient;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderAddress || !isFormValid) return;

    if (!isFunded) {
      showToast("Cannot process payments from an unfunded account.", "error");
      return;
    }

    try {
      // 1. Validating
      setTxState("validating");
      setRecipients(prev => prev.map(r => ({ ...r, status: "validating" })));
      await new Promise((r) => setTimeout(r, 600));

      // 2. Building
      setTxState("building");
      setRecipients(prev => prev.map(r => ({ ...r, status: "processing" })));
      await new Promise((r) => setTimeout(r, 600));

      // 3. Signing
      setTxState("signing");
      const cleanRecipients = recipients.map((r) => ({
        address: r.address,
        amount: r.amount,
      }));

      // Trigger freighter pop-up
      const result = await stellarService.sendBatchPayment(
        senderAddress,
        cleanRecipients,
        memo
      );

      // 4. Submitting
      setTxState("submitting");
      await new Promise((r) => setTimeout(r, 600));

      // 5. Success
      setTxHash(result.hash);
      setTxState("success");
      setRecipients(prev => prev.map(r => ({ ...r, status: "success" })));
      showToast("Batch transaction submitted successfully!", "success");
      onPaymentSuccess();
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || "Batch transaction failed. Please check wallet status.");
      setTxState("error");
      setRecipients(prev => prev.map(r => ({ ...r, status: "error" })));
      showToast("Batch transaction failed.", "error");
    }
  };

  const resetForm = () => {
    setRecipients([{ id: "1", address: "", amount: "", addressError: "", amountError: "", status: "idle" }]);
    setMemo("");
    setTxState("idle");
    setTxHash("");
    setErrorMessage("");
  };

  if (!senderAddress) {
    return (
      <div className="glass-card flex-center animate-fade-in" style={{ padding: "40px", flexDirection: "column", gap: "16px" }}>
        <Info size={36} color="var(--color-primary)" />
        <h2>Connect Wallet to Track Payments</h2>
        <p>Connect your Freighter wallet to execute multi-address payments and track their status.</p>
      </div>
    );
  }

  return (
    <div className="glass-card animate-fade-in" style={{ maxWidth: "800px", margin: "0 auto" }}>
      <h2 style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "1.5rem", marginBottom: "8px" }}>
        <Layers size={24} color="var(--color-primary)" />
        Multi-Address Payment Tracker
      </h2>
      <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "24px" }}>
        Distribute XLM to multiple public keys concurrently in a single, secure ledger transaction.
      </p>

      {txState === "idle" && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          {/* Recipient list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {recipients.map((recipient, index) => (
              <div 
                key={recipient.id} 
                className="glass-card" 
                style={{ 
                  background: "rgba(255,255,255,0.015)", 
                  padding: "16px", 
                  border: "1px solid var(--border-color)",
                  position: "relative" 
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-primary)" }}>
                    Recipient #{index + 1}
                  </span>
                  {recipients.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => removeRecipient(recipient.id)}
                      style={{ 
                        background: "transparent", 
                        color: "var(--color-error)", 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "4px",
                        fontSize: "0.8rem" 
                      }}
                    >
                      <Trash2 size={14} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
                  {/* Address field */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Stellar Address</label>
                    <input 
                      type="text" 
                      className={`form-input ${recipient.addressError ? "form-input-error" : ""}`}
                      placeholder="e.g. GBRI... (Stellar G Address)"
                      value={recipient.address}
                      onChange={(e) => updateRecipient(recipient.id, "address", e.target.value)}
                    />
                    {recipient.addressError && <div className="error-text" style={{ fontSize: "0.75rem" }}>{recipient.addressError}</div>}
                  </div>

                  {/* Amount field */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Amount (XLM)</label>
                    <div className="input-container">
                      <input 
                        type="number" 
                        step="any"
                        className={`form-input ${recipient.amountError ? "form-input-error" : ""}`}
                        placeholder="0.0"
                        value={recipient.amount}
                        onChange={(e) => updateRecipient(recipient.id, "amount", e.target.value)}
                      />
                      <span style={{ position: "absolute", right: "16px", top: "12px", fontSize: "0.9rem", fontWeight: 600, color: "var(--text-muted)" }}>
                        XLM
                      </span>
                    </div>
                    {recipient.amountError && <div className="error-text" style={{ fontSize: "0.75rem" }}>{recipient.amountError}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add recipient row button */}
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={addRecipient}
            style={{ width: "100%", borderStyle: "dashed" }}
          >
            <Plus size={16} />
            <span>Add Another Recipient</span>
          </button>

          {/* Optional Memo */}
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Shared Text Memo (Optional, max 28 bytes)</label>
            <input 
              type="text" 
              className={`form-input ${memoError ? "form-input-error" : ""}`}
              placeholder="e.g. Batch Payment"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
            {memoError && <div className="error-text">{memoError}</div>}
          </div>

          {/* Totals Summary Card */}
          <div 
            style={{ 
              background: "rgba(255, 255, 255, 0.02)", 
              border: "1px solid var(--border-color)", 
              borderRadius: "12px", 
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px"
            }}
          >
            <div className="flex-row-between" style={{ fontSize: "0.9rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>Total Payments:</span>
              <strong style={{ color: "var(--text-primary)" }}>{recipients.length} destinations</strong>
            </div>
            <div className="flex-row-between" style={{ fontSize: "0.9rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>Sum XLM Amount:</span>
              <strong style={{ color: "var(--text-primary)" }}>{totalAmount.toFixed(7)} XLM</strong>
            </div>
            <div className="flex-row-between" style={{ fontSize: "0.9rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>Stellar Network Fee:</span>
              <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                {estimatedFee.toFixed(5)} XLM ({(recipients.length * 100).toLocaleString()} stroops)
              </span>
            </div>
            <hr style={{ borderColor: "var(--border-color)", margin: "4px 0" }} />
            <div className="flex-row-between" style={{ fontSize: "1rem" }}>
              <span style={{ fontWeight: 600 }}>Total Balance Impact:</span>
              <strong style={{ color: isBalanceSufficient ? "var(--color-secondary)" : "var(--color-error)" }}>
                {totalCost.toFixed(5)} XLM
              </strong>
            </div>
            {!isBalanceSufficient && (
              <div className="error-text" style={{ marginTop: "4px", justifyContent: "flex-end" }}>
                <AlertCircle size={14} />
                <span>Insufficient balance. Wallet only holds {parseFloat(balance).toFixed(7)} XLM.</span>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="btn-primary" 
            disabled={!isFormValid || !isFunded}
            style={{ width: "100%", marginTop: "8px" }}
          >
            <Send size={16} />
            <span>Process Batch Payment ({recipients.length} transfers)</span>
          </button>
        </form>
      )}

      {/* Transaction Progress and Live Tracking */}
      {txState !== "idle" && (
        <div className="flex-center animate-fade-in" style={{ flexDirection: "column", padding: "16px 0", gap: "24px" }}>
          
          {/* General status panel */}
          {["validating", "building", "signing", "submitting"].includes(txState) && (
            <div className="flex-center" style={{ flexDirection: "column", gap: "16px", textAlign: "center" }}>
              <div className="spinner" style={{ width: "48px", height: "48px", borderWidth: "4px" }} />
              <div>
                <h3 style={{ fontSize: "1.15rem", marginBottom: "4px" }}>
                  {txState === "validating" && "Verifying Recipient Parameters..."}
                  {txState === "building" && "Structuring Batch Transaction..."}
                  {txState === "signing" && "Awaiting Freighter Wallet Approval..."}
                  {txState === "submitting" && "Submitting Batch to Horizon Network..."}
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", maxWidth: "500px" }}>
                  {txState === "validating" && "Double checking addresses formatting and balance requirements."}
                  {txState === "building" && "Bundling payment operations into a single Atomic Transaction XDR."}
                  {txState === "signing" && "Review details in Freighter extension window and click Approve."}
                  {txState === "submitting" && "Ledger validators are signing off and consensus is finalizing."}
                </p>
              </div>
            </div>
          )}

          {/* Success Summary */}
          {txState === "success" && (
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", width: "100%" }}>
              <CheckCircle2 size={56} color="var(--color-success)" />
              <div>
                <h3 style={{ fontSize: "1.3rem", color: "var(--color-success)", marginBottom: "4px" }}>
                  Batch Payment Executed!
                </h3>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", maxWidth: "450px", margin: "0 auto" }}>
                  Sent <strong>{totalAmount.toFixed(7)} XLM</strong> to <strong>{recipients.length}</strong> recipients in a single atomic transaction.
                </p>
              </div>

              {/* Transaction Hash box */}
              <div 
                style={{ 
                  background: "rgba(255,255,255,0.02)", 
                  border: "1px solid var(--border-color)", 
                  borderRadius: "10px", 
                  padding: "12px", 
                  fontFamily: "var(--font-mono)", 
                  fontSize: "0.75rem", 
                  textAlign: "left",
                  width: "100%",
                  maxWidth: "500px",
                  wordBreak: "break-all"
                }}
              >
                <div style={{ color: "var(--text-muted)", fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", marginBottom: "4px" }}>
                  Transaction Hash
                </div>
                <div style={{ color: "var(--text-primary)" }}>{txHash}</div>
              </div>
            </div>
          )}

          {/* Error Summary */}
          {txState === "error" && (
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", width: "100%" }}>
              <XCircle size={56} color="var(--color-error)" />
              <div>
                <h3 style={{ fontSize: "1.3rem", color: "var(--color-error)", marginBottom: "8px" }}>
                  Batch Submission Failed
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", maxWidth: "500px", margin: "0 auto", wordBreak: "break-word" }}>
                  {errorMessage}
                </p>
              </div>
            </div>
          )}

          {/* Recipient Tracking list */}
          <div style={{ width: "100%", maxWidth: "600px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <h4 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)", borderBottom: "1px solid var(--border-color)", paddingBottom: "6px" }}>
              Recipient Status Tracking
            </h4>

            {recipients.map((r, index) => {
              let statusText = "Pending";
              let badgeColor = "var(--text-muted)";
              let icon = <Clock size={14} />;

              if (r.status === "validating") {
                statusText = "Validating...";
                badgeColor = "var(--color-primary)";
                icon = <div className="spinner spinner-sm" style={{ borderColor: "transparent", borderTopColor: "var(--color-primary)" }} />;
              } else if (r.status === "processing") {
                statusText = "Processing...";
                badgeColor = "var(--color-secondary)";
                icon = <div className="spinner spinner-sm" style={{ borderColor: "transparent", borderTopColor: "var(--color-secondary)" }} />;
              } else if (r.status === "success") {
                statusText = "Completed";
                badgeColor = "var(--color-success)";
                icon = <CheckCircle2 size={14} color="var(--color-success)" />;
              } else if (r.status === "error") {
                statusText = "Failed";
                badgeColor = "var(--color-error)";
                icon = <XCircle size={14} color="var(--color-error)" />;
              } else if (r.status === "ready") {
                statusText = "Ready";
                badgeColor = "var(--color-success)";
                icon = <UserCheck size={14} color="var(--color-success)" />;
              }

              return (
                <div 
                  key={r.id} 
                  style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between", 
                    padding: "10px 14px", 
                    background: "rgba(255,255,255,0.01)", 
                    border: "1px solid var(--border-color)", 
                    borderRadius: "8px" 
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      Recipient #{index + 1}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                      {r.address ? `${r.address.substring(0, 8)}...${r.address.substring(r.address.length - 8)}` : "(Unspecified)"}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
                      {r.amount || "0.0"} XLM
                    </span>
                    <span 
                      style={{ 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: "6px", 
                        fontSize: "0.75rem", 
                        padding: "4px 10px", 
                        borderRadius: "20px", 
                        background: "rgba(255,255,255,0.03)", 
                        border: `1px solid ${badgeColor}`, 
                        color: badgeColor,
                        minWidth: "100px",
                        justifyContent: "center"
                      }}
                    >
                      {icon}
                      <span>{statusText}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action buttons after transaction completes or fails */}
          {(txState === "success" || txState === "error") && (
            <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
              {txState === "success" && (
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
              )}
              <button 
                onClick={resetForm} 
                className="btn-primary"
                style={{ fontSize: "0.85rem", padding: "8px 16px" }}
              >
                {txState === "success" ? "Process Another Batch" : "Try Again / Fix Form"}
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
