import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LocationInput from "../../components/common/LocationInput/LocationInput";
import "./CourierBooking.css";

function CourierBooking() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, addNotification, addRide } = useAuth();

  // If navigated from Package Classes, state will contain pre-filled data
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [packageNotes, setPackageNotes] = useState("");
  const [pkgType, setPkgType] = useState(state?.pkgType || "documents"); // documents, smallbox, largeparcel
  
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Base pricing logic for courier
  const getPrice = () => {
    if (!pickup || !drop) return null;
    let base = 50; // default for documents
    if (pkgType === "smallbox") base = 120;
    if (pkgType === "largeparcel") base = 250;
    return base;
  };

  const currentPrice = getPrice();

  useEffect(() => {
    const fetchWallet = async () => {
      try {
        const userId = user?.userId || user?.uid || "mock_user_1";
        const res = await fetch(`http://localhost:5001/api/wallet/${userId}`);
        const data = await res.json();
        setWalletBalance(data.balance || 0);
      } catch (err) {}
    };
    if (user) fetchWallet();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!pickup || !drop || !receiverName || !receiverPhone) {
      setError("Please fill in all location and receiver contact fields.");
      return;
    }

    if (paymentMethod === "wallet" && walletBalance < currentPrice) {
      setError("Insufficient Wallet balance to book this delivery.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        userId: user?.userId || user?.uid || "mock_user_1",
        pickup,
        drop,
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric" }),
        price: currentPrice,
        rideType: `Courier (${pkgType})`,
        paymentMethod,
        message: `Receiver: ${receiverName} (${receiverPhone}). Notes: ${packageNotes}`,
        status: "Confirmed"
      };

      const res = await fetch("http://localhost:5001/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (res.ok) {
        addNotification({
          type: "success",
          title: "Courier Booked! 📦",
          message: `Your ${pkgType} delivery is scheduled for pickup.`
        });

        addRide({
          id: result.id || `cr_${Date.now()}`,
          date: payload.date,
          time: payload.time,
          from: pickup,
          to: drop,
          price: currentPrice,
          type: `Courier - ${pkgType}`,
          status: "Confirmed"
        });

        navigate("/");
      } else {
        setError(result.error || "Failed to make reservation.");
      }
    } catch (err) {
      setError("Network or server error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="courier-page">
      <div className="courier-header">
        <h1>Send a Package</h1>
        <p>Fast, reliable, and secure same-day delivery across the city.</p>
      </div>

      <form className="courier-form" onSubmit={handleSubmit}>
        
        {/* Logistics Basics */}
        <div className="courier-section">
          <h3>Delivery Details</h3>

          <div className="courier-row">
            <div className="courier-col">
              <label>Pickup From</label>
              <LocationInput value={pickup} onChange={setPickup} placeholder="Your pickup address" />
            </div>
          </div>
          <div className="courier-row">
            <div className="courier-col">
              <label>Deliver To</label>
              <LocationInput value={drop} onChange={setDrop} placeholder="Receiver's address" />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="courier-section">
          <h3>Receiver Information</h3>
          <div className="courier-row">
            <div className="courier-col">
              <label>Receiver Name</label>
              <input type="text" className="courier-input" placeholder="e.g. Rahul Sharma" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} />
            </div>
            <div className="courier-col">
              <label>Receiver Phone Number</label>
              <input type="tel" className="courier-input" placeholder="+91 xxxxxxxxxx" value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} />
            </div>
          </div>
          <div className="courier-row">
            <div className="courier-col">
              <label>Special Instructions (Optional)</label>
              <input type="text" className="courier-input" placeholder="e.g., Leave at reception, Call upon arriving" value={packageNotes} onChange={(e) => setPackageNotes(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Package Tier */}
        <div className="courier-section">
          <h3>Package Size</h3>
          <div className="pkg-options">
            <div className={`pkg-card ${pkgType === "documents" ? "selected" : ""}`} onClick={() => setPkgType("documents")}>
              <div className="pkg-icon">📄</div>
              <div className="pkg-name">Documents</div>
              <div className="pkg-price">Up to 1 kg · ₹50 base</div>
            </div>
            <div className={`pkg-card ${pkgType === "smallbox" ? "selected" : ""}`} onClick={() => setPkgType("smallbox")}>
              <div className="pkg-icon">📦</div>
              <div className="pkg-name">Small Box</div>
              <div className="pkg-price">Up to 5 kg · ₹120 base</div>
            </div>
            <div className={`pkg-card ${pkgType === "largeparcel" ? "selected" : ""}`} onClick={() => setPkgType("largeparcel")}>
              <div className="pkg-icon">🛋️</div>
              <div className="pkg-name">Large Parcel</div>
              <div className="pkg-price">Up to 15 kg · ₹250 base</div>
            </div>
          </div>
        </div>

        {/* Payment Configuration */}
        <div className="courier-section">
          <h3>Payment Method</h3>
          <div className="bk-pay-options" style={{ marginBottom: "16px" }}>
            <label className={`bk-pay-option ${paymentMethod === "wallet" ? "bk-pay-selected" : ""}`}>
              <input type="radio" checked={paymentMethod === "wallet"} onChange={() => setPaymentMethod("wallet")} /> UrbanPool Wallet
            </label>
            <label className={`bk-pay-option ${paymentMethod === "cash" ? "bk-pay-selected" : ""}`}>
              <input type="radio" checked={paymentMethod === "cash"} onChange={() => setPaymentMethod("cash")} /> Cash
            </label>
            <label className={`bk-pay-option ${paymentMethod === "upi" ? "bk-pay-selected" : ""}`}>
              <input type="radio" checked={paymentMethod === "upi"} onChange={() => setPaymentMethod("upi")} /> UPI
            </label>
          </div>

          {paymentMethod === "wallet" && (
            <div style={{ background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", fontWeight: "600" }}>
                <span>Wallet Balance:</span>
                <span style={{ color: walletBalance >= (currentPrice || 0) ? "#10b981" : "#ef4444" }}>₹{walletBalance.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Summary & Checkout */}
        <div className="courier-total">
          <span>Estimated Total</span>
          <strong>{currentPrice ? `₹${currentPrice}` : "Enter locations..."}</strong>
        </div>

        {error && <div style={{ color: "#ef4444", marginBottom: "16px", textAlign: "center", fontSize: "14px", fontWeight: "500" }}>{error}</div>}

        <button type="submit" className="courier-submit" disabled={loading}>
          {loading ? "Processing..." : "Confirm Delivery"}
        </button>
      </form>
    </div>
  );
}

export default CourierBooking;
