# MatchMyRoom Testing Guide

## Quick Start Testing

### 1. Start the Backend

```bash
cd /Users/hamzasalama/MatchMyRoom/backend
python3 -m uvicorn app.main:app --reload --port 8000
```

You should see:
```
✅ Database initialized
✅ Cloudinary configured
INFO: Uvicorn running on http://127.0.0.1:8000
```

### 2. Test with Browser

Open http://127.0.0.1:8000/api/health

You should see:
```json
{
  "status": "ok",
  "users": 0,
  "database": "connected"
}
```

## Manual API Testing with curl

### Test 1: Sign Up (McGill)

```bash
curl -X POST http://localhost:8000/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Alex Johnson",
    "email": "alex.johnson@mail.mcgill.ca",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "message": "Signup successful",
  "user_id": 1,
  "email": "alex.johnson@mail.mcgill.ca",
  "name": "Alex Johnson",
  "university": "mcgill"
}
```

### Test 2: Sign Up (Concordia)

```bash
curl -X POST http://localhost:8000/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Sophie Martin",
    "email": "sophie.martin@concordia.ca",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "university": "concordia"
}
```

### Test 3: Login

```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alex.johnson@mail.mcgill.ca",
    "password": "password123"
  }'
```

### Test 4: Submit Questionnaire

```bash
curl -X POST "http://localhost:8000/api/questionnaire/submit?user_id=1" \
  -H "Content-Type: application/json" \
  -d '{
    "responses": {
      "sleepSchedule": 1,
      "cleanliness": 1,
      "noise": 0,
      "guests": 1,
      "study": 1,
      "budget": 1,
      "location": 0,
      "moveIn": 0,
      "gender": 0,
      "genderPreference": 3,
      "dietary": 0,
      "workFromHome": 1,
      "pets": 2,
      "language": 0
    }
  }'
```

### Test 5: Calculate Matches

```bash
curl -X POST "http://localhost:8000/api/matches/calculate?user_id=1"
```

### Test 6: Get Matches

```bash
curl http://localhost:8000/api/matches/1
```

**Expected**: Array of matches with compatibility scores

### Test 7: Update Profile

```bash
curl -X POST "http://localhost:8000/api/profile/update?user_id=1" \
  -H "Content-Type: application/json" \
  -d '{
    "bio": "Hey! I'm a Computer Science student looking for a clean, quiet roommate. I love coding, coffee, and cats!"
  }'
```

### Test 8: Send Message

```bash
curl -X POST "http://localhost:8000/api/messages/send?sender_id=1" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient_id": 2,
    "content": "Hi! I saw we matched. Want to chat about finding a place?"
  }'
```

### Test 9: Get Conversations

```bash
curl http://localhost:8000/api/messages/conversations/1
```

### Test 10: Get Message Thread

```bash
curl http://localhost:8000/api/messages/thread/1/2
```

## Automated Test Script

Create `backend/test_api.sh`:

```bash
#!/bin/bash

API="http://localhost:8000/api"

echo "🧪 Testing MatchMyRoom API"
echo "=========================="

echo ""
echo "1️⃣ Testing Health Check..."
curl -s $API/health | jq

echo ""
echo "2️⃣ Creating McGill User..."
RESPONSE=$(curl -s -X POST $API/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test McGill","email":"test.mcgill@mail.mcgill.ca","password":"password123"}')
echo $RESPONSE | jq
USER1_ID=$(echo $RESPONSE | jq -r '.user_id')

echo ""
echo "3️⃣ Creating Concordia User..."
RESPONSE=$(curl -s -X POST $API/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Concordia","email":"test.concordia@concordia.ca","password":"password123"}')
echo $RESPONSE | jq
USER2_ID=$(echo $RESPONSE | jq -r '.user_id')

echo ""
echo "4️⃣ Testing Login..."
curl -s -X POST $API/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test.mcgill@mail.mcgill.ca","password":"password123"}' | jq

echo ""
echo "5️⃣ Submitting Questionnaire for User 1..."
curl -s -X POST "$API/questionnaire/submit?user_id=$USER1_ID" \
  -H "Content-Type: application/json" \
  -d '{"responses":{"sleepSchedule":1,"cleanliness":1,"noise":0,"guests":1,"study":1,"budget":1,"location":0,"moveIn":0,"gender":0,"genderPreference":3,"dietary":0,"workFromHome":1,"pets":2,"language":0}}' | jq

echo ""
echo "6️⃣ Submitting Questionnaire for User 2..."
curl -s -X POST "$API/questionnaire/submit?user_id=$USER2_ID" \
  -H "Content-Type: application/json" \
  -d '{"responses":{"sleepSchedule":1,"cleanliness":1,"noise":0,"guests":1,"study":1,"budget":1,"location":0,"moveIn":0,"gender":1,"genderPreference":3,"dietary":1,"workFromHome":2,"pets":2,"language":1}}' | jq

echo ""
echo "7️⃣ Calculating Matches for User 1..."
curl -s -X POST "$API/matches/calculate?user_id=$USER1_ID" | jq

echo ""
echo "8️⃣ Getting Matches for User 1..."
curl -s "$API/matches/$USER1_ID" | jq

echo ""
echo "9️⃣ Sending Message..."
curl -s -X POST "$API/messages/send?sender_id=$USER1_ID" \
  -H "Content-Type: application/json" \
  -d "{\"recipient_id\":$USER2_ID,\"content\":\"Hi! Want to be roommates?\"}" | jq

echo ""
echo "🔟 Getting Conversations..."
curl -s "$API/messages/conversations/$USER1_ID" | jq

echo ""
echo "✅ All tests complete!"
```

Run it:
```bash
chmod +x backend/test_api.sh
./backend/test_api.sh
```

## Frontend Testing

### 1. Start Frontend

```bash
cd /Users/hamzasalama/MatchMyRoom/frontend
npm run dev
```

Open http://localhost:5173

### 2. Test Signup Flow

1. Click "Sign up"
2. Enter:
   - Name: "Test User"
   - Email: "test@mail.mcgill.ca"
   - Password: "password123"
3. Click "Create account"
4. Should redirect to questionnaire

### 3. Test Questionnaire

1. Answer all 14 questions
2. Watch progress bar increase
3. Click "Find matches ✨" on last question
4. Should redirect to dashboard

### 4. Test Dashboard

1. See "Your matches" page
2. Click on a match to expand
3. View bio, preferences, compatibility
4. Click "Send message"

### 5. Test Profile

1. Click "Profile" in nav
2. Upload a profile picture
3. Add a bio
4. Click "Save Profile"
5. Go to Dashboard - picture should show in matches

### 6. Test Messaging

1. From dashboard, click "Send message" on a match
2. Type a message
3. Hit Enter or click Send
4. Message appears on right side
5. Check "Messages" nav button for unread count

## Testing Checklist

### Backend Tests
- [ ] Server starts without errors
- [ ] Database file created (matchmyroom.db)
- [ ] Health check returns 200
- [ ] McGill signup works → university = "mcgill"
- [ ] Concordia signup works → university = "concordia"
- [ ] Login with correct password works
- [ ] Login with wrong password fails
- [ ] Questionnaire submission works
- [ ] Matches calculated correctly
- [ ] Profile update works
- [ ] Messages send successfully
- [ ] Message threads load correctly

### Frontend Tests
- [ ] Landing page loads with red theme
- [ ] Signup validates McGill/Concordia emails
- [ ] Login redirects to questionnaire
- [ ] All 14 questions display
- [ ] Progress bar updates correctly
- [ ] Dashboard shows matches
- [ ] Compatibility scores display
- [ ] Profile picture upload works
- [ ] Bio saves correctly
- [ ] Messages page loads
- [ ] Can send messages
- [ ] Unread count updates
- [ ] McGill users see red theme
- [ ] Concordia users see maroon theme

## Database Inspection

```bash
# Install sqlite3 (if not already installed)
# macOS: Already installed
# Linux: sudo apt-get install sqlite3

cd /Users/hamzasalama/MatchMyRoom/backend

# View all users
sqlite3 matchmyroom.db "SELECT * FROM users;"

# View questionnaire responses
sqlite3 matchmyroom.db "SELECT * FROM questionnaire_responses;"

# View matches
sqlite3 matchmyroom.db "SELECT * FROM matches ORDER BY compatibility_score DESC;"

# View messages
sqlite3 matchmyroom.db "SELECT * FROM messages ORDER BY sent_at DESC;"

# Count users
sqlite3 matchmyroom.db "SELECT university, COUNT(*) FROM users GROUP BY university;"
```

## Performance Testing

### Test Matching Algorithm Speed

```python
# backend/test_matching_speed.py
import time
from app.matching import calculate_compatibility

# Mock responses
user1 = {"sleepSchedule": 1, "cleanliness": 1, "budget": 1, "location": 0, "gender": 0, "genderPreference": 3}
user2 = {"sleepSchedule": 1, "cleanliness": 2, "budget": 1, "location": 0, "gender": 1, "genderPreference": 3}

# Test 1000 calculations
start = time.time()
for _ in range(1000):
    calculate_compatibility(user1, user2)
end = time.time()

print(f"✅ 1000 calculations in {end-start:.2f}s")
print(f"⚡ Average: {(end-start)/1000*1000:.2f}ms per match")
```

Expected: < 1ms per match calculation

## Common Issues & Solutions

### Issue: "Connection refused"
**Solution**: Backend isn't running. Start it first.

### Issue: "CORS error"
**Solution**: Check vite.config.js has proxy configured

### Issue: "No matches found"
**Solution**: Need at least 2 users with completed questionnaires

### Issue: "Cloudinary upload fails"
**Solution**: Check .env file has correct Cloudinary credentials

### Issue: "Database locked"
**Solution**: Close all connections, restart backend

### Issue: "Port 8000 already in use"
**Solution**: Kill existing process or use different port

---

Happy testing! 🧪✅
