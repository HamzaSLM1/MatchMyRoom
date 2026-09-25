"""Tests for the current Supabase-based auth surface:
- validate_university_email / get_university_from_email helpers
- POST /api/auth/sync-user (creates the local user row after Supabase login)
- get_current_user's 401 behavior for missing/invalid tokens

Local signup/verify-email/login/resend-code no longer exist — auth is handled
by Supabase on the frontend; the backend only verifies the Supabase JWT and
syncs a local user row.
"""
import uuid
from tests.conftest import auth_header


class TestUniversityEmailHelpers:
    def test_validate_mcgill(self):
        from backend.app.main import validate_university_email
        assert validate_university_email("alice@mcgill.ca") is True
        assert validate_university_email("alice@mail.mcgill.ca") is True

    def test_validate_concordia(self):
        from backend.app.main import validate_university_email
        assert validate_university_email("bob@concordia.ca") is True
        assert validate_university_email("bob@live.concordia.ca") is True
        assert validate_university_email("bob@mail.concordia.ca") is True

    def test_validate_rejects_other_domains(self):
        from backend.app.main import validate_university_email
        assert validate_university_email("eve@gmail.com") is False

    def test_validate_case_insensitive(self):
        from backend.app.main import validate_university_email
        assert validate_university_email("ALICE@MCGILL.CA") is True

    def test_get_university_mcgill(self):
        from backend.app.main import get_university_from_email
        assert get_university_from_email("alice@mcgill.ca") == "mcgill"
        assert get_university_from_email("alice@mail.mcgill.ca") == "mcgill"

    def test_get_university_concordia(self):
        from backend.app.main import get_university_from_email
        assert get_university_from_email("bob@concordia.ca") == "concordia"
        assert get_university_from_email("bob@live.concordia.ca") == "concordia"

    def test_get_university_defaults_to_mcgill(self):
        from backend.app.main import get_university_from_email
        # Any non-concordia domain defaults to mcgill (mirrors app behavior;
        # sync-user rejects non-university emails before this is reached)
        assert get_university_from_email("someone@example.com") == "mcgill"


class TestSyncUser:
    def test_creates_new_user(self, client, db_session):
        from backend.app.models import User
        user_id = uuid.uuid4()
        headers = auth_header(user_id, "newstudent@mcgill.ca")
        resp = client.post("/api/auth/sync-user", params={"name": "New Student"}, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["user_id"] == str(user_id)
        assert data["email"] == "newstudent@mcgill.ca"
        assert data["university"] == "mcgill"
        assert data["questionnaire_completed"] is False

        db_user = db_session.query(User).filter(User.id == user_id).first()
        assert db_user is not None
        assert db_user.name == "New Student"

    def test_defaults_name_when_not_provided(self, client):
        user_id = uuid.uuid4()
        headers = auth_header(user_id, "noname@mcgill.ca")
        resp = client.post("/api/auth/sync-user", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "User"

    def test_concordia_email_gets_concordia_university(self, client):
        user_id = uuid.uuid4()
        headers = auth_header(user_id, "student@concordia.ca")
        resp = client.post("/api/auth/sync-user", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["university"] == "concordia"

    def test_rejects_non_university_email(self, client):
        user_id = uuid.uuid4()
        headers = auth_header(user_id, "notastudent@gmail.com")
        resp = client.post("/api/auth/sync-user", headers=headers)
        assert resp.status_code == 403

    def test_existing_user_is_returned_not_recreated(self, client, create_verified_user):
        user = create_verified_user(name="Existing", email="existing@mcgill.ca")
        headers = auth_header(user.id, user.email)
        resp = client.post("/api/auth/sync-user", params={"name": "Different Name"}, headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["user_id"] == str(user.id)
        # Existing row is returned as-is; sync-user does not overwrite name on repeat calls
        assert data["name"] == "Existing"

    def test_unauthenticated_sync_fails(self, client):
        resp = client.post("/api/auth/sync-user")
        assert resp.status_code == 401


class TestGetCurrentUserAuth:
    def test_missing_token_returns_401(self, client, create_verified_user):
        user = create_verified_user(email="noauth-getcurrent@mcgill.ca")
        resp = client.get(f"/api/profile/{user.id}")
        assert resp.status_code == 401

    def test_invalid_token_returns_401(self, client, create_verified_user):
        user = create_verified_user(email="badtoken@mcgill.ca")
        resp = client.get(
            f"/api/profile/{user.id}",
            headers={"Authorization": "Bearer not-a-real-token"},
        )
        assert resp.status_code == 401

    def test_valid_token_for_deleted_user_returns_401(self, client):
        """A token that decodes fine but whose user isn't in the local DB is rejected."""
        user_id = uuid.uuid4()
        headers = auth_header(user_id, "ghost@mcgill.ca")
        resp = client.get(f"/api/profile/{user_id}", headers=headers)
        assert resp.status_code == 401
