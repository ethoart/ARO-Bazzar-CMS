// ARO Bazzar - Backend Server
// This file sets up a Node.js server using the Express framework.
// It connects to a MongoDB database and provides a REST API to manage the store's data.

// --- 1. Import Dependencies ---
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

// --- 2. Initialize Express App ---
const app = express();
const PORT = process.env.PORT || 5000;

// --- 3. Middleware ---
app.use(cors()); // Allows cross-origin requests from your frontend
app.use(express.json()); // Allows the server to accept and parse JSON in request bodies

// --- 4. Database Connection ---
// IMPORTANT: Replace the string below with your actual MongoDB connection string.
// You can get this from MongoDB Atlas (cloud) or your local MongoDB setup.
const dbURI = "YOUR_MONGODB_CONNECTION_STRING_HERE";

mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Successfully connected to MongoDB database.'))
  .catch(err => console.error('Database connection error:', err));

// --- 5. Mongoose Schemas (Data Models) ---

// User Schema with password hashing
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'Editor'], default: 'Editor' }
});

// This function runs before a user document is saved.
// It hashes the password if it's new or has been modified.
UserSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const User = mongoose.model('User', UserSchema);

// Product Schema
const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    stock: { type: Number, required: true, default: 0 },
    status: { type: String, enum: ['Active', 'Archived', 'Out of Stock'], default: 'Active' },
    images: [{ type: String }], // Array of image URLs
    createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', ProductSchema);

// Category Schema
const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }
});

const Category = mongoose.model('Category', CategorySchema);

// Order Schema
const OrderSchema = new mongoose.Schema({
    customer: { type: String, required: true },
    items: [
        {
            productName: String,
            quantity: Number,
            price: Number
        }
    ],
    total: { type: Number, required: true },
    status: { type: String, enum: ['Processing', 'Shipped', 'Delivered', 'Cancelled'], default: 'Processing' },
    orderDate: { type: Date, default: Date.now }
});

const Order = mongoose.model('Order', OrderSchema);


// --- 6. API Routes (Endpoints) ---

// Welcome Route
app.get('/', (req, res) => {
    res.send('Welcome to the ARO Bazzar Backend API!');
});

// --- Product Routes ---
// GET all products
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST a new product
app.post('/api/products', async (req, res) => {
    const product = new Product(req.body);
    try {
        const newProduct = await product.save();
        res.status(201).json(newProduct);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// PUT (update) a product by ID
app.put('/api/products/:id', async (req, res) => {
    try {
        const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedProduct);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// DELETE a product by ID
app.delete('/api/products/:id', async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted successfully.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// --- User Routes ---
// Note: In a real app, you would add authentication middleware to protect these routes.

// GET all users
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.find().select('-password'); // Exclude passwords from the result
        res.json(users);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST a new user (Signup)
app.post('/api/users', async (req, res) => {
    const user = new User(req.body);
    try {
        const newUser = await user.save();
        res.status(201).json({ id: newUser._id, name: newUser.name, email: newUser.email, role: newUser.role });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// POST login a user
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }
        // In a real app, you'd generate a JWT (JSON Web Token) here for session management
        res.json({
            message: "Login successful",
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// --- Other CRUD routes for Categories and Orders would follow a similar pattern ---


// --- 7. Start the Server ---
app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});
