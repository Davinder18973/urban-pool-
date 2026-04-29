import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import LocationInput from "../../components/common/LocationInput/LocationInput";
import "./IntercityBooking.css";

function IntercityBooking() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user, addNotification, addRide } = useAuth();

  // If navigated from Popular Routes, state will contain pre-filled data
  const [pickup, setPickup] = useState(state?.pickup || "");
  const [drop, setDrop] = useState(state?.drop || "");
  
  const [tripType, setTripType] = useState("oneway"); // oneway, roundtrip
  const [date, setDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [time, setTime] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [vehicleClass, setVehicleClass] = useState("sedan"); // sedan, suv
  
  const [paymentMethod, setPaymentMethod] = useState("wallet");
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  // Base pricing logic (simulated outstation logic)
  const getPrice = () => {
    if (!pickup || !drop) return null;
    // If state passed a pre-calculated outstation price, use it as base!
    let base = state?.price || 1500; 
    
    // Multipliers
    if (vehicleClass === "suv") base = base * 1.5;
    if (tripType === "roundtrip") base = base * 2;
    // Add passenger premium (e.g., 50rs per extra passenger above 1)
    if (passengers > 1) base += ((passengers - 1) * 50);

    return Math.round(base);
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
    
    if (tripType === "roundtrip" && !returnDate) {
      setError("Please specify a return date for round trips.");
      return;
    }

    if (paymentMethod === "wallet" && walletBalance < currentPrice) {
      setError("Insufficient Wallet balance to book this outstation trip.");
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
        rideType: `Intercity (${tripType})`,
        paymentMethod,
        message: `Passengers: ${passengers}. Return: ${returnDate || 'N/A'}`,
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
          title: "Intercity Booked! 🛣️",
          message: `Your ${vehicleClass} is scheduled to ${drop} on ${date}.`
        });

        addRide({
          id: result.id || `ic_${Date.now()}`,
          date,
          time,
          from: pickup,
          to: drop,
          price: currentPrice,
          type: `Intercity - ${vehicleClass}`,
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
    <div className="intercity-page">
      <div className="intercity-header">
        <h1>Book an Outstation Trip</h1>
        <p>Premium intercity transfers across India with trusted chauffeurs.</p>
      </div>

      <form className="intercity-form" onSubmit={handleSubmit}>
        
        {/* Route Details */}
        <div className="intercity-section">
          <h3>Your Journey</h3>
          
          <div className="trip-type-toggle">
            <button 
              type="button" 
              className={`trip-type-btn ${tripType === "oneway" ? "active" : ""}`}
              onClick={() => setTripType("oneway")}
            >One Way</button>
            <button 
              type="button" 
              className={`trip-type-btn ${tripType === "roundtrip" ? "active" : ""}`}
              onClick={() => setTripType("roundtrip")}
            >Round Trip</button>
          </div>

          <div className="intercity-row">
            <div className="intercity-col">
              <label>From</label>
              <LocationInput value={pickup} onChange={setPickup} placeholder="Starting city" />
            </div>
          </div>
          <div className="intercity-row">
            <div className="intercity-col">
              <label>To</label>
              <LocationInput value={drop} onChange={setDrop} placeholder="Destination city" />
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="intercity-section">
          <h3>Schedule</h3>
          <div className="intercity-row">
            <div className="intercity-col">
              <label>Departure Date</label>
              <input type="date" className="intercity-input" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
            </div>
            {tripType === "roundtrip" && (
              <div className="intercity-col">
                <label>Return Date</label>
                <input type="date" className="intercity-input" value={returnDate} min={date || today} onChange={(e) => setReturnDate(e.target.value)} />
              </div>
            )}
            <div className="intercity-col">
              <label>Departure Time</label>
              <input type="time" className="intercity-input" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Vehicle Class & Passengers */}
        <div className="intercity-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
             <h3 style={{ margin: 0 }}>Vehicle Option</h3>
             <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
               <label style={{ fontSize: "14px", fontWeight: "600", color: "#4b5563" }}>Passengers:</label>
               <input type="number" min="1" max={vehicleClass === "suv" ? "6" : "4"} 
                 className="intercity-input" 
                 style={{ width: "60px", padding: "6px" }} 
                 value={passengers} 
                 onChange={(e) => setPassengers(Number(e.target.value))} />
             </div>
          </div>
          
          <div className="vehicle-options">
            <div className={`vehicle-card ${vehicleClass === "sedan" ? "selected" : ""}`} onClick={() => { setVehicleClass("sedan"); if (passengers > 4) setPassengers(4); }}>
              <div className="vehicle-icon">🚘</div>
              <div className="vehicle-name">Sedan (AC)</div>
              <div className="vehicle-price">Comfort for up to 4</div>
            </div>
            <div className={`vehicle-card ${vehicleClass === "suv" ? "selected" : ""}`} onClick={() => setVehicleClass("suv")}>
              <div className="vehicle-icon">🚙</div>
              <div className="vehicle-name">Premium SUV</div>
              <div className="vehicle-price">Extra luggage, up to 6</div>
            </div>
          </div>
        </div>

        {/* Payment Configuration */}
        <div className="intercity-section">
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
        <div className="intercity-total">
          <span>Estimated Total</span>
          <strong>{currentPrice ? `₹${currentPrice.toLocaleString("en-IN")}` : "Enter locations..."}</strong>
        </div>

        {error && <div style={{ color: "#ef4444", marginBottom: "16px", textAlign: "center", fontSize: "14px", fontWeight: "500" }}>{error}</div>}

        <button type="submit" className="intercity-submit" disabled={loading}>
          {loading ? "Processing..." : "Confirm Intercity Trip"}
        </button>
      </form>
    </div>
  );
}

export default IntercityBooking;
