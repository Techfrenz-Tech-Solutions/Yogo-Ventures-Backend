# Yogo Ventures - Product Management API

A Node.js Express backend application for managing products, categories, enquiries, and customer orders for Yogo Ventures.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Local Database Setup](#-local-database-setup)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Database](#database)
- [Authentication](#-authentication)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)

## ✨ Features

- **Country Management** - CRUD operations for country master data
- **Category & Sub-Category Management** - Organize products by hierarchical categories
- **Product Management** - Manage products with multiple images and descriptions
- **Enquiry Management** - Handle quote requests and contact enquiries
- **Customer Management** - Customer information and order tracking
- **Best Selling & New Arrivals** - Showcase featured products
- **Admin Login** - Email/password + JWT, protecting all write/admin-list endpoints
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

- Node.js (v18 or higher)
- MySQL (v5.7 or higher) — or MariaDB via XAMPP/WAMP/Laragon
- NPM or Yarn package manager

## 🚀 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Yogo-Ventures-Backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up the MySQL database (see [Local Database Setup](#-local-database-setup) below)

4. Configure environment variables (see [Configuration](#configuration) section)

5. Start the server (see [Running the Application](#-running-the-application))

## 🗃️ Local Database Setup

The full schema lives in [`schema.sql`](./schema.sql) at the repo root — it's the
source of truth for every table this API reads/writes, including the real
admin login user. It's idempotent (`CREATE TABLE IF NOT EXISTS`, `INSERT IGNORE`),
so it's safe to re-run.

**Option A — command line:**
```bash
# bash / macOS / Linux / Git Bash on Windows
mysql -u root -p < schema.sql

# Windows PowerShell (mysql doesn't support `<` there)
Get-Content schema.sql | mysql -u root -p

# Windows cmd.exe
mysql -u root -p < schema.sql
```

**Option B — phpMyAdmin (XAMPP/WAMP/Laragon):**
1. Open phpMyAdmin → click the **SQL** tab (works from any DB context — the
   script creates and switches to `yogoventures` itself).
2. Paste the contents of `schema.sql`, click **Go**.

This creates the `yogoventures` database and every table the code queries,
plus one ready-to-use admin login: `admin@yogoventures.com` / `Yogo@123`
(matches what's shown on the admin panel's login screen).

If your MySQL instance uses different credentials, or you're pointing at an
existing database with a different name, just set `DB_*` in `.env` (below) —
you don't have to use `root`/no-password/`yogoventures`.

## ⚙️ Configuration

Copy [`.env.example`](./.env.example) to `.env` and adjust as needed:

```bash
cp .env.example .env
```

```env
# Server Configuration
PORT=7002

# Database Configuration — must match a database created from schema.sql
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=yogoventures

# Comma-separated extra CORS origins (localhost:5173/5174 and any LAN IP
# are already allowed by default — see app.js)
ALLOWED_ORIGINS=

# JWT Configuration — secret used to sign/verify login tokens
JWT_SECRET=SECRET@KEY
```

> **Not needed for local dev:** `AWS_ACCESS_KEY_ID`, `RAZORPAY_KEY_ID`, etc.
> are only referenced by `controllers/userController.js`, which belongs to a
> different, unrelated project and isn't wired into `app.js` at all (see
> [Project Structure](#-project-structure) note below). The live Yogo
> Ventures API never touches AWS SES or Razorpay.

## 📡 API Endpoints

🔒 = requires `Authorization: Bearer <token>` (see [Authentication](#-authentication) below).
🌐 = public, no token needed — these are the ones the public website calls directly.

### Authentication
- `POST /auth/login` 🌐 — `{ email_id, password }` → `{ token, user }`

### Country Management (admin-only)
- `POST /country/countrycreate` 🔒
- `GET /country/countrylist` 🔒
- `GET /country/country/:id` 🔒
- `POST /country/countryupdate` 🔒
- `POST /country/countrydelete` 🔒

### Category Management
- `POST /category/categorycreate` 🔒
- `GET /category/categorylist` 🔒
- `GET /category/category/:id` 🔒
- `POST /category/categoryupdate` 🔒
- `POST /category/categorydelete` 🔒
- `GET /category/categorydropdown` 🌐 — used by the public website's shop filters

### Sub-Category Management
- `POST /subcategory/sub-categorycreate` 🔒
- `GET /subcategory/sub-categorylist` 🌐 — used by the public website's shop filters
- `GET /subcategory/sub-category/:id` 🔒
- `POST /subcategory/sub-categoryupdate` 🔒
- `POST /subcategory/sub-categorydelete` 🔒
- `GET /subcategory/sub-categorydropdown` 🌐

### Product Management
- `POST /product/productcreate` 🔒
- `GET /product/productlist` 🌐 — used by the public website's shop/homepage
- `GET /product/product/:id` 🔒
- `POST /product/productupdate` 🔒
- `POST /product/productdelete` 🔒

### Enquiry & Quote Management
- `POST /quoteenquire/enquiry-quotecreate` 🌐 — public website "Get a Quote" form
- `GET /quoteenquire/enquiry-quotelist` 🔒
- `GET /quoteenquire/enquiry-quote/:id` 🔒
- `POST /quoteenquire/enquiry-quoteupdate-status` 🔒
- `POST /quoteenquire/enquiry-quotedelete` 🔒

### Contact Us Management
- `POST /contactus/contact-uscreate` 🌐 — public website contact form
- `GET /contactus/contact-uslist` 🔒
- `GET /contactus/contact-us/:id` 🔒
- `POST /contactus/contact-usupdate-status` 🔒
- `POST /contactus/contact-usdelete` 🔒

### Best Selling Products
- `POST /bestselling/best-sellingcreate` 🔒
- `GET /bestselling/best-sellinglist` 🌐 — used by the public website homepage
- `GET /bestselling/best-selling/:id` 🔒
- `POST /bestselling/best-sellingupdate` 🔒
- `POST /bestselling/best-sellingdelete` 🔒

### New Arrivals
- `POST /newarrival/new-arrivalcreate` 🔒
- `GET /newarrival/new-arrivallist` 🌐 — used by the public website homepage
- `GET /newarrival/new-arrival/:id` 🔒
- `POST /newarrival/new-arrivalupdate` 🔒
- `POST /newarrival/new-arrivaldelete` 🔒

### General Enquiries
- `POST /enquiry/enquirycreate` 🌐 — public website enquiry form
- `GET /enquiry/enquirylist` 🔒
- `GET /enquiry/enquiry/:id` 🔒
- `POST /enquiry/enquiryupdate-status` 🔒
- `POST /enquiry/enquirydelete` 🔒

### Customer Management (admin-only)
- `POST /customer/customercreate` 🔒
- `GET /customer/customerlist` 🔒
- `GET /customer/customer/:id` 🔒
- `POST /customer/customerupdate` 🔒
- `POST /customer/customerdelete` 🔒

### Order Tracking (admin-only)
- `POST /ordertrack/order-trackingcreate` 🔒
- `GET /ordertrack/order-trackinglist` 🔒
- `GET /ordertrack/order-tracking/:id` 🔒
- `POST /ordertrack/order-trackingupdate` 🔒
- `POST /ordertrack/order-trackingdelete` 🔒

### Image Upload (admin-only)
- `POST /upload` 🔒 — generic single-image upload, multipart field name `image`

### Health Check
- `GET /` 🌐 — API health check, no DB required

> `controllers/userController.js` and `routes/userRouter.js` (OTP login, wallet,
> tickets, referral profit) are **not mounted in `app.js`** and belong to an
> unrelated project — they're unreachable dead code, not part of this API.

## 🗄️ Database

MySQL. Every table below is defined in [`schema.sql`](./schema.sql) — that
file is the source of truth, not this list:

- `users` - Admin login (JWT auth)
- `country_master` - Country information
- `category_master` - Product categories
- `sub_category_master` - Product sub-categories
- `product_master` - Product details with images
- `get_enquire_quote` - Quote enquiries
- `contact_us_enquiry` - Contact form submissions
- `enquiries` - General enquiries
- `best_selling` - Best selling products
- `new_arrivals` - New arrival products
- `customer_master` - Customer information
- `order_tracking` - Order tracking details (FK → `customer_master.id`)

`mo_user_info`, `mo_user_wallet`, `mo_mail_otp_logs`, `mo_mobile_otp_logs` and
similar `mo_*` tables are **not** part of this schema — they belong to
`controllers/userController.js`, which is unrelated leftover code that isn't
mounted in `app.js` (see the note under [API Endpoints](#-api-endpoints)).
You don't need them.

## 🔑 Authentication

Get a token:
```bash
curl -X POST http://localhost:7002/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email_id\":\"admin@yogoventures.com\",\"password\":\"Yogo@123\"}"
```
Response: `{ "status": 1, "token": "Bearer eyJ...", "user": { ... } }`

Use it on any 🔒 route:
```bash
curl http://localhost:7002/category/categorylist \
  -H "Authorization: Bearer eyJ..."
```
(the `token` field already includes the `Bearer ` prefix — pass it through as-is)

Missing/invalid/expired tokens get a real `401` with `{ "status": 0, "message": "..." }`.

## 🏃 Running the Application

### Development Mode
```bash
npm start
```

The server starts on `http://localhost:7002` by default (or whatever `PORT`
is set to in `.env`) and prints both the localhost and LAN URLs it's
reachable on.

### Verify it's connected
```bash
# 1. Health check — works even with no DB
curl http://localhost:7002/

# 2. Hits the DB — should return {"status":1,"data":[...]}, not "DB error"
curl http://localhost:7002/category/categorydropdown

# 3. Login should succeed if schema.sql was imported
curl -X POST http://localhost:7002/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email_id\":\"admin@yogoventures.com\",\"password\":\"Yogo@123\"}"
```
If step 2 returns `{"status":0,"message":"DB error"}`, the server is running
but can't reach MySQL — double check `DB_*` in `.env` and that MySQL is
actually running (`mysql -u root -p -e "SELECT 1"` as a quick sanity check).

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
Yogo-Ventures-Backend/
├── bin/
│   └── www                 # Server entry point (npm start runs this)
├── controllers/
│   ├── authController.js       # Real, mounted — /auth/login
│   ├── itemMasterController.js # Real, mounted — everything in schema.sql
│   ├── uploadController.js     # Real, mounted — generic /upload
│   └── userController.js       # NOT mounted — unrelated project, dead code
├── helper/
│   ├── common.js           # Unused generic UPDATE helper (only used by userController.js)
│   ├── helper.js           # JWT `auth` middleware + unused generic CRUD/maintenance helpers
│   └── upload.js           # Multer config — writes into storage/
├── models/
│   └── db.js                # MySQL pool, reads DB_* from .env
├── routes/
│   ├── authRoutes.js       # Mounted at /auth
│   ├── itemRoutes.js       # Mounted 11x under different prefixes — see API Endpoints
│   ├── uploadRoutes.js     # Mounted at /upload
│   └── userRouter.js       # NOT mounted — unrelated project, dead code
├── storage/                # Uploaded product/best-selling/new-arrival images (served at /storage)
├── views/                  # Pug templates (error/index/layout)
├── .env                    # Your local config — gitignored
├── .env.example            # Template for .env
├── app.js                  # Express app: middleware, CORS, route mounting
├── ecosystem.config.js     # PM2 config
├── package.json
├── schema.sql               # Source of truth for the DB — see Local Database Setup
└── README.md
```

## 🔒 Security Notes

- The `.env` file contains sensitive information and is excluded from version control
- JWT tokens are used for API authentication (see [Authentication](#-authentication))
- Password hashing with bcrypt
- CORS restricted to localhost:5173/5174, any LAN IP, and `ALLOWED_ORIGINS` (see `app.js`)

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
