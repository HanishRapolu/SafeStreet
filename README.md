# SafeStreets - AI-Powered Road Damage Detection & Maintenance System

SafeStreets is an end-to-end intelligent road maintenance and inspection system. It combines field worker mobile capture, computer vision models (CNN road surface validation and YOLOv8 damage detection), Google Gemini generative AI summaries & chat, and an administrative dashboard to manage repair workflows from initial detection through resolution.

---

## 🏛️ System Architecture

The SafeStreets monorepo consists of five core components:

```
SafeStreets/
├── backend/                     # Node.js/Express + MongoDB + Socket.IO (Port 5030)
├── ai_models_server/            # Flask + PyTorch/YOLOv8 + CNN Road Classifier (Port 5000)
├── apps/
│   ├── admin-portal/            # React (CRA) + Material-UI Web Dashboard (Port 3000)
│   └── user-app/                # React Native / Expo Field Worker Mobile App
├── docs/                        # Setup guides, architecture notes, and LOCAL_RUN.md
└── README.md
```

### Component Roles & Ports
| Component | Stack | Port / URL | Description |
| :--- | :--- | :--- | :--- |
| **MongoDB** | MongoDB 8.x | `mongodb://127.0.0.1:27017/safestreets` | Document store for users, reports, and audit trails |
| **AI Models Server** | Flask, PyTorch, Ultralytics YOLOv8 | `http://localhost:5000` | CNN road classifier, YOLOv8 damage detector, Gemini summaries |
| **Backend API** | Node.js, Express, Socket.IO | `http://localhost:5030` | Core REST API, JWT auth, damage lifecycle, email dispatch |
| **Admin Portal** | React 18, Material-UI, Socket.IO Client | `http://localhost:3000` | Management portal for owners & admins to oversee repairs and team |
| **Field Worker App** | React Native, Expo, React Navigation | Metro (`:8081`) | Mobile app for field workers to scan damage and track repair tasks |

---

## 🚀 Key Features

### 1. Unified Computer Vision Pipeline
- **CNN Road Surface Classifier:** Validates that submitted images actually contain road surfaces before running detection, preventing false reports.
- **YOLOv8 Damage Localization:** Detects damage categories (Linear Cracks, Alligator Cracks, Potholes, Patches, Line Blur, Utility Holes) with bounding boxes and confidence scores.
- **Automated Severity & Priority:** Computes severity (`LOW`, `MEDIUM`, `HIGH`) and priority (1–10) from the primary detection, bounding-box image coverage, and multi-damage density.
- **Backend Proxy Architecture:** The mobile app communicates exclusively with the backend API (`POST /api/fieldworker/damage/analyze`), which proxies to the AI server with timeout protection and 503 fallback handling.

### 2. Gemini Generative AI Integration
- **Damage Assessment Summaries:** Uses Google Gemini (`gemini-2.5-flash`) via `POST /generate-summary` to generate structured Markdown damage reports with mitigation strategies.
- **Resilient Fallback:** Automatically falls back to a standardized engineering report template when `GEMINI_API_KEY` is not configured or offline.
- **Admin AI Assistant:** Powered by `gemini-2.5-pro` for intelligent conversational support on infrastructure maintenance protocols and prioritization.

### 3. Streamlined Role-Based Access Control
- Single default tenant (`DEFAULT`) eliminating super-admin complexity.
- **Tenant Owner:** Can manage Admins and Field Workers, view all analytics, and manage reports.
- **Tenant Admin:** Can manage Field Workers, review damage reports, assign tasks, and access AI chat.
- **Field Worker:** Mobile access to capture images, submit AI reports, view assigned work orders, update repair status, and upload post-repair verification photos.

### 4. High-Severity Email Alerts
- Fire-and-forget notification system via Nodemailer.
- Automatically notifies all tenant admins when a field worker submits a `HIGH` severity report with address, coordinates, Google Maps link, and worker details.
- Uses Ethereal test inbox in development mode without requiring external SMTP setup.

### 5. Task Lifecycle & Resolution
`Pending Review` ➔ `Assigned` ➔ `In Progress` ➔ `Completed` ➔ `Resolved` (upon uploading after-repair photo).

---

## 🛠️ Quick Start Guide

For comprehensive local setup and physical phone testing instructions, see [docs/LOCAL_RUN.md](./docs/LOCAL_RUN.md).

### 1. Environment Setup

#### Backend (`backend/.env`)
Copy template and customize:
```bash
cp backend/.env.example backend/.env
```
Key configuration:
- `PORT=5030`
- `MONGO_URI=mongodb://localhost:27017/safestreets`
- `REDIS_ENABLED=false` (Redis is optional; silently no-ops when disabled)
- `OWNER_EMAIL=owner@safestreets.com`
- `OWNER_PASSWORD=ownerpassword123`

#### AI Server (`ai_models_server/.env`)
```bash
cp ai_models_server/.env.sample ai_models_server/.env
```
Key configuration:
- `FLASK_PORT=5000`
- `ENABLE_VIT=false` (ViT download skipped; uses YOLOv8 + CNN classifier)
- `GEMINI_MODEL=gemini-2.5-flash`

---

### 2. Running Services

Open separate terminal windows for each service:

#### Terminal 1: MongoDB
```powershell
& "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --dbpath "D:\Desktop\Safestreet\.mongodb_data" --bind_ip 127.0.0.1
```

#### Terminal 2: AI Models Server
```powershell
cd ai_models_server
.\.venv\Scripts\Activate.ps1
python app.py
```

#### Terminal 3: Backend Server
```powershell
cd backend
# Seed default tenant and owner (first run only)
npm run seed
# Start server
npm start
```

#### Terminal 4: Admin Portal
```powershell
cd apps/admin-portal
npm start
```
Open [http://localhost:3000](http://localhost:3000) and sign in:
- **Email:** `owner@safestreets.com`
- **Password:** `ownerpassword123`

#### Terminal 5: Field Worker Mobile App
```powershell
cd apps/user-app
npx expo start
```
Scan the displayed QR code with the **Expo Go** app (Android) or **Camera** (iOS).

---

## 🧪 Automated End-to-End Smoke Test

Run the full end-to-end verification pipeline against running services:

```powershell
cd backend
npm run smoke
```

The test validates all 12 operational steps:
1. `[PASS] Step 1: Owner login`
2. `[PASS] Step 2: Create admin`
3. `[PASS] Step 3: Create field worker`
4. `[PASS] Step 4: Worker login`
5. `[PASS] Step 5: POST analyze with sample.jpg`
6. `[PASS] Step 6: Worker submits AI report`
7. `[PASS] Step 7: Admin lists AI reports`
8. `[PASS] Step 8: Admin creates damage report from it`
9. `[PASS] Step 9: Admin assigns worker`
10. `[PASS] Step 10: Worker sets in_progress then completed`
11. `[PASS] Step 11: Worker uploads after-image`
12. `[PASS] Step 12: Report status is Resolved`

---

## 📂 Project Structure

```
SafeStreets/
├── ai_models_server/            # Flask AI service
│   ├── models/                  # CNN & YOLO weights, class names
│   ├── src/
│   │   ├── api/                 # Flask route handlers
│   │   ├── core/                # App factory & config
│   │   └── utils/               # Vision inference & Gemini clients
│   └── app.py
├── apps/
│   ├── admin-portal/            # React admin web portal
│   │   ├── src/
│   │   │   ├── components/      # UI components (Team, Chat, Reports)
│   │   │   ├── pages/           # Dashboard, Reports, Team, Login
│   │   │   └── config/          # API & socket URLs
│   │   └── package.json
│   └── user-app/                # React Native Expo field worker app
│       ├── screens/             # Camera, Tasks, Profile, Chat
│       ├── utils/               # Backend proxy analysis & auth APIs
│       └── app.json
├── backend/                     # Node.js Express backend
│   ├── controllers/             # Damage, AI, Team, Auth controllers
│   ├── middleware/              # Auth & tenant isolation
│   ├── models/                  # Mongoose schemas (DamageReport, Admin, FieldWorker, AiReport)
│   ├── routes/                  # Express API routes
│   ├── scripts/                 # seedOwner.js, smokeTest.js, test scripts
│   ├── server.js                # Server entry point & Socket.IO
│   └── package.json
├── docs/                        # Technical & execution documentation
│   ├── LOCAL_RUN.md             # Local run guide & manual mobile testing
│   ├── api-documentation.md     # API endpoints reference
│   └── architecture-overview.md # Architecture notes
└── README.md
```

---

## 📜 License & Credits

Repository: [https://github.com/HanishRapolu/SafeStreet](https://github.com/HanishRapolu/SafeStreet)
