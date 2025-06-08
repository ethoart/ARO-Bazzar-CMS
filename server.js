// ARO Bazzar - Backend Server
// This file sets up a Node.js server using the Express framework.
// It connects to a MongoDB database and provides a REST API to manage the store's data.

// --- 1. Import Dependencies ---
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config(); // Loads environment variables from a .env file into process.env

// --- 2. Initialize Express App ---
const app = express();
const PORT = process.env.PORT || 8080;

// --- 3. Middleware ---
app.use(cors());
app.use(express.json()); // This is crucial for parsing JSON request bodies

// --- 4. Database Connection ---
const dbURI = process.env.MONGO_URI;

if (!dbURI) {
    console.error("FATAL ERROR: MONGO_URI is not defined in the environment variables.");
    process.exit(1);
}

const connectDB = async () => {
    try {
        console.log("Attempting to connect to MongoDB...");
        await mongoose.connect(dbURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 15000
        });
        console.log('Successfully connected to MongoDB database.');
    } catch (err) {
        console.error('Database connection error:', err.message);
        console.error('Full error object:', err);
        process.exit(1);
    }
};

connectDB();

// --- 5. Mongoose Schemas (Data Models) ---

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'Editor'], default: 'Editor' }
});

UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const User = mongoose.model('User', UserSchema);

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    stock: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ['Active', 'Archived', 'Out of Stock'], default: 'Active' },
    images: [{ type: String }],
    createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', ProductSchema);

const CategorySchema = new mongoose.Schema({ name: { type: String, required: true, unique: true } });
const Category = mongoose.model('Category', CategorySchema);

const OrderSchema = new mongoose.Schema({
    customer: { type: String, required: true },
    items: [{ productName: String, quantity: Number, price: Number }],
    total: { type: Number, required: true },
    status: { type: String, enum: ['Processing', 'Shipped', 'Delivered', 'Cancelled'], default: 'Processing' },
    orderDate: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', OrderSchema);

// --- 6. API Routes (Endpoints) ---

// Middleware to log request details for debugging
const requestLogger = (req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    if (req.method === "POST" || req.method === "PUT") {
        console.log('Request Body Payload:', req.body);
    }
    next();
};
app.use(requestLogger);


app.get('/', (req, res) => { res.send('Welcome to the ARO Bazzar Backend API! Status: Connected'); });

// Product Routes
app.get('/api/products', async (req, res) => { try { const data = await Product.find(); res.json(data); } catch (e) { res.status(500).json({ message: e.message }); }});
app.post('/api/products', async (req, res) => { if (!req.body || Object.keys(req.body).length === 0) return res.status(400).json({ message: 'Payload not set or empty.' }); const item = new Product(req.body); try { const newItem = await item.save(); res.status(201).json(newItem); } catch (e) { res.status(400).json({ message: e.message }); }});
app.put('/api/products/:id', async (req, res) => { if (!req.body || Object.keys(req.body).length === 0) return res.status(400).json({ message: 'Payload not set or empty.' }); try { const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json(updated); } catch (e) { res.status(400).json({ message: e.message }); }});
app.delete('/api/products/:id', async (req, res) => { try { await Product.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted successfully.' }); } catch (e) { res.status(500).json({ message: e.message }); }});

// Category Routes
app.get('/api/categories', async (req, res) => { try { const data = await Category.find(); res.json(data); } catch (e) { res.status(500).json({ message: e.message }); }});
app.post('/api/categories', async (req, res) => { if (!req.body || Object.keys(req.body).length === 0) return res.status(400).json({ message: 'Payload not set or empty.' }); const item = new Category(req.body); try { const newItem = await item.save(); res.status(201).json(newItem); } catch (e) { res.status(400).json({ message: e.message }); }});
app.put('/api/categories/:id', async (req, res) => { if (!req.body || Object.keys(req.body).length === 0) return res.status(400).json({ message: 'Payload not set or empty.' }); try { const updated = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json(updated); } catch (e) { res.status(400).json({ message: e.message }); }});
app.delete('/api/categories/:id', async (req, res) => { try { await Category.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted successfully.' }); } catch (e) { res.status(500).json({ message: e.message }); }});

// Order Routes
app.get('/api/orders', async (req, res) => { try { const data = await Order.find().sort({ orderDate: -1 }); res.json(data); } catch (e) { res.status(500).json({ message: e.message }); }});
app.post('/api/orders', async (req, res) => { if (!req.body || Object.keys(req.body).length === 0) return res.status(400).json({ message: 'Payload not set or empty.' }); const item = new Order(req.body); try { const newItem = await item.save(); res.status(201).json(newItem); } catch (e) { res.status(400).json({ message: e.message }); }});
app.put('/api/orders/:id', async (req, res) => { if (!req.body || Object.keys(req.body).length === 0) return res.status(400).json({ message: 'Payload not set or empty.' }); try { const updated = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json(updated); } catch (e) { res.status(400).json({ message: e.message }); }});

// User Routes
app.get('/api/users', async (req, res) => { try { const data = await User.find().select('-password'); res.json(data); } catch (e) { res.status(500).json({ message: e.message }); }});
app.post('/api/users', async (req, res) => { if (!req.body || Object.keys(req.body).length === 0) return res.status(400).json({ message: 'Payload not set or empty.' }); const item = new User(req.body); try { const newItem = await item.save(); res.status(201).json({ _id: newItem._id, name: newItem.name, email: newItem.email, role: newItem.role }); } catch (e) { res.status(400).json({ message: e.message }); }});
app.put('/api/users/:id', async (req, res) => { if (!req.body || Object.keys(req.body).length === 0) return res.status(400).json({ message: 'Payload not set or empty.' }); try { const { name, email, role } = req.body; const updated = await User.findByIdAndUpdate(req.params.id, { name, email, role }, { new: true }).select('-password'); res.json(updated); } catch (e) { res.status(400).json({ message: e.message }); }});
app.delete('/api/users/:id', async (req, res) => { try { await User.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted successfully.' }); } catch (e) { res.status(500).json({ message: e.message }); }});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        res.json({ message: "Login successful", user: { _id: user._id, name: user.name, email: user.email, role: user.role }});
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// --- 7. Start the Server ---
app.listen(PORT, () => {
    console.log(`Server is listening on port: ${PORT}`);
});
