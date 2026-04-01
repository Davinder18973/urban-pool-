import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "../config/firebase";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Initial state helper
  const getInitialProfile = () => {
    const saved = localStorage.getItem('urbanpool_profile');
    if (saved) return JSON.parse(saved);
    return {
      name: "",
      emoji: "😎",
      balance: 265.00,
      transactions: [
        { id: 1, type: 'bonus', amount: 50, date: '2025-10-25', description: 'Welcome Bonus from UrbanPool', status: 'completed' },
        { id: 2, type: 'deduction', amount: 165, date: '2025-10-24', description: 'Ride to Chandigarh Sector 17', status: 'completed' },
      ],
      rides: [
        { id: 'UP-10293', date: '25 Oct 2025', time: '14:30', from: 'Mohali Phase 7', to: 'Chandigarh Sector 17', price: 165, type: 'UrbanPool', status: 'Completed' },
      ],
      notifications: [
        { id: 1, type: 'info', title: 'Welcome to UrbanPool', message: 'Explore our new features and enjoy your rides!', time: '2 days ago' },
      ]
    };
  };

  const [userProfile, setUserProfile] = useState(getInitialProfile());

  // Persist profile changes
  useEffect(() => {
    localStorage.setItem('urbanpool_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setUserProfile(prev => {
          // Only use email-split name if current name is empty
          if (!prev.name) {
            return {
              ...prev,
              name: currentUser.displayName || currentUser.email?.split('@')[0] || "User",
            };
          }
          return prev;
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    // Optional: clear profile or keep it? Usually keep for persistence, but clear on actual logout if security bound.
    // For this app, we'll keep it for the "wow" factor of persistence unless it's a shared device.
  };

  const updateProfile = (updates) => {
    setUserProfile(prev => ({ ...prev, ...updates }));
  };

  const addTransaction = (tx) => {
    setUserProfile(prev => ({
      ...prev,
      balance: prev.balance + (tx.type === 'addition' || tx.type === 'bonus' ? tx.amount : -tx.amount),
      transactions: [{ id: Date.now(), ...tx }, ...prev.transactions]
    }));
  };

  const addNotification = (notif) => {
    setUserProfile(prev => ({
      ...prev,
      notifications: [{ id: Date.now(), time: 'Just now', ...notif }, ...prev.notifications]
    }));
  };

  const addRide = (ride) => {
    setUserProfile(prev => ({
      ...prev,
      rides: [{ id: ride.id, ...ride }, ...prev.rides]
    }));
  };

  const updateRideStatus = (rideId, newStatus) => {
    setUserProfile(prev => ({
      ...prev,
      rides: prev.rides.map(ride => 
        ride.id === rideId ? { ...ride, status: newStatus } : ride
      )
    }));
  };

  return (
    <AuthContext.Provider value={{ 
      user, loading, userProfile, updateProfile, 
      addTransaction, logout, addNotification, 
      addRide, updateRideStatus 
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);