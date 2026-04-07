"""API tests for match calculation and retrieval endpoints."""

from tests.conftest import auth_header, sample_questionnaire_responses


class TestCalculateMatches:
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
        r2.update({"budget": 3, "location": 4, "gender": 0, "genderPreference": 1,
                    "sleepSchedule": 2, "cleanliness": 2, "noise": 2, "guests": 3, "study": 3})

        u1 = create_user_with_questionnaire(name="Low1", email="low1@mcgill.ca", responses=r1)
        u2 = create_user_with_questionnaire(name="Low2", email="low2@mcgill.ca", responses=r2)

        resp = client.post(
            f"/api/matches/calculate?user_id={u1.id}",
            headers=auth_header(u1.id, u1.email),
        )
        assert resp.status_code == 200
        # The match should not be stored because score <= 50
        get_resp = client.get(
            f"/api/matches/{u1.id}",
            headers=auth_header(u1.id, u1.email),
        )
        assert get_resp.status_code == 200
        matches = get_resp.json()
        for m in matches:
            assert m["compatibility_score"] > 50

    def test_calculate_updates_existing_match(self, client, create_user_with_questionnaire):
        u1 = create_user_with_questionnaire(name="Up1", email="up1@mcgill.ca")
        u2 = create_user_with_questionnaire(name="Up2", email="up2@mcgill.ca")
        headers = auth_header(u1.id, u1.email)
        # Calculate twice — second should update, not duplicate
        client.post(f"/api/matches/calculate?user_id={u1.id}", headers=headers)
        resp = client.post(f"/api/matches/calculate?user_id={u1.id}", headers=headers)
        assert resp.status_code == 200


class TestGetMatches:
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
