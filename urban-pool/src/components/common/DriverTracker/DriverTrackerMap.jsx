import { useState, useEffect, useRef } from "react";
import { GoogleMap, useLoadScript, DirectionsRenderer, Marker } from "@react-google-maps/api";
import "./DriverTrackerMap.css";

const libraries = ["places"];
const mapContainerStyle = { width: "100%", height: "100%", borderRadius: "12px" };

export default function DriverTrackerMap({ pickup, driverName }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const hasValidKey = apiKey && apiKey !== "YOUR_API_KEY_HERE";

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: hasValidKey ? apiKey : "",
    libraries,
  });

  const [directions, setDirections] = useState(null);
  const [driverPos, setDriverPos] = useState(null);
  const [eta, setEta] = useState("");
  const pathRef = useRef([]);
  const indexRef = useRef(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isLoaded || !hasValidKey || !pickup) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: pickup }, (results, status) => {
      if (status === "OK" && results[0]) {
        const destLoc = results[0].geometry.location;
        // Create a fake driver starting location roughly 2-3km away
        const startLat = destLoc.lat() - 0.025;
        const startLng = destLoc.lng() - 0.025;
        const startLoc = new window.google.maps.LatLng(startLat, startLng);

        const directionsService = new window.google.maps.DirectionsService();
        directionsService.route(
          {
            origin: startLoc,
            destination: destLoc,
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (res, dirStatus) => {
            if (dirStatus === window.google.maps.DirectionsStatus.OK) {
              setDirections(res);
              const leg = res.routes[0].legs[0];
              setEta(leg.duration.text);
              
              // Extract the detailed polyline path for smooth animation
              const detailedPath = res.routes[0].overview_path;
              pathRef.current = detailedPath;
              indexRef.current = 0;
              setDriverPos(detailedPath[0]);

              // Start animation loop
              if (intervalRef.current) clearInterval(intervalRef.current);
              intervalRef.current = setInterval(() => {
                if (indexRef.current < pathRef.current.length - 1) {
                  indexRef.current += 1;
                  setDriverPos(pathRef.current[indexRef.current]);
                } else {
                  setEta("Arrived");
                  clearInterval(intervalRef.current);
                }
              }, 1200); // Move every 1.2s to visually simulate driving
            }
          }
        );
      }
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLoaded, hasValidKey, pickup]);

  if (!hasValidKey) {
    return (
      <div className="tracker-wrapper">
        <div className="tracker-placeholder">
          <span className="tracker-icon">🚗</span>
          <h4>Live Tracking Disabled</h4>
          <p>Add a valid Google Maps API Key to watch {driverName} approach in real-time.</p>
        </div>
      </div>
    );
  }

  if (loadError) return <div className="tracker-placeholder">Error loading Maps API</div>;
  if (!isLoaded) return <div className="tracker-placeholder">Loading Live Tracker...</div>;

  return (
    <div className="tracker-wrapper">
      <div className="tracker-status-bar">
        <div className="tracker-status-left">
          <div className="driver-avatar">🚘</div>
          <div className="driver-info">
            <strong>{driverName}</strong>
            <span>{eta === "Arrived" ? "Driver is outside!" : `Arriving in ${eta}`}</span>
          </div>
        </div>
        <div className="tracker-car-plate">UP-01-AB-1234</div>
      </div>
      
      <div className="tracker-map-container">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={13}
          center={driverPos || { lat: 0, lng: 0 }}
          options={{
            disableDefaultUI: true,
            gestureHandling: 'cooperative'
          }}
        >
          {directions && (
            <DirectionsRenderer 
              directions={directions} 
              options={{
                suppressMarkers: true, // We draw our own custom markers
                polylineOptions: { strokeColor: "#3b82f6", strokeWeight: 5, strokeOpacity: 0.8 }
              }}
            />
          )}

          {/* User Pickup Marker */}
          {directions && directions.routes[0] && (
            <Marker 
              position={directions.routes[0].legs[0].end_location}
              icon={{
                url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png"
              }}
            />
          )}

          {/* Moving Driver Marker */}
          {driverPos && (
            <Marker 
              position={driverPos}
              icon={{
                path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                scale: 6,
                fillColor: "#000000",
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: "#ffffff",
                rotation: calculateHeading(
                  pathRef.current[Math.max(0, indexRef.current - 1)], 
                  driverPos
                )
              }}
              zIndex={999}
            />
          )}
        </GoogleMap>
      </div>
    </div>
  );
}

// Helper to orient the car icon in the direction of travel
function calculateHeading(p1, p2) {
  if (!p1 || !p2) return 0;
  const lat1 = p1.lat() * Math.PI / 180;
  const lng1 = p1.lng() * Math.PI / 180;
  const lat2 = p2.lat() * Math.PI / 180;
  const lng2 = p2.lng() * Math.PI / 180;

  const dLng = lng2 - lng1;
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = Math.atan2(y, x);
  return (brng * 180 / Math.PI + 360) % 360;
}
