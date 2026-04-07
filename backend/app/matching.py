from typing import Dict


def _gender_score(user1_responses: Dict, user2_responses: Dict) -> float:
    """Returns 0, 10, or 20 points for gender preference compatibility."""
    user1_gender = user1_responses.get("gender", 0)
    user2_gender = user2_responses.get("gender", 0)
    user1_pref = user1_responses.get("genderPreference", 2)
    user2_pref = user2_responses.get("genderPreference", 2)

    if user1_pref == 2 and user2_pref == 2:
        return 20
    elif (user1_pref == 2 or user1_pref == user2_gender) and (user2_pref == 2 or user2_pref == user1_gender):
        return 20
    elif (user1_pref != 2 and user1_pref == user2_gender) or (user2_pref != 2 and user2_pref == user1_gender):
        return 10
    return 0


def _lifestyle_score(user1_responses: Dict, user2_responses: Dict) -> float:
    """Returns 0–20 points for lifestyle compatibility."""
    lifestyle_keys = ["sleepSchedule", "cleanliness", "noise", "guests", "study"]
    matches = sum(
        1 for k in lifestyle_keys
        if user1_responses.get(k) is not None and user1_responses.get(k) == user2_responses.get(k)
    )
    return (matches / len(lifestyle_keys)) * 20


def _pet_score(user1_responses: Dict, user2_responses: Dict) -> float:
    """Returns 0–5 points for pet preference compatibility.
    Pets: 0=No pets, 1=Cat(s), 2=Dog(s), 3=Other pets
    """
    user1_pets = user1_responses.get("pets")
    user2_pets = user2_responses.get("pets")

    if user1_pets is None or user2_pets is None:
        return 2  # Missing data — partial credit

    if user1_pets == user2_pets:
        return 5  # Same preference
    if user1_pets == 0 or user2_pets == 0:
        return 0  # One wants no pets, other wants pets — conflict
    return 2  # Both want pets but different types — partial match


def calculate_compatibility(user1_responses: Dict[str, int], user2_responses: Dict[str, int]) -> float:
    """
    Calculate compatibility score between two users based on their questionnaire responses.
    Returns a score from 0-100.

    Three cases:
    1. Both have apartments → 0 (can't be roommates)
    2. One has apartment, one looking → match apartment details vs. seeker preferences
    3. Both looking → existing budget/location/lifestyle scoring
    """
    score = 0.0

    # hasApartment: 0 = "Yes, I have a place", 1 = "No, I'm looking for one"
    user1_has_apt = user1_responses.get("hasApartment") == 0
    user2_has_apt = user2_responses.get("hasApartment") == 0

    # ─── Case 1: Both have apartments ───
    if user1_has_apt and user2_has_apt:
        return 0.0

    # ─── Case 2: Mixed — one has apartment, one looking ───
    if user1_has_apt or user2_has_apt:
        apt_r = user1_responses if user1_has_apt else user2_responses
        look_r = user2_responses if user1_has_apt else user1_responses

        # Location match (25 points): apt's area vs. seeker's preferred area
        apt_loc = apt_r.get("apartmentLocation")
        seek_loc = look_r.get("location")
        if apt_loc is not None and seek_loc is not None:
            if seek_loc == 5:  # "Flexible / no preference"
                score += 15
            elif isinstance(apt_loc, int) and isinstance(seek_loc, int) and apt_loc == seek_loc:
                score += 25
            # else: 0 — different areas
        else:
            score += 12  # Missing data — partial credit

        # Budget match (30 points): apt rent vs. seeker's budget
        apt_rent = apt_r.get("apartmentRent")
        seek_budget = look_r.get("budget")
        if apt_rent is not None and seek_budget is not None:
            if isinstance(apt_rent, int) and isinstance(seek_budget, int):
                diff = abs(apt_rent - seek_budget)
                if diff == 0:
                    score += 30
                elif diff == 1:
                    score += 20
                elif diff == 2:
                    score += 10
            else:
                score += 15  # Custom amounts — partial credit
        else:
            score += 15  # Missing data — partial credit

        # Gender preference (20 points)
        score += _gender_score(user1_responses, user2_responses)

        # Lifestyle (20 points)
        score += _lifestyle_score(user1_responses, user2_responses)

        # Pet compatibility (5 points)
        score += _pet_score(user1_responses, user2_responses)

        return round(max(0, min(100, score)), 1)

    # ─── Case 3: Both looking — original logic ───
    # Support both "livingLocation" (correct) and "housingType" (legacy) keys
    user1_housing = user1_responses.get("livingLocation", user1_responses.get("housingType"))
    user2_housing = user2_responses.get("livingLocation", user2_responses.get("housingType"))

    both_in_residence = user1_housing == 0 and user2_housing == 0

    if both_in_residence:
        user1_mcgill = user1_responses.get("mcgillResidence")
        user2_mcgill = user2_responses.get("mcgillResidence")
        user1_concordia = user1_responses.get("concordiaResidence")
        user2_concordia = user2_responses.get("concordiaResidence")

        if user1_mcgill is not None and user2_mcgill is not None:
            if user1_mcgill != user2_mcgill:
                return 0.0
            else:
                score += 10
        elif user1_concordia is not None and user2_concordia is not None:
            if user1_concordia != user2_concordia:
                return 0.0
            else:
                score += 10
        elif (user1_mcgill is not None and user2_concordia is not None) or \
             (user1_concordia is not None and user2_mcgill is not None):
            return 0.0

    # Budget match (30 points)
    if not both_in_residence:
        user1_budget = user1_responses.get("budget")
        user2_budget = user2_responses.get("budget")

        if user1_budget is not None and user2_budget is not None:
            if isinstance(user1_budget, int) and isinstance(user2_budget, int):
                if user1_budget == user2_budget:
                    score += 30
                elif abs(user1_budget - user2_budget) == 1:
                    score += 20
                elif abs(user1_budget - user2_budget) == 2:
                    score += 10
            else:
                score += 15
        elif user1_budget is None and user2_budget is None:
            score += 30
    else:
        score += 30

    # Location match (25 points)
    if not both_in_residence:
        user1_location = user1_responses.get("location")
        user2_location = user2_responses.get("location")

        if user1_location is not None and user2_location is not None:
            if user1_location == 5 or user2_location == 5:
                score += 15
            elif user1_location == user2_location:
                score += 25
        elif user1_location is None and user2_location is None:
            score += 25
    else:
        score += 25

    # Gender preference (20 points)
    score += _gender_score(user1_responses, user2_responses)

    # Lifestyle (20 points) — uses _lifestyle_score() for consistent None-handling
    score += _lifestyle_score(user1_responses, user2_responses)

    # Pet compatibility (5 points)
    score += _pet_score(user1_responses, user2_responses)

    return round(max(0, min(100, score)), 1)


def calculate_compatibility_breakdown(user1_responses: Dict, user2_responses: Dict) -> dict:
    """
    Returns per-category compatibility breakdown instead of a single score.
    Each category includes score, max_score, percentage, status, and readable values.
    """

    def get_status(score: float, max_score: float) -> str:
        if max_score == 0:
            return "match"
        pct = score / max_score * 100
        if pct >= 80:
            return "match"
        elif pct >= 40:
            return "close"
        return "mismatch"

    user1_has_apt = user1_responses.get("hasApartment") == 0
    user2_has_apt = user2_responses.get("hasApartment") == 0

    # Both have apartments — incompatible
    if user1_has_apt and user2_has_apt:
        return {
            "overall_score": 0.0,
            "categories": [
                {"name": "Budget", "icon": "💰", "score": 0, "max_score": 30, "percentage": 0, "status": "mismatch", "your_value": "Has apartment", "their_value": "Has apartment"},
                {"name": "Location", "icon": "📍", "score": 0, "max_score": 25, "percentage": 0, "status": "mismatch", "your_value": "N/A", "their_value": "N/A"},
                {"name": "Gender Preference", "icon": "👤", "score": 0, "max_score": 20, "percentage": 0, "status": "mismatch", "your_value": "N/A", "their_value": "N/A"},
                {"name": "Lifestyle", "icon": "🌙", "score": 0, "max_score": 20, "percentage": 0, "status": "mismatch", "subcategories": []},
                {"name": "Pets", "icon": "🐾", "score": 0, "max_score": 5, "percentage": 0, "status": "mismatch", "your_value": "N/A", "their_value": "N/A"},
            ]
        }

    categories = []

    # ─── Budget & Location ───
    if user1_has_apt or user2_has_apt:
        # Mixed: one has apartment, one is looking
        apt_r = user1_responses if user1_has_apt else user2_responses
        look_r = user2_responses if user1_has_apt else user1_responses

        apt_rent = apt_r.get("apartmentRent")
        seek_budget = look_r.get("budget")
        budget_score = 0.0
        if apt_rent is not None and seek_budget is not None:
            if isinstance(apt_rent, int) and isinstance(seek_budget, int):
                diff = abs(apt_rent - seek_budget)
                if diff == 0:
                    budget_score = 30
                elif diff == 1:
                    budget_score = 20
                elif diff == 2:
                    budget_score = 10
            else:
                budget_score = 15
        else:
            budget_score = 15

        if user1_has_apt:
            your_budget = get_question_text("apartmentRent", apt_rent) if apt_rent is not None else "Not specified"
            their_budget = get_question_text("budget", seek_budget) if seek_budget is not None else "Not specified"
        else:
            your_budget = get_question_text("budget", seek_budget) if seek_budget is not None else "Not specified"
            their_budget = get_question_text("apartmentRent", apt_rent) if apt_rent is not None else "Not specified"

        apt_loc = apt_r.get("apartmentLocation")
        seek_loc = look_r.get("location")
        location_score = 0.0
        if apt_loc is not None and seek_loc is not None:
            if seek_loc == 5:
                location_score = 15
            elif isinstance(apt_loc, int) and isinstance(seek_loc, int) and apt_loc == seek_loc:
                location_score = 25
        else:
            location_score = 12

        if user1_has_apt:
            your_loc = get_question_text("apartmentLocation", apt_loc) if apt_loc is not None else "Not specified"
            their_loc = get_question_text("location", seek_loc) if seek_loc is not None else "Not specified"
        else:
            your_loc = get_question_text("location", seek_loc) if seek_loc is not None else "Not specified"
            their_loc = get_question_text("apartmentLocation", apt_loc) if apt_loc is not None else "Not specified"
    else:
        # Both looking
        user1_housing = user1_responses.get("livingLocation", user1_responses.get("housingType"))
        user2_housing = user2_responses.get("livingLocation", user2_responses.get("housingType"))
        both_in_residence = user1_housing == 0 and user2_housing == 0

        if both_in_residence:
            budget_score = 30.0
            your_budget = "University residence"
            their_budget = "University residence"
            location_score = 25.0
            your_loc = "University residence"
            their_loc = "University residence"
        else:
            u1_b = user1_responses.get("budget")
            u2_b = user2_responses.get("budget")
            budget_score = 0.0
            if u1_b is not None and u2_b is not None:
                if isinstance(u1_b, int) and isinstance(u2_b, int):
                    if u1_b == u2_b:
                        budget_score = 30
                    elif abs(u1_b - u2_b) == 1:
                        budget_score = 20
                    elif abs(u1_b - u2_b) == 2:
                        budget_score = 10
                else:
                    budget_score = 15
            elif u1_b is None and u2_b is None:
                budget_score = 30
            your_budget = get_question_text("budget", u1_b) if u1_b is not None else "Not specified"
            their_budget = get_question_text("budget", u2_b) if u2_b is not None else "Not specified"

            u1_l = user1_responses.get("location")
            u2_l = user2_responses.get("location")
            location_score = 0.0
            if u1_l is not None and u2_l is not None:
                if u1_l == 5 or u2_l == 5:
                    location_score = 15
                elif u1_l == u2_l:
                    location_score = 25
            elif u1_l is None and u2_l is None:
                location_score = 25
            your_loc = get_question_text("location", u1_l) if u1_l is not None else "Not specified"
            their_loc = get_question_text("location", u2_l) if u2_l is not None else "Not specified"

    categories.append({
        "name": "Budget",
        "icon": "💰",
        "score": budget_score,
        "max_score": 30,
        "percentage": round(budget_score / 30 * 100),
        "status": get_status(budget_score, 30),
        "your_value": your_budget,
        "their_value": their_budget,
    })
    categories.append({
        "name": "Location",
        "icon": "📍",
        "score": location_score,
        "max_score": 25,
        "percentage": round(location_score / 25 * 100),
        "status": get_status(location_score, 25),
        "your_value": your_loc,
        "their_value": their_loc,
    })

    # ─── Gender Preference ───
    gender_score = _gender_score(user1_responses, user2_responses)
    u1_gp = user1_responses.get("genderPreference", 2)
    u2_gp = user2_responses.get("genderPreference", 2)
    categories.append({
        "name": "Gender Preference",
        "icon": "👤",
        "score": gender_score,
        "max_score": 20,
        "percentage": round(gender_score / 20 * 100),
        "status": get_status(gender_score, 20),
        "your_value": get_question_text("genderPreference", u1_gp),
        "their_value": get_question_text("genderPreference", u2_gp),
    })

    # ─── Lifestyle ───
    lifestyle_keys = ["sleepSchedule", "cleanliness", "noise", "guests", "study"]
    lifestyle_icons = {"sleepSchedule": "😴", "cleanliness": "✨", "noise": "🔊", "guests": "🚪", "study": "📚"}
    lifestyle_names = {"sleepSchedule": "Sleep", "cleanliness": "Cleanliness", "noise": "Noise", "guests": "Guests", "study": "Study"}
    match_count = 0
    subcategories = []
    for k in lifestyle_keys:
        v1 = user1_responses.get(k)
        v2 = user2_responses.get(k)
        is_match = v1 is not None and v1 == v2
        if is_match:
            match_count += 1
        subcategories.append({
            "name": lifestyle_names[k],
            "icon": lifestyle_icons[k],
            "match": is_match,
            "your_value": get_question_text(k, v1) if v1 is not None else "Not specified",
            "their_value": get_question_text(k, v2) if v2 is not None else "Not specified",
        })
    lifestyle_score = (match_count / len(lifestyle_keys)) * 20
    categories.append({
        "name": "Lifestyle",
        "icon": "🌙",
        "score": lifestyle_score,
        "max_score": 20,
        "percentage": round(lifestyle_score / 20 * 100),
        "status": get_status(lifestyle_score, 20),
        "subcategories": subcategories,
    })

    # ─── Pets ───
    pet_score = _pet_score(user1_responses, user2_responses)
    u1_pets = user1_responses.get("pets")
    u2_pets = user2_responses.get("pets")
    categories.append({
        "name": "Pets",
        "icon": "🐾",
        "score": pet_score,
        "max_score": 5,
        "percentage": round(pet_score / 5 * 100),
        "status": get_status(pet_score, 5),
        "your_value": get_question_text("pets", u1_pets) if u1_pets is not None else "Not specified",
        "their_value": get_question_text("pets", u2_pets) if u2_pets is not None else "Not specified",
    })

    overall_score = round(max(0, min(100, budget_score + location_score + gender_score + lifestyle_score + pet_score)), 1)
    return {"overall_score": overall_score, "categories": categories}


def get_question_text(question_id: str, option_index: int) -> str:
    """
    Helper function to convert question ID and option index to readable text.
    Used for displaying match details.
    """
    question_map = {
        "university": ["McGill", "Concordia"],
        "hasApartment": ["Yes, I have a place", "No, I'm looking for one"],
        "livingLocation": ["University Residence", "Off-campus apartment/house"],
        "mcgillResidence": ["Upper Rez (Gardner, McConnell, Molson)", "New Rez", "Solin Hall", "La Citadelle", "RVC", "Campus 1", "Carrefour Sherbrooke"],
        "concordiaResidence": ["Grey Nuns Residence", "Hingston Hall"],
        "year": ["U0", "U1", "U2", "U3", "U4", "Masters", "PhD", "Other"],
        "gender": ["Male", "Female", "Non-binary", "Prefer not to say"],
        "genderPreference": ["Male", "Female", "No preference"],
        "age": ["18-20", "21-23", "24-26", "27+"],
        "program": ["Arts", "Science", "Engineering", "Commerce/Management", "Medicine", "Law", "Education", "Music", "Other"],
        "budget": ["$700–$1000", "$1000–$1300", "$1300–$1500", "$1500+", "Custom amount"],
        "location": ["Milton-Parc / Ghetto", "Plateau Mont-Royal", "Downtown", "Côte-des-Neiges", "Mile End", "Flexible / no preference"],
        "apartmentLocation": ["Milton-Parc / Ghetto", "Plateau Mont-Royal", "Downtown", "Côte-des-Neiges", "Mile End", "Other"],
        "apartmentRent": ["$700–$1000", "$1000–$1300", "$1300–$1500", "$1500+", "Custom amount"],
        "apartmentRooms": ["Studio / 1.5", "2 bedrooms", "3 bedrooms", "4+ bedrooms"],
        "spotsAvailable": ["1 roommate", "2 roommates", "3+ roommates"],
        "apartmentAvailable": ["August", "January", "May", "ASAP / Now"],
        "religion": ["No preference", "Christian", "Muslim", "Jewish", "Hindu", "Atheist/Agnostic", "Other"],
        "sleepSchedule": ["Early bird (before 10pm)", "Night owl (after midnight)", "Somewhere in between", "Irregular / varies"],
        "cleanliness": ["Spotless at all times", "Tidy, clean weekly", "Organized chaos", "I'll get to it eventually"],
        "noise": ["Library silence", "Background music is fine", "I like it lively", "Depends on the day"],
        "guests": ["Rarely / never", "Occasionally with notice", "Friends welcome anytime", "The more the merrier"],
        "study": ["Always at home", "Libraries & cafés", "Mix of both", "I study on the go"],
        "dietary": ["None", "Vegetarian", "Vegan", "Halal/Kosher", "Allergies"],
        "workFromHome": ["Never", "1-2 days/week", "3-4 days/week", "Always"],
        "pets": ["No pets", "Cat(s)", "Dog(s)", "Other pets"],
        "language": ["English", "French", "Bilingual", "No preference"],
        "moveIn": ["August", "January", "May", "ASAP / Flexible"],
    }

    options = question_map.get(question_id, [])
    if isinstance(option_index, int) and 0 <= option_index < len(options):
        return options[option_index]
    if isinstance(option_index, str):
        return option_index  # Custom text input
    return "Unknown"
