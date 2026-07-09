import React, { useState } from "react";
import { Wallet, Copy, Check, LogOut, ShieldAlert } from "lucide-react";

interface HeaderProps {
  address: string | null;
  network: string;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  showToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export const Header: React.FC<HeaderProps> = ({
  address,
  network,
  isConnecting,
  onConnect,
  onDisconnect,
  showToast,
}) => {
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      showToast("Address copied to clipboard!", "success");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncateAddress = (addr: string) => {
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const isTestnet = network.toUpperCase() === "TESTNET";

  return (
    <header className="glass-card flex-row-between animate-fade-in app-header">
      {/* Brand logo */}
      <div className="header-brand">
        <div className="brand-logo-container">
          <Wallet size={20} color="white" />
        </div>
        <div>
          <h1 
            style={{ 
              fontSize: "1.2rem", 
              fontWeight: 700, 
              margin: 0, 
              letterSpacing: "-0.01em", 
              display: "flex", 
              alignItems: "center", 
              gap: "8px" 
            }}
          >
            Stellar Link
            <span style={{ fontSize: "0.75rem", fontWeight: 400, color: "var(--text-muted)" }}>v1.0</span>
          </h1>
        </div>
      </div>

      {/* Connection & Network Status */}
      <div className="header-actions-group">
        {address && (
          <>
            {/* Network Badge */}
            <div 
              className="flex-center"
              style={{
                background: isTestnet ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.08)",
                border: `1px solid ${isTestnet ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)"}`,
                color: isTestnet ? "var(--color-success)" : "var(--color-warning)",
                padding: "6px 12px",
                borderRadius: "20px",
                fontSize: "0.75rem",
                fontWeight: 600,
                gap: "6px",
                flexShrink: 0
              }}
            >
              {!isTestnet && <ShieldAlert size={14} />}
              <span className={`status-dot ${isTestnet ? "active" : "inactive"}`} />
              {isTestnet ? "TESTNET" : `NETWORK: ${network}`}
            </div>

            {/* Account Truncated Copy Badges */}
            <div className="copy-badge" onClick={copyAddress} title="Copy Address">
              <span>{truncateAddress(address)}</span>
              {copied ? <Check size={14} color="var(--color-success)" /> : <Copy size={14} />}
            </div>

            {/* Disconnect Button */}
            <button 
              className="btn-icon" 
              onClick={onDisconnect}
              title="Disconnect Wallet"
              style={{ color: "var(--color-error)" }}
            >
              <LogOut size={18} />
            </button>
          </>
        )}

        {!address && (
          <button 
            className="btn-primary" 
            onClick={onConnect}
            disabled={isConnecting}
            style={{ padding: "8px 18px", borderRadius: "8px" }}
          >
            {isConnecting ? (
              <>
                <div className="spinner spinner-sm" style={{ borderTopColor: "white" }} />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Wallet size={16} />
                <span>Connect Freighter</span>
              </>
            )}
          </button>
        )}
      </div>
    </header>
  );
};
