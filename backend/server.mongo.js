const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");
const mysql = require('mysql2/promise');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// --- Socket.io Logic ---
io.on('connection', (socket) => {
  console.log('A user connected via socket:', socket.id);
  socket.on('join_room', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their personal room`);
  });
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// --- Database Initialization ---
let sequelize;
const dbName = 'urbanpool';

async function initializeDatabase() {
  try {
    // 1. Create DB if it doesn't exist
    const connection = await mysql.createConnection({
      host: '127.0.0.1',
      user: 'root',
      password: '',
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.end();

    // 2. Connect via Sequelize
    sequelize = new Sequelize(dbName, 'root', '', {
      host: '127.0.0.1',
      dialect: 'mysql',
      logging: false, // Set to console.log to see SQL queries
    });

    // 3. Define Models
    const PriceLog = sequelize.define('PriceLog', {
      pickup: DataTypes.STRING,
      drop: DataTypes.STRING,
      price: DataTypes.FLOAT,
      rideType: DataTypes.STRING,
      timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    });

    const Booking = sequelize.define('Booking', {
      userId: DataTypes.STRING,
      pickup: DataTypes.STRING,
      drop: DataTypes.STRING,
      price: DataTypes.FLOAT,
      rideType: DataTypes.STRING,
      date: DataTypes.STRING,
      time: DataTypes.STRING,
      paymentMethod: DataTypes.STRING,
      status: { type: DataTypes.STRING, defaultValue: 'confirmed' },
      createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    });

    const RideRequest = sequelize.define('RideRequest', {
      pickup: DataTypes.STRING,
      drop: DataTypes.STRING,
      date: DataTypes.STRING,
      time: DataTypes.STRING,
      rideType: DataTypes.STRING,
      createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    });

    const PoolRide = sequelize.define('PoolRide', {
      driverId: DataTypes.STRING,
      driverName: DataTypes.STRING,
      pickup: DataTypes.STRING,
      destination: DataTypes.STRING,
      date: DataTypes.STRING,
      time: DataTypes.STRING,
      seatsAvailable: DataTypes.INTEGER,
      pricePerSeat: DataTypes.FLOAT,
      status: { type: DataTypes.STRING, defaultValue: 'open' },
      createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    });

    const PoolBooking = sequelize.define('PoolBooking', {
      passengerId: DataTypes.STRING,
      passengerName: DataTypes.STRING,
      rideId: DataTypes.INTEGER,
      seatsBooked: DataTypes.INTEGER,
      totalFare: DataTypes.FLOAT,
      status: { type: DataTypes.STRING, defaultValue: 'confirmed' },
      createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    });

    const Review = sequelize.define('Review', {
      fromUserId: DataTypes.STRING,
      toUserId: DataTypes.STRING,
      fromUserName: DataTypes.STRING,
      rating: DataTypes.INTEGER,
      comment: DataTypes.TEXT,
      targetType: DataTypes.STRING,
      createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    });

    // Attach models to app locals to use in routes
    app.locals.models = { PriceLog, Booking, RideRequest, PoolRide, PoolBooking, Review };

    // 4. Sync Database
    await sequelize.sync({ alter: true });
    console.log('MySQL Database Connected and Synced');

    // 5. Start Server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

// Map utils
const calculateHeuristicDistance = (pickup, drop) => {
  const p = pickup.toLowerCase();
  const d = drop.toLowerCase();
  if (p.includes('mohali') && d.includes('mohali')) return 3 + Math.random() * 5;
  if ((p.includes('mohali') && d.includes('chandigarh')) || (p.includes('chandigarh') && d.includes('mohali'))) return 10 + Math.random() * 8;
  if ((p.includes('delhi') && d.includes('mumbai')) || (p.includes('mumbai') && d.includes('delhi'))) return 1420;
  if ((p.includes('delhi') && d.includes('chandigarh')) || (p.includes('chandigarh') && d.includes('delhi'))) return 250;
  return 5 + Math.abs(p.length - d.length) * 4;
};

const getRealRouteData = async (pickup, drop) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
    const dist = calculateHeuristicDistance(pickup, drop);
    return { 
      distance: parseFloat(dist.toFixed(1)), 
      duration: Math.round(dist * 1.8 + 5)
    };
  }
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(pickup)}&destinations=${encodeURIComponent(drop)}&key=${apiKey}`;
    const response = await axios.get(url);
    const data = response.data;
    if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
      const element = data.rows[0].elements[0];
      return {
        distance: element.distance.value / 1000, 
        duration: Math.round(element.duration.value / 60)
      };
    }
    throw new Error(data.error_message || "Invalid API Response");
  } catch (err) {
    const dist = calculateHeuristicDistance(pickup, drop);
    return { distance: dist, duration: dist * 1.8 + 5 };
  }
};

const BASE_FARES = { pool: 40, go: 60, xl: 100, premier: 150, auto: 25, bike: 15 };
const RATE_PER_KM = { pool: 12, go: 15, xl: 22, premier: 30, auto: 10, bike: 7 };

// --- ROUTES ---

app.post('/api/price', async (req, res) => {
  const { pickup, drop, rideType } = req.body;
  if (!pickup || !drop) return res.status(400).json({ error: 'Locations required' });

  const routeData = await getRealRouteData(pickup, drop);
  const { distance, duration } = routeData;
  const isAvailable = distance < 1000;
  const base = BASE_FARES[rideType] || 50;
  const rate = RATE_PER_KM[rideType] || 15;
  const price = isAvailable ? Math.round(base + (distance * rate)) : 0;
  const eta = isAvailable ? `${duration} min` : "N/A";

  let matchCount = 0;
  try {
    const { RideRequest } = req.app.locals.models;
    const { Op } = require('sequelize');
    await RideRequest.create({ pickup, drop, date: req.body.date, time: req.body.time, rideType });
    matchCount = await RideRequest.count({
      where: {
        pickup: { [Op.like]: `%${pickup}%` },
        drop: { [Op.like]: `%${drop}%` }
      }
    });
    matchCount = Math.max(0, matchCount - 1);
  } catch (err) { console.error(err) }

  res.json({ price, eta, distance, available: isAvailable, matchCount });
});

app.post('/api/bookings', async (req, res) => {
  try {
    const { Booking } = req.app.locals.models;
    const booking = await Booking.create(req.body);
    
    const userId = req.body.userId;
    if (userId) {
      io.to(userId).emit('notification', {
        id: Date.now(),
        type: 'ride_confirmed',
        title: 'Ride Confirmed! ✅',
        message: `Your ride from ${req.body.pickup} to ${req.body.drop} is scheduled.`,
        time: 'Just now'
      });
      setTimeout(() => {
        io.to(userId).emit("driverStatus", { 
          status: "Driver Assigned", 
          message: "Rahul is arriving in a white Dzire (PB01AB1234)",
          step: 1
        });
        io.to(userId).emit('notification', {
          id: Date.now() + 1,
          type: 'info',
          title: 'Driver Assigned 🚕',
          message: 'Rahul (PB01AB1234) has accepted your ride request.',
          time: '3s ago'
        });
      }, 3000); 
      setTimeout(() => {
        io.to(userId).emit("driverStatus", { 
          status: "On the way", 
          message: "Driver is 2 minutes away.",
          step: 2
        });
        io.to(userId).emit('notification', {
          id: Date.now() + 2,
          type: 'driver_arriving',
          title: 'Driver is Near! 📍',
          message: 'Your driver is just 2 minutes away. Please be ready!',
          time: 'Just now'
        });
      }, 8000); 
    }
    res.status(201).json({ success: true, id: booking.id, booking });
  } catch (err) {
    console.error('Error saving booking:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/bookings/:userId', async (req, res) => {
  try {
    const { Booking } = req.app.locals.models;
    const bookings = await Booking.findAll({ 
      where: { userId: req.params.userId },
      order: [['createdAt', 'DESC']]
    });
    res.json(bookings);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/carpool/rides', async (req, res) => {
  try {
    const { PoolRide } = req.app.locals.models;
    const ride = await PoolRide.create(req.body);
    res.status(201).json(ride);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/carpool/search', async (req, res) => {
  const { pickup, destination, date } = req.query;
  const { Op } = require('sequelize');
  const query = { status: 'open' };
  
  if (pickup) query.pickup = { [Op.like]: `%${pickup}%` };
  if (destination) query.destination = { [Op.like]: `%${destination}%` };
  if (date) query.date = date;

  try {
    const { PoolRide } = req.app.locals.models;
    const rides = await PoolRide.findAll({ where: query, order: [['time', 'ASC']] });
    res.json(rides);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/carpool/book', async (req, res) => {
  const { rideId, passengerId, passengerName, seatsBooked } = req.body;
  
  try {
    const { PoolRide, PoolBooking } = req.app.locals.models;
    const ride = await PoolRide.findByPk(rideId);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.seatsAvailable < seatsBooked) {
      return res.status(400).json({ error: 'Not enough seats available' });
    }

    const totalFare = ride.pricePerSeat * seatsBooked;
    const booking = await PoolBooking.create({
      rideId, passengerId, passengerName, seatsBooked, totalFare
    });

    ride.seatsAvailable -= seatsBooked;
    if (ride.seatsAvailable === 0) ride.status = 'full';
    await ride.save();

    io.to(ride.driverId).emit('notification', {
      id: Date.now(),
      type: 'info',
      title: 'New Booking! 🧍',
      message: `${passengerName} booked ${seatsBooked} seat(s) for your ride to ${ride.destination}.`,
      time: 'Just now'
    });

    res.status(201).json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/carpool/my-offers/:userId', async (req, res) => {
  try {
    const { PoolRide } = req.app.locals.models;
    const rides = await PoolRide.findAll({ 
      where: { driverId: req.params.userId },
      order: [['createdAt', 'DESC']]
    });
    res.json(rides);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reviews', async (req, res) => {
  try {
    const { Review } = req.app.locals.models;
    const review = await Review.create(req.body);
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/reviews/:userId', async (req, res) => {
  try {
    const { Review } = req.app.locals.models;
    const reviews = await Review.findAll({ 
      where: { toUserId: req.params.userId },
      order: [['createdAt', 'DESC']]
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

initializeDatabase();
