const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middleware/errorHandler');

dotenv.config();

const PORT = process.env.PORT || 5000;
const isVercel = Boolean(process.env.VERCEL);
const allowedOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(url => url.trim())
  .filter(Boolean);
let dbReadyPromise;

const app = express();

function ensureDbConnection() {
  if (!dbReadyPromise) {
    dbReadyPromise = connectDB().catch((err) => {
      dbReadyPromise = undefined;
      throw err;
    });
  }

  return dbReadyPromise;
}

app.use(express.json());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(async (req, res, next) => {
  try {
    await ensureDbConnection();
    next();
  } catch (err) {
    next(err);
  }
});

// Routes
app.use('/api/auth', require('./src/routes/auth.routes'));
app.use('/api/categories', require('./src/routes/category.routes'));
app.use('/api/products', require('./src/routes/product.routes'));
app.use('/api/orders', require('./src/routes/order.routes'));
app.use('/api/dashboard', require('./src/routes/dashboard.routes'));
app.use('/api/restock', require('./src/routes/restock.routes'));
app.use('/api/logs', require('./src/routes/logs.routes'));

app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

app.use(errorHandler);

if (!isVercel) {
  ensureDbConnection()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to start server due to DB connection error:', err);
      process.exit(1);
    });
}

module.exports = app;
