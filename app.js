// app.js
var createError = require('http-errors');
var express = require('express');
const bodyParser = require("body-parser");
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors');
const http = require("http");

require('dotenv').config({ debug: false, silent: true, quiet: true });

// ================== ROUTES ==================

var authRouter = require('./routes/authRoutes');

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



const PORT = process.env.PORT || 8001;

var app = express();

// ================== VIEW ENGINE ==================
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// ================== CORS ==================
app.use(cors({
  origin: ["http://localhost:5174","http://localhost:5174"],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization','cache-control','pragma']
}));

// ================== BODY PARSERS ==================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(logger('dev'));

const { log: showLog } = console;

// ================== ROUTES ==================

app.use('/auth', authRouter);
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

// ================== SERVER ==================
let server = http.createServer(app);

server.listen(PORT, () => showLog(`Server running on http://192.168.0.29:${PORT}`));

module.exports = app;