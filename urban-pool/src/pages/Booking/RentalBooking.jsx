import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LocationInput from "../../components/common/LocationInput/LocationInput";
import "./RentalBooking.css";

function RentalBooking() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, addNotification, addRide } = useAuth();

  const [pickup, setPickup] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  
  const [hours, setHours] = useState(2); // 2, 4, 8, 12
  const [vehicleClass, setVehicleClass] = useState(state?.vehicleType || "hatchback"); // hatchback, sedan, suv
  
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  // Pricing calculation
  const getPrice = () => {
    if (!pickup) return null;
    let hourlyRate = 249; // hatchback
    if (vehicleClass === "sedan") hourlyRate = 399;
    if (vehicleClass === "suv") hourlyRate = 599;
    return hourlyRate * hours;
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

    if (!pickup || !date || !time) {
      setError("Please fill in the pickup location, date, and time.");
      return;
    }

    if (paymentMethod === "wallet" && walletBalance < currentPrice) {
      setError("Insufficient Wallet balance to book this rental.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        userId: user?.userId || user?.uid || "mock_user_1",
        pickup,
        drop: "Hourly Rental (Multi-stop)", 
        date,
        time,
        price: currentPrice,
        rideType: `Rental - ${hours} Hrs (${vehicleClass})`,
        paymentMethod,
        message: `Hourly Car Rental (${hours} Hours).`,
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
          title: "Rental Booked! ⏱️",
          message: `Your ${vehicleClass} is reserved for ${hours} hours starting ${date} at ${time}.`
        });

        addRide({
          id: result.id || `rn_${Date.now()}`,
          date,
          time,
          from: pickup,
          to: "Hourly Multi-stop",
          price: currentPrice,
          type: `Rental (${hours}H) - ${vehicleClass}`,
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
    <div className="rental-page">
      <div className="rental-header">
        <h1>Book an Hourly Rental</h1>
        <p>Keep a car and professional driver with you for the whole day.</p>
      </div>

      <form className="rental-form" onSubmit={handleSubmit}>
        
        {/* Logistics Basics */}
        <div className="rental-section">
          <h3>Starting Point & Time</h3>

          <div className="rental-row">
            <div className="rental-col">
              <label>Pickup Location</label>
              <LocationInput value={pickup} onChange={setPickup} placeholder="Where should the driver meet you?" />
            </div>
          </div>
          
          <div className="rental-row">
            <div className="rental-col">
              <label>Date</label>
              <input type="date" className="rental-input" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="rental-col">
              <label>Time</label>
              <input type="time" className="rental-input" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Hours Package */}
        <div className="rental-section">
          <h3>Rental Package</h3>
          <div className="hr-options">
            {[2, 4, 8, 12].map(h => (
              <div 
                key={h} 
                className={`hr-card ${hours === h ? "selected" : ""}`} 
                onClick={() => setHours(h)}
              >
                <div className="hr-val">{h} Hrs</div>
                <div className="hr-label">{h * 10} km limit</div>
              </div>
            ))}
          </div>
        </div>

        {/* Vehicle Class */}
        <div className="rental-section">
          <h3>Choose Vehicle</h3>
          <div className="v-options">
            <div className={`v-card ${vehicleClass === "hatchback" ? "selected" : ""}`} onClick={() => setVehicleClass("hatchback")}>
              <div className="v-icon">🚗</div>
              <div className="v-name">Hatchback</div>
              <div className="v-price">₹249/hr</div>
            </div>
            <div className={`v-card ${vehicleClass === "sedan" ? "selected" : ""}`} onClick={() => setVehicleClass("sedan")}>
              <div className="v-icon">🚘</div>
              <div className="v-name">Sedan</div>
              <div className="v-price">₹399/hr</div>
            </div>
            <div className={`v-card ${vehicleClass === "suv" ? "selected" : ""}`} onClick={() => setVehicleClass("suv")}>
              <div className="v-icon">🚙</div>
              <div className="v-name">Premium SUV</div>
              <div className="v-price">₹599/hr</div>
            </div>
          </div>
        </div>

        {/* Payment Configuration */}
        <div className="rental-section">
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
        <div className="rental-total">
          <span>Estimated Total</span>
          <strong>{currentPrice ? `₹${currentPrice.toLocaleString("en-IN")}` : "Enter locations..."}</strong>
        </div>

        {error && <div style={{ color: "#ef4444", marginBottom: "16px", textAlign: "center", fontSize: "14px", fontWeight: "500" }}>{error}</div>}

        <button type="submit" className="rental-submit" disabled={loading}>
          {loading ? "Processing..." : "Confirm Rental"}
        </button>
      </form>
    </div>
  );
}

export default RentalBooking;
