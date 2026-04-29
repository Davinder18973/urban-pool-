import { useState, useEffect } from "react";
import "./Admin.css";

export default function AdminRidesTable() {
  const [rides, setRides] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5001/api/admin/rides")
      .then(res => res.json())
      .then(data => setRides(data))
      .catch(console.error);
  }, []);

  return (
    <div className="admin-table-container">
      <h3>All Platform Rides</h3>
      <div className="table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Type</th>
              <th>Pickup</th>
              <th>Dropoff</th>
              <th>Date</th>
              <th>Fare</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rides.length === 0 ? (
              <tr><td colSpan="7" className="empty-state">No rides found.</td></tr>
            ) : (
              rides.map(ride => (
                <tr key={ride.id}>
                  <td className="col-id">#{ride.id}</td>
                  <td>{ride.type}</td>
                  <td className="truncate">{ride.pickup}</td>
                  <td className="truncate">{ride.drop}</td>
                  <td>{ride.date}</td>
                  <td className="col-fare">₹{ride.price}</td>
                  <td>
                    <span className={`status-badge ${ride.status?.toLowerCase() || 'completed'}`}>
                      {ride.status || 'Confirmed'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
