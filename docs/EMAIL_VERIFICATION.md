# Email Verification Feature 🔐

## Overview

MatchMyRoom now requires **real McGill or Concordia email verification** to ensure only legitimate students can create accounts.

## How It Works

### 1. Sign Up Flow

```
User enters info → Backend generates 6-digit code → Email sent → User enters code → Account verified ✅
```

### 2. Step-by-Step Process

1. **User signs up** with name, email (@mail.mcgill.ca or @concordia.ca), and password
2. **Backend validates** email domain (must be real McGill/Concordia email)
3. **6-digit code generated** and saved to database with 15-minute expiration
4. **Email sent** to the student's inbox with the verification code
5. **Verification page** appears asking for the code
6. **User enters code** from their email
7. **Backend verifies** the code matches and hasn't expired
8. **Account activated** - user can now log in!

### 3. Security Features

✅ **No fake emails** - Only real university emails work  
✅ **Time-limited codes** - Codes expire after 15 minutes  
✅ **One-time use** - Codes are deleted after successful verification  
✅ **Resend option** - Users can request a new code if needed  
✅ **Login blocked** - Unverified users cannot access the app  

---

## Backend Changes

### New Database Fields (User model)

```python
email_verified = Column(Boolean, default=False)
verification_code = Column(String, nullable=True)  
verification_code_expires = Column(DateTime, nullable=True)
```

### New API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/signup` | POST | Now generates and sends verification code |
| `/api/verify-email` | POST | Verify the 6-digit code |
| `/api/resend-verification-code` | POST | Resend a new code |
| `/api/login` | POST | Now checks if email is verified |

### Example API Flow

**1. Signup:**
```bash
POST /api/signup
{
  "name": "John Doe",
  "email": "john.doe@mail.mcgill.ca",
  "password": "securepass123"
}

Response:
{
  "message": "Verification code sent to your email. Please check your inbox.",
  "user_id": 1,
  "email": "john.doe@mail.mcgill.ca"
}
```

**2. Verify Email:**
```bash
POST /api/verify-email
{
  "email": "john.doe@mail.mcgill.ca",
  "code": "482356"
}

Response:
{
  "message": "Email verified successfully! You can now log in.",
  "email_verified": true
}
```

**3. Login (after verification):**
```bash
POST /api/login
{
  "email": "john.doe@mail.mcgill.ca",
  "password": "securepass123"
}

Response:
{
  "message": "Login successful",
  "user_id": 1,
  "email": "john.doe@mail.mcgill.ca",
  "name": "John Doe",
  "university": "mcgill"
}
```

**4. Login (before verification) - BLOCKED:**
```bash
POST /api/login
{
  "email": "unverified@mail.mcgill.ca",
  "password": "password123"
}

Response: 403 Forbidden
{
  "detail": "Please verify your email first. Check your inbox for the verification code."
}
```

---

## Frontend Changes

### New Component: VerificationPage

Beautiful verification code entry screen with:
- Large code input field (6 digits, auto-formatted)
- Real-time validation
- "Resend code" button
- Success animation when verified
- Auto-redirect to login after 2 seconds

### Updated Components

**AuthPage:**
- After signup, redirects to VerificationPage
- Saves email to state for verification

**App:**
- Added `pendingEmail` state to track email awaiting verification
- Added routing for `/verify` page
- Passes email to VerificationPage

---

## Email Templates

### Verification Email

**Subject:** Verify Your MatchMyRoom Account - Verification Code Inside

**Content:**
```
🔐 Verify Your Email

Hi [Name]!

Welcome to MatchMyRoom! To complete your registration and verify 
your student email, please enter the verification code below:

┌─────────────────────┐
│     482356          │  ← 6-digit code
└─────────────────────┘

This code expires in 15 minutes

⚠️ Security Note: Never share this code with anyone.

If you didn't create a MatchMyRoom account, please ignore this email.
```

---

## User Experience Flow

### Happy Path ✅

1. User goes to http://localhost:3000
2. Clicks "Sign up"
3. Enters name, McGill email, password
4. Clicks "Create account"
5. **Sees verification screen**: "Check your email"
6. Opens email inbox
7. Finds email from MatchMyRoom
8. Copies 6-digit code
9. Enters code in verification screen
10. **Sees success message**: "Email verified! ✅"
11. Auto-redirected to login page after 2 seconds
12. Logs in with credentials
13. Completes questionnaire
14. Finds roommates! 🎉

### Code Expired ⏰

1. User waits too long (>15 minutes)
2. Enters code
3. **Error**: "Verification code has expired"
4. Clicks "Resend code"
5. New code sent to email
6. Enters new code
7. Success! ✅

### Wrong Code ❌

1. User types wrong code
2. **Error**: "Invalid verification code"
3. Tries again with correct code
4. Success! ✅

### Already Verified ✅

1. User tries to verify again
2. **Message**: "Email already verified"
3. Redirected to login

---

## Testing the Feature

### Test Scenario 1: Complete Flow

```bash
# 1. Sign up
curl -X POST http://localhost:8000/api/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@mail.mcgill.ca","password":"password123"}'

# 2. Get verification code from database
sqlite3 backend/matchmyroom.db \
  "SELECT verification_code FROM users WHERE email='test@mail.mcgill.ca';"
# Output: 482356

# 3. Verify email
curl -X POST http://localhost:8000/api/verify-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@mail.mcgill.ca","code":"482356"}'

# 4. Login (should work now)
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@mail.mcgill.ca","password":"password123"}'
```

### Test Scenario 2: Blocked Login

```bash
# 1. Create unverified user
curl -X POST http://localhost:8000/api/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Unverified","email":"unverified@mail.mcgill.ca","password":"password123"}'

# 2. Try to login WITHOUT verifying (should fail)
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"unverified@mail.mcgill.ca","password":"password123"}'

# Response: 403 Forbidden
# "Please verify your email first. Check your inbox for the verification code."
```

### Test Scenario 3: Resend Code

```bash
curl -X POST http://localhost:8000/api/resend-verification-code \
  -H "Content-Type: application/json" \
  -d '{"email":"test@mail.mcgill.ca"}'

# New code generated and sent to email
```

---

## Database Schema

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    password_hash VARCHAR NOT NULL,
    university VARCHAR NOT NULL,
    email_verified BOOLEAN DEFAULT 0,  -- ← NEW
    verification_code VARCHAR,          -- ← NEW
    verification_code_expires DATETIME, -- ← NEW
    bio TEXT,
    profile_pic_url VARCHAR,
    questionnaire_completed BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Security Considerations

### What's Protected ✅

1. **Email ownership verified** - Users must have access to their university email
2. **Time-limited codes** - 15-minute expiration prevents delayed attacks
3. **One-time codes** - Codes deleted after use
4. **Random generation** - 6-digit codes are cryptographically random
5. **Database storage** - Codes stored securely with user record

### What's NOT Protected ⚠️

- Brute force attempts (no rate limiting yet)
- Email spoofing (relies on SMTP security)
- Password strength (only checks length)

### Future Enhancements

- [ ] Rate limiting on verification attempts
- [ ] CAPTCHA on signup
- [ ] Password strength meter
- [ ] JWT tokens for session management
- [ ] Two-factor authentication (optional)

---

## Troubleshooting

### "Email not configured" warning

**Cause:** SMTP credentials not set in `.env`

**Fix:** Add email credentials to `backend/.env`:
```env
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

Without email setup, the code is still generated and saved to the database - you just won't receive the email. You can get the code from the database for testing.

### Code not received

1. Check spam/junk folder
2. Verify email address is correct
3. Check backend logs for errors
4. Use "Resend code" button

### "Invalid code" error

1. Make sure code is exactly 6 digits
2. Check if code expired (15 min limit)
3. Request new code with "Resend code"
4. Verify you're using the most recent code

### Already verified but can't login

- Check password is correct
- Try password reset (if implemented)
- Check database: `SELECT email_verified FROM users WHERE email='your@email.com';`

---

## File Changes Summary

### Backend

- ✅ `models.py` - Added email verification fields
- ✅ `schemas.py` - Added VerifyEmailRequest/Response schemas
- ✅ `email_service.py` - Added send_verification_code()
- ✅ `main.py` - Added verification endpoints, updated signup/login

### Frontend  

- ✅ `App.jsx` - Added VerificationPage component
- ✅ `App.jsx` - Added pendingEmail state
- ✅ `App.jsx` - Updated AuthPage signup flow
- ✅ `App.jsx` - Added /verify routing

### Database

- ✅ Deleted old database to apply schema changes
- ✅ New schema includes email_verified, verification_code, verification_code_expires

---

## What Changed from Before

### Old Flow (Insecure) ❌

```
Sign up → Immediately logged in → Can use app
```

**Problem:** Anyone could create an account with fake emails like `random@mail.mcgill.ca`

### New Flow (Secure) ✅

```
Sign up → Email verification required → Enter code → Verified → Can log in → Can use app
```

**Benefit:** Only real McGill/Concordia students with access to their university email can create accounts!

---

## Next Steps

1. ✅ Backend with email verification implemented
2. ✅ Frontend with verification UI implemented  
3. ✅ Email sending configured
4. 🔄 **Test with real emails** (requires SMTP setup)
5. 📝 Add password reset flow (future)
6. 🔒 Add rate limiting (future)
7. 🚀 Deploy to production

---

**Built with security in mind for McGill & Concordia students! 🔐**

© 2025 MatchMyRoom
