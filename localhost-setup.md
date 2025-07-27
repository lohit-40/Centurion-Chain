# 🏠 ShikshaChain Localhost Setup Guide

## Prerequisites
- Node.js (v16 or higher)
- Python 3.8+
- MongoDB (local installation or MongoDB Atlas)
- Git

## 📁 Step 1: Download the Project Files

Create a new folder on your computer and copy these files:

### Backend Structure
```
shikshachain-local/
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.js
│   └── .env
└── README.md
```

## 🛠️ Step 2: Setup Backend (FastAPI)

### 2.1 Create Virtual Environment
```bash
cd shikshachain-local/backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux  
source venv/bin/activate
```

### 2.2 Install Dependencies
```bash
pip install fastapi uvicorn pymongo motor python-dotenv
```

### 2.3 Create .env file
```bash
# backend/.env
MONGO_URL=mongodb://localhost:27017
DB_NAME=shikshachain_local
```

### 2.4 Run Backend
```bash
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```
✅ Backend will run at: `http://localhost:8001`

## ⚛️ Step 3: Setup Frontend (React)

### 3.1 Install Dependencies
```bash
cd shikshachain-local/frontend
npm install
# or
yarn install
```

### 3.2 Create .env file
```bash
# frontend/.env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 3.3 Run Frontend
```bash
npm start
# or
yarn start
```
✅ Frontend will open at: `http://localhost:3000`

## 🗄️ Step 4: Setup MongoDB

### Option A: Local MongoDB
1. Download MongoDB Community Server
2. Install and start MongoDB service
3. MongoDB will run at: `mongodb://localhost:27017`

### Option B: MongoDB Atlas (Cloud)
1. Create free account at mongodb.com
2. Create cluster and get connection string
3. Update `MONGO_URL` in backend/.env

## 🚀 Step 5: Access Your Localhost App

Open browser and go to: **http://localhost:3000**

## 📋 Features Available Locally:
✅ University registration  
✅ Student registration with Aadhaar  
✅ Degree minting with SGPA/CGPA  
✅ QR code generation  
✅ Degree verification  
✅ Leather wallet integration  

## 🔧 Troubleshooting

### Backend Issues:
```bash
# Check if backend is running
curl http://localhost:8001/api/health

# View logs
python server.py
```

### Frontend Issues:
```bash
# Clear cache and restart
rm -rf node_modules package-lock.json
npm install
npm start
```

### Database Issues:
```bash
# Check MongoDB connection
mongosh mongodb://localhost:27017
```

## 📱 Access URLs:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Docs**: http://localhost:8001/docs