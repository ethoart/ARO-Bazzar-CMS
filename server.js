// ARO Bazzar - SQL Backend Server
// This version uses Node.js, Express, and Sequelize with a PostgreSQL database.

// --- 1. Import Dependencies ---
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// --- 2. Initialize Express App ---
const app = express();
const PORT = process.env.PORT || 8080;

// --- 3. Middleware ---
app.use(cors());
app.use(express.json());

// --- 4. Database Connection (Sequelize) ---
const dbURI = process.env.DATABASE_URL;

if (!dbURI) {
    console.error("FATAL ERROR: DATABASE_URL is not defined in the environment variables.");
    process.exit(1);
}

const sequelize = new Sequelize(dbURI, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
    },
    logging: false, 
});

// Test the database connection
const testDbConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Successfully connected to PostgreSQL database.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        // We don't exit the process here anymore, to allow the server to stay running.
    }
};


// --- 5. Sequelize Models (Data Structure) ---

const User = sequelize.define('User', {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true } },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, defaultValue: 'Editor', validate: { isIn: [['Admin', 'Editor']] } }
}, {
    hooks: {
        beforeCreate: async (user) => {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
        }
    }
});

const Product = sequelize.define('Product', {
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    price: { type: DataTypes.FLOAT, allowNull: false },
    stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING, defaultValue: 'Active', validate: { isIn: [['Active', 'Archived', 'Out of Stock']] } },
    images: { type: DataTypes.ARRAY(DataTypes.STRING) }
});

const Category = sequelize.define('Category', {
    name: { type: DataTypes.STRING, allowNull: false, unique: true }
});

const Order = sequelize.define('Order', {
    customer: { type: DataTypes.STRING, allowNull: false },
    total: { type: DataTypes.FLOAT, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'Processing', validate: { isIn: [['Processing', 'Shipped', 'Delivered', 'Cancelled']] } }
});

const OrderItem = sequelize.define('OrderItem', {
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false }
});

Category.hasMany(Product);
Product.belongsTo(Category);
Order.belongsToMany(Product, { through: OrderItem });
Product.belongsToMany(Order, { through: OrderItem });

// --- 6. API Routes (Endpoints) ---

// **FIXED**: Added a health check route that doesn't require a database connection.
// This gives Google Cloud Run a way to verify the server is running.
app.get('/healthz', (req, res) => res.status(200).send('OK'));

app.get('/', (req, res) => res.send('Welcome to the ARO Bazzar SQL Backend API!'));

// --- Product Routes ---
app.get('/api/products', async (req, res) => { try { const products = await Product.findAll({ include: Category }); res.json(products); } catch (e) { res.status(500).json({ message: e.message }); }});
app.post('/api/products', async (req, res) => { try { const newProduct = await Product.create(req.body); res.status(201).json(newProduct); } catch (e) { res.status(400).json({ message: e.message }); }});
app.put('/api/products/:id', async (req, res) => { try { await Product.update(req.body, { where: { id: req.params.id } }); res.json({ message: 'Product updated' }); } catch (e) { res.status(400).json({ message: e.message }); }});
app.delete('/api/products/:id', async (req, res) => { try { await Product.destroy({ where: { id: req.params.id } }); res.json({ message: 'Product deleted' }); } catch (e) { res.status(500).json({ message: e.message }); }});

// --- Category Routes ---
app.get('/api/categories', async (req, res) => { try { const categories = await Category.findAll(); res.json(categories); } catch (e) { res.status(500).json({ message: e.message }); }});
app.post('/api/categories', async (req, res) => { try { const newCategory = await Category.create(req.body); res.status(201).json(newCategory); } catch (e) { res.status(400).json({ message: e.message }); }});
app.put('/api/categories/:id', async (req, res) => { try { await Category.update(req.body, { where: { id: req.params.id } }); res.json({ message: 'Category updated' }); } catch (e) { res.status(400).json({ message: e.message }); }});
app.delete('/api/categories/:id', async (req, res) => { try { await Category.destroy({ where: { id: req.params.id } }); res.json({ message: 'Category deleted' }); } catch (e) { res.status(500).json({ message: e.message }); }});

// --- Order Routes ---
app.get('/api/orders', async (req, res) => { try { const orders = await Order.findAll({ include: Product, order: [['createdAt', 'DESC']] }); res.json(orders); } catch (e) { res.status(500).json({ message: e.message }); }});
app.post('/api/orders', async (req, res) => { try { const newOrder = await Order.create(req.body); res.status(201).json(newOrder); } catch (e) { res.status(400).json({ message: e.message }); }});
app.put('/api/orders/:id', async (req, res) => { try { await Order.update(req.body, { where: { id: req.params.id } }); res.json({ message: 'Order updated' }); } catch (e) { res.status(400).json({ message: e.message }); }});


// --- User Routes ---
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(400).json({ message: 'Invalid credentials' });
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const userPayload = { id: user.id, name: user.name, email: user.email, role: user.role };
        res.json({ message: "Login successful", user: userPayload });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
app.get('/api/users', async (req, res) => { try { const users = await User.findAll({ attributes: { exclude: ['password'] } }); res.json(users); } catch (e) { res.status(500).json({ message: e.message }); }});
app.post('/api/users', async (req, res) => { try { const newUser = await User.create(req.body); const userPayload = { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }; res.status(201).json(userPayload); } catch (e) { res.status(400).json({ message: e.message }); }});
app.put('/api/users/:id', async (req, res) => { try { await User.update(req.body, { where: { id: req.params.id } }); res.json({ message: 'User updated' }); } catch (e) { res.status(400).json({ message: e.message }); }});
app.delete('/api/users/:id', async (req, res) => { try { await User.destroy({ where: { id: req.params.id } }); res.json({ message: 'User deleted' }); } catch (e) { res.status(500).json({ message: e.message }); }});

// --- 7. Start the Server and Database Connection ---
const startServer = async () => {
    // **FIXED**: Start the web server immediately.
    app.listen(PORT, () => {
        console.log(`Server is listening on port: ${PORT}`);
        // **FIXED**: Connect to the database AFTER the server is running.
        testDbConnection();
        // Sync database tables
        sequelize.sync({ alter: true }).then(() => console.log("Database & tables synced!"));
    });
};

startServer();
