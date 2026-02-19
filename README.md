# MatchMyRoom 🏠

A dual-university roommate matching platform for **McGill** and **Concordia** students.

![McGill Red](https://img.shields.io/badge/McGill-ED1B2F?style=flat&logo=university&logoColor=white) ![Concordia Maroon](https://img.shields.io/badge/Concordia-912338?style=flat&logo=university&logoColor=FFD700)

## ✨ Features

### 🎯 Smart Matching Algorithm
- **Weighted compatibility scoring** prioritizing what matters most:
  - Budget: 30% (financial compatibility)
  - Location: 25% (commute and neighborhood)
  - Gender preference: 20% (comfort and safety)
  - Lifestyle factors: 25% (sleep, cleanliness, noise, guests, study habits)
- Pet compatibility bonuses and penalties
- Only shows matches above 50% compatibility

### 👤 User Profiles
- Profile picture upload with Cloudinary cloud storage
- Personal bio (500 characters)
- University affiliation with dynamic theming
- View complete profiles of your matches

### 💬 Direct Messaging
- Send messages to matched roommates
- Real-time inbox with unread counts
- Conversation history persistence
- Auto-polling for new messages

### 📝 Enhanced Questionnaire
14 comprehensive questions including:
- Gender and gender preference
- Budget range (8 options from <$500 to $1500+)
- Preferred location in Montreal (8 neighborhoods)
- Sleep schedule, cleanliness, noise tolerance
- Guest frequency, study habits
- Dietary considerations, work-from-home frequency
- Pet preferences, language preference

### 🎨 Dual-University Theming
- **McGill students** → Red theme (#ED1B2F)
- **Concordia students** → Maroon/Gold theme (#912338/#FFD700)
- Dynamic theme switching based on email domain
- University-specific branding throughout

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- npm or yarn

### 1. Backend Setup (2 minutes)

\`\`\`bash
cd backend

# Install Python dependencies
pip3 install -r requirements.txt

# Set up Cloudinary (free account at cloudinary.com)
# Edit .env file with your credentials:
# CLOUDINARY_CLOUD_NAME=your-cloud-name
# CLOUDINARY_API_KEY=your-api-key
# CLOUDINARY_API_SECRET=your-api-secret

# Start the backend server
python3 -m uvicorn app.main:app --reload
\`\`\`

Backend runs on **http://localhost:8000**

### 2. Frontend Setup (2 minutes)

\`\`\`bash
cd frontend

# Install dependencies (if not already installed)
npm install

# Start development server
npm run dev
\`\`\`

Frontend runs on **http://localhost:5173**

### 3. Test It! (1 minute)

1. Open http://localhost:5173
2. Sign up with a McGill or Concordia email:
   - McGill: \`yourname@mail.mcgill.ca\` or \`@mcgill.ca\`
   - Concordia: \`yourname@concordia.ca\` or \`@live.concordia.ca\`
3. Complete the 14-question questionnaire
4. See your matches on the dashboard!
5. Upload a profile picture and add a bio
6. Send messages to your matches

## 📁 Project Structure

\`\`\`
MatchMyRoom/
├── backend/
│   ├── app/
│   │   ├── main.py              # 15 REST API endpoints
│   │   ├── models.py            # SQLAlchemy database models
│   │   ├── database.py          # SQLite connection
│   │   ├── schemas.py           # Pydantic request/response models
│   │   ├── matching.py          # Weighted matching algorithm
│   │   └── cloudinary_config.py # Image upload service
│   ├── requirements.txt         # Python dependencies
│   ├── .env                     # Environment variables (you configure)
│   └── matchmyroom.db          # SQLite database (auto-created)
├── frontend/
│   ├── src/
│   │   └── App.jsx             # Complete React app (~1300 lines)
│   ├── index.html              # Entry point
│   ├── vite.config.js          # Vite configuration
│   └── package.json            # Node dependencies
└── [Documentation files...]
\`\`\`

## 🗄️ Database Schema

- **Users**: id, name, email, password_hash, university, bio, profile_pic_url
- **QuestionnaireResponses**: user_id, responses (JSON), completed_at
- **Matches**: user1_id, user2_id, compatibility_score
- **Messages**: sender_id, recipient_id, content, sent_at, read

## 🔌 Key API Endpoints

- \`POST /api/signup\` - Create account
- \`POST /api/login\` - Authenticate
- \`POST /api/profile/upload-picture\` - Upload profile picture
- \`POST /api/questionnaire/submit\` - Save answers
- \`GET /api/matches/{user_id}\` - Get matches
- \`POST /api/messages/send\` - Send message
- \`GET /api/messages/conversations/{user_id}\` - Get inbox

## 🛠️ Technology Stack

**Backend:** FastAPI • SQLAlchemy • SQLite • Pydantic • Bcrypt • Cloudinary • Uvicorn

**Frontend:** React 18 • Vite • Native Fetch API • CSS Animations

## 🔒 Security

✅ Bcrypt password hashing • ✅ Email validation • ✅ SQL injection prevention • ✅ CORS • ✅ Input validation

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get running in 5 minutes
- **[SETUP.md](SETUP.md)** - Detailed setup guide
- **[CLOUDINARY_SETUP.md](CLOUDINARY_SETUP.md)** - Image upload setup
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Testing all features
- **[IMPLEMENTATION_EXPLAINED.md](IMPLEMENTATION_EXPLAINED.md)** - Architecture deep dive
- **[CHANGES_SUMMARY.md](CHANGES_SUMMARY.md)** - Complete feature list

## 🐛 Troubleshooting

**Backend won't start?**
\`\`\`bash
pip3 install -r backend/requirements.txt
ls backend/.env  # Must exist with Cloudinary credentials
\`\`\`

**Frontend won't start?**
\`\`\`bash
cd frontend && npm install
\`\`\`

**No matches?** Need at least 2 users who completed the questionnaire.

**Images not uploading?** Sign up at [cloudinary.com](https://cloudinary.com) and add credentials to \`.env\`. See [CLOUDINARY_SETUP.md](CLOUDINARY_SETUP.md).

## 🚀 Deployment

**Recommended:**
- Backend: Railway.app • Render • DigitalOcean
- Frontend: Vercel • Netlify • Cloudflare Pages

**Checklist:**
- [ ] Migrate SQLite → PostgreSQL
- [ ] Set production environment variables
- [ ] Update API_BASE URL in frontend
- [ ] Configure CORS for production domain
- [ ] Enable HTTPS

## 📊 Project Stats

- **~3,700 lines of code**
- **15 API endpoints**
- **4 database tables**
- **14 questionnaire questions**
- **8 React components**
- **1,500+ lines of documentation**

## 💡 Quick Commands

\`\`\`bash
# Start both servers (separate terminals)
cd backend && python3 -m uvicorn app.main:app --reload
cd frontend && npm run dev

# Test backend
curl http://localhost:8000/api/health

# Inspect database
sqlite3 backend/matchmyroom.db "SELECT * FROM users;"

# Reset database (⚠️ deletes all data)
rm backend/matchmyroom.db && restart backend
\`\`\`

---

**Built with ❤️ for McGill & Concordia students** 🎓

Ready to find your perfect roommate? **Let's go!** 🎉
