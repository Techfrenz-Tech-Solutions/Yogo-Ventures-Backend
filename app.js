// app.js
var createError = require('http-errors');
var express = require('express');
const bodyParser = require("body-parser");
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
var helmet = require('helmet');

require('dotenv').config({ debug: false, silent: true, quiet: true });

const isProduction = process.env.NODE_ENV === 'production';

// ================== JWT SECRET GUARD ==================
// No hardcoded fallback secret is allowed. In production, a missing
// JWT_SECRET is a fatal misconfiguration — refuse to start rather than
// silently signing/verifying tokens with a guessable default. In local
// dev, generate a random one for this run only so the server still boots,
// but tokens won't survive a restart until JWT_SECRET is set in .env.
if (!process.env.JWT_SECRET) {
  if (isProduction) {
    console.error('FATAL: JWT_SECRET environment variable is required in production. Refusing to start.');
    process.exit(1);
  } else {
    console.warn('WARNING: JWT_SECRET is not set in .env — using a random secret for this run only. Existing tokens will be invalidated on restart. Set JWT_SECRET in .env to avoid this.');
    process.env.JWT_SECRET = require('crypto').randomBytes(32).toString('hex');
  }
}

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
var settingsRouter = require('./routes/settingsRoutes');
var sampleRouter = require('./routes/itemRoutes');
var notificationsRouter = require('./routes/itemRoutes');
var dashboardRouter = require('./routes/itemRoutes');


var app = express();

// ================== SECURITY HEADERS ==================
app.use(helmet({
  // Disabling CSP by default: this API serves JSON + uploaded images to
  // separate-origin frontends, not HTML pages that need a content policy.
  // Revisit if the pug views under views/ are ever actually rendered.
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

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
// Only trusted in non-production: matches any private-network origin on any
// port, which is convenient for testing from other devices on a LAN but far
// too broad to allow once this is reachable from the public internet.
const lanOriginPattern = /^https?:\/\/((192\.168|10\.\d+)\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+):\d+$/;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    if (!isProduction && lanOriginPattern.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'cache-control', 'pragma'],
  // Without this, browsers hide Content-Disposition on cross-origin
  // responses — the admin panel's export download (a different origin
  // from this API) couldn't read the server-generated filename and every
  // .xlsx export silently fell back to a generic "export.xlsx".
  exposedHeaders: ['Content-Disposition']
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
app.use('/settings', settingsRouter);
app.use('/sample', sampleRouter);
app.use('/notifications', notificationsRouter);
app.use('/dashboard', dashboardRouter);

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
  // Always log full detail server-side; only expose it to the client
  // outside production, where every other controller's convention is a
  // generic "DB error"-style message rather than raw error text.
  console.error(err);
  res.status(err.status || 500);
  res.json({
    status: 0,
    message: (!isProduction && err.message) || "Internal server error"
  });
});

module.exports = app;