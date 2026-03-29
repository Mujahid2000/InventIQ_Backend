# InventIQ — Smart Inventory & Order Management System

## Live Demo
- Frontend: [Vercel URL here]
- Backend API: [Render URL here]
- Demo credentials: demo@test.com / demo123

## API Docs (Swagger)
- Swagger UI: /api/docs

## Features
- JWT Authentication with demo login
- Product & category management
- Real-time stock tracking
- Order lifecycle management (Pending→Delivered)
- Automated restock queue with priority levels
- Conflict detection (duplicate/inactive products)
- Dashboard with analytics charts
- Activity log timeline
- Role-based access (Admin / Manager)

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas |
| Auth | JWT + bcryptjs |
| Charts | Recharts |
| Deployment | Vercel + Render |

## Getting Started (Local Setup)

### Prerequisites
- Node.js 18+
- MongoDB Atlas account

### Backend Setup
1. Open a terminal and go to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a .env file in backend and add the required variables (see Environment Variables section).
4. Run the backend in development mode:
   ```bash
   npm run dev
   ```
5. Build TypeScript:
   ```bash
   npm run build
   ```
6. Run production build:
   ```bash
   npm start
   ```
7. Backend runs at:
   ```text
   http://localhost:5000
   ```

### Frontend Setup
1. Open a new terminal and go to the frontend app directory:
   ```bash
   cd frontend/my-app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a .env.local file in frontend/my-app and add the required variables (see Environment Variables section).
4. Run the frontend in development mode:
   ```bash
   npm run dev
   ```
5. Frontend runs at:
   ```text
   http://localhost:3000
   ```

## Environment Variables

### Backend (.env)
- PORT: Backend server port (example: 5000).
- MONGO_URI: MongoDB Atlas connection string.
- CLIENT_URL: Allowed frontend origin(s) for CORS. Use comma-separated URLs for multiple clients.
- NODE_ENV: Runtime mode (development or production).
- JWT_SECRET: Secret key used to sign and verify JWT tokens.

### Frontend (.env.local)
- NEXT_PUBLIC_API_URL: Public base URL of the backend API used by the frontend.

## API Endpoints

### Auth
- POST /api/auth/signup
- POST /api/auth/login

### Categories
- GET /api/categories
- POST /api/categories
- PUT /api/categories/:id
- DELETE /api/categories/:id (Admin only)

### Products
- GET /api/products
- GET /api/products/:id
- POST /api/products
- PUT /api/products/:id
- DELETE /api/products/:id (Admin only)

### Orders
- POST /api/orders
- GET /api/orders
- GET /api/orders/:id
- PUT /api/orders/:id/status
- PUT /api/orders/:id/cancel
- DELETE /api/orders/:id (Admin only)

### Dashboard
- GET /api/dashboard/stats

### Restock Queue
- GET /api/restock
- PUT /api/restock/:id
- DELETE /api/restock/:id

### Activity Logs
- GET /api/logs

## Folder Structure
```text
smart-inventory/
├─ backend/
│  ├─ server.js
│  ├─ package.json
│  ├─ .env
│  └─ src/
│     ├─ config/
│     ├─ controllers/
│     ├─ middleware/
│     ├─ models/
│     └─ routes/
└─ frontend/
   └─ my-app/
      ├─ app/
      ├─ src/
      │  ├─ components/
      │  ├─ context/
      │  ├─ hooks/
      │  ├─ lib/
      │  └─ types/
      ├─ public/
      ├─ package.json
      └─ .env.local
```