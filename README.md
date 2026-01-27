# 🛡️ Armoured Vehicles API (Backend)

The robust backend service for the Armoured Vehicles marketplace, built with **Next.js 15+ (App Router)**, **TypeScript**, **Sequelize (PostgreSQL)**, and **Material UI compatibility**.

## 🚀 Overview

This project serves as the centralized API layer, handling:
- **Authentication**: JWT-based auth with Access/Refresh tokens.
- **Role-Based Access Control (RBAC)**: Admin, Vendor, and Customer roles.
- **E-commerce Logic**: Products, Cart, Wishlist, Orders, and Checkout.
- **Onboarding**: Complex multi-step vendor/customer onboarding flows.
- **Admin Management**: User management, product moderation, and system configuration.

## 🛠️ Tech Stack

- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: PostgreSQL
- **ORM**: [Sequelize](https://sequelize.org/)
- **Validation**: [Zod](https://zod.dev/)
- **Documentation**: Swagger UI (`/api/docs`)
- **Security**: `bcryptjs` (hashing), `jsonwebtoken` (auth)

## 📂 Project Structure

Verified **MVC (Model-View-Controller)** pattern adapted for Next.js App Router:

```bash
src/
├── app/
│   ├── api/v1/         # API Route Entry Points (The 'View' layer for APIs)
│   │   ├── [resource]/route.ts  # Route Handlers
│   └── docs/           # Swagger UI Page
├── controllers/        # Business Logic (The 'Controller' layer)
│   ├── AuthController.ts
│   ├── ProductController.ts
│   └── ...
├── models/             # Database Schemas (The 'Model' layer)
│   ├── User.ts
│   ├── Product.ts
│   └── ...
├── migrations/         # Sequelize Migrations
├── seeders/            # Database Seeders
├── utils/              # Helpers (JWT, ResponseHandler, Logger)
└── config/             # Database & System Config
```

## ⚙️ Setup & Installation

### 1. Prerequisites
- Node.js (v18+ recommended)
- PostgreSQL Database
- Git

### 2. Installation
```bash
# Clone the repository
git clone <repo-url>

# Navigate to backend
cd ArmouredVehiclesApis_New

# Install dependencies
npm install
```

### 3. Environment Variables
Create a `.env` file in the root directory:

```env
# Server
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_USER=postgres
DB_PASS=yourpassword
DB_NAME=armoured_vehicles
DB_PORT=5432
# Or use connection string
DATABASE_URL=postgres://user:pass@host:5432/dbname

# Authentication
JWT_SECRET=your_super_secret_jwt_key
JWT_REFRESH_SECRET=your_super_secret_refresh_key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

### 4. Database Setup
```bash
# Run Migrations (Create Tables)
npm run db:migrate

# Seed Data (Optional - default roles/users)
npm run db:seed
```

## 🏃‍♂️ Running the Application

### Development Mode
Runs on **Port 3001** to avoid conflicts with frontend (usually 3000).
```bash
npm run dev
```

### Production Build
```bash
# Build the project
npm run build

# Start production server
npm start
```

## 📚 API Documentation (Swagger)

The API documentation is auto-generated and available at:
- **URL**: `http://localhost:3001/api/docs`

---
**Armoured Vehicles Marketplace** © 2026
