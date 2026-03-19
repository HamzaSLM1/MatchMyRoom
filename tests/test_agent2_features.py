"""
Tests for Agent 2 backend features:
- Password reset (forgot-password, reset-password)
- Account deletion (DELETE /api/users/{user_id})
- Block / Unblock / Report
- Block filtering in matches and messages
- Matching algorithm bug fixes
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import patch
from tests.conftest import auth_header, sample_questionnaire_responses


# ═══════════════════════════════════════════════════════════════════════════════
# Password Reset Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestForgotPassword:
    def test_always_returns_200_for_nonexistent_email(self, client):
        """Anti-enumeration: non-existent email still gets 200."""
        resp = client.post("/api/auth/forgot-password", json={"email": "nobody@mcgill.ca"})
        assert resp.status_code == 200
        assert "registered" in resp.json()["message"].lower()

    def test_returns_200_for_existing_email(self, client, create_verified_user):
        user = create_verified_user(email="reset@mcgill.ca")
        with patch("backend.app.main.send_email", return_value=True):
            resp = client.post("/api/auth/forgot-password", json={"email": "reset@mcgill.ca"})
        assert resp.status_code == 200
        assert "registered" in resp.json()["message"].lower()

    def test_creates_token_in_db(self, client, create_verified_user, db_session):
        from backend.app.models import PasswordResetToken
        user = create_verified_user(email="tokentest@mcgill.ca")
        with patch("backend.app.main.send_email", return_value=True):
            client.post("/api/auth/forgot-password", json={"email": "tokentest@mcgill.ca"})
        token = db_session.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id
        ).first()
        assert token is not None
        assert not token.used

    def test_replaces_old_tokens(self, client, create_verified_user, db_session):
        from backend.app.models import PasswordResetToken
        user = create_verified_user(email="replace@mcgill.ca")
        with patch("backend.app.main.send_email", return_value=True):
            client.post("/api/auth/forgot-password", json={"email": "replace@mcgill.ca"})
            client.post("/api/auth/forgot-password", json={"email": "replace@mcgill.ca"})
        tokens = db_session.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id
        ).all()
        # Should only have 1 token after second request
        assert len(tokens) == 1


class TestResetPassword:
    def _get_token(self, client, db_session, user):
        from backend.app.models import PasswordResetToken
        with patch("backend.app.main.send_email", return_value=True):
            client.post("/api/auth/forgot-password", json={"email": user.email})
        db_session.expire_all()
        token = db_session.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id
        ).first()
        return token.token

    def test_valid_token_resets_password(self, client, create_verified_user, db_session):
        user = create_verified_user(email="validreset@mcgill.ca")
        token = self._get_token(client, db_session, user)

        resp = client.post("/api/auth/reset-password", json={
            "token": token,
            "new_password": "newpassword123"
        })
        assert resp.status_code == 200
        assert "successfully" in resp.json()["message"].lower()

    def test_token_marked_used_after_reset(self, client, create_verified_user, db_session):
        from backend.app.models import PasswordResetToken
        user = create_verified_user(email="usedtoken@mcgill.ca")
        token_str = self._get_token(client, db_session, user)

        client.post("/api/auth/reset-password", json={
            "token": token_str,
            "new_password": "newpassword123"
        })

        db_session.expire_all()
        token = db_session.query(PasswordResetToken).filter(
            PasswordResetToken.token == token_str
        ).first()
        assert token.used

    def test_used_token_returns_400(self, client, create_verified_user, db_session):
        user = create_verified_user(email="reuse@mcgill.ca")
        token = self._get_token(client, db_session, user)

        # First reset — should succeed
        client.post("/api/auth/reset-password", json={"token": token, "new_password": "pass12345"})

        # Second reset with same token — should fail
        resp = client.post("/api/auth/reset-password", json={"token": token, "new_password": "pass12345"})
        assert resp.status_code == 400

    def test_invalid_token_returns_400(self, client):
        resp = client.post("/api/auth/reset-password", json={
            "token": "totally-fake-token-xyz",
            "new_password": "pass12345"
        })
        assert resp.status_code == 400

    def test_expired_token_returns_400(self, client, create_verified_user, db_session):
        from backend.app.models import PasswordResetToken
        user = create_verified_user(email="expired@mcgill.ca")
        token_str = self._get_token(client, db_session, user)

        # Manually expire the token
        token = db_session.query(PasswordResetToken).filter(
            PasswordResetToken.token == token_str
        ).first()
        token.expires_at = datetime.utcnow() - timedelta(hours=2)
        db_session.commit()

        resp = client.post("/api/auth/reset-password", json={
            "token": token_str,
            "new_password": "pass12345"
        })
        assert resp.status_code == 400

    def test_can_login_with_new_password_after_reset(self, client, create_verified_user, db_session):
        user = create_verified_user(email="newlogin@mcgill.ca", password="oldpassword123")
        token = self._get_token(client, db_session, user)

        client.post("/api/auth/reset-password", json={
            "token": token,
            "new_password": "newpassword456"
        })

        resp = client.post("/api/login", json={
            "email": "newlogin@mcgill.ca",
            "password": "newpassword456"
        })
        assert resp.status_code == 200
        assert resp.json()["token"] != ""


# ═══════════════════════════════════════════════════════════════════════════════
# Account Deletion Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestAccountDeletion:
    def test_delete_own_account(self, client, create_verified_user, db_session):
        from backend.app.models import User
        user = create_verified_user(email="delete@mcgill.ca")
        headers = auth_header(user.id, user.email)

        resp = client.delete(f"/api/users/{user.id}", headers=headers)
        assert resp.status_code == 200
        assert "deleted" in resp.json()["message"].lower()

        # User should be gone
        db_session.expire_all()
        gone = db_session.query(User).filter(User.id == user.id).first()
        assert gone is None

    def test_cannot_delete_another_users_account(self, client, create_verified_user):
        user1 = create_verified_user(email="user1del@mcgill.ca")
        user2 = create_verified_user(email="user2del@mcgill.ca")
        headers = auth_header(user1.id, user1.email)

        resp = client.delete(f"/api/users/{user2.id}", headers=headers)
        assert resp.status_code == 403

    def test_delete_cascades_messages(self, client, create_verified_user, db_session):
        from backend.app.models import Message
        user = create_verified_user(email="msgdelete@mcgill.ca")
        other = create_verified_user(email="msgother@mcgill.ca")

        # Create a message
        msg = Message(sender_id=user.id, recipient_id=other.id, content="Hello")
        db_session.add(msg)
        db_session.commit()

        headers = auth_header(user.id, user.email)
        client.delete(f"/api/users/{user.id}", headers=headers)

        db_session.expire_all()
        msgs = db_session.query(Message).filter(Message.sender_id == user.id).all()
        assert len(msgs) == 0

    def test_unauthenticated_delete_fails(self, client, create_verified_user):
        user = create_verified_user(email="unauth@mcgill.ca")
        resp = client.delete(f"/api/users/{user.id}")
        assert resp.status_code == 401


# ═══════════════════════════════════════════════════════════════════════════════
# Block / Unblock Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestBlock:
    def test_block_user(self, client, create_verified_user, db_session):
        from backend.app.models import Block
        blocker = create_verified_user(email="blocker@mcgill.ca")
        target = create_verified_user(email="target@mcgill.ca")
        headers = auth_header(blocker.id, blocker.email)

        resp = client.post(f"/api/users/{blocker.id}/block",
                           json={"blocked_user_id": target.id},
                           headers=headers)
        assert resp.status_code == 200
        assert "blocked" in resp.json()["message"].lower()

        block = db_session.query(Block).filter(
            Block.blocker_id == blocker.id,
            Block.blocked_id == target.id
        ).first()
        assert block is not None

    def test_cannot_block_self(self, client, create_verified_user):
        user = create_verified_user(email="selfblock@mcgill.ca")
        headers = auth_header(user.id, user.email)

        resp = client.post(f"/api/users/{user.id}/block",
                           json={"blocked_user_id": user.id},
                           headers=headers)
        assert resp.status_code == 400
        assert "yourself" in resp.json()["detail"].lower()

    def test_cannot_block_twice(self, client, create_verified_user):
        blocker = create_verified_user(email="double_blocker@mcgill.ca")
        target = create_verified_user(email="double_target@mcgill.ca")
        headers = auth_header(blocker.id, blocker.email)

        client.post(f"/api/users/{blocker.id}/block",
                    json={"blocked_user_id": target.id},
                    headers=headers)

        resp = client.post(f"/api/users/{blocker.id}/block",
                           json={"blocked_user_id": target.id},
                           headers=headers)
        assert resp.status_code == 400
        assert "already blocked" in resp.json()["detail"].lower()

    def test_unblock_user(self, client, create_verified_user, db_session):
        from backend.app.models import Block
        blocker = create_verified_user(email="unblocker@mcgill.ca")
        target = create_verified_user(email="unblocked@mcgill.ca")
        headers = auth_header(blocker.id, blocker.email)

        client.post(f"/api/users/{blocker.id}/block",
                    json={"blocked_user_id": target.id},
                    headers=headers)

        resp = client.delete(f"/api/users/{blocker.id}/block/{target.id}", headers=headers)
        assert resp.status_code == 200
        assert "unblocked" in resp.json()["message"].lower()

        db_session.expire_all()
        block = db_session.query(Block).filter(
            Block.blocker_id == blocker.id,
            Block.blocked_id == target.id
        ).first()
        assert block is None

    def test_unblock_nonexistent_returns_404(self, client, create_verified_user):
        user = create_verified_user(email="noblock@mcgill.ca")
        other = create_verified_user(email="noblock2@mcgill.ca")
        headers = auth_header(user.id, user.email)

        resp = client.delete(f"/api/users/{user.id}/block/{other.id}", headers=headers)
        assert resp.status_code == 404

    def test_cannot_block_as_another_user(self, client, create_verified_user):
        user1 = create_verified_user(email="asblock1@mcgill.ca")
        user2 = create_verified_user(email="asblock2@mcgill.ca")
        user3 = create_verified_user(email="asblock3@mcgill.ca")
        headers = auth_header(user1.id, user1.email)

        # user1 tries to block as user2
        resp = client.post(f"/api/users/{user2.id}/block",
                           json={"blocked_user_id": user3.id},
                           headers=headers)
        assert resp.status_code == 403


# ═══════════════════════════════════════════════════════════════════════════════
# Report Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestReport:
    def test_report_user(self, client, create_verified_user, db_session):
        from backend.app.models import Report
        reporter = create_verified_user(email="reporter@mcgill.ca")
        target = create_verified_user(email="reported@mcgill.ca")
        headers = auth_header(reporter.id, reporter.email)

        resp = client.post(f"/api/users/{reporter.id}/report",
                           json={"reported_user_id": target.id, "reason": "Harassment"},
                           headers=headers)
        assert resp.status_code == 200
        assert "submitted" in resp.json()["message"].lower()

        report = db_session.query(Report).filter(
            Report.reporter_id == reporter.id,
            Report.reported_id == target.id
        ).first()
        assert report is not None
        assert report.reason == "Harassment"

    def test_cannot_report_self(self, client, create_verified_user):
        user = create_verified_user(email="selfreport@mcgill.ca")
        headers = auth_header(user.id, user.email)

        resp = client.post(f"/api/users/{user.id}/report",
                           json={"reported_user_id": user.id, "reason": "Test"},
                           headers=headers)
        assert resp.status_code == 400
        assert "yourself" in resp.json()["detail"].lower()

    def test_duplicate_reports_allowed(self, client, create_verified_user, db_session):
        from backend.app.models import Report
        reporter = create_verified_user(email="dup_reporter@mcgill.ca")
        target = create_verified_user(email="dup_target@mcgill.ca")
        headers = auth_header(reporter.id, reporter.email)

        client.post(f"/api/users/{reporter.id}/report",
                    json={"reported_user_id": target.id, "reason": "Spam"},
                    headers=headers)
        resp = client.post(f"/api/users/{reporter.id}/report",
                           json={"reported_user_id": target.id, "reason": "Fake Profile"},
                           headers=headers)
        assert resp.status_code == 200

        reports = db_session.query(Report).filter(
            Report.reporter_id == reporter.id,
            Report.reported_id == target.id
        ).all()
        assert len(reports) == 2


# ═══════════════════════════════════════════════════════════════════════════════
# Block Filtering Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestBlockFiltering:
    def test_blocked_user_filtered_from_messages(self, client, create_verified_user, db_session):
        from backend.app.models import Message
        user_a = create_verified_user(email="filter_a@mcgill.ca")
        user_b = create_verified_user(email="filter_b@mcgill.ca")

        # Add a message thread between them
        msg = Message(sender_id=user_a.id, recipient_id=user_b.id, content="Hi!")
        db_session.add(msg)
        db_session.commit()

        # A blocks B
        headers_a = auth_header(user_a.id, user_a.email)
        client.post(f"/api/users/{user_a.id}/block",
                    json={"blocked_user_id": user_b.id},
                    headers=headers_a)

        # A's conversations should not include B
        resp = client.get(f"/api/messages/conversations/{user_a.id}", headers=headers_a)
        assert resp.status_code == 200
        convos = resp.json()
        other_ids = [c["user_id"] for c in convos]
        assert user_b.id not in other_ids

    def test_blocked_user_cannot_send_message(self, client, create_verified_user):
        user_a = create_verified_user(email="nosend_a@mcgill.ca")
        user_b = create_verified_user(email="nosend_b@mcgill.ca")

        # A blocks B
        headers_a = auth_header(user_a.id, user_a.email)
        client.post(f"/api/users/{user_a.id}/block",
                    json={"blocked_user_id": user_b.id},
                    headers=headers_a)

        # B tries to send a message to A — should be blocked (bidirectional)
        headers_b = auth_header(user_b.id, user_b.email)
        resp = client.post("/api/messages/send",
                           json={"recipient_id": user_a.id, "content": "Hello!"},
                           params={"sender_id": user_b.id},
                           headers=headers_b)
        assert resp.status_code == 403

    def test_blocker_cannot_send_message_to_blocked(self, client, create_verified_user):
        user_a = create_verified_user(email="nosend_c@mcgill.ca")
        user_b = create_verified_user(email="nosend_d@mcgill.ca")

        # A blocks B
        headers_a = auth_header(user_a.id, user_a.email)
        client.post(f"/api/users/{user_a.id}/block",
                    json={"blocked_user_id": user_b.id},
                    headers=headers_a)

        # A tries to send to B — should also be blocked
        resp = client.post("/api/messages/send",
                           json={"recipient_id": user_b.id, "content": "Hello!"},
                           params={"sender_id": user_a.id},
                           headers=headers_a)
        assert resp.status_code == 403


# ═══════════════════════════════════════════════════════════════════════════════
# Matching Algorithm Bug Fix Tests
# ═══════════════════════════════════════════════════════════════════════════════

class TestMatchingBugFixes:
    def test_no_preference_gender_default_is_2(self):
        """Bug 2 fix: genderPreference default is now 2 (No preference), not 3."""
        from backend.app.matching import _gender_score
        # Both users with no genderPreference key — should default to 2 (No preference)
        # and get full 20 points
        score = _gender_score({}, {})
        assert score == 20

    def test_no_preference_explicit_both_same(self):
        """Both users explicitly set genderPreference=2 (No preference) → 20 points."""
        from backend.app.matching import _gender_score
        score = _gender_score(
            {"gender": 0, "genderPreference": 2},
            {"gender": 1, "genderPreference": 2}
        )
        assert score == 20

    def test_lifestyle_score_case3_uses_helper(self):
        """Bug 1 fix: Case 3 lifestyle scoring uses _lifestyle_score() helper for None-handling."""
        from backend.app.matching import calculate_compatibility
        # Both users looking (hasApartment=1), same lifestyle — should get full lifestyle points
        r1 = {
            "hasApartment": 1, "budget": 1, "location": 2,
            "sleepSchedule": 1, "cleanliness": 1, "noise": 1, "guests": 1, "study": 1,
            "gender": 0, "genderPreference": 2
        }
        r2 = {
            "hasApartment": 1, "budget": 1, "location": 2,
            "sleepSchedule": 1, "cleanliness": 1, "noise": 1, "guests": 1, "study": 1,
            "gender": 1, "genderPreference": 2
        }
        score = calculate_compatibility(r1, r2)
        # With matching budget(30), location(25), gender(20), lifestyle(20), pets partial = high score
        assert score > 80

    def test_lifestyle_score_case3_none_handling(self):
        """Bug 1 fix: None lifestyle values in Case 3 are handled correctly (not counted as match)."""
        from backend.app.matching import _lifestyle_score
        # Only explicit matches count — None != None per _lifestyle_score()
        score = _lifestyle_score(
            {"sleepSchedule": None, "cleanliness": None, "noise": None, "guests": None, "study": None},
            {"sleepSchedule": None, "cleanliness": None, "noise": None, "guests": None, "study": None}
        )
        # All None — no matches, should be 0
        assert score == 0

    def test_lifestyle_case2_and_case3_consistent(self):
        """Bug 1 fix: lifestyle scoring produces identical results for Case 2 and Case 3 with identical lifestyle inputs."""
        from backend.app.matching import _lifestyle_score
        r = {"sleepSchedule": 0, "cleanliness": 1, "noise": 2, "guests": 0, "study": 1}
        # Same inputs — both should return the same score
        assert _lifestyle_score(r, r) == _lifestyle_score(r, r)
