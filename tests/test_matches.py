"""API tests for match calculation and retrieval endpoints."""

import uuid
import pytest
from tests.conftest import auth_header, sample_questionnaire_responses


class TestCalculateMatches:
    @pytest.mark.parametrize("existing_match", [False, True], ids=["new", "saved"])
    @pytest.mark.parametrize("first_housing,second_housing", [
        ({"hasApartment": 0}, {"hasApartment": 0}),
        ({"livingLocation": 0, "mcgillResidence": 0},
         {"livingLocation": 0, "mcgillResidence": 1}),
        ({"livingLocation": 0, "concordiaResidence": 0},
         {"livingLocation": 0, "concordiaResidence": 1}),
        ({"livingLocation": 0, "mcgillResidence": 0},
         {"livingLocation": 0, "concordiaResidence": 0}),
    ], ids=["both-have-apartments", "different-mcgill-residences",
            "different-concordia-residences", "cross-university-residences"])
    def test_same_gender_does_not_override_housing_exclusions(
        self, client, db_session, create_user_with_questionnaire,
        first_housing, second_housing, existing_match,
    ):
        from backend.app.models import Match

        a = create_user_with_questionnaire(
            email="housing_a@mcgill.ca", responses={"gender": 0, **first_housing},
        )
        b = create_user_with_questionnaire(
            email="housing_b@mcgill.ca", responses={"gender": 0, **second_housing},
        )
        if existing_match:
            db_session.add(Match(
                user1_id=min(a.id, b.id), user2_id=max(a.id, b.id),
                compatibility_score=0,
            ))
            db_session.commit()

        response = client.post(
            f"/api/matches/calculate?user_id={a.id}",
            headers=auth_header(a.id, a.email),
        )
        assert response.status_code == 200
        assert db_session.query(Match).count() == 0
        assert response.json()["matches_found"] == 0
        for user in (a, b):
            matches = client.get(
                f"/api/matches/{user.id}", headers=auth_header(user.id, user.email),
            )
            assert matches.status_code == 200
            assert matches.json() == []

    def test_refresh_preserves_eligible_match_while_blocked(self, client, db_session, create_user_with_questionnaire):
        from backend.app.models import Block, Match

        a = create_user_with_questionnaire(name="A", email="blockrefresh_a@mcgill.ca")
        b = create_user_with_questionnaire(name="B", email="blockrefresh_b@mcgill.ca")
        headers = auth_header(a.id, a.email)
        client.post(f"/api/matches/calculate?user_id={a.id}", headers=headers)
        block = Block(blocker_id=a.id, blocked_id=b.id)
        db_session.add(block)
        db_session.commit()
        client.post(f"/api/matches/calculate?user_id={a.id}", headers=headers)
        assert db_session.query(Match).count() == 1
        assert client.get(f"/api/matches/{a.id}", headers=headers).json() == []
        db_session.delete(block)
        db_session.commit()
        matches = client.get(f"/api/matches/{a.id}", headers=headers).json()
        assert [match["user_id"] for match in matches] == [str(b.id)]

    def test_same_gender_low_score_is_listed(self, client, create_user_with_questionnaire):
        first = sample_questionnaire_responses()
        second = sample_questionnaire_responses()
        first.update({"budget": 0, "location": 0, "gender": 0,
                      "sleepSchedule": 0, "cleanliness": 0, "noise": 0, "guests": 0, "study": 0, "pets": 0})
        second.update({"budget": 3, "location": 4, "gender": 0,
                       "sleepSchedule": 2, "cleanliness": 2, "noise": 2, "guests": 3, "study": 3, "pets": 2})
        a = create_user_with_questionnaire(name="Low A", email="lowa@mcgill.ca", responses=first)
        b = create_user_with_questionnaire(name="Low B", email="lowb@mcgill.ca", responses=second)
        response = client.post(f"/api/matches/calculate?user_id={a.id}", headers=auth_header(a.id, a.email))
        assert response.status_code == 200
        matches = client.get(f"/api/matches/{a.id}", headers=auth_header(a.id, a.email)).json()
        assert any(m["user_id"] == str(b.id) and m["compatibility_score"] <= 50 for m in matches)

    def test_calculate_includes_candidate_after_first_500(self, client, db_session, create_user_with_questionnaire):
        from backend.app.models import User, QuestionnaireResponse

        current = create_user_with_questionnaire(name="Current", email="current@mcgill.ca")
        fillers = [
            User(id=uuid.UUID(int=i), name=f"Filler {i}", email=f"filler{i}@mcgill.ca",
                 questionnaire_completed=True)
            for i in range(1, 501)
        ]
        target = User(id=uuid.UUID(int=501), name="Late candidate",
                      email="late@mcgill.ca", questionnaire_completed=True)
        db_session.add_all(fillers + [target])
        db_session.add(QuestionnaireResponse(
            user_id=target.id, responses=sample_questionnaire_responses()
        ))
        db_session.commit()

        response = client.post(
            f"/api/matches/calculate?user_id={current.id}",
            headers=auth_header(current.id, current.email),
        )
        assert response.status_code == 200
        assert response.json()["matches_found"] == 1

    def test_new_questionnaire_creates_match_for_existing_user(self, client, create_user_with_questionnaire, create_verified_user):
        existing = create_user_with_questionnaire(name="Existing", email="existing@mcgill.ca")
        newcomer = create_verified_user(name="New", email="new@mcgill.ca")
        response = client.post(
            f"/api/questionnaire/submit?user_id={newcomer.id}",
            json={"responses": sample_questionnaire_responses()},
            headers=auth_header(newcomer.id, newcomer.email),
        )
        assert response.status_code == 200
        matches = client.get(
            f"/api/matches/{existing.id}", headers=auth_header(existing.id, existing.email)
        ).json()
        assert any(match["user_id"] == str(newcomer.id) for match in matches)
        reverse_matches = client.get(
            f"/api/matches/{newcomer.id}", headers=auth_header(newcomer.id, newcomer.email)
        ).json()
        assert any(match["user_id"] == str(existing.id) for match in reverse_matches)

    def test_calculate_creates_matches(self, client, create_user_with_questionnaire):
        u1 = create_user_with_questionnaire(name="A", email="a@mcgill.ca")
        u2 = create_user_with_questionnaire(name="B", email="b@mcgill.ca")

        resp = client.post(
            f"/api/matches/calculate?user_id={u1.id}",
            headers=auth_header(u1.id, u1.email),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["matches_found"] >= 0

    def test_calculate_no_questionnaire(self, client, create_verified_user):
        user = create_verified_user(email="noquiz@mcgill.ca")
        resp = client.post(
            f"/api/matches/calculate?user_id={user.id}",
            headers=auth_header(user.id, user.email),
        )
        assert resp.status_code == 400

    def test_calculate_unauthenticated(self, client):
        resp = client.post("/api/matches/calculate?user_id=9999")
        assert resp.status_code == 401

    def test_calculate_for_another_user(self, client, create_user_with_questionnaire):
        u1 = create_user_with_questionnaire(name="Self", email="self@mcgill.ca")
        u2 = create_user_with_questionnaire(name="Other", email="other@mcgill.ca")
        resp = client.post(
            f"/api/matches/calculate?user_id={u2.id}",
            headers=auth_header(u1.id, u1.email),
        )
        assert resp.status_code == 403

    def test_calculate_low_score_not_stored(self, client, create_user_with_questionnaire):
        # Create two users with very different preferences to get low score
        r1 = sample_questionnaire_responses()
        r1.update({"budget": 0, "location": 0, "gender": 0, "genderPreference": 1,
                    "sleepSchedule": 0, "cleanliness": 0, "noise": 0, "guests": 0, "study": 0})
        r2 = sample_questionnaire_responses()
        r2.update({"budget": 3, "location": 4, "gender": 1, "genderPreference": 1,
                    "sleepSchedule": 2, "cleanliness": 2, "noise": 2, "guests": 3, "study": 3})

        u1 = create_user_with_questionnaire(name="Low1", email="low1@mcgill.ca", responses=r1)
        u2 = create_user_with_questionnaire(name="Low2", email="low2@mcgill.ca", responses=r2)

        resp = client.post(
            f"/api/matches/calculate?user_id={u1.id}",
            headers=auth_header(u1.id, u1.email),
        )
        assert resp.status_code == 200
        # Different genders and a score <= 50 do not meet either listing rule.
        get_resp = client.get(
            f"/api/matches/{u1.id}",
            headers=auth_header(u1.id, u1.email),
        )
        assert get_resp.status_code == 200
        matches = get_resp.json()
        assert all(m["user_id"] != str(u2.id) for m in matches)

    def test_calculate_updates_existing_match(self, client, create_user_with_questionnaire):
        u1 = create_user_with_questionnaire(name="Up1", email="up1@mcgill.ca")
        u2 = create_user_with_questionnaire(name="Up2", email="up2@mcgill.ca")
        headers = auth_header(u1.id, u1.email)
        # Calculate twice — second should update, not duplicate
        client.post(f"/api/matches/calculate?user_id={u1.id}", headers=headers)
        resp = client.post(f"/api/matches/calculate?user_id={u1.id}", headers=headers)
        assert resp.status_code == 200


class TestGetMatches:
    def test_self_match_row_is_never_returned(self, client, db_session, create_user_with_questionnaire):
        from backend.app.models import Match

        user = create_user_with_questionnaire(name="Self", email="selfrow@mcgill.ca")
        db_session.add(Match(user1_id=user.id, user2_id=user.id, compatibility_score=100))
        db_session.commit()
        response = client.get(f"/api/matches/{user.id}", headers=auth_header(user.id, user.email))
        assert response.status_code == 200
        assert response.json() == []
        client.post(f"/api/matches/calculate?user_id={user.id}", headers=auth_header(user.id, user.email))
        assert db_session.query(Match).count() == 0

    def test_get_matches(self, client, create_user_with_questionnaire):
        u1 = create_user_with_questionnaire(name="M1", email="m1@mcgill.ca")
        u2 = create_user_with_questionnaire(name="M2", email="m2@mcgill.ca")
        client.post(
            f"/api/matches/calculate?user_id={u1.id}",
            headers=auth_header(u1.id, u1.email),
        )

        resp = client.get(
            f"/api/matches/{u1.id}",
            headers=auth_header(u1.id, u1.email),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)

    def test_get_matches_other_user(self, client, create_verified_user):
        u1 = create_verified_user(name="Viewer", email="viewer@mcgill.ca")
        u2 = create_verified_user(name="Target", email="target@mcgill.ca")
        resp = client.get(
            f"/api/matches/{u2.id}",
            headers=auth_header(u1.id, u1.email),
        )
        assert resp.status_code == 403

    def test_get_matches_unauthenticated(self, client, create_verified_user):
        user = create_verified_user(email="noauth4@mcgill.ca")
        resp = client.get(f"/api/matches/{user.id}")
        assert resp.status_code == 401

    def test_get_matches_sorted_by_score(self, client, create_user_with_questionnaire):
        r_base = sample_questionnaire_responses()

        r_high = r_base.copy()  # Same as base — perfect match
        r_low = r_base.copy()
        r_low.update({"budget": 3, "location": 4})  # Lower match

        u1 = create_user_with_questionnaire(name="Main", email="main@mcgill.ca", responses=r_base)
        u2 = create_user_with_questionnaire(name="High", email="high@mcgill.ca", responses=r_high)
        u3 = create_user_with_questionnaire(name="Low", email="low@mcgill.ca", responses=r_low)

        client.post(
            f"/api/matches/calculate?user_id={u1.id}",
            headers=auth_header(u1.id, u1.email),
        )

        resp = client.get(
            f"/api/matches/{u1.id}",
            headers=auth_header(u1.id, u1.email),
        )
        data = resp.json()
        if len(data) >= 2:
            scores = [m["compatibility_score"] for m in data]
            assert scores == sorted(scores, reverse=True)
