# SafeStreets Local Execution Guide

This document describes the exact start order, service URLs, credentials, manual phone testing procedure, and automated smoke test.

---

## 1. Architecture & Port Mapping

| Service | Technology | Port / URL | Health / Status URL |
| :--- | :--- | :--- | :--- |
| **MongoDB** | MongoDB Server 8.x | `mongodb://127.0.0.1:27017/safestreets` | mongosh / daemon |
| **AI Server** | Flask + YOLOv8 + PyTorch | `http://localhost:5000` | `GET /health`, `GET /models-status` |
| **Backend** | Node.js + Express + Socket.IO | `http://localhost:5030` | `GET /api/health` |
| **Admin Portal** | React (CRA) + MUI | `http://localhost:3000` | Browser URL |
| **User App** | Expo React Native | Metro Dev Server (`:8081`) | Expo Go on mobile |

---

## 2. Exact Service Start Order

Start services in separate terminal windows in the following order:

### Step 1: MongoDB Daemon
```powershell
# Create data folder if not exists
New-Item -ItemType Directory -Force -Path "D:\Desktop\Safestreet\.mongodb_data"

# Run mongod
& "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --dbpath "D:\Desktop\Safestreet\.mongodb_data" --bind_ip 127.0.0.1
```

### Step 2: AI Models Server
```powershell
cd d:\Desktop\Safestreet\ai_models_server
# Activate virtual environment
.\.venv\Scripts\Activate.ps1
# Run Flask app
python app.py
```
*Expected log:* `* Running on all addresses (0.0.0.0) -> http://127.0.0.1:5000`

### Step 3: Backend Server
```powershell
cd d:\Desktop\Safestreet\backend
# Optional: Seed default tenant and owner on first run
npm run seed
# Start backend
npm start
```
*Expected log:* `🚀 Server running on port 5030`

### Step 4: Admin Portal (Optional for web administration)
```powershell
cd d:\Desktop\Safestreet\apps\admin-portal
npm start
```
*Expected URL:* `http://localhost:3000`

### Step 5: Field Worker Mobile App (Expo)
```powershell
cd d:\Desktop\Safestreet\apps\user-app
npx expo start
```
*Displays Metro bundler QR code in the terminal.*

---

## 3. Default Credentials Source (`.env`)

Credentials and seed values are managed in `backend/.env` (mirrored in `backend/.env.example`):

### Tenant Owner
- **Email:** Defined by `OWNER_EMAIL` in `backend/.env` (default: `owner@safestreets.com`)
- **Password:** Defined by `OWNER_PASSWORD` in `backend/.env` (default: `ownerpassword123`)
- **Seed Script:** Run `npm run seed` in `backend/` to idempotent-seed the default tenant (`DEFAULT`) and owner account.

### Tenant Admins
- Created by the Tenant Owner via the Admin Portal **Team** page or via the API:
  - `POST /api/admin/team/admins` (Bearer Token: Owner)

### Field Workers
- Created by Owner or Admin via the Admin Portal **Team** page or via the API:
  - `POST /api/admin/team/field-workers`
- Auto-generates:
  - Email: `<workerId>@safestreets.com`
  - Password: `<workerId><4-digit-pin>` (returned in API response and displayed in UI)

---

## 4. Manual Phone Test Steps

Follow these steps to test the mobile field-worker application on a physical phone:

### Prerequisites
1. Ensure your computer and mobile phone are connected to the **same local Wi-Fi network**.
2. Install the **Expo Go** application on your phone from the Google Play Store (Android) or Apple App Store (iOS).
3. Ensure backend is running (`http://localhost:5030`) and reachable from your computer's LAN IP.

### Step-by-Step Testing
1. **Start User App**:
   ```bash
   cd apps/user-app
   npx expo start
   ```
2. **Open on Phone**:
   - **Android**: Open the **Expo Go** app and tap **Scan QR code**, then scan the QR code displayed in the terminal.
   - **iOS**: Open the native **Camera** app, scan the QR code, and tap the prompt to open in Expo Go.
3. **Log In as Field Worker**:
   - On the login screen, enter the Field Worker email and password (e.g. created from the Admin Portal or smoke test).
   - Tap **Login**. You will be taken to the Worker Dashboard showing assigned tasks and quick actions.
4. **Capture Road Damage**:
   - Tap the **Camera / Scan** icon in the bottom navigation.
   - Point your phone camera at a damaged road surface (or take a photo of an asphalt crack/pothole).
   - Tap the capture button.
5. **AI Inspection & Validation**:
   - The app securely uploads the photo to the backend (`POST /api/fieldworker/damage/analyze`), which coordinates with the AI server.
   - If a road surface is not detected, an alert prompts to confirm or retake.
   - When detected, the screen displays:
     - Annotated bounding boxes
     - Identified damage type (e.g., Pothole, Alligator Crack)
     - Calculated severity (LOW / MEDIUM / HIGH) and priority score (1–10).
6. **Submit Damage Report**:
   - Review or edit description and location notes.
   - Tap **Submit Report**.
   - Confirmation is displayed. If severity is HIGH, an alert email is sent to tenant admins.
7. **Complete Work Order**:
   - In the **Tasks** tab, view your assigned repair tasks.
   - Tap on the task and select **Start Work** (status changes to `In Progress`).
   - When finished, select **Mark as Completed** (status changes to `Completed`).
   - Take and upload an "After" photo of the repaired road surface.
   - Report status transitions to **Resolved**.

---

## 5. Automated Smoke Test

To verify the entire pipeline programmatically without a physical phone:

```bash
cd backend
npm run smoke
```

The smoke test validates all 12 operational steps:
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
