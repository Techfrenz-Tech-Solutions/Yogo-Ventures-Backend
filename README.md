# Yogo Ventures - Product Management API

A Node.js Express backend application for managing products, categories, enquiries, and customer orders for Yogo Ventures.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Database](#database)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)

## ✨ Features

- **Country Management** - CRUD operations for country master data
- **Category & Sub-Category Management** - Organize products by hierarchical categories
- **Product Management** - Manage products with multiple images and descriptions
- **Enquiry Management** - Handle quote requests and contact enquiries
- **Customer Management** - Customer information and order tracking
- **Best Selling & New Arrivals** - Showcase featured products
- **User Authentication** - OTP-based email and mobile verification
- **JWT Token Authentication** - Secure API access
- **Order Tracking** - Track customer orders and status

## 🛠 Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MySQL
- **Authentication:** JWT, Bcrypt
- **Email Service:** AWS SES, Nodemailer
- **Payment Gateway:** Razorpay
- **Template Engine:** Pug
- **Other Libraries:** 
  - Multer (file uploads)
  - Moment (date handling)
  - Node-cron (scheduled tasks)
  - Node-input-validator (validation)
  - CORS (cross-origin requests)

## 📦 Prerequisites

- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- NPM or Yarn package manager

## 🚀 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd "yogo ventures"
```

2. Install dependencies:
```bash
npm install
```

3. Set up the MySQL database (see [Database](#database) section)

4. Configure environment variables (see [Configuration](#configuration) section)

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=8001

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=yogoventures
DB_PORT=3306

# JWT Configuration
JWT_SECRET=SECRET@KEY

# AWS SES Configuration (if using email)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=your_region

# Razorpay Configuration (if using payments)
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
```

## 📡 API Endpoints

### Country Management
- `POST /country/countrycreate` - Create a new country
- `GET /country/countrylist` - Get all countries
- `GET /country/country/:id` - Get country by ID
- `POST /country/countryupdate` - Update country
- `POST /country/countrydelete` - Delete country

### Category Management
- `POST /category/categorycreate` - Create a new category
- `GET /category/categorylist` - Get all categories
- `GET /category/category/:id` - Get category by ID
- `POST /category/categoryupdate` - Update category
- `POST /category/categorydelete` - Delete category
- `GET /category/categorydropdown` - Get categories for dropdown

### Sub-Category Management
- `POST /subcategory/sub-categorycreate` - Create sub-category
- `GET /subcategory/sub-categorylist` - Get all sub-categories
- `GET /subcategory/sub-category/:id` - Get sub-category by ID
- `POST /subcategory/sub-categoryupdate` - Update sub-category
- `POST /subcategory/sub-categorydelete` - Delete sub-category
- `GET /subcategory/sub-categorydropdown` - Get sub-categories for dropdown

### Product Management
- `POST /product/productcreate` - Create a new product
- `GET /product/productlist` - Get all products
- `GET /product/product/:id` - Get product by ID
- `POST /product/productupdate` - Update product
- `POST /product/productdelete` - Delete product

### Enquiry & Quote Management
- `POST /quoteenquire/enquiry-quotecreate` - Submit quote enquiry
- `GET /quoteenquire/enquiry-quotelist` - Get all quote enquiries
- `GET /quoteenquire/enquiry-quote/:id` - Get enquiry by ID
- `POST /quoteenquire/enquiry-quoteupdate-status` - Update enquiry status
- `POST /quoteenquire/enquiry-quotedelete` - Delete enquiry

### Contact Us Management
- `POST /contactus/contact-uscreate` - Submit contact enquiry
- `GET /contactus/contact-uslist` - Get all contact enquiries
- `GET /contactus/contact-us/:id` - Get contact by ID
- `POST /contactus/contact-usupdate-status` - Update status
- `POST /contactus/contact-usdelete` - Delete contact

### Best Selling Products
- `POST /bestselling/best-sellingcreate` - Add to best selling
- `GET /bestselling/best-sellinglist` - Get best selling products
- `GET /bestselling/best-selling/:id` - Get by ID
- `POST /bestselling/best-sellingupdate` - Update
- `POST /bestselling/best-sellingdelete` - Delete

### New Arrivals
- `POST /newarrival/new-arrivalcreate` - Add to new arrivals
- `GET /newarrival/new-arrivallist` - Get new arrivals
- `GET /newarrival/new-arrival/:id` - Get by ID
- `POST /newarrival/new-arrivalupdate` - Update
- `POST /newarrival/new-arrivaldelete` - Delete

### Customer Management
- `POST /customer/customercreate` - Create customer
- `GET /customer/customerlist` - Get all customers
- `GET /customer/customer/:id` - Get customer by ID
- `POST /customer/customerupdate` - Update customer
- `POST /customer/customerdelete` - Delete customer

### Order Tracking
- `POST /ordertrack/order-trackingcreate` - Create order tracking
- `GET /ordertrack/order-trackinglist` - Get all tracking records
- `GET /ordertrack/order-tracking/:id` - Get tracking by ID
- `POST /ordertrack/order-trackingupdate` - Update tracking
- `POST /ordertrack/order-trackingdelete` - Delete tracking

### User Authentication (Not mounted in app.js currently)
- `POST /users/createAccount` - Register new user
- `POST /users/login` - Login user (sends OTP)
- `POST /users/loginVerify` - Verify OTP and get JWT token
- `POST /users/send_mail_otp_register` - Send email OTP for registration
- `POST /users/send_mob_otp_register` - Send mobile OTP for registration
- `POST /users/verify_mail_otp_register` - Verify email OTP
- `POST /users/verify_mobile_otp_register` - Verify mobile OTP
- `POST /users/info` - Get user info (requires authentication)

### Health Check
- `GET /` - API health check

## 🗄️ Database

The application uses MySQL database. Key tables include:

- `country_master` - Country information
- `category_master` - Product categories
- `sub_category_master` - Product sub-categories
- `product_master` - Product details with images
- `get_enquire_quote` - Quote enquiries
- `contact_us_enquiry` - Contact form submissions
- `best_selling` - Best selling products
- `new_arrival` - New arrival products
- `customer_master` - Customer information
- `order_tracking` - Order tracking details
- `mo_user_info` - User accounts
- `mo_user_wallet` - User wallet information
- `mo_mail_otp_logs` - Email OTP logs
- `mo_mobile_otp_logs` - Mobile OTP logs

## 🏃 Running the Application

### Development Mode
```bash
npm start
```

The server will start on `http://localhost:8001` (or the PORT specified in .env)

### Production Mode with PM2
```bash
pm2 start ecosystem.config.js
```

Monitor PM2 processes:
```bash
pm2 list
pm2 logs
pm2 monit
```

## 📁 Project Structure

```
yogo ventures/
├── bin/                    # Binary scripts
├── config/                 # Configuration files
├── controllers/            # Request handlers
│   ├── itemMasterController.js
│   └── userController.js
├── helper/                 # Helper utilities
│   ├── common.js
│   └── helper.js
├── logs/                   # Application logs
│   └── pm2/               # PM2 logs
├── models/                 # Database models
│   └── db.js
├── node_modules/          # Dependencies
├── public/                # Static files
│   ├── images/
│   ├── javascripts/
│   └── stylesheets/
├── routes/                # API routes
│   ├── itemRoutes.js
│   └── userRouter.js
├── views/                 # Pug templates
│   ├── error.pug
│   ├── index.pug
│   └── layout.pug
├── .env                   # Environment variables (not in git)
├── .gitignore            # Git ignore file
├── app.js                # Main application file
├── ecosystem.config.js   # PM2 configuration
├── package.json          # Dependencies and scripts
└── README.md             # This file
```

## 🔒 Security Notes

- The `.env` file contains sensitive information and is excluded from version control
- JWT tokens are used for API authentication
- OTP-based verification for user registration
- Password hashing with bcrypt
- CORS enabled for specified origins

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is proprietary software for Yogo Ventures.

## 📧 Contact

For any inquiries, please contact the Yogo Ventures development team.

---

**Note:** Ensure all environment variables are properly configured before running the application.
