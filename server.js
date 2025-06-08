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
// The database connection string is loaded from an environment variable.
// For a PostgreSQL database, it will look like: "postgres://USER:PASSWORD@HOST:PORT/DATABASE"
const dbURI = process.env.DATABASE_URL;

if (!dbURI) {
    console.error("FATAL ERROR: DATABASE_URL is not defined. Please create a .env file and add your PostgreSQL connection string.");
    process.exit(1);
}

// **FIXED**: Added SSL configuration for connecting to managed cloud databases like Google Cloud SQL.
const sequelize = new Sequelize(dbURI, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false // This may be needed for some cloud providers
        }
    },
    logging: false, // Set to true to see SQL queries in the console
});

// Test the database connection
const testDbConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('Successfully connected to PostgreSQL database.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        process.exit(1);
    }
};
testDbConnection();


// --- 5. Sequelize Models (Data Structure) ---

// User Model
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

// Product Model
const Product = sequelize.define('Product', {
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    price: { type: DataTypes.FLOAT, allowNull: false },
    stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING, defaultValue: 'Active', validate: { isIn: [['Active', 'Archived', 'Out of Stock']] } },
    images: { type: DataTypes.ARRAY(DataTypes.STRING) }
});

// Category Model
const Category = sequelize.define('Category', {
    name: { type: DataTypes.STRING, allowNull: false, unique: true }
});

// Order Model
const Order = sequelize.define('Order', {
    customer: { type: DataTypes.STRING, allowNull: false },
    total: { type: DataTypes.FLOAT, allowNull: false },
    status: { type: DataTypes.STRING, defaultValue: 'Processing', validate: { isIn: [['Processing', 'Shipped', 'Delivered', 'Cancelled']] } }
});

// OrderItem Model (to link products to orders)
const OrderItem = sequelize.define('OrderItem', {
    quantity: { type: DataTypes.INTEGER, allowNull: false },
    price: { type: DataTypes.FLOAT, allowNull: false } // Price at the time of purchase
});

// --- Model Relationships ---
Category.hasMany(Product, { onDelete: 'SET NULL' });
Product.belongsTo(Category);

Order.belongsToMany(Product, { through: OrderItem });
Product.belongsToMany(Order, { through: OrderItem });

// Sync all models with the database
sequelize.sync({ alter: true }).then(() => console.log("Database & tables created!"));


// --- 6. API Routes (Endpoints) ---

app.get('/', (req, res) => res.send('Welcome to the ARO Bazzar SQL Backend API!'));

// --- Product Routes ---
app.get('/api/products', async (req, res) => { try { const products = await Product.findAll({ include: Category }); res.json(products); } catch (e) { res.status(500).json({ message: e.message }); }});
app.post('/api/products', async (req, res) => { try { const newProduct = await Product.create(req.body); res.status(201).json(newProduct); } catch (e) { res.status(400).json({ message: e.message }); }});
app.put('/api/products/:id', async (req, res) => { try { await Product.update(req.body, { where: { id: req.params.id } }); res.json({ message: 'Product updated' }); } catch (e) { res.status(400).json({ message: e.message }); }});
app.delete('/api/products/:id', async (req, res) => { try { await Product.destroy({ where: { id: req.params.id } }); res.json({ message: 'Product deleted' }); } catch (e) { res.status(500).json({ message: e.message }); }});

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

// --- The rest of the API routes (Categories, Orders) would follow a similar pattern ---


// --- 7. Start the Server ---
app.listen(PORT, () => {
    console.log(`Server is running on port: ${PORT}`);
});
