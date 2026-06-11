import React from "react";
import { Coins, Flame, ArrowRight, Wallet, Info } from "lucide-react";

interface DashboardProps {
  address: string | null;
  balance: string;
  isFunded: boolean;
  faucetLoading: boolean;
  onRequestFaucet: () => void;
  setActiveTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  address,
  balance,
  isFunded,
  faucetLoading,
  onRequestFaucet,
  setActiveTab,
}) => {
  if (!address) {
    return (
      <div className="glass-card flex-center animate-fade-in" style={{ padding: "48px 24px", flexDirection: "column", gap: "20px", textAlign: "center" }}>
        <div 
          style={{ 
            background: "rgba(59, 130, 246, 0.05)",
            border: "1px dashed rgba(59, 130, 246, 0.3)",
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "10px"
          }}
        >
          <Wallet size={36} color="var(--color-primary)" />
        </div>
        <div>
          <h2 style={{ marginBottom: "8px" }}>Connect Your Wallet</h2>
          <p style={{ maxWidth: "420px", margin: "0 auto 16px" }}>
            Please connect your Freighter browser wallet extension to check your balance, request testnet XLM, and make payments.
          </p>
          <div className="alert-banner info" style={{ maxWidth: "500px", margin: "0 auto", textAlign: "left" }}>
            <Info size={20} style={{ flexShrink: 0 }} />
            <div className="alert-banner-content">
              <div className="alert-banner-title">Need Freighter?</div>
              <div className="alert-banner-desc">
                Freighter is a browser extension that enables you to sign Stellar transactions. You can download it from{" "}
                <a href="https://www.freighter.app/" target="_blank" rel="noopener noreferrer" style={{ color: "var(--color-primary)", textDecoration: "underline" }}>
                  freighter.app
                </a>.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-grid animate-fade-in">
      {/* Balance & Overview Column */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Main Balance Card */}
        <div 
          className="glass-card" 
          style={{ 
            position: "relative", 
            overflow: "hidden", 
            background: "linear-gradient(135deg, rgba(16, 22, 43, 0.9) 0%, rgba(20, 30, 60, 0.7) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.1)"
          }}
        >
          <div 
            style={{ 
              position: "absolute",
              top: "-50px",
              right: "-50px",
              width: "200px",
              height: "200px",
              background: "radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)",
              pointerEvents: "none"
            }}
          />

          <p style={{ textTransform: "uppercase", fontSize: "0.8rem", letterSpacing: "0.1em", fontWeight: 600, color: "var(--text-secondary)" }}>
            Available Balance
          </p>
          
          <div style={{ display: "flex", alignItems: "baseline", gap: "10px", margin: "16px 0 8px" }}>
            <h1 style={{ fontSize: "3rem", fontWeight: 700, margin: 0, lineHeight: 1, letterSpacing: "-0.03em" }}>
              {parseFloat(balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })}
            </h1>
            <span style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--color-secondary)" }}>XLM</span>
          </div>

          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
            <Coins size={14} />
            Stellar Native Lumens (Testnet)
          </p>

          {/* Quick Action Navigation Buttons */}
          <div style={{ display: "flex", gap: "12px", marginTop: "24px", borderTop: "1px solid var(--border-color)", paddingTop: "20px" }}>
            <button 
              className="btn-primary" 
              onClick={() => setActiveTab("send")}
              style={{ flex: 1, padding: "10px 16px", fontSize: "0.9rem" }}
            >
              <span>Send XLM</span>
              <ArrowRight size={16} />
            </button>
            <button 
              className="btn-secondary" 
              onClick={() => setActiveTab("checker")}
              style={{ flex: 1, padding: "10px 16px", fontSize: "0.9rem" }}
            >
              <span>Check Others</span>
            </button>
          </div>
        </div>

        {/* Unfunded Warning Card */}
        {!isFunded && (
          <div className="alert-banner warning animate-fade-in" style={{ margin: 0 }}>
            <Info size={24} style={{ flexShrink: 0 }} />
            <div className="alert-banner-content">
              <div className="alert-banner-title">Account Inactive (Unfunded)</div>
              <div className="alert-banner-desc" style={{ marginBottom: "10px" }}>
                This account is brand new and has not been initialized on the Stellar Testnet. In Stellar, accounts must hold a minimum reserve (at least 1 XLM) to exist. Use the faucet below to fund and initialize your account.
              </div>
              <button 
                className="btn-primary" 
                onClick={onRequestFaucet} 
                disabled={faucetLoading}
                style={{ 
                  background: "var(--color-warning)",
                  boxShadow: "0 4px 14px rgba(245, 158, 11, 0.3)",
                  padding: "8px 16px",
                  fontSize: "0.85rem",
                  color: "#070a13",
                  fontWeight: 600
                }}
              >
                {faucetLoading ? (
                  <>
                    <div className="spinner spinner-sm" style={{ borderTopColor: "#070a13" }} />
                    <span>Funding Account...</span>
                  </>
                ) : (
                  <>
                    <Flame size={14} />
                    <span>Fund with Faucet</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Faucet Sidebar Column */}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Faucet Interactive Card */}
        <div className="glass-card" style={{ display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: "1.2rem", marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Flame size={20} color="var(--color-warning)" />
              Testnet Faucet
            </h3>
            <p style={{ fontSize: "0.9rem", marginBottom: "20px" }}>
              Fund your wallet with 10,000 testnet XLM instantly from Friendbot to test transactions, payments, and smart contract fees.
            </p>
          </div>

          <div style={{ marginTop: "auto" }}>
            <button 
              className="btn-primary" 
              onClick={onRequestFaucet} 
              disabled={faucetLoading}
              style={{ 
                width: "100%", 
                background: "linear-gradient(135deg, var(--color-warning) 0%, #d97706 100%)",
                boxShadow: "0 4px 14px rgba(245, 158, 11, 0.3)",
                color: "#070a13",
                fontWeight: 600
              }}
            >
              {faucetLoading ? (
                <>
                  <div className="spinner spinner-sm" style={{ borderTopColor: "#070a13" }} />
                  <span>Requesting Faucet...</span>
                </>
              ) : (
                <>
                  <Flame size={16} />
                  <span>Request 10,000 XLM</span>
                </>
              )}
            </button>
            <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "8px", textAlign: "center" }}>
              Rate limits apply. Friendbot is only for Stellar Testnet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
