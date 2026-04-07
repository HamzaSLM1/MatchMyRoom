"""API tests for auth endpoints: signup, verify-email, login, resend-code."""

import pytest
from datetime import datetime, timedelta, timezone
from tests.conftest import auth_header


class TestSignup:
    def test_signup_mcgill(self, client):
        resp = client.post("/api/signup", json={
            "name": "Alice Smith",
            "email": "alice@mcgill.ca",
            "password": "securepass123",
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["university"] == "mcgill"
        assert data["user_id"] > 0
        assert data["dev_code"] is not None  # dev mode returns the code

    def test_signup_concordia(self, client):
        resp = client.post("/api/signup", json={
            "name": "Bob Jones",
            "email": "bob@concordia.ca",
            "password": "securepass123",
        })
        assert resp.status_code == 200
        assert resp.json()["university"] == "concordia"

    def test_signup_mail_mcgill(self, client):
        resp = client.post("/api/signup", json={
            "name": "Carol", "email": "carol@mail.mcgill.ca", "password": "securepass123",
        })
        assert resp.status_code == 200
        assert resp.json()["university"] == "mcgill"

    def test_signup_live_concordia(self, client):
        resp = client.post("/api/signup", json={
            "name": "Dan", "email": "dan@live.concordia.ca", "password": "securepass123",
        })
        assert resp.status_code == 200
        assert resp.json()["university"] == "concordia"

    def test_signup_invalid_domain(self, client):
        resp = client.post("/api/signup", json={
            "name": "Eve", "email": "eve@gmail.com", "password": "securepass123",
        })
        assert resp.status_code == 400

    def test_signup_duplicate_email(self, client):
        payload = {"name": "First", "email": "dup@mcgill.ca", "password": "securepass123"}
        client.post("/api/signup", json=payload)
        resp = client.post("/api/signup", json=payload)
        assert resp.status_code == 400
        assert "already registered" in resp.json()["detail"]

    def test_signup_empty_name(self, client):
        resp = client.post("/api/signup", json={
            "name": "", "email": "x@mcgill.ca", "password": "securepass123",
        })
        assert resp.status_code == 422

    def test_signup_short_password(self, client):
        resp = client.post("/api/signup", json={
            "name": "Short", "email": "s@mcgill.ca", "password": "short",
        })
        assert resp.status_code == 422


class TestVerifyEmail:
    def _signup(self, client, email="verify@mcgill.ca"):
        resp = client.post("/api/signup", json={
            "name": "Verifier", "email": email, "password": "securepass123",
        })
        return resp.json()

    def test_verify_success(self, client):
        data = self._signup(client)
        resp = client.post("/api/verify-email", json={
            "email": data["email"], "code": data["dev_code"],
        })
        assert resp.status_code == 200
        assert resp.json()["email_verified"] is True

    def test_verify_wrong_code(self, client):
        data = self._signup(client)
        resp = client.post("/api/verify-email", json={
            "email": data["email"], "code": "000000",
        })
        assert resp.status_code == 400

    def test_verify_already_verified(self, client, create_verified_user):
        user = create_verified_user(email="already@mcgill.ca")
        resp = client.post("/api/verify-email", json={
            "email": user.email, "code": "123456",
        })
        assert resp.status_code == 200
        assert "already verified" in resp.json()["message"].lower()

    def test_verify_max_attempts(self, client, db_session):
        data = self._signup(client)
        from backend.app.models import User
        user = db_session.query(User).filter(User.email == data["email"]).first()
        user.verification_attempts = 5
        db_session.commit()
        resp = client.post("/api/verify-email", json={
            "email": data["email"], "code": data["dev_code"],
        })
        assert resp.status_code == 429

    def test_verify_expired_code(self, client, db_session):
        data = self._signup(client)
        from backend.app.models import User
        user = db_session.query(User).filter(User.email == data["email"]).first()
        user.verification_code_expires = datetime.now(timezone.utc) - timedelta(hours=1)
        db_session.commit()
        resp = client.post("/api/verify-email", json={
            "email": data["email"], "code": data["dev_code"],
        })
        assert resp.status_code == 400
        assert "expired" in resp.json()["detail"].lower()


class TestLogin:
    def _create_and_verify(self, client, email="login@mcgill.ca"):
        data = client.post("/api/signup", json={
            "name": "Logger", "email": email, "password": "securepass123",
        }).json()
        client.post("/api/verify-email", json={"email": email, "code": data["dev_code"]})
        return data

    def test_login_success(self, client):
        self._create_and_verify(client)
        resp = client.post("/api/login", json={
            "email": "login@mcgill.ca", "password": "securepass123",
        })
        assert resp.status_code == 200
        assert resp.json()["token"] != ""

    def test_login_wrong_password(self, client):
        self._create_and_verify(client)
        resp = client.post("/api/login", json={
            "email": "login@mcgill.ca", "password": "wrongpassword",
        })
        assert resp.status_code == 401

    def test_login_nonexistent_email(self, client):
        resp = client.post("/api/login", json={
            "email": "nobody@mcgill.ca", "password": "securepass123",
        })
        assert resp.status_code == 401

    def test_login_unverified_email(self, client):
        client.post("/api/signup", json={
            "name": "Unverified", "email": "unv@mcgill.ca", "password": "securepass123",
        })
        resp = client.post("/api/login", json={
            "email": "unv@mcgill.ca", "password": "securepass123",
        })
        assert resp.status_code == 403


class TestResendVerificationCode:
    def test_resend_success(self, client):
        client.post("/api/signup", json={
            "name": "Resender", "email": "resend@mcgill.ca", "password": "securepass123",
        })
        resp = client.post("/api/resend-verification-code", json={"email": "resend@mcgill.ca"})
        assert resp.status_code == 200

    def test_resend_already_verified(self, client, create_verified_user):
        user = create_verified_user(email="verified@mcgill.ca")
        resp = client.post("/api/resend-verification-code", json={"email": user.email})
        assert resp.status_code == 400

    def test_resend_nonexistent(self, client):
        resp = client.post("/api/resend-verification-code", json={"email": "nobody@mcgill.ca"})
        assert resp.status_code == 404
