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
