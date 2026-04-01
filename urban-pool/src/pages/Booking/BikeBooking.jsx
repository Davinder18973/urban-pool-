import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LocationInput from "../../components/common/LocationInput/LocationInput";
import "./BikeBooking.css";

function BikeBooking() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, addNotification, addRide } = useAuth();

  // If navigated from Quick Book on the Bike service page, state contains pre-filled data
  const [pickup, setPickup] = useState(state?.pickup || "");
  const [drop, setDrop] = useState(state?.drop || "");
  
  const [bikeType, setBikeType] = useState("standard"); // standard, ev
  
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Base pricing logic for bikes
  const getPrice = () => {
    if (!pickup || !drop) return null;
    let base = 49; // standard moto
    if (bikeType === "ev") base = 39; // EV scooter is slightly cheaper
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

    if (!pickup || !drop) {
      setError("Please fill in both pickup and drop-off locations.");
      return;
    }

    if (paymentMethod === "wallet" && walletBalance < currentPrice) {
      setError("Insufficient Wallet balance to book this ride.");
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
        rideType: `Bike (${bikeType === "standard" ? "Moto" : "EV Scooter"})`,
        paymentMethod,
        message: "Bike ride.",
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
          title: "Bike Booked! 🛵",
          message: `Your ${bikeType === "standard" ? "Standard Moto" : "Electric Scooter"} rider is on the way.`
        });

        addRide({
          id: result.id || `bk_${Date.now()}`,
          date: payload.date,
          time: payload.time,
          from: pickup,
          to: drop,
          price: currentPrice,
          type: `Bike - ${bikeType === "standard" ? "Moto" : "EV"}`,
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
    <div className="bike-page">
      <div className="bike-header">
        <h1>Book a Bike Ride</h1>
        <p>The fastest way to beat the city traffic.</p>
      </div>

      <form className="bike-form" onSubmit={handleSubmit}>
        
        {/* Logistics Basics */}
        <div className="bike-section">
          <h3>Where are you riding?</h3>

          <div className="bike-row">
            <div className="bike-col">
              <label>Pickup Location</label>
              <LocationInput value={pickup} onChange={setPickup} placeholder="Enter your current location" />
            </div>
          </div>
          <div className="bike-row">
            <div className="bike-col">
              <label>Destination</label>
              <LocationInput value={drop} onChange={setDrop} placeholder="Where to?" />
            </div>
          </div>
        </div>

        {/* Vehicle Class */}
        <div className="bike-section">
          <h3>Choose 2-Wheeler</h3>
          <div className="bike-options">
            <div className={`bike-card ${bikeType === "standard" ? "selected" : ""}`} onClick={() => setBikeType("standard")}>
              <div className="bike-icon">🏍️</div>
              <div className="bike-name">Standard Moto</div>
              <div className="bike-price">Fast & Reliable · ₹49 base</div>
            </div>
            <div className={`bike-card ${bikeType === "ev" ? "selected" : ""}`} onClick={() => setBikeType("ev")}>
              <div className="bike-icon">🛵</div>
              <div className="bike-name">EV Scooter</div>
              <div className="bike-price">Eco-Friendly · ₹39 base</div>
            </div>
          </div>
        </div>

        {/* Payment Configuration */}
        <div className="bike-section">
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
        <div className="bike-total">
          <span>Estimated Total</span>
          <strong>{currentPrice ? `₹${currentPrice}` : "Enter locations..."}</strong>
        </div>

        {error && <div style={{ color: "#ef4444", marginBottom: "16px", textAlign: "center", fontSize: "14px", fontWeight: "500" }}>{error}</div>}

        <button type="submit" className="bike-submit" disabled={loading}>
          {loading ? "Processing..." : "Confirm Bike Ride"}
        </button>
      </form>
    </div>
  );
}

export default BikeBooking;
