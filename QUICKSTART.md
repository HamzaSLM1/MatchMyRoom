# MatchMyRoom - Quick Start Guide

## 🚀 Get Running in 5 Minutes!

### Step 1: Install Backend Dependencies (2 min)

```bash
cd /Users/hamzasalama/MatchMyRoom/backend
pip3 install -r requirements.txt
```

### Step 2: Set Up Cloudinary (1 min)

1. Go to [cloudinary.com](https://cloudinary.com) → Sign up free
2. Copy your credentials from dashboard
3. Create `.env` file:

```bash
cat > .env << 'EOF'
DATABASE_URL=sqlite:///./matchmyroom.db
SECRET_KEY=matchmyroom-secret-2025
CLOUDINARY_CLOUD_NAME=paste-your-cloud-name
CLOUDINARY_API_KEY=paste-your-api-key
CLOUDINARY_API_SECRET=paste-your-api-secret
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
EOF
```

### Step 3: Install Frontend Dependencies (1 min)

```bash
cd /Users/hamzasalama/MatchMyRoom/frontend
npm install
```

### Step 4: Start the App (1 min)

**Terminal 1 - Backend:**
```bash
cd backend
python3 -m uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 5: Test It! (30 sec)

Open http://localhost:5173

1. Click "Sign up"
2. Use email: `test@mail.mcgill.ca`
3. Password: `password123`
4. Complete questionnaire
5. See your matches!

---

## ✨ What You Built

### Frontend Features ✅
- Landing page with hero section
- Sign up / Login (McGill + Concordia)
- 14-question smart questionnaire
- Dashboard with matched roommates
- Profile editing (bio + picture)
- Direct messaging system
- Unread message counts
- Dynamic red/maroon theme

### Backend Features ✅
- User authentication (bcrypt)
- SQLite database (persistent)
- Weighted matching algorithm
  - Budget: 30%
  - Location: 25%
  - Gender: 20%
  - Lifestyle: 25%
- Cloudinary image uploads
- Messaging API
- 15+ REST endpoints

### Universities Supported 🎓
- McGill University
- Concordia University

---

## 🧪 Quick Test

```bash
# Test backend health
curl http://localhost:8000/api/health

# Should see:
# {"status":"ok","users":0,"database":"connected"}
```

---

## 📝 Files Changed

**New Files Created:**
- `backend/app/models.py` - Database models
- `backend/app/database.py` - DB connection
- `backend/app/schemas.py` - API schemas
- `backend/app/matching.py` - Algorithm
- `backend/app/cloudinary_config.py` - Image uploads
- `backend/app/__init__.py` - Package marker
- `backend/.env` - Config (you create this)
- `frontend/src/App.jsx` - Complete new UI

**Files Updated:**
- `backend/app/main.py` - All endpoints
- `backend/requirements.txt` - Dependencies
- `frontend/index.html` - Title
- `frontend/package.json` - Dependencies
- `.gitignore` - Proper ignores

---

## 🎯 Test Workflow

1. **Sign Up McGill User**
   - Email: test1@mail.mcgill.ca
   - See RED theme

2. **Sign Up Concordia User**
   - Email: test2@concordia.ca
   - See MAROON theme

3. **Complete Questionnaire** (both users)
   - Answer all 14 questions
   - Matches auto-calculate

4. **Check Dashboard**
   - See compatibility scores
   - Expand to view details

5. **Edit Profile**
   - Upload profile picture
   - Add bio

6. **Send Message**
   - Click "Send message" on match
   - Type & send
   - Check unread count

---

## 🐛 Troubleshooting

**Backend won't start?**
```bash
# Check dependencies
pip3 list | grep fastapi

# Check .env file exists
ls backend/.env

# Check port 8000 free
lsof -ti:8000
```

**Frontend won't start?**
```bash
# Check node_modules
ls frontend/node_modules

# Reinstall if needed
rm -rf frontend/node_modules
cd frontend && npm install
```

**No matches?**
- Need at least 2 users with completed questionnaires
- Matches calculated when questionnaire submits

**Images not uploading?**
- Check Cloudinary credentials in `.env`
- Check file size < 5MB
- Check browser console

---

## 📚 Documentation

- [SETUP.md](SETUP.md) - Detailed setup guide
- [CLOUDINARY_SETUP.md](CLOUDINARY_SETUP.md) - Image upload setup
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Test all features
- [IMPLEMENTATION_EXPLAINED.md](IMPLEMENTATION_EXPLAINED.md) - How it works

---

## 🎉 You're Ready!

Your dual-university roommate matching platform is live!

Share with friends:
- McGill students → Red theme
- Concordia students → Maroon theme
- Smart matching → Compatible roommates
- Direct messaging → Easy communication

Built with ❤️ for Montreal students!
