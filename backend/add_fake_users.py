"""
Script to add fake users to the database for testing purposes
Run with: python3 add_fake_users.py
"""

import sys
import random
from pathlib import Path

# Add the parent directory to the path so we can import from app
sys.path.insert(0, str(Path(__file__).parent))

from app.database import SessionLocal, init_db
from app.models import User, QuestionnaireResponse
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_fake_users():
    """Create 10 fake users with completed questionnaires"""

    init_db()
    db = SessionLocal()

    fake_users = [
        {
            "name": "Emma Johnson",
            "email": "emma.johnson@mail.mcgill.ca",
            "university": "mcgill",
            "program": "Engineering",
            "bio": "Third-year engineering student who loves hiking and cooking. Looking for a clean, quiet roommate.",
            "responses": {"gender": 1, "genderPreference": 3, "age": 1, "program": 2, "budget": 1, "location": 0, "religion": 5, "sleepSchedule": 2, "cleanliness": 1, "noise": 0, "guests": 1, "study": 2, "dietary": 0, "workFromHome": 1, "pets": 2, "language": 0, "moveIn": 0}
        },
        {
            "name": "Liam Chen",
            "email": "liam.chen@concordia.ca",
            "university": "concordia",
            "program": "Commerce/Management",
            "bio": "Business student and gym enthusiast. Social but respectful of personal space.",
            "responses": {"gender": 0, "genderPreference": 3, "age": 0, "program": 3, "budget": 2, "location": 2, "religion": 0, "sleepSchedule": 1, "cleanliness": 1, "noise": 2, "guests": 2, "study": 1, "dietary": 0, "workFromHome": 0, "pets": 0, "language": 0, "moveIn": 0}
        },
        {
            "name": "Sophia Patel",
            "email": "sophia.patel@mcgill.ca",
            "university": "mcgill",
            "program": "Science",
            "bio": "Pre-med student who studies a lot. Looking for someone serious about academics.",
            "responses": {"gender": 1, "genderPreference": 1, "age": 1, "program": 1, "budget": 0, "location": 0, "religion": 4, "sleepSchedule": 0, "cleanliness": 0, "noise": 0, "guests": 0, "study": 0, "dietary": 1, "workFromHome": 0, "pets": 3, "language": 2, "moveIn": 0}
        },
        {
            "name": "Noah Tremblay",
            "email": "noah.tremblay@live.concordia.ca",
            "university": "concordia",
            "program": "Arts",
            "bio": "Art history major and part-time barista. Love music, museums, and good conversations.",
            "responses": {"gender": 0, "genderPreference": 3, "age": 1, "program": 0, "budget": 1, "location": 1, "religion": 0, "sleepSchedule": 2, "cleanliness": 2, "noise": 1, "guests": 2, "study": 1, "dietary": 2, "workFromHome": 2, "pets": 2, "language": 2, "moveIn": 1}
        },
        {
            "name": "Olivia Martinez",
            "email": "olivia.martinez@mail.mcgill.ca",
            "university": "mcgill",
            "program": "Law",
            "bio": "Law student looking for a quiet study environment. I'm organized and respectful.",
            "responses": {"gender": 1, "genderPreference": 1, "age": 2, "program": 5, "budget": 2, "location": 0, "religion": 1, "sleepSchedule": 0, "cleanliness": 0, "noise": 0, "guests": 0, "study": 0, "dietary": 0, "workFromHome": 1, "pets": 0, "language": 0, "moveIn": 0}
        },
        {
            "name": "Ethan Kim",
            "email": "ethan.kim@concordia.ca",
            "university": "concordia",
            "program": "Engineering",
            "bio": "Computer engineering student and gamer. Night owl who's chill and easy-going.",
            "responses": {"gender": 0, "genderPreference": 3, "age": 0, "program": 2, "budget": 1, "location": 4, "religion": 0, "sleepSchedule": 1, "cleanliness": 2, "noise": 1, "guests": 1, "study": 2, "dietary": 0, "workFromHome": 3, "pets": 2, "language": 0, "moveIn": 0}
        },
        {
            "name": "Ava Leblanc",
            "email": "ava.leblanc@mcgill.ca",
            "university": "mcgill",
            "program": "Music",
            "bio": "Music performance student. I practice piano daily but use headphones! Love cats.",
            "responses": {"gender": 1, "genderPreference": 3, "age": 0, "program": 6, "budget": 0, "location": 1, "religion": 0, "sleepSchedule": 2, "cleanliness": 1, "noise": 1, "guests": 1, "study": 2, "dietary": 2, "workFromHome": 1, "pets": 1, "language": 2, "moveIn": 0}
        },
        {
            "name": "Mason Williams",
            "email": "mason.williams@live.concordia.ca",
            "university": "concordia",
            "program": "Science",
            "bio": "Biology major and fitness enthusiast. Early riser who keeps things clean and organized.",
            "responses": {"gender": 0, "genderPreference": 3, "age": 1, "program": 1, "budget": 1, "location": 3, "religion": 1, "sleepSchedule": 0, "cleanliness": 0, "noise": 1, "guests": 1, "study": 1, "dietary": 3, "workFromHome": 0, "pets": 2, "language": 0, "moveIn": 0}
        },
        {
            "name": "Isabella Nguyen",
            "email": "isabella.nguyen@mail.mcgill.ca",
            "university": "mcgill",
            "program": "Commerce/Management",
            "bio": "Marketing major and social butterfly. Love hosting small gatherings and trying new recipes.",
            "responses": {"gender": 1, "genderPreference": 3, "age": 1, "program": 3, "budget": 2, "location": 2, "religion": 2, "sleepSchedule": 2, "cleanliness": 1, "noise": 2, "guests": 3, "study": 1, "dietary": 0, "workFromHome": 2, "pets": 2, "language": 0, "moveIn": 1}
        },
        {
            "name": "James Anderson",
            "email": "james.anderson@concordia.ca",
            "university": "concordia",
            "program": "Education",
            "bio": "Education student and aspiring teacher. Friendly, responsible, and drama-free.",
            "responses": {"gender": 0, "genderPreference": 3, "age": 2, "program": 7, "budget": 1, "location": 0, "religion": 1, "sleepSchedule": 0, "cleanliness": 1, "noise": 1, "guests": 2, "study": 2, "dietary": 0, "workFromHome": 1, "pets": 2, "language": 0, "moveIn": 0}
        }
    ]

    password = "password123"  # Same password for all fake users
    hashed_password = pwd_context.hash(password)

    created_count = 0

    for fake_user in fake_users:
        # Check if user already exists
        existing = db.query(User).filter(User.email == fake_user["email"]).first()
        if existing:
            print(f"⚠️  User {fake_user['email']} already exists, skipping...")
            continue

        # Create user
        user = User(
            name=fake_user["name"],
            email=fake_user["email"],
            password_hash=hashed_password,
            university=fake_user["university"],
            program=fake_user["program"],
            bio=fake_user["bio"],
            email_verified=True,
            questionnaire_completed=True
        )

        db.add(user)
        db.flush()  # Get the user ID

        # Create questionnaire response
        questionnaire = QuestionnaireResponse(
            user_id=user.id,
            responses=fake_user["responses"]
        )

        db.add(questionnaire)
        created_count += 1

        print(f"✅ Created user: {fake_user['name']} ({fake_user['email']})")

    db.commit()
    db.close()

    print(f"\n🎉 Successfully created {created_count} fake users!")
    print(f"📝 Password for all fake users: {password}")
    print("\n💡 Run the backend to calculate matches for these users:")
    print("   POST http://localhost:8000/api/matches/calculate?user_id=<id>")

if __name__ == "__main__":
    print("🚀 Adding fake users to database...\n")
    create_fake_users()