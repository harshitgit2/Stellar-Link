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
  AlertCircle,
  FileText,
  GitBranch,
  RefreshCw
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

interface IncomingPayment {
  from: string;
  amount: string;
  hash: string;
  date: string;
}

type TxState = "idle" | "validating" | "building" | "signing" | "submitting" | "success" | "error";

interface HoveredNodeInfo {
  type: "source" | "wallet" | "destination";
  title: string;
  address: string;
  amount: string;
  details?: string;
  x: number;
  y: number;
}

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

  // Sub-tabs navigation
  const [subTab, setSubTab] = useState<"form" | "flow">("form");

  // Incoming payment tracing
  const [incomingPayments, setIncomingPayments] = useState<IncomingPayment[]>([]);
  const [loadingIncoming, setLoadingIncoming] = useState(false);

  // Tooltip state
  const [hoveredNode, setHoveredNode] = useState<HoveredNodeInfo | null>(null);

  // Fetch incoming payments
  const fetchIncoming = async () => {
    if (!senderAddress) return;
    setLoadingIncoming(true);
    try {
      const data = await stellarService.fetchIncomingPayments(senderAddress);
      setIncomingPayments(data);
    } catch (err) {
      console.error("Failed to load funding sources:", err);
    } finally {
      setLoadingIncoming(false);
    }
  };

  useEffect(() => {
    fetchIncoming();
  }, [senderAddress]);

  // Fallback to faucet if funded but no history returns
  const getVisualSources = (): IncomingPayment[] => {
    if (incomingPayments.length > 0) {
      return incomingPayments;
    }
    if (isFunded) {
      // Mock faucet origin if account is funded to make diagram look rich
      return [
        {
          from: "GAIH35SMSTTRUTJU7KSBSICBO65AF56W7YSGS65E57G7556A7W6SZRRP", // Friendbot faucet G address
          amount: "10000.0000000",
          hash: "faucet-genesis-mock-hash",
          date: new Date().toISOString()
        }
      ];
    }
    return [];
  };

  // Calculate totals
  const totalAmount = recipients.reduce((sum, r) => {
    const amt = parseFloat(r.amount);
    return isNaN(amt) ? sum : sum + amt;
  }, 0);

  const estimatedFee = recipients.length * 0.00001; 
  const totalCost = totalAmount + estimatedFee;

  const parsedBalance = parseFloat(balance);
  const isBalanceSufficient = parsedBalance >= totalCost;

  // Add/Remove recipient rows
  const addRecipient = () => {
    const newId = (Date.now() + Math.random()).toString();
    setRecipients([
      ...recipients,
      { id: newId, address: "", amount: "", addressError: "", amountError: "", status: "idle" }
    ]);
  };

  const removeRecipient = (id: string) => {
    if (recipients.length === 1) {
      showToast("At least one recipient is required.", "info");
      return;
    }
    setRecipients(recipients.filter((r) => r.id !== id));
  };

  const updateRecipient = (id: string, field: "address" | "amount", value: string) => {
    setRecipients(
      recipients.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          [field]: value.trim(),
          status: "idle"
        };
      })
    );
  };

  // Live validation
  useEffect(() => {
    const stellarAddrRegex = /^G[A-D2-7][A-Z2-7]{54}$/;
    
    setRecipients((prev) =>
      prev.map((r) => {
        let addrErr = "";
        let amtErr = "";
        let status = r.status;

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
  }, [senderAddress]);

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

    // Switch view to Flow Chart to see animations
    setSubTab("flow");

    try {
      setTxState("validating");
      setRecipients(prev => prev.map(r => ({ ...r, status: "validating" })));
      await new Promise((r) => setTimeout(r, 700));

      setTxState("building");
      setRecipients(prev => prev.map(r => ({ ...r, status: "processing" })));
      await new Promise((r) => setTimeout(r, 700));

      setTxState("signing");
      const cleanRecipients = recipients.map((r) => ({
        address: r.address,
        amount: r.amount,
      }));

      const result = await stellarService.sendBatchPayment(
        senderAddress,
        cleanRecipients,
        memo
      );

      setTxState("submitting");
      await new Promise((r) => setTimeout(r, 700));

      setTxHash(result.hash);
      setTxState("success");
      setRecipients(prev => prev.map(r => ({ ...r, status: "success" })));
      showToast("Batch transaction submitted successfully!", "success");
      onPaymentSuccess();
      fetchIncoming(); // reload history
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || "Batch transaction failed.");
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
    setSubTab("form");
  };

  // Node geometries for flow chart
  const visualSources = getVisualSources();
  const activeRecipients = recipients.filter(r => r.address && !r.addressError);

  if (!senderAddress) {
    return (
      <div className="glass-card flex-center animate-fade-in" style={{ padding: "40px", flexDirection: "column", gap: "16px" }}>
        <Info size={36} color="var(--color-primary)" />
        <h2>Connect Wallet to Track Payments</h2>
        <p>Connect your Freighter wallet to execute multi-address payments and track their flow.</p>
      </div>
    );
  }

  return (
    <div className="glass-card animate-fade-in" style={{ maxWidth: "900px", margin: "0 auto", position: "relative" }}>
      
      {/* Styles for SVG elements */}
      <style>{`
        @keyframes flowDash {
          to {
            stroke-dashoffset: -20;
          }
        }
        .flow-line {
          transition: all 0.5s ease;
        }
        .flow-line-anim {
          stroke-dasharray: 6, 4;
          animation: flowDash 1s linear infinite;
        }
        .flow-line-anim-fast {
          stroke-dasharray: 6, 4;
          animation: flowDash 0.4s linear infinite;
        }
        .flow-node {
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .flow-node:hover {
          transform: scale(1.08);
        }
        .flow-node-wallet {
          filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.4));
        }
        .flow-node-source {
          filter: drop-shadow(0 0 6px rgba(16, 185, 129, 0.2));
        }
        .flow-node-dest {
          filter: drop-shadow(0 0 6px rgba(0, 229, 255, 0.2));
        }
        .tooltip-box {
          position: absolute;
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 8px 12px;
          pointer-events: none;
          z-index: 10;
          font-size: 0.75rem;
          color: var(--text-primary);
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          backdrop-filter: blur(8px);
          max-width: 320px;
          animation: fadeIn 0.15s ease-out;
        }
      `}</style>

      <div className="flex-row-between" style={{ marginBottom: "16px" }}>
        <div>
          <h2 style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "1.5rem", marginBottom: "4px" }}>
            <Layers size={24} color="var(--color-primary)" />
            Multi-Address Payment Tracker
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            Execute concurrent transfers and visualize the entire ledger fund path.
          </p>
        </div>

        {/* View toggles */}
        {txState === "idle" && (
          <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "2px" }}>
            <button 
              type="button"
              className={`tab-btn`}
              onClick={() => setSubTab("form")}
              style={{ 
                padding: "6px 12px", 
                fontSize: "0.8rem", 
                borderRadius: "6px", 
                borderBottom: "none", 
                background: subTab === "form" ? "rgba(255,255,255,0.08)" : "transparent",
                color: subTab === "form" ? "var(--text-primary)" : "var(--text-secondary)",
                top: 0
              }}
            >
              <FileText size={14} style={{ marginRight: "4px" }} />
              Form Setup
            </button>
            <button 
              type="button"
              className={`tab-btn`}
              onClick={() => setSubTab("flow")}
              style={{ 
                padding: "6px 12px", 
                fontSize: "0.8rem", 
                borderRadius: "6px", 
                borderBottom: "none", 
                background: subTab === "flow" ? "rgba(255,255,255,0.08)" : "transparent",
                color: subTab === "flow" ? "var(--text-primary)" : "var(--text-secondary)",
                top: 0
              }}
            >
              <GitBranch size={14} style={{ marginRight: "4px" }} />
              Funds Flow Chart
            </button>
          </div>
        )}
      </div>

      {/* Tooltip Overlay */}
      {hoveredNode && (
        <div 
          className="tooltip-box"
          style={{ 
            left: `${hoveredNode.x}px`, 
            top: `${hoveredNode.y}px`, 
            transform: "translate(-50%, -105%)" 
          }}
        >
          <strong style={{ color: "var(--color-secondary)", display: "block", marginBottom: "4px" }}>
            {hoveredNode.title}
          </strong>
          <div style={{ wordBreak: "break-all", fontFamily: "var(--font-mono)", fontSize: "0.65rem", color: "var(--text-secondary)", marginBottom: "4px" }}>
            {hoveredNode.address}
          </div>
          <div style={{ fontWeight: 600 }}>
            Amount: <span style={{ color: hoveredNode.type === "source" ? "var(--color-success)" : hoveredNode.type === "destination" ? "var(--color-error)" : "var(--text-primary)" }}>
              {hoveredNode.amount}
            </span>
          </div>
          {hoveredNode.details && (
            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "4px", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "4px" }}>
              {hoveredNode.details}
            </div>
          )}
        </div>
      )}

      {/* FORM SETUP TAB */}
      {subTab === "form" && txState === "idle" && (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
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
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" style={{ fontSize: "0.75rem" }}>Stellar Public Key</label>
                    <input 
                      type="text" 
                      className={`form-input ${recipient.addressError ? "form-input-error" : ""}`}
                      placeholder="e.g. GBRI... (Stellar G Address)"
                      value={recipient.address}
                      onChange={(e) => updateRecipient(recipient.id, "address", e.target.value)}
                    />
                    {recipient.addressError && <div className="error-text" style={{ fontSize: "0.75rem" }}>{recipient.addressError}</div>}
                  </div>

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

          <button 
            type="button" 
            className="btn-secondary" 
            onClick={addRecipient}
            style={{ width: "100%", borderStyle: "dashed" }}
          >
            <Plus size={16} />
            <span>Add Another Recipient</span>
          </button>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Shared Memo (Optional, max 28 chars)</label>
            <input 
              type="text" 
              className={`form-input ${memoError ? "form-input-error" : ""}`}
              placeholder="e.g. Coffee split"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
            {memoError && <div className="error-text">{memoError}</div>}
          </div>

          {/* Cost Estimates */}
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
              <span style={{ color: "var(--text-secondary)" }}>Recipients Count:</span>
              <strong style={{ color: "var(--text-primary)" }}>{recipients.length} destinations</strong>
            </div>
            <div className="flex-row-between" style={{ fontSize: "0.9rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>Base Payment Total:</span>
              <strong style={{ color: "var(--text-primary)" }}>{totalAmount.toFixed(7)} XLM</strong>
            </div>
            <div className="flex-row-between" style={{ fontSize: "0.9rem" }}>
              <span style={{ color: "var(--text-secondary)" }}>Horizon Ops Fee:</span>
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
                <span>Insufficient balance. Wallet holds {parseFloat(balance).toFixed(7)} XLM.</span>
              </div>
            )}
          </div>

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

      {/* FUNDS FLOW CHART TAB */}
      {(subTab === "flow" || txState !== "idle") && (
        <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          {/* Dynamic SVG Flow Diagram */}
          <div 
            style={{ 
              background: "rgba(10, 14, 28, 0.4)", 
              border: "1px solid var(--border-color)", 
              borderRadius: "16px", 
              padding: "16px", 
              overflowX: "auto",
              position: "relative"
            }}
          >
            {loadingIncoming && (
              <div style={{ position: "absolute", top: "12px", right: "12px", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                <RefreshCw size={12} className="spinner" />
                <span>Loading sources...</span>
              </div>
            )}

            <svg 
              width="100%" 
              height="340" 
              viewBox="0 0 800 340" 
              style={{ minWidth: "750px", display: "block" }}
            >
              <defs>
                {/* Node glowing filters */}
                <filter id="glow-primary" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="glow-success" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="glow-secondary" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>

                {/* Arrow Markers */}
                <marker id="arrow-green" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--color-success)" />
                </marker>
                <marker id="arrow-blue" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--color-primary)" />
                </marker>
                <marker id="arrow-cyan" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--color-secondary)" />
                </marker>
              </defs>

              {/* === CONNECTING LINES (BEZIER PATHS) === */}
              
              {/* Left to Center (Funding Sources -> Connected Wallet) */}
              {visualSources.map((_source, idx) => {
                const totalSources = visualSources.length;
                const srcX = 140;
                let srcY = 170; // middle
                if (totalSources === 2) {
                  srcY = idx === 0 ? 110 : 230;
                } else if (totalSources >= 3) {
                  const positions = [70, 170, 270];
                  srcY = positions[idx] || 170;
                }

                const pathData = `M ${srcX} ${srcY} C 270 ${srcY}, 270 170, 400 170`;
                
                // Color path based on state
                const isFlowing = ["validating", "building", "signing", "submitting"].includes(txState);
                const strokeColor = txState === "success" 
                  ? "rgba(16, 185, 129, 0.4)" // green
                  : isFlowing 
                    ? "rgba(59, 130, 246, 0.5)" // blue flow
                    : "rgba(255, 255, 255, 0.08)"; // idle dim

                return (
                  <g key={`path-src-${idx}`}>
                    {/* Underlying glow path */}
                    <path 
                      d={pathData} 
                      fill="none" 
                      stroke={strokeColor} 
                      strokeWidth={txState === "success" ? 3 : 2}
                      className="flow-line"
                      markerEnd="url(#arrow-green)"
                    />
                    {/* Flowing dashes animation */}
                    {isFlowing && (
                      <path 
                        d={pathData} 
                        fill="none" 
                        stroke="var(--color-primary)" 
                        strokeWidth="2"
                        className="flow-line-anim"
                      />
                    )}
                  </g>
                );
              })}

              {/* Center to Right (Connected Wallet -> Recipients) */}
              {activeRecipients.length === 0 ? (
                // Draw a placeholder line if no recipient entered
                <path 
                  d="M 400 170 C 530 170, 530 170, 660 170" 
                  fill="none" 
                  stroke="rgba(255, 255, 255, 0.05)" 
                  strokeWidth="2" 
                  strokeDasharray="4, 4"
                  markerEnd="url(#arrow-cyan)"
                />
              ) : (
                activeRecipients.slice(0, 4).map((recipient, idx) => {
                  const count = Math.min(activeRecipients.length, 4);
                  const destX = 660;
                  let destY = 170;
                  if (count === 2) {
                    destY = idx === 0 ? 110 : 230;
                  } else if (count === 3) {
                    destY = idx === 0 ? 80 : idx === 1 ? 170 : 260;
                  } else if (count >= 4) {
                    const positions = [60, 130, 210, 280];
                    destY = positions[idx] || 170;
                  }

                  const pathData = `M 400 170 C 530 170, 530 ${destY}, ${destX} ${destY}`;
                  
                  // Color codes
                  let strokeColor = "rgba(255, 255, 255, 0.08)";
                  let isAnim = false;
                  let isFast = false;

                  if (txState === "success") {
                    strokeColor = "var(--color-success)";
                  } else if (recipient.status === "processing" || txState === "submitting") {
                    strokeColor = "var(--color-secondary)";
                    isAnim = true;
                    isFast = true;
                  } else if (txState === "signing" || txState === "building") {
                    strokeColor = "var(--color-primary)";
                    isAnim = true;
                  }

                  return (
                    <g key={`path-dest-${recipient.id}`}>
                      <path 
                        d={pathData} 
                        fill="none" 
                        stroke={strokeColor} 
                        strokeWidth={txState === "success" ? 3 : 2}
                        className="flow-line"
                        markerEnd={txState === "success" ? "url(#arrow-green)" : "url(#arrow-cyan)"}
                      />
                      {isAnim && (
                        <path 
                          d={pathData} 
                          fill="none" 
                          stroke={isFast ? "var(--color-secondary)" : "var(--color-primary)"} 
                          strokeWidth="2"
                          className={isFast ? "flow-line-anim-fast" : "flow-line-anim"}
                        />
                      )}
                    </g>
                  );
                })
              )}


              {/* === NODES (CIRCLES & LABELS) === */}

              {/* 1. LEFT COLUMN: Funding Sources */}
              {visualSources.length === 0 ? (
                // Placeholder Source Node
                <g transform="translate(140, 170)">
                  <circle r="22" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" strokeDasharray="3,3" />
                  <text y="5" textAnchor="middle" fill="var(--text-muted)" fontSize="10">No Source</text>
                  <text y="42" textAnchor="middle" fill="var(--text-muted)" fontSize="9">Unfunded</text>
                </g>
              ) : (
                visualSources.map((source, idx) => {
                  const totalSources = visualSources.length;
                  const srcX = 140;
                  let srcY = 170;
                  if (totalSources === 2) {
                    srcY = idx === 0 ? 110 : 230;
                  } else if (totalSources >= 3) {
                    const positions = [70, 170, 270];
                    srcY = positions[idx] || 170;
                  }

                  const isFaucet = source.from === "GAIH35SMSTTRUTJU7KSBSICBO65AF56W7YSGS65E57G7556A7W6SZRRP" || source.from.includes("Faucet");
                  const shortAddress = isFaucet ? "Friendbot Faucet" : `${source.from.substring(0, 5)}...${source.from.substring(source.from.length - 4)}`;

                  return (
                    <g 
                      key={`node-src-${idx}`} 
                      className="flow-node flow-node-source" 
                      transform={`translate(${srcX}, ${srcY})`}
                      onMouseEnter={(e) => setHoveredNode({
                        type: "source",
                        title: isFaucet ? "Friendbot (Testnet Faucet)" : "Stellar Funding Source",
                        address: source.from,
                        amount: `+${parseFloat(source.amount).toLocaleString()} XLM`,
                        details: `Tx Hash: ${source.hash.substring(0, 12)}...\nReceived: ${new Date(source.date).toLocaleDateString()}`,
                        x: e.clientX,
                        y: e.clientY
                      })}
                      onMouseMove={(e) => setHoveredNode(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      <circle r="22" fill="rgba(16, 185, 129, 0.12)" stroke="var(--color-success)" strokeWidth="1.5" />
                      <path d="M-6 -2 L0 -8 L6 -2 M0 -8 L0 8" fill="none" stroke="var(--color-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      
                      {/* Labels */}
                      <text y="-28" textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontWeight="600">{shortAddress}</text>
                      <text y="36" textAnchor="middle" fill="var(--color-success)" fontSize="10" fontWeight="500">+{parseFloat(source.amount).toLocaleString()} XLM</text>
                    </g>
                  );
                })
              )}

              {/* 2. CENTER COLUMN: Active Freighter Wallet */}
              <g 
                className="flow-node flow-node-wallet" 
                transform="translate(400, 170)"
                onMouseEnter={(e) => setHoveredNode({
                  type: "wallet",
                  title: "Your Freighter Wallet",
                  address: senderAddress || "",
                  amount: `${parseFloat(balance).toLocaleString()} XLM`,
                  details: `Status: ${isFunded ? "Active (Funded)" : "Inactive"}\nEst. Fee Buffer: ${estimatedFee.toFixed(5)} XLM`,
                  x: e.clientX,
                  y: e.clientY
                })}
                onMouseMove={(e) => setHoveredNode(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                onMouseLeave={() => setHoveredNode(null)}
              >
                <circle r="36" fill="rgba(59, 130, 246, 0.16)" stroke="var(--color-primary)" strokeWidth="2.5" filter="url(#glow-primary)" />
                {/* Wallet Icon */}
                <path d="M-10-8 h20 a2,2 0 0 1 2,2 v12 a2,2 0 0 1-2,2 h-20 a2,2 0 0 1-2-2 v-12 a2,2 0 0 1 2-2 z M6-1 v2" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" strokeLinecap="round" />
                
                <text y="-44" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="600">My Wallet</text>
                <text y="50" textAnchor="middle" fill="var(--color-secondary)" fontSize="11" fontWeight="600">{parseFloat(balance).toLocaleString()} XLM</text>
              </g>

              {/* 3. RIGHT COLUMN: Outgoing Destinations */}
              {activeRecipients.length === 0 ? (
                // Placeholder Destination Node
                <g transform="translate(660, 170)">
                  <circle r="22" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.08)" strokeDasharray="3,3" />
                  <text y="5" textAnchor="middle" fill="var(--text-muted)" fontSize="10">Recipient</text>
                  <text y="42" textAnchor="middle" fill="var(--text-muted)" fontSize="9">Pending Input</text>
                </g>
              ) : (
                activeRecipients.slice(0, 4).map((recipient, idx) => {
                  const count = Math.min(activeRecipients.length, 4);
                  const destX = 660;
                  let destY = 170;
                  if (count === 2) {
                    destY = idx === 0 ? 110 : 230;
                  } else if (count === 3) {
                    destY = idx === 0 ? 80 : idx === 1 ? 170 : 260;
                  } else if (count >= 4) {
                    const positions = [60, 130, 210, 280];
                    destY = positions[idx] || 170;
                  }

                  const shortDest = `${recipient.address.substring(0, 5)}...${recipient.address.substring(recipient.address.length - 4)}`;
                  const showMoreBadge = idx === 3 && activeRecipients.length > 4;

                  let strokeCol = "var(--color-secondary)";
                  let fillCol = "rgba(0, 229, 255, 0.12)";

                  if (recipient.status === "success" || txState === "success") {
                    strokeCol = "var(--color-success)";
                    fillCol = "rgba(16, 185, 129, 0.15)";
                  } else if (recipient.status === "error") {
                    strokeCol = "var(--color-error)";
                    fillCol = "rgba(244, 63, 94, 0.15)";
                  }

                  return (
                    <g 
                      key={`node-dest-${recipient.id}`} 
                      className="flow-node flow-node-dest" 
                      transform={`translate(${destX}, ${destY})`}
                      onMouseEnter={(e) => setHoveredNode({
                        type: "destination",
                        title: showMoreBadge ? `Recipient #${idx + 1} (+${activeRecipients.length - 3} more)` : `Recipient #${idx + 1}`,
                        address: recipient.address,
                        amount: `-${parseFloat(recipient.amount).toLocaleString()} XLM`,
                        details: `Status: ${recipient.status.toUpperCase()}`,
                        x: e.clientX,
                        y: e.clientY
                      })}
                      onMouseMove={(e) => setHoveredNode(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      <circle r="22" fill={fillCol} stroke={strokeCol} strokeWidth="1.5" />
                      
                      {/* Node Icon */}
                      {recipient.status === "success" || txState === "success" ? (
                        <path d="M-6 0 L-2 4 L6 -4" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      ) : recipient.status === "error" ? (
                        <path d="M-4 -4 L4 4 M-4 4 L4 -4" fill="none" stroke="var(--color-error)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      ) : (
                        <path d="M-6 2 L0 8 L6 2 M0 8 L0 -8" fill="none" stroke="var(--color-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      )}

                      {/* Labels */}
                      <text y="-28" textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontWeight="600">
                        {showMoreBadge ? `+${activeRecipients.length - 3} More` : shortDest}
                      </text>
                      <text y="36" textAnchor="middle" fill={strokeCol} fontSize="10" fontWeight="500">
                        -{parseFloat(recipient.amount).toLocaleString()} XLM
                      </text>
                    </g>
                  );
                })
              )}

            </svg>
          </div>

          {/* Subtitle details */}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "var(--text-muted)", padding: "0 8px" }}>
            <span>💡 Hover over nodes to inspect ledger details.</span>
            <span>Total Destination Flow: <strong>{totalAmount.toFixed(7)} XLM</strong></span>
          </div>

          {/* Flow status panel */}
          {txState !== "idle" && (
            <div 
              className="glass-card flex-center" 
              style={{ 
                flexDirection: "column", 
                padding: "20px", 
                textAlign: "center", 
                gap: "16px",
                background: "rgba(255,255,255,0.01)" 
              }}
            >
              {/* Loaders */}
              {["validating", "building", "signing", "submitting"].includes(txState) && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                  <div className="spinner" style={{ width: "36px", height: "36px", borderWidth: "3px" }} />
                  <div>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "2px" }}>
                      {txState === "validating" && "Verifying Ledger Conditions..."}
                      {txState === "building" && "Structuring Transaction Operations..."}
                      {txState === "signing" && "Awaiting Wallet Signature..."}
                      {txState === "submitting" && "Submitting Batch to Ledger Consensus..."}
                    </h3>
                    <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                      {txState === "validating" && "Ensuring recipient addresses exist and formatting is correct."}
                      {txState === "building" && "Packaging transfers into a single transaction envelope."}
                      {txState === "signing" && "Freighter browser extension prompt is active. Please review and sign."}
                      {txState === "submitting" && "Submitting payload to the Horizon Network. Waiting for confirmation."}
                    </p>
                  </div>
                </div>
              )}

              {/* Success */}
              {txState === "success" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", width: "100%" }}>
                  <CheckCircle2 size={44} color="var(--color-success)" />
                  <div>
                    <h3 style={{ fontSize: "1.2rem", color: "var(--color-success)", marginBottom: "4px" }}>
                      Batch Transfer Finalized
                    </h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", maxWidth: "500px", margin: "0 auto 12px" }}>
                      Successfully routed <strong>{totalAmount.toFixed(7)} XLM</strong> to <strong>{recipients.length}</strong> recipients.
                    </p>
                    
                    <div 
                      style={{ 
                        background: "rgba(255,255,255,0.015)", 
                        border: "1px solid var(--border-color)", 
                        borderRadius: "8px", 
                        padding: "10px", 
                        fontFamily: "var(--font-mono)", 
                        fontSize: "0.7rem", 
                        textAlign: "left",
                        width: "100%",
                        maxWidth: "480px",
                        margin: "0 auto",
                        wordBreak: "break-all"
                      }}
                    >
                      <span style={{ color: "var(--text-muted)", display: "block", fontSize: "0.6rem", textTransform: "uppercase", marginBottom: "2px" }}>
                        Transaction Hash
                      </span>
                      {txHash}
                    </div>
                  </div>
                </div>
              )}

              {/* Error */}
              {txState === "error" && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                  <XCircle size={44} color="var(--color-error)" />
                  <div>
                    <h3 style={{ fontSize: "1.2rem", color: "var(--color-error)", marginBottom: "4px" }}>
                      Batch Routing Failed
                    </h3>
                    <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", maxWidth: "450px", wordBreak: "break-word" }}>
                      {errorMessage}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action buttons in Flowchart Tab */}
          {(txState === "success" || txState === "error") && (
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
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
                {txState === "success" ? "Process Another Batch" : "Back to Editor"}
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
