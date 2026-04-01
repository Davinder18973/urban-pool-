import { useState } from "react";
import { useNavigate } from "react-router-dom";
import LocationInput from "../../common/LocationInput/LocationInput";
import "./RideSearchCard.css";

function RideSearchCard() {
  const navigate = useNavigate();

  const [mode, setMode] = useState("normal"); // normal, carpool
  const [carpoolAction, setCarpoolAction] = useState("find"); // find, offer
  const [pickup, setPickup] = useState("");
  const [drop, setDrop] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [seats, setSeats] = useState(1);
  const [price, setPrice] = useState("");
  const [success, setSuccess] = useState(false);
  
  // Enforce today's date only (other dates require 'Reserve' feature)
  const today = new Date().toISOString().split("T")[0];

  const handleSearch = () => {
    if (!pickup || !drop || !date || !time) {
      alert("Please fill all fields");
      return;
    }

    if (mode === "normal") {
      navigate("/results", {
        state: { pickup, drop, date, time },
      });
    } else {
      if (carpoolAction === "find") {
        navigate("/carpool/search", {
          state: { pickup, drop, date, time },
        });
      } else {
        // Post Ride Logic
        if (!seats || !price) {
          alert("Please specify seats and price");
          return;
        }
        
        // Simulate API call
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          navigate("/carpool/offer");
        }, 1500);
        
        // Reset fields
        setPickup("");
        setDrop("");
        setPrice("");
      }
    }
  };

  return (
    <div className="search-card">
      <div className="mode-tabs">
        <button 
          className={mode === "normal" ? "active" : ""} 
          onClick={() => setMode("normal")}
        >
          Ride
        </button>
        <button 
          className={mode === "carpool" ? "active" : ""} 
          onClick={() => setMode("carpool")}
        >
          Carpool
        </button>
      </div>

      {mode === "carpool" && (
        <div className="sub-tabs">
          <button 
            className={carpoolAction === "find" ? "active" : ""} 
            onClick={() => setCarpoolAction("find")}
          >
            Find a Ride
          </button>
          <button 
            className={carpoolAction === "offer" ? "active" : ""} 
            onClick={() => setCarpoolAction("offer")}
          >
            Offer a Ride
          </button>
        </div>
      )}

      <h2>{mode === "normal" ? "Request a ride" : carpoolAction === "find" ? "Find a carpool" : "Offer a carpool"}</h2>
      <p>
        {mode === "normal" 
          ? "Share rides, save money, and commute smarter with UrbanPool." 
          : "Join the largest community of trusted carpoolers."}
      </p>

      <LocationInput
        placeholder="Pickup location"
        value={pickup}
        onChange={(val) => setPickup(val)}
      />

      <LocationInput
        placeholder="Dropoff location"
        value={drop}
        onChange={(val) => setDrop(val)}
      />

      <div className="row">
        <input
          type="date"
          min={today}
          max={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
      </div>

      {mode === "carpool" && carpoolAction === "offer" && (
        <div className="row">
          <input
            type="number"
            placeholder="Available Seats"
            value={seats}
            onChange={(e) => setSeats(e.target.value)}
            min="1"
          />
          <input
            type="number"
            placeholder="Price per Seat"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min="0"
          />
        </div>
      )}

      {success && (
        <div className="success-msg">
          🎉 Ride posted successfully! Others can now find it.
        </div>
      )}

      <button className="primary-btn" onClick={handleSearch}>
        {mode === "normal" ? "See prices" : carpoolAction === "find" ? "Search Rides" : "Post Ride"}
      </button>
    </div>
  );
}

export default RideSearchCard;