// ARO Bazzar - Backend Server (Diagnostic Version)
// This version includes enhanced logging to diagnose connection issues.

// --- 1. Import Dependencies ---
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// --- 2. Initialize Express App ---
const app = express();
// Cloud Run provides the PORT environment variable automatically.
const PORT = process.env.PORT || 8080;

// --- 3. Middleware ---
app.use(cors());
app.use(express.json());

// --- 4. Database Connection ---
const dbURI = process.env.MONGO_URI;

// This function will attempt to connect to the database.
const connectDB = async () => {
    if (!dbURI) {
        console.error("FATAL ERROR: The MONGO_URI environment variable is not defined in the Google Cloud Run service configuration.");
        process.exit(1); // Exit if the connection string is missing.
    }
    try {
        console.log("DIAGNOSTIC: Attempting to connect to MongoDB Atlas...");
        console.log("DIAGNOSTIC: Using a URI that starts with: " + dbURI.substring(0, 20) + "..."); // Logs the start of the URI without revealing the password.

        // Attempt the connection with an increased timeout for cloud environments.
        await mongoose.connect(dbURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 20000, // Increased timeout to 20 seconds
            socketTimeoutMS: 45000, // Increased socket timeout
        });

        console.log('DIAGNOSTIC: Successfully established connection to MongoDB database.');

    } catch (err) {
        // This block will execute if the connection fails, providing detailed logs.
        console.error('----------------------------------------------------');
        console.error('DIAGNOSTIC: DATABASE CONNECTION FAILED.');
        console.error('This is the most likely cause of the timeout error in your CMS.');
        console.error('Please carefully check the following:');
        console.error('1. In MongoDB Atlas, under Network Access, is "0.0.0.0/0" (Access from Anywhere) active?');
        console.error('2. In Google Cloud Run, is the MONGO_URI environment variable set correctly?');
        console.error('   - Did you replace <password> with your actual password?');
        console.error('   - Did you remove the angle brackets < > from around the password?');
        console.error('   - Are there any typos in your username, password, or cluster name?');
        console.error('Full Mongoose Error Message:', err.message);
        console.error('----------------------------------------------------');
        process.exit(1); // Exit the process if DB connection fails
    }
};

// Immediately attempt to connect to the database when the server starts.
connectDB();


// --- 5. Mongoose Schemas and API Routes (Full implementation) ---

// Schemas
const UserSchema = new mongoose.Schema({ name: { type: String, required: true }, email: { type: String, required: true, unique: true }, password: { type: String, required: true }, role: { type: String, enum: ['Admin', 'Editor'], default: 'Editor' } });
UserSchema.pre('save', async function(next) { if (!this.isModified('password')) return next(); const salt = await bcrypt.genSalt(10); this.password = await bcrypt.hash(this.password, salt); next(); });
const User = mongoose.model('User', UserSchema);
const ProductSchema = new mongoose.Schema({ name: { type: String, required: true }, description: { type: String }, price: { type: Number, required: true }, category: { type: String, required: true }, stock: { type: Number, required: true, default: 0 }, status: { type: String, enum: ['Active', 'Archived', 'Out of Stock'], default: 'Active' }, images: [{ type: String }], createdAt: { type: Date, default: Date.now } });
const Product = mongoose.model('Product', ProductSchema);
const CategorySchema = new mongoose.Schema({ name: { type: String, required: true, unique: true } });
const Category = mongoose.model('Category', CategorySchema);
const OrderSchema = new mongoose.Schema({ customer: { type: String, required: true }, items: [{ productName: String, quantity: Number, price: Number }], total: { type: Number, required: true }, status: { type: String, enum: ['Processing', 'Shipped', 'Delivered', 'Cancelled'], default: 'Processing' }, orderDate: { type: Date, default: Date.now } });
const Order = mongoose.model('Order', OrderSchema);

// API Routes
app.get('/', (req, res) => res.send('Welcome to the ARO Bazzar Backend API!'));
app.get('/api/products', async (req, res) => { try { const data = await Product.find(); res.json(data); } catch (e) { res.status(500).json({ message: e.message }); }});
app.post('/api/products', async (req, res) => { const item = new Product(req.body); try { const newItem = await item.save(); res.status(201).json(newItem); } catch (e) { res.status(400).json({ message: e.message }); }});
app.put('/api/products/:id', async (req, res) => { try { const updated = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json(updated); } catch (e) { res.status(400).json({ message: e.message }); }});
app.delete('/api/products/:id', async (req, res) => { try { await Product.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted successfully.' }); } catch (e) { res.status(500).json({ message: e.message }); }});
app.get('/api/categories', async (req, res) => { try { const data = await Category.find(); res.json(data); } catch (e) { res.status(500).json({ message: e.message }); }});
app.post('/api/categories', async (req, res) => { const item = new Category(req.body); try { const newItem = await item.save(); res.status(201).json(newItem); } catch (e) { res.status(400).json({ message: e.message }); }});
app.put('/api/categories/:id', async (req, res) => { try { const updated = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json(updated); } catch (e) { res.status(400).json({ message: e.message }); }});
app.delete('/api/categories/:id', async (req, res) => { try { await Category.findByIdAndDelete(req.params.id); res.json({ message: 'Deleted successfully.' }); } catch (e) { res.status(500).json({ message: e.message }); }});
app.get('/api/orders', async (req, res) => { try { const data = await Order.find().sort({ orderDate: -1 }); res.json(data); } catch (e) { res.status(500).json({ message: e.message }); }});
app.post('/api/orders', async (req, res) => { const item = new Order(req.body); try { const newItem = await item.save(); res.status(201).json(newItem); } catch (e) { res.status(400).json({ message: e.message }); }});
app.put('/api/orders/:id', async (req, res) => { try { const updated = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true }); res.json(updated); } catch (e) { res.status(400).json({ message: e.message }); }});
app.get('/api/users', async (req, res) => { try { const data = await User.find().select('-password'); res.json(data); } catch (e) { res.status(500).json({ message: e.message }); }});
app.post('/api/users', async (req, res) => { const item = new User(req.body); try { const newItem = await item.save(); res.status(201).json({ _id: newItem._id, name: newItem.name, email: newItem.email, role: newItem.role }); } catch (e) { res.status(400).json({ message: e.message }); }});
app.put('/api/users/:id', async (req, res) => { try { const { name, email, role } = req.body; const updated = await User.findByIdAndUpdate(req.params.id, { name, email, role }, { new: true }).select('-password'); res.json(updated); } catch (e) { res.status(400).json({ message: e.message }); }});
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

// --- 6. Start the Server ---
app.listen(PORT, () => {
    console.log(`Server is listening on port: ${PORT}`);
});
