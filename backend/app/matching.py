from typing import Dict


def calculate_compatibility(user1_responses: Dict[str, int], user2_responses: Dict[str, int]) -> float:
    """
    Calculate compatibility score between two users based on their questionnaire responses.
    Returns a score from 0-100.

    Weights:
    - Budget: 30% (skipped if both in university residence)
    - Location: 25% (skipped if both in university residence)
    - Gender preference: 20%
    - Lifestyle factors (sleep, clean, noise, guests, study): 25%

    Residence Matching (Dealbreaker):
    - If both users selected "University Residence", they MUST be in the same residence to match
    - Otherwise, score is 0 (incompatible)
    """
    score = 0.0

    # ─── Residence Matching (Dealbreaker) ───
    user1_housing = user1_responses.get("livingLocation")
    user2_housing = user2_responses.get("livingLocation")

    both_in_residence = user1_housing == 0 and user2_housing == 0

    if both_in_residence:
        # Check McGill residences
        user1_mcgill = user1_responses.get("mcgillResidence")
        user2_mcgill = user2_responses.get("mcgillResidence")
        # Check Concordia residences
        user1_concordia = user1_responses.get("concordiaResidence")
        user2_concordia = user2_responses.get("concordiaResidence")

        # Both in McGill residence
        if user1_mcgill is not None and user2_mcgill is not None:
            if user1_mcgill != user2_mcgill:
                return 0.0  # Different residences — incompatible
            else:
                score += 10  # Same residence bonus

        # Both in Concordia residence
        elif user1_concordia is not None and user2_concordia is not None:
            if user1_concordia != user2_concordia:
                return 0.0
            else:
                score += 10

        # One in McGill residence, one in Concordia — different universities, can't share
        elif (user1_mcgill is not None and user2_concordia is not None) or \
             (user1_concordia is not None and user2_mcgill is not None):
            return 0.0

    # Budget match (30 points) — only if not both in university residence
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
                # Custom budget — give partial credit
                score += 15
        elif user1_budget is None and user2_budget is None:
            # Both in residence — budget not applicable, redistribute points
            score += 30
    else:
        # Both in residence — budget not applicable, give full points
        score += 30

    # Location match (25 points) — only if not both in university residence
    if not both_in_residence:
        user1_location = user1_responses.get("location")
        user2_location = user2_responses.get("location")

        if user1_location is not None and user2_location is not None:
            # "Flexible / no preference" is index 5
            if user1_location == 5 or user2_location == 5:
                score += 15
            elif user1_location == user2_location:
                score += 25
        elif user1_location is None and user2_location is None:
            score += 25
    else:
        score += 25

    # Gender preference match (20 points)
    user1_gender = user1_responses.get("gender", 0)
    user2_gender = user2_responses.get("gender", 0)
    user1_pref = user1_responses.get("genderPreference", 3)  # Default "No preference" is index 3
    user2_pref = user2_responses.get("genderPreference", 3)

    if user1_pref == 3 and user2_pref == 3:
        score += 20
    elif (user1_pref == 3 or user1_pref == user2_gender) and (user2_pref == 3 or user2_pref == user1_gender):
        score += 20
    elif (user1_pref == user2_gender) or (user2_pref == user1_gender):
        score += 10

    # Lifestyle factors (25 points total)
    lifestyle_keys = ["sleepSchedule", "cleanliness", "noise", "guests", "study"]
    lifestyle_matches = 0

    for key in lifestyle_keys:
        if user1_responses.get(key) == user2_responses.get(key):
            lifestyle_matches += 1

    score += (lifestyle_matches / len(lifestyle_keys)) * 25

    # Ensure score is between 0 and 100
    score = max(0, min(100, score))

    return round(score, 1)


def get_question_text(question_id: str, option_index: int) -> str:
    """
    Helper function to convert question ID and option index to readable text.
    Used for displaying match details.
    """
    question_map = {
        "university": ["McGill", "Concordia"],
        "livingLocation": ["University Residence", "Off-campus apartment/house"],
        "mcgillResidence": ["Upper Rez (Gardner, McConnell, Molson)", "New Rez", "Solin Hall", "La Citadelle", "RVC", "Campus 1", "Carrefour Sherbrooke"],
        "concordiaResidence": ["Grey Nuns Residence", "Hingston Hall"],
        "year": ["U0", "U1", "U2", "U3", "U4", "Masters", "PhD", "Other"],
        "gender": ["Male", "Female", "Non-binary", "Prefer not to say"],
        "genderPreference": ["Male", "Female", "Non-binary", "No preference"],
        "age": ["18-20", "21-23", "24-26", "27+"],
        "program": ["Arts", "Science", "Engineering", "Commerce/Management", "Medicine", "Law", "Education", "Music", "Other"],
        "budget": ["$700–$1000", "$1000–$1300", "$1300–$1500", "$1500+", "Custom amount"],
        "location": ["Milton-Parc / Ghetto", "Plateau Mont-Royal", "Downtown", "Côte-des-Neiges", "Mile End", "Flexible / no preference"],
        "religion": ["No preference", "Christian", "Muslim", "Jewish", "Hindu", "Atheist/Agnostic", "Other"],
        "sleepSchedule": ["Early bird (before 10pm)", "Night owl (after midnight)", "Somewhere in between", "Irregular / varies"],
        "cleanliness": ["Spotless at all times", "Tidy, clean weekly", "Organized chaos", "I'll get to it eventually"],
        "noise": ["Library silence", "Background music is fine", "I like it lively", "Depends on the day"],
        "guests": ["Rarely / never", "Occasionally with notice", "Friends welcome anytime", "The more the merrier"],
        "study": ["Always at home", "Libraries & cafés", "Mix of both", "I study on the go"],
        "dietary": ["None", "Vegetarian", "Vegan", "Halal/Kosher", "Allergies"],
        "workFromHome": ["Never", "1-2 days/week", "3-4 days/week", "Always"],
        "language": ["English", "French", "Bilingual", "No preference"],
        "moveIn": ["August", "January", "May", "ASAP / Flexible"],
    }

    options = question_map.get(question_id, [])
    if isinstance(option_index, int) and 0 <= option_index < len(options):
        return options[option_index]
    if isinstance(option_index, str):
        return option_index  # Custom text input
    return "Unknown"
