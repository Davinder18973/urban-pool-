import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LocationInput from "../../components/common/LocationInput/LocationInput";
import "./ReserveBooking.css";

function ReserveBooking() {
  const navigate = useNavigate();
  const { user, addNotification, addRide } = useAuth();

  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [driverMessage, setDriverMessage] = useState("");
  const [vehicleClass, setVehicleClass] = useState("economy");
  
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Base pricing logic (simulated)
  const getPrice = () => {
    if (!pickup || !drop) return null;
    let base = 300;
    if (vehicleClass === "premium") base = 500;
    if (vehicleClass === "suv") base = 750;
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

    if (!pickup || !drop || !date || !time) {
      setError("Please fill in all location and time fields.");
      return;
    }

    if (paymentMethod === "wallet" && walletBalance < currentPrice) {
      setError("Insufficient Wallet balance to reserve this ride.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        userId: user?.userId || user?.uid || "mock_user_1",
        pickup,
        drop,
        date,
        time,
        price: currentPrice,
        rideType: `Reserve (${vehicleClass.toUpperCase()})`,
        paymentMethod,
        message: driverMessage, // Can be stored if backend model updated, otherwise ignored implicitly by Sequelize
        status: "Reserved"
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
          title: "Reservation Confirmed! 📅",
          message: `Your ${vehicleClass} is reserved for ${date} at ${time}.`
        });

        addRide({
          id: result.id || `res_${Date.now()}`,
          date,
          time,
          from: pickup,
          to: drop,
          price: currentPrice,
          type: `Reserve - ${vehicleClass}`,
          status: "Upcoming"
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

  // Enforce min date to tomorrow to fit "Reserve" concept logically
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateConfig = tomorrow.toISOString().split("T")[0];

  return (
    <div className="reserve-page">
      <div className="reserve-header">
        <h1>Schedule your ride in advance</h1>
        <p>Book up to 30 days ahead with guaranteed flat-rate pricing.</p>
      </div>

      <form className="reserve-form" onSubmit={handleSubmit}>
        
        {/* Route Details */}
        <div className="reserve-section">
          <h3>Route Details</h3>
          <div className="reserve-row">
            <div className="reserve-col">
              <label>Pickup Location</label>
              <LocationInput value={pickup} onChange={setPickup} placeholder="Enter pickup" />
            </div>
          </div>
          <div className="reserve-row">
            <div className="reserve-col">
              <label>Dropoff Location</label>
              <LocationInput value={drop} onChange={setDrop} placeholder="Enter destination" />
            </div>
          </div>
        </div>

        {/* Schedule & Notes */}
        <div className="reserve-section">
          <h3>Schedule & Instructions</h3>
          <div className="reserve-row">
            <div className="reserve-col">
              <label>Pickup Date</label>
              <input type="date" className="reserve-input" value={date} min={minDateConfig} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="reserve-col">
              <label>Pickup Time</label>
              <input type="time" className="reserve-input" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="reserve-row">
            <div className="reserve-col">
              <label>Message for Driver (Optional)</label>
              <textarea 
                className="reserve-input" 
                placeholder="E.g., I have two large suitcases. Please call upon arrival." 
                value={driverMessage}
                onChange={(e) => setDriverMessage(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Vehicle Class */}
        <div className="reserve-section">
          <h3>Vehicle Class</h3>
          <div className="vehicle-options">
            <div className={`vehicle-card ${vehicleClass === "economy" ? "selected" : ""}`} onClick={() => setVehicleClass("economy")}>
              <div className="vehicle-icon">🚗</div>
              <div className="vehicle-name">Economy</div>
              <div className="vehicle-price">₹300</div>
            </div>
            <div className={`vehicle-card ${vehicleClass === "premium" ? "selected" : ""}`} onClick={() => setVehicleClass("premium")}>
              <div className="vehicle-icon">🚘</div>
              <div className="vehicle-name">Premium</div>
              <div className="vehicle-price">₹500</div>
            </div>
            <div className={`vehicle-card ${vehicleClass === "suv" ? "selected" : ""}`} onClick={() => setVehicleClass("suv")}>
              <div className="vehicle-icon">🚙</div>
              <div className="vehicle-name">SUV (6 Seats)</div>
              <div className="vehicle-price">₹750</div>
            </div>
          </div>
        </div>

        {/* Payment Configuration */}
        <div className="reserve-section">
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
        <div className="reserve-total">
          <span>Estimated Total</span>
          <strong>{currentPrice ? `₹${currentPrice}` : "Enter locations..."}</strong>
        </div>

        {error && <div style={{ color: "#ef4444", marginBottom: "16px", textAlign: "center", fontSize: "14px", fontWeight: "500" }}>{error}</div>}

        <button type="submit" className="reserve-submit" disabled={loading}>
          {loading ? "Processing..." : "Confirm Reservation"}
        </button>
      </form>
    </div>
  );
}

export default ReserveBooking;
