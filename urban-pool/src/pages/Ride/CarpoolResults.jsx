import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import AuthGate from "../../components/common/AuthGate/AuthGate";
import { GoogleMap, DirectionsRenderer, useLoadScript } from "@react-google-maps/api";
import "./CarpoolResults.css";

const libraries = ["places"];
const mapContainerStyle = { width: "100%", height: "100%", borderRadius: "12px" };
const defaultCenter = { lat: 30.7333, lng: 76.7794 }; // Chandigarh fallback

const MOCK_CARPOOLS = [
  {
    id: "cp1",
    driver: { name: "Ankit Sharma", rating: 4.8, img: "👨‍✈️", rides: 124 },
    vehicle: "Swift Dzire • White",
    time: { departure: "09:30 AM", arrival: "10:45 AM", duration: "1h 15m" },
    pricing: { price: 150, seats: 3, totalSeats: 4 },
    features: ["AC", "Music", "No Smoking"]
  },
  {
    id: "cp2",
    driver: { name: "Priya Verma", rating: 4.9, img: "👩‍✈️", rides: 89 },
    vehicle: "Honda City • Black",
    time: { departure: "10:15 AM", arrival: "11:30 AM", duration: "1h 15m" },
    pricing: { price: 200, seats: 2, totalSeats: 3 },
    features: ["AC", "Pets Allowed"]
  },
  {
    id: "cp3",
    driver: { name: "Rahul Gupta", rating: 4.7, img: "👨‍💼", rides: 215 },
    vehicle: "Maruti Ertiga • Silver",
    time: { departure: "11:00 AM", arrival: "12:30 PM", duration: "1h 30m" },
    pricing: { price: 120, seats: 5, totalSeats: 6 },
    features: ["AC", "Large Boot"]
  }
];

export default function CarpoolResults() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selected, setSelected] = useState(null);
  const [showAuth, setShowAuth] = useState(false);

  const pickup = state?.pickup || "Current Location";
  const drop = state?.drop || "Destination";
  const date = state?.date || new Date().toLocaleDateString();

  const handleBook = (ride) => {
    if (!user) {
      setShowAuth(true);
      return;
    }
    navigate("/booking", {
      state: {
        pickup, drop, date,
        rideType: "Carpool",
        price: ride.pricing.price,
        driver: ride.driver.name
      },
    });
  };

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const hasValidKey = apiKey && apiKey !== "YOUR_API_KEY_HERE";

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: hasValidKey ? apiKey : "",
    libraries,
  });

  const [directions, setDirections] = useState(null);

  useEffect(() => {
    if (!isLoaded || !pickup || !drop) return;
    if (pickup === "Current Location" || drop === "Destination") return;

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: pickup,
        destination: drop,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);
        } else {
          console.error(`Error fetching real directions: ${status}`);
        }
      }
    );
  }, [isLoaded, pickup, drop]);

  return (
    <div className="cr-page">
      <div className="cr-panel">
        <div className="cr-header">
          <div className="cr-route-summary">
            <div className="cr-point">
              <span className="dot start"></span>
              <span className="text">{pickup}</span>
            </div>
            <div className="cr-line"></div>
            <div className="cr-point">
              <span className="dot end"></span>
              <span className="text">{drop}</span>
            </div>
          </div>
          <div className="cr-meta-info">
            <span>📅 {date}</span>
            <span>🚗 {MOCK_CARPOOLS.length} rides available</span>
          </div>
        </div>

        <div className="cr-list">
          {MOCK_CARPOOLS.map((ride) => (
            <div 
              key={ride.id} 
              className={`cr-card ${selected === ride.id ? 'active' : ''}`}
              onClick={() => setSelected(ride.id)}
            >
              <div className="cr-card-top">
                <div className="cr-driver-info">
                  <span className="driver-avatar">{ride.driver.img}</span>
                  <div>
                    <h4>{ride.driver.name}</h4>
                    <span className="rating">⭐ {ride.driver.rating} • {ride.driver.rides} rides</span>
                  </div>
                </div>
                <div className="cr-price-info">
                  <span className="price">₹{ride.pricing.price}</span>
                  <span className="per-seat">per seat</span>
                </div>
              </div>

              <div className="cr-card-details">
                <div className="cr-time-info">
                  <div className="time-block">
                    <span className="time">{ride.time.departure}</span>
                    <span className="label">Departure</span>
                  </div>
                  <div className="duration-line">
                    <span>{ride.time.duration}</span>
                    <div className="arrow-line"></div>
                  </div>
                  <div className="time-block">
                    <span className="time">{ride.time.arrival}</span>
                    <span className="label">Arrival</span>
                  </div>
                </div>

                <div className="cr-bottom-row">
                  <div className="cr-vehicle">
                    <span>{ride.vehicle}</span>
                    <div className="features">
                      {ride.features.map(f => <span key={f} className="feature-tag">{f}</span>)}
                    </div>
                  </div>
                  <div className="cr-seats">
                    <span className="seats-count">{ride.pricing.seats} seats left</span>
                    <progress value={ride.pricing.totalSeats - ride.pricing.seats} max={ride.pricing.totalSeats}></progress>
                  </div>
                </div>

                {selected === ride.id && (
                  <button className="cr-book-btn" onClick={() => handleBook(ride)}>
                    Request to Join
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="cr-map-container">
        {!hasValidKey ? (
          <div className="map-placeholder">
            <span style={{fontSize: "24px", marginBottom: "8px"}}>🗺️</span>
            <div>Interactive Map disabled.</div>
            <div style={{fontSize: "12px", marginTop: "4px", opacity: 0.7}}>Add a valid Google Maps API Key to view routes.</div>
          </div>
        ) : loadError ? (
          <div className="map-placeholder">Error loading Maps API Context.</div>
        ) : !isLoaded ? (
          <div className="map-placeholder">Loading Interactive Map...</div>
        ) : (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            zoom={10}
            center={defaultCenter}
            options={{
              disableDefaultUI: true,
              zoomControl: true,
            }}
          >
            {directions && (
              <DirectionsRenderer 
                directions={directions} 
                options={{
                  polylineOptions: { strokeColor: "#000", strokeWeight: 4 }
                }}
              />
            )}
          </GoogleMap>
        )}
      </div>

      <AuthGate
        visible={showAuth}
        onClose={() => setShowAuth(false)}
        message="to request a carpool"
      />
    </div>
  );
}
