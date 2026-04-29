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

  socket.on('join_chat', (rideId) => {
    socket.join(`chat_${rideId}`);
    console.log(`User joined chat room: chat_${rideId}`);
  });

  socket.on('send_message', async (data) => {
    // expected data format: { rideId, senderId, text }
    try {
      const { Message } = app.locals.models;
      if (Message) {
        const newMsg = await Message.create({
          rideId: data.rideId,
          senderId: data.senderId,
          text: data.text
        });
        
        // Broadcast to everyone in the chat room including sender
        io.to(`chat_${data.rideId}`).emit('receive_message', newMsg);
        
        // Auto-reply simulation for demo purposes
        if (data.senderId !== 'driver_system') {
          setTimeout(async () => {
            const autoReply = await Message.create({
              rideId: data.rideId,
              senderId: 'driver_system',
              text: "Got it! I'm tracking your location now and will be there shortly."
            });
            io.to(`chat_${data.rideId}`).emit('receive_message', autoReply);
          }, 3500);
        }
      }
    } catch (err) {
      console.error('Error saving message:', err);
    }
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
      password: process.env.DB_PASSWORD || '',
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.end();

    // 2. Connect via Sequelize
    sequelize = new Sequelize(dbName, 'root', process.env.DB_PASSWORD || '', {
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
      driverId: { type: DataTypes.STRING, allowNull: true },
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

    const Message = sequelize.define('Message', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      rideId: { type: DataTypes.STRING, allowNull: false },
      senderId: { type: DataTypes.STRING, allowNull: false },
      text: { type: DataTypes.TEXT, allowNull: false },
      createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    });

    const Wallet = sequelize.define('Wallet', {
      userId: DataTypes.STRING,
      balance: { type: DataTypes.FLOAT, defaultValue: 500.0 }
    });

    const Transaction = sequelize.define('Transaction', {
      userId: DataTypes.STRING,
      amount: DataTypes.FLOAT,
      type: DataTypes.STRING, // addition, deduction, bonus
      description: DataTypes.STRING,
      date: { type: DataTypes.STRING, defaultValue: () => new Date().toISOString().split('T')[0] },
      status: { type: DataTypes.STRING, defaultValue: 'completed' },
      createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
    });

    // Attach models to app locals to use in routes
    app.locals.models = { PriceLog, Booking, RideRequest, PoolRide, PoolBooking, Review, Message, Wallet, Transaction };

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
    const { Booking, Wallet, Transaction } = req.app.locals.models;
    const bodyArgs = req.body;

    // Deduct from Wallet if payment method is wallet
    if (bodyArgs.paymentMethod === 'wallet') {
      const wallet = await Wallet.findOne({ where: { userId: bodyArgs.userId }});
      if (!wallet || wallet.balance < bodyArgs.price) {
        return res.status(400).json({ error: 'Insufficient UrbanPool Wallet balance.' });
      }
      wallet.balance -= bodyArgs.price;
      await wallet.save();
      
      await Transaction.create({
        userId: bodyArgs.userId,
        amount: bodyArgs.price,
        type: 'deduction',
        description: `Ride booked: ${bodyArgs.pickup.substring(0, 15)}...`
      });
    }

    const booking = await Booking.create(bodyArgs);
    
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

// --- ADMIN ROUTES ---

app.get('/api/admin/stats', async (req, res) => {
  try {
    const { Booking, PoolBooking } = req.app.locals.models;
    const bookings = await Booking.findAll();
    const poolBookings = await PoolBooking.findAll();

    const totalRides = bookings.length + poolBookings.length;
    let totalRevenue = 0;
    
    bookings.forEach(b => totalRevenue += (b.price || 0));
    poolBookings.forEach(pb => totalRevenue += (pb.totalFare || 0));

    // Calculate last 7 days revenue
    const chartData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = d.toISOString().split('T')[0]; // YYYY-MM-DD
      
      let dayRev = 0;
      bookings.forEach(b => {
        if (b.createdAt.toISOString().startsWith(dateString)) dayRev += (b.price || 0);
      });
      poolBookings.forEach(pb => {
        if (pb.createdAt.toISOString().startsWith(dateString)) dayRev += (pb.totalFare || 0);
      });

      chartData.push({ name: d.toLocaleDateString('en-US', { weekday: 'short' }), revenue: dayRev });
    }

    res.json({
      totalRides,
      totalRevenue,
      activeUsers: 142, // Mocked for now
      chartData
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/rides', async (req, res) => {
  try {
    const { Booking, PoolBooking, PoolRide } = req.app.locals.models;
    const bookings = await Booking.findAll({ order: [['createdAt', 'DESC']] });
    const poolBookings = await PoolBooking.findAll({ order: [['createdAt', 'DESC']] });
    
    // We need pickup/drop for PoolBookings which are stored in PoolRide
    // But for a simple dashboard, we can just return what we have
    const formatted = [
      ...bookings.map(b => ({
        id: b.id,
        type: 'Private Ride',
        pickup: b.pickup,
        drop: b.drop,
        price: b.price,
        date: new Date(b.createdAt).toLocaleDateString(),
        status: b.status,
      })),
      ...poolBookings.map(pb => ({
        id: pb.id,
        type: 'Carpool',
        pickup: 'Carpool Route',
        drop: 'Carpool Route',
        price: pb.totalFare,
        date: new Date(pb.createdAt).toLocaleDateString(),
        status: pb.status,
      }))
    ];

    res.json(formatted.sort((a,b) => new Date(b.date) - new Date(a.date)));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// --- CHAT ROUTES ---
app.get('/api/chat/:rideId', async (req, res) => {
  try {
    const { Message } = req.app.locals.models;
    const messages = await Message.findAll({ 
      where: { rideId: req.params.rideId },
      order: [['createdAt', 'ASC']]
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- DRIVER ROUTES ---
// Get pending requests
app.get('/api/driver/requests', async (req, res) => {
  try {
    const { Booking } = req.app.locals.models;
    const pending = await Booking.findAll({
      where: { status: 'confirmed' }, // 'confirmed' means user booked it, but no driver yet
      order: [['createdAt', 'DESC']]
    });
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept Request
app.post('/api/driver/accept/:id', async (req, res) => {
  try {
    const { Booking } = req.app.locals.models;
    const { driverId } = req.body;
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Ride not found' });
    
    booking.driverId = driverId;
    booking.status = 'driver_assigned';
    await booking.save();
    
    // In a real app we'd emit a socket event to the user here
    res.json({ message: 'Ride accepted successfully', booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Diver's Active/Past Rides
app.get('/api/driver/rides/:driverId', async (req, res) => {
  try {
    const { Booking } = req.app.locals.models;
    const rides = await Booking.findAll({
      where: { driverId: req.params.driverId },
      order: [['createdAt', 'DESC']]
    });
    res.json(rides);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Ride Status
app.post('/api/driver/status/:id', async (req, res) => {
  try {
    const { Booking } = req.app.locals.models;
    const { status } = req.body; // e.g., 'in_progress', 'completed'
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).json({ error: 'Ride not found' });
    
    booking.status = status;
    await booking.save();
    
    res.json({ message: `Ride status updated to ${status}`, booking });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- WALLET API ROUTES ---

app.get('/api/wallet/:userId', async (req, res) => {
  try {
    const { Wallet, Transaction } = req.app.locals.models;
    const { userId } = req.params;
    
    // Find or create
    let [wallet, created] = await Wallet.findOrCreate({
      where: { userId },
      defaults: { balance: 500.0 }
    });

    // Insert sign-up bonus history conditionally
    if (created) {
      await Transaction.create({
        userId,
        amount: 500,
        type: 'bonus',
        description: 'Welcome Bonus from UrbanPool'
      });
    }

    const transactions = await Transaction.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    res.json({ balance: wallet.balance, transactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/wallet/promo', async (req, res) => {
  try {
    const { Wallet, Transaction } = req.app.locals.models;
    const { userId, code } = req.body;
    
    if (!code) return res.status(400).json({ error: 'Code is required' });
    const formattedCode = code.toUpperCase();

    // Valid Promos
    const PROMOS = {
      'URBAN50': 50,
      'WELCOME200': 200,
      'FREE100': 100
    };

    const amount = PROMOS[formattedCode];
    if (!amount) {
      return res.status(400).json({ error: 'Invalid or expired promo code' });
    }
    
    let [wallet] = await Wallet.findOrCreate({ where: { userId }, defaults: { balance: 500.0 }});
    wallet.balance += amount;
    await wallet.save();

    const tx = await Transaction.create({
      userId,
      amount,
      type: 'bonus',
      description: `Promo Code Applied: ${formattedCode}`
    });

    res.json({ message: 'Promo applied successfully', balance: wallet.balance, transaction: tx });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

initializeDatabase();
