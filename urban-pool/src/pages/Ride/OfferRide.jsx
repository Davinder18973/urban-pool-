import { useState } from "react";
import "./OfferRide.css";

const MOCK_REQUESTS = [
  { id: 1, name: "Suresh Kumar", rating: 4.5, pickup: "Sector 17, Chandigarh", drop: "Zirakpur", status: "pending", avatar: "👤" },
  { id: 2, name: "Meera Singh", rating: 4.9, pickup: "Mohali Ph 7", drop: "Derabassi", status: "pending", avatar: "👩" },
  { id: 3, name: "Amit Bajaj", rating: 4.2, pickup: "Landran", drop: "Delhi Border", status: "pending", avatar: "👨" },
];

export default function OfferRide() {
  const [requests, setRequests] = useState(MOCK_REQUESTS);
  const [seats, setSeats] = useState(3);
  const [price, setPrice] = useState(200);
  const [activeTab, setActiveTab] = useState("requests"); // requests, settings

  const handleAction = (id, action) => {
    if (action === "accept") {
      if (seats > 0) {
        setRequests(requests.filter(r => r.id !== id));
        setSeats(seats - 1);
        alert("Request accepted!");
      } else {
        alert("No vacant seats left!");
      }
    } else {
      setRequests(requests.filter(r => r.id !== id));
    }
  };

  return (
    <div className="or-page">
      <div className="or-container">
        {/* Sidebar/Navigation */}
        <div className="or-sidebar">
          <h2>Driver Dashboard</h2>
          <nav>
            <button 
              className={activeTab === "requests" ? "active" : ""} 
              onClick={() => setActiveTab("requests")}
            >
              📥 Ride Requests ({requests.length})
            </button>
            <button 
              className={activeTab === "settings" ? "active" : ""} 
              onClick={() => setActiveTab("settings")}
            >
              ⚙️ Ride Settings
            </button>
          </nav>

          <div className="or-stats">
            <div className="stat-card">
              <span className="label">Vacant Seats</span>
              <span className="value">{seats}</span>
            </div>
            <div className="stat-card">
              <span className="label">Price/Seat</span>
              <span className="value">₹{price}</span>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="or-content">
          {activeTab === "requests" ? (
            <div className="or-requests">
              <div className="content-header">
                <h3>Interested Riders</h3>
                <p>Respond to passengers wanting to join your route.</p>
              </div>

              {requests.length === 0 ? (
                <div className="or-empty">
                  <span className="icon">🎉</span>
                  <h4>All caught up!</h4>
                  <p>No pending requests at the moment.</p>
                </div>
              ) : (
                <div className="or-list">
                  {requests.map(req => (
                    <div key={req.id} className="request-card">
                      <div className="rider-profile">
                        <span className="avatar">{req.avatar}</span>
                        <div className="info">
                          <h4>{req.name}</h4>
                          <span className="rating">⭐ {req.rating}</span>
                        </div>
                      </div>
                      
                      <div className="route-details">
                        <p><strong>From:</strong> {req.pickup}</p>
                        <p><strong>To:</strong> {req.drop}</p>
                      </div>

                      <div className="actions">
                        <button className="reject-btn" onClick={() => handleAction(req.id, "reject")}>Reject</button>
                        <button className="accept-btn" onClick={() => handleAction(req.id, "accept")}>Accept</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="or-settings">
              <div className="content-header">
                <h3>Ride Configuration</h3>
                <p>Update your carpool details for others to see.</p>
              </div>

              <div className="settings-form">
                <div className="form-group">
                  <label>Available Seats</label>
                  <div className="counter">
                    <button onClick={() => setSeats(Math.max(1, seats - 1))}>-</button>
                    <span>{seats}</span>
                    <button onClick={() => setSeats(Math.min(6, seats + 1))}>+</button>
                  </div>
                </div>

                <div className="form-group">
                  <label>Price per Seat (₹)</label>
                  <input 
                    type="number" 
                    value={price} 
                    onChange={(e) => setPrice(e.target.value)}
                    min="50"
                  />
                </div>

                <div className="form-group">
                  <label>Vehicle Details</label>
                  <input type="text" placeholder="e.g. White Swift Dzire (PB-65-XXXX)" defaultValue="White Swift Dzire (PB-65-XXXX)" />
                </div>

                <div className="form-group">
                  <label>Ride Preferences</label>
                  <div className="checkbox-grid">
                    <label><input type="checkbox" defaultChecked /> AC Available</label>
                    <label><input type="checkbox" /> Music</label>
                    <label><input type="checkbox" defaultChecked /> No Smoking</label>
                    <label><input type="checkbox" /> Pets Allowed</label>
                  </div>
                </div>

                <button className="save-btn" onClick={() => alert("Settings saved!")}>Save Changes</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
