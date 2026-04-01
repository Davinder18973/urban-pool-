import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './Wallet.css';

export default function Wallet() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [promoCode, setPromoCode] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchWallet = async () => {
    try {
      const userId = user?.userId || user?.uid || "mock_user_1";
      const res = await fetch(`http://localhost:5001/api/wallet/${userId}`);
      const data = await res.json();
      setBalance(data.balance || 0);
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    try {
      const userId = user?.userId || user?.uid || "mock_user_1";
      const res = await fetch(`http://localhost:5001/api/wallet/promo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code: promoCode })
      });
      const data = await res.json();
      if (res.ok) {
        setPromoCode("");
        fetchWallet();
        alert(`Success! ₹${data.transaction.amount} added to your wallet.`);
      } else {
        alert(data.error || "Failed to apply promo");
      }
    } catch (err) {
      alert("Network error");
    }
  };

  return (
    <div className="wallet-container">
      <div className="balance-card">
        <div className="balance-info">
          <label>Available Balance</label>
          <h1>₹{balance.toFixed(2)}</h1>
        </div>
        <div className="promo-input-group" style={{display: 'flex', gap: '8px', marginTop: '16px'}}>
          <input 
            type="text" 
            placeholder="Enter promo code" 
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            style={{flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', textTransform: 'uppercase'}}
          />
          <button 
            className="add-money-btn" 
            onClick={handleApplyPromo}
            style={{padding: '10px 16px', background: '#000', color: '#fff'}}
          >
            Apply
          </button>
        </div>
      </div>

      <div className="wallet-stats">
        <div className="stat-item">
          <span className="stat-label">Spent this month</span>
          <span className="stat-value">₹285</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Cashback earned</span>
          <span className="stat-value bonus">₹50</span>
        </div>
      </div>

      <div className="history-section">
        <h2>Transaction History</h2>
        <div className="transaction-list">
          {loading ? <p style={{padding: '20px', textAlign: 'center'}}>Loading ledger...</p> : transactions.length === 0 ? <p style={{padding: '20px', textAlign: 'center'}}>No transactions yet.</p> : transactions.map(tx => (
            <div key={tx.id} className="transaction-item">
              <div className={`tx-icon ${tx.type}`}>
                {tx.type === 'addition' ? '↓' : tx.type === 'bonus' ? '★' : '↑'}
              </div>
              <div className="tx-details">
                <p className="tx-desc">{tx.description}</p>
                <p className="tx-date">{new Date(tx.createdAt).toLocaleDateString()}</p>
              </div>
              <div className={`tx-amount ${tx.type}`}>
                {tx.type === 'addition' || tx.type === 'bonus' ? '+' : '-'} ₹{tx.amount}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="referral-banner">
        <div className="banner-content">
          <h3>Refer & Earn</h3>
          <p>Get ₹100 for every friend who takes their first ride!</p>
        </div>
        <button className="invite-btn">Invite Friends</button>
      </div>
    </div>
  );
}
