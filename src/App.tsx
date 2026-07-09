import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { Dashboard } from "./components/Dashboard";
import { PaymentForm } from "./components/PaymentForm";
import { BalanceChecker } from "./components/BalanceChecker";
import { TransactionHistory } from "./components/TransactionHistory";
import { Wallet, ArrowLeftRight, Coins, History, X } from "lucide-react";
import { stellarService } from "./services/stellar";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>("0.0000000");
  const [isFunded, setIsFunded] = useState<boolean>(false);
  const [network, setNetwork] = useState<string>("UNKNOWN");
  
  // Loading states
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [faucetLoading, setFaucetLoading] = useState<boolean>(false);

  // Custom Toast State
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: "success" | "error" | "info" = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove after 4.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Check storage and auto-connect on load if allowed
  useEffect(() => {
    const wasConnected = localStorage.getItem("stellar_wallet_connected") === "true";
    if (wasConnected) {
      autoConnect();
    }
  }, []);

  const autoConnect = async () => {
    try {
      setIsConnecting(true);
      const installed = await stellarService.isFreighterInstalled();
      if (installed) {
        const addr = await stellarService.connect();
        setAddress(addr);
        
        // Fetch network details
        const net = await stellarService.getNetwork();
        setNetwork(net);

        // Fetch balance details
        const details = await stellarService.fetchAccountDetails(addr);
        setBalance(details.balance);
        setIsFunded(details.isFunded);
      }
    } catch (err) {
      console.error("Auto-connect failed:", err);
      localStorage.removeItem("stellar_wallet_connected");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const addr = await stellarService.connect();
      setAddress(addr);
      localStorage.setItem("stellar_wallet_connected", "true");
      showToast("Freighter wallet connected successfully!", "success");

      // Fetch network details
      const net = await stellarService.getNetwork();
      setNetwork(net);

      // Fetch balance details
      const details = await stellarService.fetchAccountDetails(addr);
      setBalance(details.balance);
      setIsFunded(details.isFunded);
    } catch (err: any) {
      showToast(err?.message || "Failed to connect Freighter wallet.", "error");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setAddress(null);
    setBalance("0.0000000");
    setIsFunded(false);
    setNetwork("UNKNOWN");
    localStorage.removeItem("stellar_wallet_connected");
    showToast("Wallet disconnected.", "info");
    setActiveTab("dashboard");
  };

  const handleRequestFaucet = async () => {
    if (!address) return;
    setFaucetLoading(true);
    try {
      showToast("Requesting testnet XLM from Friendbot...", "info");
      await stellarService.requestTestnetFaucet(address);
      showToast("Successfully received 10,000 testnet XLM!", "success");
      
      // Update account details
      const details = await stellarService.fetchAccountDetails(address);
      setBalance(details.balance);
      setIsFunded(details.isFunded);
    } catch (err: any) {
      showToast(err?.message || "Faucet request failed. Try again shortly.", "error");
    } finally {
      setFaucetLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    // Refresh balance after successful payment
    if (address) {
      const details = await stellarService.fetchAccountDetails(address);
      setBalance(details.balance);
      setIsFunded(details.isFunded);
    }
  };

  return (
    <div className="app-container">
      {/* Top Header / Navbar */}
      <Header
        address={address}
        network={network}
        isConnecting={isConnecting}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        showToast={showToast}
      />

      {/* Main Tabs Navigation */}
      {address && (
        <nav className="tabs-nav animate-fade-in">
          <button 
            className={`tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            <Wallet size={16} />
            <span>Overview</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === "send" ? "active" : ""}`}
            onClick={() => setActiveTab("send")}
          >
            <ArrowLeftRight size={16} />
            <span>Send XLM</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === "checker" ? "active" : ""}`}
            onClick={() => setActiveTab("checker")}
          >
            <Coins size={16} />
            <span>Balance Checker</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === "history" ? "active" : ""}`}
            onClick={() => setActiveTab("history")}
          >
            <History size={16} />
            <span>History</span>
          </button>
        </nav>
      )}

      {/* Main Content Area */}
      <main style={{ flex: 1 }}>
        {activeTab === "dashboard" && (
          <Dashboard
            address={address}
            balance={balance}
            isFunded={isFunded}
            faucetLoading={faucetLoading}
            onRequestFaucet={handleRequestFaucet}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === "send" && (
          <PaymentForm
            senderAddress={address}
            balance={balance}
            isFunded={isFunded}
            onPaymentSuccess={handlePaymentSuccess}
            showToast={showToast}
          />
        )}

        {activeTab === "checker" && <BalanceChecker />}

        {activeTab === "history" && (
          <TransactionHistory 
            address={address} 
            showToast={showToast} 
          />
        )}
      </main>

      {/* Footer Info */}
      <footer className="app-footer">
        <p>Stellar Link is a testnet payment demonstration. Never send mainnet assets here.</p>
        <p style={{ marginTop: "4px" }}>Powered by Freighter Wallet & Stellar Horizon API</p>
      </footer>

      {/* Toast Notification Stack */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <span className="toast-message">{toast.message}</span>
            <button className="toast-close" onClick={() => removeToast(toast.id)}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
