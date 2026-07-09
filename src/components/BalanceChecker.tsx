import React, { useState, useEffect } from "react";
import { Plus, Trash2, RefreshCw, Copy, Check, Info, Coins } from "lucide-react";
import { stellarService } from "../services/stellar";

interface SavedAccount {
  label: string;
  address: string;
  balance: string;
  isFunded: boolean;
  isLoading: boolean;
  error: string;
}

export const BalanceChecker: React.FC = () => {
  const [accounts, setAccounts] = useState<SavedAccount[]>([]);
  const [inputAddress, setInputAddress] = useState("");
  const [inputLabel, setInputLabel] = useState("");
  const [validationError, setValidationError] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [globalLoading, setGlobalLoading] = useState(false);

  // Load saved accounts from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem("stellar_saved_accounts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as { label: string; address: string }[];
        const accountsWithStates = parsed.map((acc) => ({
          ...acc,
          balance: "0.0",
          isFunded: false,
          isLoading: false,
          error: "",
        }));
        setAccounts(accountsWithStates);
        // Automatically fetch balances for loaded accounts
        fetchBalancesForAccounts(accountsWithStates);
      } catch (err) {
        console.error("Failed to parse saved accounts:", err);
      }
    } else {
      // Provide some default testnet accounts as examples if empty
      const defaultAccounts = [
        {
          label: "Testnet Funder (Friendbot)",
          address: "GAAZIQD556IK7Y6C3P64BPG44TVEG665TT6YZ3U5DE7D2VQD4DPMZ4W4",
          balance: "0.0",
          isFunded: false,
          isLoading: false,
          error: "",
        },
      ];
      setAccounts(defaultAccounts);
      fetchBalancesForAccounts(defaultAccounts);
    }
  }, []);

  // Save accounts list to localStorage whenever it changes
  const saveToLocalStorage = (list: SavedAccount[]) => {
    const toSave = list.map((acc) => ({ label: acc.label, address: acc.address }));
    localStorage.setItem("stellar_saved_accounts", JSON.stringify(toSave));
  };

  const fetchBalancesForAccounts = async (list: SavedAccount[]) => {
    if (list.length === 0) return;
    setGlobalLoading(true);
    
    const updatedList = await Promise.all(
      list.map(async (acc) => {
        try {
          const details = await stellarService.fetchAccountDetails(acc.address);
          return {
            ...acc,
            balance: details.balance,
            isFunded: details.isFunded,
            isLoading: false,
            error: "",
          };
        } catch (err: any) {
          return {
            ...acc,
            isLoading: false,
            error: "Failed to fetch",
          };
        }
      })
    );

    setAccounts(updatedList);
    setGlobalLoading(false);
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    const addr = inputAddress.trim();
    const lbl = inputLabel.trim() || `Account ${accounts.length + 1}`;

    // Validate Address
    const stellarAddrRegex = /^G[A-D2-7][A-Z2-7]{54}$/;
    if (!stellarAddrRegex.test(addr)) {
      setValidationError("Invalid Stellar address (Must be a 56 character public key starting with G).");
      return;
    }

    // Check duplicates
    if (accounts.some((acc) => acc.address === addr)) {
      setValidationError("This address has already been added.");
      return;
    }

    const newAccount: SavedAccount = {
      label: lbl,
      address: addr,
      balance: "Loading...",
      isFunded: false,
      isLoading: true,
      error: "",
    };

    const updatedList = [...accounts, newAccount];
    setAccounts(updatedList);
    saveToLocalStorage(updatedList);

    // Clear inputs
    setInputAddress("");
    setInputLabel("");

    // Fetch balance for new account
    try {
      const details = await stellarService.fetchAccountDetails(addr);
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.address === addr
            ? { ...acc, balance: details.balance, isFunded: details.isFunded, isLoading: false }
            : acc
        )
      );
    } catch (err: any) {
      setAccounts((prev) =>
        prev.map((acc) =>
          acc.address === addr
            ? { ...acc, balance: "0.0", isLoading: false, error: "Failed to fetch" }
            : acc
        )
      );
    }
  };

  const handleDelete = (address: string) => {
    const updatedList = accounts.filter((acc) => acc.address !== address);
    setAccounts(updatedList);
    saveToLocalStorage(updatedList);
  };

  const copyAddress = (address: string, index: number) => {
    navigator.clipboard.writeText(address);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const truncateAddress = (addr: string) => {
    return `${addr.substring(0, 8)}...${addr.substring(addr.length - 8)}`;
  };

  return (
    <div className="glass-card animate-fade-in">
      <div className="checker-header-row">
        <h2 style={{ margin: 0, fontSize: "1.5rem", display: "flex", alignItems: "center", gap: "10px" }}>
          <Coins size={24} color="var(--color-primary)" />
          Wallet Balance Checker
        </h2>
        <button 
          className="btn-secondary" 
          onClick={() => fetchBalancesForAccounts(accounts)} 
          disabled={globalLoading || accounts.length === 0}
          style={{ padding: "8px 14px", fontSize: "0.85rem" }}
        >
          <RefreshCw size={14} className={globalLoading ? "spinner" : ""} />
          <span>Refresh All</span>
        </button>
      </div>

      {/* Add New Account Form */}
      <form onSubmit={handleAddAccount} className="checker-add-form">
        <div>
          <input 
            type="text" 
            className="form-input"
            placeholder="Stellar Public Key (starts with G...)"
            value={inputAddress}
            onChange={(e) => setInputAddress(e.target.value)}
            style={{ padding: "10px 14px" }}
          />
        </div>
        <div>
          <input 
            type="text" 
            className="form-input"
            placeholder="Account Label (e.g. My Ledger)"
            value={inputLabel}
            onChange={(e) => setInputLabel(e.target.value)}
            style={{ padding: "10px 14px" }}
          />
        </div>
        <div>
          <button type="submit" className="btn-primary" style={{ padding: "10px 20px" }}>
            <Plus size={16} />
            <span>Add Account</span>
          </button>
        </div>
        {validationError && <div className="error-text" style={{ width: "100%", margin: "4px 0 0" }}>{validationError}</div>}
      </form>

      {/* Accounts List */}
      {accounts.length === 0 ? (
        <div className="flex-center" style={{ padding: "40px 20px", flexDirection: "column", gap: "12px", opacity: 0.6 }}>
          <Info size={32} />
          <p>No watched accounts. Add a Stellar public address above to start tracking balances.</p>
        </div>
      ) : (
        <div className="checker-accounts-list">
          {accounts.map((acc, index) => (
            <div 
              key={acc.address}
              className="checker-account-card glass-card interactive"
              style={{ 
                borderColor: acc.isLoading ? "rgba(59, 130, 246, 0.3)" : undefined
              }}
            >
              {/* Account Label & Address */}
              <div className="account-card-info">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{acc.label}</span>
                  <span 
                    className={`status-dot ${acc.isLoading ? "inactive" : acc.error ? "inactive" : acc.isFunded ? "active" : "inactive"}`}
                    title={acc.isLoading ? "Loading..." : acc.error ? acc.error : acc.isFunded ? "Active / Funded" : "Unfunded Account"}
                  />
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {acc.isLoading ? "loading..." : acc.error ? "offline" : acc.isFunded ? "active" : "inactive"}
                  </span>
                </div>
                
                {/* Truncated address & Copy button */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                    {truncateAddress(acc.address)}
                  </span>
                  <button 
                    onClick={() => copyAddress(acc.address, index)} 
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", display: "flex", alignItems: "center" }}
                    title="Copy Address"
                  >
                    {copiedIndex === index ? (
                      <Check size={14} color="var(--color-success)" />
                    ) : (
                      <Copy size={14} className="btn-icon" style={{ width: "24px", height: "24px" }} />
                    )}
                  </button>
                </div>
              </div>

              {/* Balance display */}
              <div className="account-card-balance-actions">
                <div style={{ textAlign: "right" }}>
                  {acc.isLoading ? (
                    <div className="spinner spinner-sm" style={{ margin: "4px auto" }} />
                  ) : acc.error ? (
                    <span style={{ fontSize: "0.85rem", color: "var(--color-error)" }}>{acc.error}</span>
                  ) : (
                    <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                      <span style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)" }}>
                        {parseFloat(acc.balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 7 })}
                      </span>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-secondary)" }}>XLM</span>
                    </div>
                  )}
                </div>

                {/* Delete button */}
                <button 
                  className="btn-icon" 
                  onClick={() => handleDelete(acc.address)}
                  style={{ color: "var(--color-error)" }}
                  title="Remove Account"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
