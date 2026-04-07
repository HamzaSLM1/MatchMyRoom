# Bugs Found During Testing

## Bug 1: Case 3 lifestyle scoring uses inline logic instead of `_lifestyle_score` helper

**File:** `backend/app/matching.py:178-183`

**Description:** Case 3 (both looking) duplicates the lifestyle scoring logic inline instead of calling `_lifestyle_score()`. The inline version counts `None == None` as a match, while the helper function explicitly skips None values (`if user1_responses.get(k) is not None`). This means users with missing lifestyle fields get inflated scores in Case 3 but not in Case 2.

**Impact:** Inconsistent scoring between Case 2 and Case 3 when lifestyle fields are missing/None.

**Fix:** Replace lines 178-183 with a call to `_lifestyle_score(user1_responses, user2_responses)`.

## Bug 2: `genderPreference` index 3 used as "no preference" but UI only has 3 options (0-2)

**File:** `backend/app/matching.py:8-9`

**Description:** The `_gender_score` function defaults `genderPreference` to `3` (no preference), and the `get_question_text` map at line 204 only lists 3 options: `["Male", "Female", "No preference"]` (indices 0, 1, 2). The code uses index 3 as "no preference" but the UI option "No preference" is at index 2. This means the default (3) and the actual UI selection (2) represent the same intent but are treated as different values.

**Impact:** A user who selects "No preference" (index 2) in the questionnaire will NOT get the full 20-point gender score when matched against a user whose `genderPreference` defaulted to 3. The `elif` branch at line 13 may still award 20 points in some cases, but the behavior is inconsistent.

**Fix:** Either change the default from 3 to 2, or add index 2 to the "no preference" check: `if user1_pref in (2, 3) and user2_pref in (2, 3)`.

## Bug 3: `calculate_matches` endpoint was not authenticated (now fixed in main.py)

**File:** `backend/app/main.py:497-502`

**Description:** The `/api/matches/calculate` endpoint previously did not require authentication, allowing anyone to trigger match calculation for any user. The `docs/API.md` notes this as a "potential security issue". The current code now includes `current_user: User = Depends(get_current_user)` — this appears to have been fixed already.

**Impact:** None (already resolved).
