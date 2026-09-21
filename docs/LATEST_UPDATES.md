# Latest Updates - MatchMyRoom

## ✅ All Requested Features Implemented

### 1. **Fixed Questionnaire Logic**
- ✅ Questionnaire now only shows on **first login**
- ✅ After completing it once, users go directly to dashboard
- ✅ "Retake questionnaire" button available on dashboard to change answers

### 2. **Added Email Verification Improvements**
- ✅ **Bold text** reminder to check junk/spam folder
- Shows: "📬 Check your junk/spam folder if you don't see it in your inbox"

### 3. **Updated Budget Options**
- ✅ New budget ranges:
  - $700–$1000
  - $1000–$1300
  - $1300–$1500
  - $1500+
  - **Custom amount** (with text input)

### 4. **Added Program/Faculty Field**
- ✅ New question: "What are you studying?"
- ✅ Options: Arts, Science, Engineering, Commerce/Management, Medicine, Law, Education, Music, Other
- ✅ Includes **custom input** option
- ✅ Added `program` field to database User model

### 5. **Custom Input for Questions**
- ✅ Questions with "Other" or "Custom amount" now show text input
- ✅ Stores custom text instead of just index
- ✅ Works for: Religion, Program, Budget

### 6. **Improved Profile Picture Quality**
- ✅ Increased resolution: 400x400 → **800x800**
- ✅ Better quality setting: `auto` → `auto:best`
- ✅ Much sharper profile pictures

### 7. **Fake Users for Testing**
- ✅ Created 10 realistic fake users with completed questionnaires
- ✅ Mix of McGill and Concordia students
- ✅ Different programs, budgets, preferences
- ✅ All have bios and varied answers

---

## 🧪 How to Test Everything

### Step 1: Start the Backend

```bash
cd backend
python3 -m uvicorn app.main:app --reload
```

Backend will run on **http://localhost:8000**

### Step 2: Add Fake Users

Open a new terminal and run:

```bash
curl -X POST http://localhost:8000/api/dev/create-fake-users
```

**Response:**
```json
{
  "message": "Created 10 fake users",
  "users": [...],
  "password": "password123"
}
```

✅ **All fake users use password:** `password123`

### Step 3: Calculate Matches for Fake Users

For each user ID returned (usually 1-10):

```bash
curl -X POST http://localhost:8000/api/matches/calculate?user_id=1
curl -X POST http://localhost:8000/api/matches/calculate?user_id=2
# ... repeat for all user IDs
```

### Step 4: Start the Frontend

```bash
cd frontend
npm run dev
```

Frontend runs on **http://localhost:3000**

### Step 5: Test New Features

#### Test 1: Login with Existing User
1. Go to http://localhost:3000
2. Click "I have an account"
3. Login with: `emma.johnson@mail.mcgill.ca` / `password123`
4. ✅ Should go **directly to dashboard** (NOT questionnaire)
5. ✅ You should see matches from other fake users

#### Test 2: Create New Account
1. Click "Get matched"
2. Sign up with your real McGill/Concordia email
3. Check email for verification code (**check junk/spam!**)
4. ✅ You should see the bold reminder about junk mail
5. Enter verification code
6. ✅ Answer questionnaire (now 17 questions)
7. ✅ New questions: Program (question 4), updated Budget (question 5)
8. ✅ Try selecting "Custom amount" for budget - text input appears
9. ✅ Try selecting "Other" for religion - text input appears
10. Complete questionnaire
11. ✅ Should see dashboard with matches

#### Test 3: Profile Picture Quality
1. Go to dashboard
2. Click "Edit Profile" (or profile button in nav)
3. Upload a profile picture
4. ✅ Picture should be much sharper/higher quality
5. Check in swipe mode - pictures look crisp

#### Test 4: Swipe Mode
1. On dashboard, click "💫 Swipe" toggle
2. ✅ See card interface with fake users
3. ✅ Profile pictures are high quality
4. ✅ See program info in match details

---

## 📝 Fake Users Created

| Name | Email | University | Program |
|------|-------|------------|---------|
| Emma Johnson | emma.johnson@mail.mcgill.ca | McGill | Engineering |
| Liam Chen | liam.chen@concordia.ca | Concordia | Commerce/Management |
| Sophia Patel | sophia.patel@mcgill.ca | McGill | Science |
| Noah Tremblay | noah.tremblay@live.concordia.ca | Concordia | Arts |
| Olivia Martinez | olivia.martinez@mail.mcgill.ca | McGill | Law |
| Ethan Kim | ethan.kim@concordia.ca | Concordia | Engineering |
| Ava Leblanc | ava.leblanc@mcgill.ca | McGill | Music |
| Mason Williams | mason.williams@live.concordia.ca | Concordia | Science |
| Isabella Nguyen | isabella.nguyen@mail.mcgill.ca | McGill | Commerce/Management |
| James Anderson | james.anderson@concordia.ca | Concordia | Education |

**Password for all:** `password123`

---

## 🗂️ Database Changes

**New field added to `users` table:**
- `program` (String, nullable) - User's program/faculty of study

**⚠️ Important:** Old database was deleted to apply new schema. You'll need to:
1. Start backend (creates new database automatically)
2. Run fake users endpoint
3. Calculate matches for each user

---

## 🎨 Updated Questions (17 total)

### Dealbreakers (Most Important):
1. Gender
2. Gender Preference
3. Age
4. **Program** ⬅️ NEW
5. **Budget** ⬅️ UPDATED (with custom input)
6. Location
7. **Religion** ⬅️ UPDATED (with custom input)

### Lifestyle Compatibility:
8. Sleep Schedule
9. Cleanliness
10. Noise Level
11. Guests
12. Study Location
13. Dietary
14. Work From Home
15. Pets
16. Language
17. Move-in Date

---

## 🔧 Technical Changes

### Frontend (`App.jsx`):
- Updated `handleAuth` to check `questionnaire_completed`
- Added custom input support in `QuestionnairePage`
- Updated verification page with junk mail notice
- Modified questions array with new options

### Backend:
- **models.py**: Added `program` field to `User` model
- **schemas.py**: Added `program` to `UserProfile`
- **cloudinary_config.py**: Upgraded image quality (800x800, auto:best)
- **main.py**: Added `/api/dev/create-fake-users` endpoint

---

## 🚀 Quick Start Commands

```bash
# Terminal 1: Backend
cd backend
python3 -m uvicorn app.main:app --reload

# Terminal 2: Create fake users
curl -X POST http://localhost:8000/api/dev/create-fake-users

# Terminal 3: Calculate matches (do for each user 1-10)
for i in {1..10}; do
  curl -X POST "http://localhost:8000/api/matches/calculate?user_id=$i"
done

# Terminal 4: Frontend
cd frontend
npm run dev
```

Then visit: **http://localhost:3000**

---

## ✨ What's Different Now?

1. **Smarter Login:** No more answering questionnaire every time
2. **Better Email:** Clear reminder to check spam folder
3. **Custom Budgets:** Enter any amount, not limited to presets
4. **Program Field:** Know what your matches are studying
5. **Sharp Photos:** 4x better resolution (800x800 vs 400x400)
6. **Realistic Testing:** 10 fake users with diverse profiles

---

**Ready to test!** 🎉