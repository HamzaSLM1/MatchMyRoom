# Cloudinary Setup Guide for MatchMyRoom

## Step 1: Create Free Cloudinary Account

1. Go to [cloudinary.com](https://cloudinary.com)
2. Click "Sign Up Free"
3. Use your personal email (not McGill/Concordia)
4. Fill in the form:
   - First & Last Name
   - Email
   - Password
   - Company Name: "MatchMyRoom" (or your name)
   - Choose: "Developer/Programmer"

## Step 2: Get Your Credentials

After signing up, you'll land on the dashboard. You'll see:

```
Cloud name: [your-cloud-name]
API Key: [your-api-key]
API Secret: [click to reveal]
```

**Important**: Click "Reveal" next to API Secret to see it.

## Step 3: Create Backend .env File

Create the file `/Users/hamzasalama/MatchMyRoom/backend/.env` with your credentials:

```bash
cd /Users/hamzasalama/MatchMyRoom/backend
cat > .env << 'EOF'
DATABASE_URL=sqlite:///./matchmyroom.db
SECRET_KEY=matchmyroom-secret-key-2025-change-in-production
CLOUDINARY_CLOUD_NAME=your-cloud-name-here
CLOUDINARY_API_KEY=your-api-key-here
CLOUDINARY_API_SECRET=your-api-secret-here
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
EOF
```

**Replace**:
- `your-cloud-name-here` with your Cloud name
- `your-api-key-here` with your API Key
- `your-api-secret-here` with your API Secret

## Step 4: Verify Setup

Create this test file to verify Cloudinary works:

```python
# backend/test_cloudinary.py
import os
from dotenv import load_dotenv
import cloudinary

load_dotenv()

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True
)

print("✅ Cloudinary configured successfully!")
print(f"Cloud Name: {os.getenv('CLOUDINARY_CLOUD_NAME')}")
print(f"API Key: {os.getenv('CLOUDINARY_API_KEY')[:10]}...")
```

Run it:
```bash
cd backend
python test_cloudinary.py
```

You should see: `✅ Cloudinary configured successfully!`

## Example .env File (with fake values)

```env
DATABASE_URL=sqlite:///./matchmyroom.db
SECRET_KEY=matchmyroom-secret-key-2025-change-in-production
CLOUDINARY_CLOUD_NAME=dxyz123abc
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=AbCdEfGhIjKlMnOpQrStUvWxYz1234567890
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

## Free Tier Limits

Cloudinary's free tier includes:
- ✅ 25 GB storage
- ✅ 25 GB bandwidth/month
- ✅ Image transformations
- ✅ Face detection for cropping
- ✅ 500,000 transformations/month

This is MORE than enough for testing and small-scale deployment!

## Troubleshooting

### "Invalid API credentials"
- Check that you copied the full API Secret (click "Reveal")
- Make sure there are no extra spaces in .env file
- Restart the backend server after creating .env

### Images not uploading
- Check file size < 5MB
- Check file format is JPG, PNG, or WebP
- Check browser console for errors
- Verify .env file exists in backend/ directory

### Where are uploaded images?
1. Log into Cloudinary dashboard
2. Click "Media Library" in left menu
3. Look in folder: `matchmyroom/profiles/`
4. Images are named: `user_{user_id}`

## Testing Upload from Terminal

```bash
# Install Cloudinary CLI (optional)
npm install -g cloudinary-cli

# Upload test image
cloudinary uploader upload test.jpg \
  --cloud_name your-cloud-name \
  --api_key your-api-key \
  --api_secret your-api-secret \
  --folder matchmyroom/test
```

## Security Notes

⚠️ **NEVER commit .env file to git!**
- Already in .gitignore
- If accidentally committed, regenerate API secret in Cloudinary dashboard

✅ **For production**:
- Use environment variables on hosting platform
- Consider signed uploads for extra security
- Set up usage alerts in Cloudinary dashboard

---

Once setup is complete, profile picture uploads will work automatically in the app!
