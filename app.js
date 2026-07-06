// app.js
var createError = require('http-errors');
var express = require('express');
const bodyParser = require("body-parser");
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');

require('dotenv').config({ debug: false, silent: true, quiet: true });

// ================== ROUTES ==================

var authRouter = require('./routes/authRoutes');
var uploadRouter = require('./routes/uploadRoutes');

var countryRouter = require('./routes/itemRoutes');
var categoryRouter = require('./routes/itemRoutes');
var subcategoryRouter = require("./routes/itemRoutes");
var productRouter = require('./routes/itemRoutes');
var quoteenquireRouter = require('./routes/itemRoutes');
var contactusRouter = require('./routes/itemRoutes');
var bestsellingRouter = require('./routes/itemRoutes');
var newarrivalRouter = require('./routes/itemRoutes');
var enquiryRouter = require('./routes/itemRoutes');
var customerRouter = require('./routes/itemRoutes');
var ordertrackRouter = require('./routes/itemRoutes');



var app = express();

// ================== VIEW ENGINE ==================
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// ================== CORS ==================
// Allow the Vite dev servers (localhost + LAN, since Vite binds 0.0.0.0)
// plus any extra origins supplied via ALLOWED_ORIGINS (comma separated).
const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];
const envOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];
const lanOriginPattern = /^https?:\/\/((192\.168|10\.\d+)\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+):\d+$/;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || lanOriginPattern.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'cache-control', 'pragma']
}));

// ================== BODY PARSERS ==================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/storage', express.static(path.join(__dirname, 'storage')));
app.use(logger('dev'));

// ================== ROUTES ==================

app.use('/auth', authRouter);
app.use('/upload', uploadRouter);
app.use('/country', countryRouter);
app.use('/category', categoryRouter);
app.use('/subcategory', subcategoryRouter);
app.use('/product', productRouter);
app.use('/quoteenquire', quoteenquireRouter);
app.use('/contactus', contactusRouter);
app.use('/bestselling', bestsellingRouter);
app.use('/newarrival', newarrivalRouter);
app.use('/enquiry', enquiryRouter);
app.use('/customer', customerRouter);
app.use('/ordertrack', ordertrackRouter);

// ================== HEALTH CHECK ==================
app.get('/', (req, res) => {
  res.json({ status: 1, message: "API running successfully" });
});

// ================== 404 HANDLER ==================
app.use(function (req, res, next) {
  next(createError(404));
});

// ================== ERROR HANDLER ==================
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.json({
    status: 0,
    message: err.message || "Internal server error"
  });
});

module.exports = app;