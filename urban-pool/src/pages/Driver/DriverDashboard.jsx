import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { MapPin } from "lucide-react";

export default function DriverDashboard() {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch pending requests when online
  useEffect(() => {
    let interval;
    if (isOnline) {
      fetchRequests();
      interval = setInterval(fetchRequests, 5000); // Poll every 5 seconds
    } else {
      setRequests([]);
    }
    return () => clearInterval(interval);
  }, [isOnline]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5001/api/driver/requests");
      const data = await res.json();
      setRequests(data);
    } catch (err) {
      console.error("Error fetching requests", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (id) => {
    try {
      const res = await fetch(`http://localhost:5001/api/driver/accept/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverId: user?.userId || user?.uid || "driver_system" })
      });
      if (res.ok) {
        // Remove from list or trigger refresh
        fetchRequests();
        alert("Ride accepted! Check your Active Rides tab.");
      }
    } catch (err) {
      console.error("Accept error", err);
    }
  };

  return (
    <div className="driver-dashboard">
      <div className="driver-dash-header">
        <h1>Welcome back, {user?.name?.split(" ")[0] || "Driver"}</h1>
        
        <div className="online-toggle-container">
          <span className={`online-status-text ${isOnline ? "online" : ""}`}>
            {isOnline ? "You're Online" : "Currently Offline"}
          </span>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={isOnline} 
              onChange={(e) => setIsOnline(e.target.checked)} 
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      {!isOnline ? (
        <div className="offline-state">
          <h3>Go online to start earning</h3>
          <p>You have 0 active ride requests in your area.</p>
        </div>
      ) : (
        <div className="requests-area">
          <h2 style={{fontSize: '20px', marginBottom: '20px', color: '#111827'}}>
            Live Requests Network {loading && <span style={{fontSize: '12px', color: '#6b7280', marginLeft: '10px'}}>Updating...</span>}
          </h2>
          
          {requests.length === 0 ? (
            <div className="offline-state" style={{border: '1px dashed #cbd5e1', borderRadius: '16px'}}>
              <h3 style={{fontSize: '18px'}}>Scanning for riders...</h3>
              <p>It's quiet right now. Stay online, requests will appear here.</p>
            </div>
          ) : (
            <div className="requests-grid">
              {requests.map((req) => (
                <div key={req.id} className="request-card fadeIn">
                  <div className="req-price-tag">₹{req.price}</div>
                  
                  <div className="req-meta">
                    {req.rideType} • {req.date} at {req.time}
                  </div>
                  
                  <div className="req-locations">
                    <div className="req-loc-line"></div>
                    
                    <div className="req-loc">
                      <div className="req-loc-icon start"></div>
                      <div className="req-loc-text">
                        <span>Pickup</span>
                        <strong>{req.pickup}</strong>
                      </div>
                    </div>
                    
                    <div className="req-loc">
                      <div className="req-loc-icon end"></div>
                      <div className="req-loc-text">
                        <span>Dropoff</span>
                        <strong>{req.drop}</strong>
                      </div>
                    </div>
                  </div>
                  
                  <div className="req-actions">
                    <button className="req-btn decline" onClick={() => {
                        // Optimistically remove from view
                        setRequests(prev => prev.filter(r => r.id !== req.id))
                      }}>
                      Decline
                    </button>
                    <button className="req-btn accept" onClick={() => handleAccept(req.id)}>
                      Accept Ride
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
