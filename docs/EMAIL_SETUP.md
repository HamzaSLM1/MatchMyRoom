# Email Notifications Setup Guide

MatchMyRoom can automatically notify users when new potential roommate matches are found for them! 📧

## 🎯 What Gets Sent

Users receive email notifications when:
1. **New matches are found** - When someone new completes the questionnaire and matches with them
2. **They previously had no matches** - And now compatible roommates have joined

## 📧 Email Setup (Gmail Example)

### Step 1: Enable App Passwords in Gmail

1. Go to your Google Account: https://myaccount.google.com
2. Navigate to **Security** → **2-Step Verification** (enable if not already)
3. Scroll down to **App passwords**
4. Select app: **Mail**
5. Select device: **Other** (enter "MatchMyRoom")
6. Click **Generate**
7. Copy the 16-character app password (example: `abcd efgh ijkl mnop`)

### Step 2: Configure Backend .env File

Edit `/Users/hamzasalama/MatchMyRoom/backend/.env`:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-gmail-address@gmail.com
SMTP_PASSWORD=abcdefghijklmnop
FROM_EMAIL=noreply@matchmyroom.com
APP_URL=http://localhost:3000
```

**Replace:**
- `your-gmail-address@gmail.com` with your actual Gmail
- `abcdefghijklmnop` with your App Password (no spaces)

### Step 3: Restart Backend

```bash
cd backend
# Stop the backend (Ctrl+C)
python3 -m uvicorn app.main:app --reload
```

That's it! Emails will now be sent automatically. ✅

---

## 🧪 Testing Email Notifications

### Method 1: Automatic (Recommended)

Emails are sent automatically when:
- A new user completes their questionnaire
- This creates matches for existing users who previously had no matches

**Test it:**
1. Create User A with questionnaire
2. Create User B with compatible questionnaire
3. User A receives an email notification

### Method 2: Manual Trigger

Force send notifications to all users who have matches:

```bash
curl -X POST http://localhost:8000/api/matches/notify-all
```

---

## 📨 Email Templates

### New Matches Notification

**Subject:** 🎉 New Roommate Matches Found on MatchMyRoom!

**Content:**
- Personalized greeting
- Number of new matches found
- Call-to-action button to view matches
- Clean, branded design (McGill red theme)

---

## 🔧 Using Other Email Providers

### Outlook/Hotmail

```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USERNAME=your-email@outlook.com
SMTP_PASSWORD=your-password
```

### Custom SMTP Server

```env
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587  # or 465 for SSL
SMTP_USERNAME=noreply@yourdomain.com
SMTP_PASSWORD=your-password
```

---

## ⚙️ Advanced: Periodic Notifications

To check for new matches periodically (e.g., daily), set up a cron job or scheduled task:

### Using Cron (Linux/Mac)

```bash
# Edit crontab
crontab -e

# Add this line to check daily at 9 AM
0 9 * * * curl -X POST http://localhost:8000/api/matches/notify-all
```

### Using Task Scheduler (Windows)

1. Open Task Scheduler
2. Create Basic Task
3. Trigger: Daily at 9:00 AM
4. Action: Start a program
5. Program: `curl`
6. Arguments: `-X POST http://localhost:8000/api/matches/notify-all`

---

## 🚫 Disabling Email Notifications

Leave `SMTP_USERNAME` and `SMTP_PASSWORD` blank in `.env`:

```env
SMTP_USERNAME=
SMTP_PASSWORD=
```

The app will still work normally, just without sending emails.

---

## 🐛 Troubleshooting

### "⚠️ Email not configured"

**Cause:** SMTP_USERNAME or SMTP_PASSWORD is empty

**Fix:** Fill in your email credentials in `.env` and restart backend

### "Authentication failed"

**Cause:** Incorrect credentials or App Password not enabled

**Fix:**
1. Double-check your App Password (no spaces)
2. Enable 2-Step Verification in Google Account
3. Generate a new App Password

### "Connection timeout"

**Cause:** Firewall blocking SMTP port 587

**Fix:**
1. Check firewall settings
2. Try port 465 (SSL) instead
3. Contact your IT department if on corporate network

### Emails not arriving

**Check:**
1. Spam/Junk folder
2. Backend terminal for error messages
3. Email credentials are correct
4. Internet connection is active

---

## 📊 Email Delivery Status

Check backend terminal logs:

```
✅ Email sent to user@example.com
❌ Failed to send email to user@example.com: Authentication error
```

---

## 🎨 Customizing Email Templates

Edit `/Users/hamzasalama/MatchMyRoom/backend/app/email_service.py`:

- Change colors, styling in HTML templates
- Modify subject lines
- Add more information
- Include profile pictures (coming soon)

---

## 🔐 Security Best Practices

1. ✅ **Never commit** `.env` file to git (already in .gitignore)
2. ✅ **Use App Passwords** instead of real passwords
3. ✅ **Rotate passwords** periodically
4. ✅ **Limit email sending** rate to avoid spam flags
5. ✅ **Monitor** email logs for suspicious activity

---

## 🚀 Production Recommendations

For production deployment, use a professional email service:

- **SendGrid** (free tier: 100 emails/day)
- **Mailgun** (free tier: 5,000 emails/month)
- **AWS SES** (pay-as-you-go, very cheap)
- **Postmark** (developer-friendly)

These services offer:
- Higher delivery rates
- Better spam reputation
- Detailed analytics
- Webhooks for tracking

---

**Need help?** Check the main documentation or open an issue!

Built with ❤️ for McGill & Concordia students
