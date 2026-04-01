/**
 * Pricing utility to fetch fares from the backend
 */

const API_BASE = "http://localhost:5001/api";

export const calculateRidePrice = async (rideType, pickup, drop) => {
    try {
        const response = await fetch(`${API_BASE}/price`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rideType, pickup, drop })
        });
        const data = await response.json();
        return data; // Return full data { price, eta, distance, matchCount }
    } catch (error) {
        console.error("Error fetching price:", error);
        // Fallback pricing
        return { price: 100, eta: "5 min", matchCount: 0 };
    }
};

export const getEstimateETA = async (rideType, pickup, drop) => {
    try {
        const response = await fetch(`${API_BASE}/price`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ rideType, pickup, drop })
        });
        const data = await response.json();
        return data.eta;
    } catch (error) {
        console.error("Error fetching ETA:", error);
        return "5 min";
    }
};
