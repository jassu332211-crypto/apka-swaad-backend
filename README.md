# 🍽️ Apka Swaad — Backend API

Festival Food Cultural Exchange Platform — Node.js + Express + MongoDB

---

## 🚀 Quick Start (Local)

### Step 1 — Clone & Install
```bash
cd apka-swaad-backend
npm install
```

### Step 2 — Setup Environment
```bash
cp .env.example .env
```
Edit `.env` and fill these values:
| Variable | Where to get |
|---|---|
| `MONGODB_URI` | [MongoDB Atlas](https://cloud.mongodb.com) → Free cluster → Connect |
| `JWT_SECRET` | Run: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | Same command again |
| `RAZORPAY_KEY_ID` | [Razorpay Dashboard](https://dashboard.razorpay.com) → Settings → API Keys |
| `RAZORPAY_KEY_SECRET` | Same page |

### Step 3 — Seed Database
```bash
npx ts-node src/config/seeder.ts
```
This creates: 12 foods, 12 festivals, 1 admin user

### Step 4 — Run Dev Server
```bash
npm run dev
```
Server starts at: `http://localhost:5000`

---

## 📡 API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET  | `/api/auth/profile` | Get profile (🔒) |
| PUT  | `/api/auth/profile` | Update profile (🔒) |
| POST | `/api/auth/address` | Add address (🔒) |
| POST | `/api/auth/refresh` | Refresh token |

### Foods
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/foods` | All foods (filter: religion, category, festival, search) |
| GET | `/api/foods/:id` | Food details |
| GET | `/api/foods/religion/:religion` | Foods by religion |
| GET | `/api/foods/festival/:festival` | Foods by festival |
| POST | `/api/foods/:id/review` | Add review (🔒) |

### Orders
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/orders` | Place order (🔒) |
| GET  | `/api/orders` | My orders (🔒) |
| GET  | `/api/orders/:id` | Order details (🔒) |
| GET  | `/api/orders/:id/track` | Live tracking (🔒) |
| POST | `/api/orders/:id/cancel` | Cancel order (🔒) |
| POST | `/api/orders/:id/rate` | Rate order (🔒) |

### Payment
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/payment/create-order` | Create Razorpay order (🔒) |
| POST | `/api/payment/verify` | Verify payment (🔒) |
| POST | `/api/payment/confirm-cod` | Confirm COD (🔒) |
| POST | `/api/payment/webhook` | Razorpay webhook |

### Loyalty
| Method | Endpoint | Description |
|---|---|---|
| GET  | `/api/loyalty/dashboard` | Points + rewards (🔒) |
| GET  | `/api/loyalty/history` | Points history (🔒) |
| GET  | `/api/loyalty/streak` | Streak bonus (🔒) |
| POST | `/api/loyalty/redeem` | Redeem reward (🔒) |

### Festivals
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/festivals` | All festivals |
| GET | `/api/festivals/upcoming` | Current month festivals |
| GET | `/api/festivals/:id` | Festival details |

🔒 = Requires `Authorization: Bearer <token>` header

---

## 🌐 Deploy on Render.com (Free)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial backend"
git remote add origin https://github.com/YOUR_USERNAME/apka-swaad-backend.git
git push -u origin main
```

### Step 2 — Create MongoDB Atlas (Free)
1. Go to [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create free cluster (M0 — 512MB free)
3. Database Access → Add user (username + password)
4. Network Access → Add `0.0.0.0/0`
5. Connect → Drivers → Copy connection string
6. Replace `<password>` with your password

### Step 3 — Deploy on Render
1. Go to [render.com](https://render.com) → Sign up free
2. New → Web Service → Connect GitHub repo
3. Settings:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Region:** Singapore (closest to India)
4. Add Environment Variables:
   ```
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://...
   JWT_SECRET=<your-64-char-secret>
   JWT_REFRESH_SECRET=<another-64-char-secret>
   RAZORPAY_KEY_ID=rzp_live_...
   RAZORPAY_KEY_SECRET=...
   FRONTEND_URL=https://apkaswaad.in
   ADMIN_EMAIL=admin@apkaswaad.in
   ADMIN_PASSWORD=YourSecurePassword123
   ```
5. Click **Deploy!** ✅

### Step 4 — Seed Production Database
After deploy, open Render Shell and run:
```bash
npx ts-node src/config/seeder.ts
```

### Step 5 — Update Frontend
In your frontend `.env`:
```
NEXT_PUBLIC_API_URL=https://apka-swaad-backend.onrender.com
```

---

## 🧪 Test with cURL

```bash
# Register
curl -X POST https://your-api.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@test.com","phone":"+919876543210","password":"Test@123"}'

# Login
curl -X POST https://your-api.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test@123"}'

# Get Foods
curl https://your-api.onrender.com/api/foods?religion=Muslim&limit=5

# Health Check
curl https://your-api.onrender.com/health
```

---

## 🏗️ Project Structure

```
src/
├── config/
│   ├── database.ts     — MongoDB connection
│   └── seeder.ts       — Sample data seeder
├── controllers/
│   ├── authController.ts
│   ├── foodController.ts
│   ├── orderController.ts
│   ├── paymentController.ts
│   ├── loyaltyController.ts
│   └── festivalController.ts
├── middleware/
│   ├── auth.ts         — JWT protect + adminOnly
│   └── error.ts        — Global error handler
├── models/
│   ├── User.ts
│   ├── Food.ts
│   ├── Order.ts
│   └── Festival.ts
├── routes/
│   ├── auth.routes.ts
│   ├── food.routes.ts
│   ├── order.routes.ts
│   ├── payment.routes.ts
│   ├── loyalty.routes.ts
│   └── festival.routes.ts
├── socket/
│   └── index.ts        — Socket.io real-time tracking
├── utils/
│   ├── apiResponse.ts  — Standard response helpers
│   ├── cache.ts        — In-memory cache
│   └── logger.ts       — Winston logger
├── app.ts              — Express app setup
└── server.ts           — HTTP server entry point
```

---

## ⚡ Tech Stack
- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** MongoDB + Mongoose
- **Auth:** JWT (access + refresh tokens)
- **Payments:** Razorpay
- **Real-time:** Socket.io
- **Security:** Helmet, CORS, Rate Limiting, Mongo Sanitize, HPP
- **Deploy:** Render.com (free tier)
