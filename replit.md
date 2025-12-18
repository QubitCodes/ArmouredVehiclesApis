# AutoParts B2B Marketplace

## Overview

A B2B e-commerce marketplace for automotive and defense vehicle parts. The platform connects verified vendors with workshops and retailers, offering features like product catalog browsing, shopping cart management, checkout with Stripe integration, and user authentication. The application follows a full-stack architecture with React frontend and Express backend, using PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state, local state with React hooks
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style variant)
- **Build Tool**: Vite with custom plugins for Replit integration

The frontend is organized under `client/src/` with pages, components, hooks, and lib utilities. Components follow the shadcn/ui pattern with Radix UI primitives.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Design**: RESTful endpoints under `/api` prefix
- **Documentation**: Swagger/OpenAPI integration at `/api-docs`
- **Authentication**: Token-based auth with Bearer tokens stored in memory (sessions Map)

The server handles API routes in `server/routes.ts`, with database operations abstracted through `server/storage.ts`.

### Data Storage
- **Database**: PostgreSQL with Drizzle ORM
- **Schema**: Defined in `shared/schema.ts` with tables for users, products, categories, reviews, cart items, orders, and order items
- **Migrations**: Managed via `drizzle-kit push` command

Key entities:
- Users (customer, vendor, admin, super_admin roles)
- Products (with SKU, pricing, inventory, vehicle fitment data)
- Categories (hierarchical product organization)
- Cart and Orders (e-commerce workflow)

### API Structure
The API follows RESTful conventions with endpoints for:
- `/api/auth/*` - Authentication (login, register, me)
- `/api/products/*` - Product catalog (list, details, featured, recommendations)
- `/api/categories` - Category management
- `/api/cart/*` - Shopping cart operations
- `/api/checkout/*` - Stripe checkout session creation
- `/api/orders/*` - Order management

### Build System
- Development: Vite dev server for frontend, tsx for backend with hot reload
- Production: Custom build script using esbuild for server bundling, Vite for client
- Output: `dist/` directory with `index.cjs` (server) and `public/` (static assets)

## External Dependencies

### Payment Processing
- **Stripe**: Integrated for checkout sessions, with support for both development and production environments via Replit Connectors

### Database
- **PostgreSQL**: Required via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries with automatic schema inference

### UI Components
- **Radix UI**: Headless component primitives (dialog, dropdown, accordion, etc.)
- **Embla Carousel**: Product image carousels with autoplay
- **Lucide React**: Icon library

### Authentication
- **bcryptjs**: Password hashing
- Session tokens stored in-memory (consider Redis for production scaling)

### Development Tools
- **Replit Plugins**: Cartographer, dev banner, runtime error overlay
- **TypeScript**: Full type safety across client, server, and shared code