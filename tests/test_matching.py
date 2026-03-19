"""Unit tests for backend/app/matching.py — calculate_compatibility and helpers."""

import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend.app.matching import (
    calculate_compatibility,
    _gender_score,
    _lifestyle_score,
    _pet_score,
    get_question_text,
)


# ────────────────────────────────────────────
# _gender_score
# ────────────────────────────────────────────

class TestGenderScore:
    def test_both_no_preference(self):
        assert _gender_score({"genderPreference": 2}, {"genderPreference": 2}) == 20

    def test_mutual_match(self):
        # User1 is male(0), prefers female(1); User2 is female(1), prefers male(0)
        u1 = {"gender": 0, "genderPreference": 1}
        u2 = {"gender": 1, "genderPreference": 0}
        assert _gender_score(u1, u2) == 20

    def test_one_no_preference_other_matches(self):
        u1 = {"gender": 0, "genderPreference": 2}
        u2 = {"gender": 1, "genderPreference": 0}
        assert _gender_score(u1, u2) == 20

    def test_one_sided_match(self):
        # User1 prefers female(1), User2 IS female(1) but prefers female(1) — user1 is male(0)
        u1 = {"gender": 0, "genderPreference": 1}
        u2 = {"gender": 1, "genderPreference": 1}
        assert _gender_score(u1, u2) == 10

    def test_complete_mismatch(self):
        u1 = {"gender": 0, "genderPreference": 1}
        u2 = {"gender": 0, "genderPreference": 1}
        assert _gender_score(u1, u2) == 0

    def test_defaults_when_missing(self):
        # Defaults: gender=0, genderPreference=2 (no preference)
        assert _gender_score({}, {}) == 20


# ────────────────────────────────────────────
# _lifestyle_score  (max 20 points)
# ────────────────────────────────────────────

class TestLifestyleScore:
    def test_all_match(self):
        r = {"sleepSchedule": 1, "cleanliness": 1, "noise": 1, "guests": 1, "study": 1}
        assert _lifestyle_score(r, r.copy()) == 20.0  # 5/5 * 20

    def test_none_match(self):
        u1 = {"sleepSchedule": 0, "cleanliness": 0, "noise": 0, "guests": 0, "study": 0}
        u2 = {"sleepSchedule": 1, "cleanliness": 1, "noise": 1, "guests": 1, "study": 1}
        assert _lifestyle_score(u1, u2) == 0

    def test_partial_match(self):
        u1 = {"sleepSchedule": 1, "cleanliness": 1, "noise": 0, "guests": 0, "study": 1}
        u2 = {"sleepSchedule": 1, "cleanliness": 1, "noise": 1, "guests": 1, "study": 1}
        assert _lifestyle_score(u1, u2) == 12.0  # 3/5 * 20

    def test_missing_keys_not_counted(self):
        # None values should not count as a match
        u1 = {"sleepSchedule": None, "cleanliness": 1}
        u2 = {"sleepSchedule": None, "cleanliness": 1}
        # sleepSchedule: both None but get() returns None, condition checks is not None — so skipped
        # cleanliness: matches
        # noise, guests, study: missing (get returns None) — skipped
        assert _lifestyle_score(u1, u2) == 4.0  # 1/5 * 20


# ────────────────────────────────────────────
# _pet_score  (max 5 points)
# ────────────────────────────────────────────

class TestPetScore:
    def test_same_no_pets(self):
        assert _pet_score({"pets": 0}, {"pets": 0}) == 5

    def test_same_cats(self):
        assert _pet_score({"pets": 1}, {"pets": 1}) == 5

    def test_same_dogs(self):
        assert _pet_score({"pets": 2}, {"pets": 2}) == 5

    def test_no_pets_vs_cats_conflict(self):
        assert _pet_score({"pets": 0}, {"pets": 1}) == 0

    def test_no_pets_vs_dogs_conflict(self):
        assert _pet_score({"pets": 0}, {"pets": 2}) == 0

    def test_cats_vs_dogs_partial(self):
        assert _pet_score({"pets": 1}, {"pets": 2}) == 2

    def test_cats_vs_other_partial(self):
        assert _pet_score({"pets": 1}, {"pets": 3}) == 2

    def test_missing_one(self):
        assert _pet_score({"pets": 1}, {}) == 2

    def test_missing_both(self):
        assert _pet_score({}, {}) == 2

    def test_one_none_explicit(self):
        assert _pet_score({"pets": None}, {"pets": 1}) == 2


# ────────────────────────────────────────────
# calculate_compatibility — Case 1: Both have apartments
# ────────────────────────────────────────────

class TestBothHaveApartments:
    def test_returns_zero(self):
        u1 = {"hasApartment": 0}
        u2 = {"hasApartment": 0}
        assert calculate_compatibility(u1, u2) == 0.0


# ────────────────────────────────────────────
# calculate_compatibility — Case 2: Mixed (one has apt, one looking)
# Scoring: location(25) + budget(30) + gender(20) + lifestyle(20) + pets(5) = 100
# ────────────────────────────────────────────

class TestMixedApartment:
    def _apt_responses(self, **overrides):
        base = {
            "hasApartment": 0,
            "apartmentLocation": 2,
            "apartmentRent": 1,
            "gender": 0,
            "genderPreference": 2,
            "sleepSchedule": 1, "cleanliness": 1, "noise": 1, "guests": 1, "study": 1,
            "pets": 0,
        }
        base.update(overrides)
        return base

    def _seeker_responses(self, **overrides):
        base = {
            "hasApartment": 1,
            "location": 2,
            "budget": 1,
            "gender": 0,
            "genderPreference": 2,
            "sleepSchedule": 1, "cleanliness": 1, "noise": 1, "guests": 1, "study": 1,
            "pets": 0,
        }
        base.update(overrides)
        return base

    def test_perfect_match(self):
        # location +25, budget +30, gender +20, lifestyle +20, pets +5 = 100
        score = calculate_compatibility(self._apt_responses(), self._seeker_responses())
        assert score == 100.0

    def test_location_mismatch(self):
        score = calculate_compatibility(
            self._apt_responses(apartmentLocation=0),
            self._seeker_responses(location=4),
        )
        # location 0, budget +30, gender +20, lifestyle +20, pets +5 = 75
        assert score == 75.0

    def test_seeker_flexible_location(self):
        score = calculate_compatibility(
            self._apt_responses(),
            self._seeker_responses(location=5),
        )
        # location +15, budget +30, gender +20, lifestyle +20, pets +5 = 90
        assert score == 90.0

    def test_missing_location_data(self):
        apt = self._apt_responses()
        del apt["apartmentLocation"]
        seeker = self._seeker_responses()
        del seeker["location"]
        score = calculate_compatibility(apt, seeker)
        # location +12, budget +30, gender +20, lifestyle +20, pets +5 = 87
        assert score == 87.0

    def test_budget_off_by_one(self):
        score = calculate_compatibility(
            self._apt_responses(apartmentRent=1),
            self._seeker_responses(budget=2),
        )
        # location +25, budget +20, gender +20, lifestyle +20, pets +5 = 90
        assert score == 90.0

    def test_budget_off_by_two(self):
        score = calculate_compatibility(
            self._apt_responses(apartmentRent=0),
            self._seeker_responses(budget=2),
        )
        # location +25, budget +10, gender +20, lifestyle +20, pets +5 = 80
        assert score == 80.0

    def test_budget_off_by_three(self):
        score = calculate_compatibility(
            self._apt_responses(apartmentRent=0),
            self._seeker_responses(budget=3),
        )
        # location +25, budget +0, gender +20, lifestyle +20, pets +5 = 70
        assert score == 70.0

    def test_missing_budget_data(self):
        apt = self._apt_responses()
        del apt["apartmentRent"]
        score = calculate_compatibility(apt, self._seeker_responses())
        # location +25, budget +15, gender +20, lifestyle +20, pets +5 = 85
        assert score == 85.0

    def test_no_lifestyle_match(self):
        score = calculate_compatibility(
            self._apt_responses(sleepSchedule=0, cleanliness=0, noise=0, guests=0, study=0),
            self._seeker_responses(sleepSchedule=2, cleanliness=2, noise=2, guests=2, study=3),
        )
        # location +25, budget +30, gender +20, lifestyle +0, pets +5 = 80
        assert score == 80.0

    def test_pet_conflict(self):
        score = calculate_compatibility(
            self._apt_responses(pets=0),
            self._seeker_responses(pets=1),
        )
        # location +25, budget +30, gender +20, lifestyle +20, pets +0 = 95
        assert score == 95.0

    def test_order_independent(self):
        """Score should be the same regardless of which user has the apartment."""
        apt = self._apt_responses()
        seeker = self._seeker_responses()
        score1 = calculate_compatibility(apt, seeker)
        score2 = calculate_compatibility(seeker, apt)
        assert score1 == score2


# ────────────────────────────────────────────
# calculate_compatibility — Case 3: Both looking
# Scoring: budget(30) + location(25) + gender(20) + lifestyle(20) + pets(5) = 100
# Note: Case 3 now uses _lifestyle_score() helper (same as Case 2), so
# None values are NOT counted as matches.
# ────────────────────────────────────────────

class TestBothLooking:
    def _base(self, **overrides):
        base = {
            "hasApartment": 1,
            "housingType": 1,
            "gender": 0,
            "genderPreference": 2,
            "budget": 1,
            "location": 2,
            "sleepSchedule": 1, "cleanliness": 1, "noise": 1, "guests": 1, "study": 1,
            "pets": 0,
        }
        base.update(overrides)
        return base

    def test_perfect_match(self):
        r = self._base()
        score = calculate_compatibility(r, r.copy())
        assert score == 100.0

    def test_budget_exact(self):
        score = calculate_compatibility(self._base(budget=2), self._base(budget=2))
        assert score == 100.0

    def test_budget_off_by_one(self):
        score = calculate_compatibility(self._base(budget=1), self._base(budget=2))
        # budget +20, location +25, gender +20, lifestyle +20, pets +5 = 90
        assert score == 90.0

    def test_budget_off_by_two(self):
        score = calculate_compatibility(self._base(budget=0), self._base(budget=2))
        # budget +10, location +25, gender +20, lifestyle +20, pets +5 = 80
        assert score == 80.0

    def test_budget_far_apart(self):
        score = calculate_compatibility(self._base(budget=0), self._base(budget=3))
        # budget +0, location +25, gender +20, lifestyle +20, pets +5 = 70
        assert score == 70.0

    def test_both_budgets_none(self):
        u1 = self._base()
        u2 = self._base()
        del u1["budget"]
        del u2["budget"]
        score = calculate_compatibility(u1, u2)
        # budget +30, location +25, gender +20, lifestyle +20, pets +5 = 100
        assert score == 100.0

    def test_location_exact(self):
        score = calculate_compatibility(self._base(location=3), self._base(location=3))
        assert score == 100.0

    def test_location_one_flexible(self):
        score = calculate_compatibility(self._base(location=5), self._base(location=2))
        # budget +30, location +15, gender +20, lifestyle +20, pets +5 = 90
        assert score == 90.0

    def test_location_mismatch(self):
        score = calculate_compatibility(self._base(location=0), self._base(location=4))
        # budget +30, location +0, gender +20, lifestyle +20, pets +5 = 75
        assert score == 75.0

    def test_both_locations_none(self):
        u1 = self._base()
        u2 = self._base()
        del u1["location"]
        del u2["location"]
        score = calculate_compatibility(u1, u2)
        # budget +30, location +25, gender +20, lifestyle +20, pets +5 = 100
        assert score == 100.0

    def test_both_in_same_residence(self):
        u1 = self._base(livingLocation=0, mcgillResidence=1)
        u2 = self._base(livingLocation=0, mcgillResidence=1)
        score = calculate_compatibility(u1, u2)
        # residence +10, budget +30 (auto), location +25 (auto), gender +20, lifestyle +20, pets +5
        # Total: 110 -> capped at 100
        assert score == 100.0

    def test_both_in_different_residence(self):
        u1 = self._base(livingLocation=0, mcgillResidence=0)
        u2 = self._base(livingLocation=0, mcgillResidence=1)
        assert calculate_compatibility(u1, u2) == 0.0

    def test_cross_university_residence(self):
        u1 = self._base(livingLocation=0, mcgillResidence=0)
        u2 = self._base(livingLocation=0, concordiaResidence=0)
        assert calculate_compatibility(u1, u2) == 0.0

    def test_concordia_same_residence(self):
        u1 = self._base(livingLocation=0, concordiaResidence=0)
        u2 = self._base(livingLocation=0, concordiaResidence=0)
        score = calculate_compatibility(u1, u2)
        assert score == 100.0

    def test_concordia_different_residence(self):
        u1 = self._base(livingLocation=0, concordiaResidence=0)
        u2 = self._base(livingLocation=0, concordiaResidence=1)
        assert calculate_compatibility(u1, u2) == 0.0

    def test_housingType_fallback(self):
        """When only housingType key is present (legacy), it should still work."""
        u1 = {"hasApartment": 1, "housingType": 1, "budget": 1, "location": 2,
               "gender": 0, "genderPreference": 2,
               "sleepSchedule": 1, "cleanliness": 1, "noise": 1, "guests": 1, "study": 1, "pets": 0}
        u2 = u1.copy()
        score = calculate_compatibility(u1, u2)
        assert score == 100.0

    def test_livingLocation_preferred_over_housingType(self):
        """When both keys exist, livingLocation should take precedence."""
        u1 = {"hasApartment": 1, "livingLocation": 1, "housingType": 0, "budget": 1, "location": 2,
               "gender": 0, "genderPreference": 2,
               "sleepSchedule": 1, "cleanliness": 1, "noise": 1, "guests": 1, "study": 1, "pets": 0}
        u2 = u1.copy()
        score = calculate_compatibility(u1, u2)
        # livingLocation=1 (off-campus) takes precedence, so normal scoring applies
        assert score == 100.0


# ────────────────────────────────────────────
# calculate_compatibility — Edge cases
# ────────────────────────────────────────────

class TestEdgeCases:
    def test_empty_responses(self):
        score = calculate_compatibility({}, {})
        assert isinstance(score, float)
        assert 0 <= score <= 100

    def test_non_integer_budget(self):
        u1 = {"hasApartment": 1, "budget": "custom", "location": 2,
               "gender": 0, "genderPreference": 2,
               "sleepSchedule": 1, "cleanliness": 1, "noise": 1, "guests": 1, "study": 1}
        u2 = u1.copy()
        score = calculate_compatibility(u1, u2)
        assert isinstance(score, float)

    def test_score_clamped_to_100(self):
        # Even if internal sum exceeds 100 it should be clamped
        u = {
            "hasApartment": 1, "livingLocation": 0, "mcgillResidence": 1,
            "budget": 1, "location": 2,
            "gender": 0, "genderPreference": 2,
            "sleepSchedule": 1, "cleanliness": 1, "noise": 1, "guests": 1, "study": 1,
        }
        score = calculate_compatibility(u, u.copy())
        assert score <= 100.0

    def test_symmetry(self):
        u1 = {"hasApartment": 1, "budget": 0, "location": 3,
               "gender": 0, "genderPreference": 1,
               "sleepSchedule": 0, "cleanliness": 2, "noise": 1, "guests": 0, "study": 1}
        u2 = {"hasApartment": 1, "budget": 2, "location": 1,
               "gender": 1, "genderPreference": 0,
               "sleepSchedule": 1, "cleanliness": 1, "noise": 1, "guests": 2, "study": 0}
        assert calculate_compatibility(u1, u2) == calculate_compatibility(u2, u1)


# ────────────────────────────────────────────
# get_question_text
# ────────────────────────────────────────────

class TestGetQuestionText:
    def test_valid_question_and_index(self):
        assert get_question_text("gender", 0) == "Male"
        assert get_question_text("gender", 1) == "Female"
        assert get_question_text("budget", 0) == "$700\u2013$1000"

    def test_out_of_range_index(self):
        assert get_question_text("gender", 99) == "Unknown"

    def test_invalid_question_id(self):
        assert get_question_text("nonexistent", 0) == "Unknown"

    def test_string_option_index(self):
        assert get_question_text("budget", "My custom amount") == "My custom amount"

    def test_negative_index(self):
        # Negative index should return "Unknown" since it would select from end
        result = get_question_text("gender", -1)
        assert result == "Unknown"
