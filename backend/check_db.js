const mongoose = require('mongoose');
require('dotenv').config();

async function checkBookings() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/urbanpool');
        
        const Booking = mongoose.model('Booking', new mongoose.Schema({
            userId: String,
            pickup: String,
            drop: String,
            price: Number,
            rideType: String,
            status: String,
            createdAt: Date
        }));

        const bookings = await Booking.find().sort({ createdAt: -1 }).limit(5);
        console.log('--- RECENT BOOKINGS ---');
        console.log(JSON.stringify(bookings, null, 2));
        
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkBookings();
