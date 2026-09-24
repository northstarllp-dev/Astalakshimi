# Matching algorithm

Locked product and engine contract. For you is preference-gated. Browse is the full eligible catalog. The app never shows a match percentage.

## Who is eligible (both For you and Browse)

A profile appears only when all of these are true:

- Not the viewer
- Opposite gender: Male sees Female; Female sees Male. Gender Other viewers see Male and Female. Profiles whose own gender is Other do not appear
- `profiles.required_complete` is true
- Has an approved primary photo
- Not paused: `hide_profile` is false and `profile_visibility` is not `hidden`
- `profile_visibility = premium` only if the viewer is on a paid plan
- Photo blur does not affect eligibility

Skipped profiles are hidden on the client after load.

## Partner preferences form

Required on signup page 5, profile edit → Preferences, and admin create:

- Age min and max (18–80, min ≤ max)
- Religion: at least one value (multi-select)
- Marital status: at least one value (Never Married, Divorced, Widowed, Awaiting Divorce)

Optional: communities, mother tongues, minimum education, locations, height. Blank optional means Any. Never persist `['Never Married']` or height `140–200` when the member left them empty.

Same-as-me copies religion, community, tongue, and city. It does not copy marital status.

If age, religion, or marital is missing on an existing row, For you is empty and the UI asks the member to set preferences. Browse still works.

## For you (one-way, any-of)

Compare the viewer’s partner preferences to the other profile’s fields.

| Preference | Profile field | Rule |
|---|---|---|
| Age min–max | `dob` | Whole-year age today, inclusive. Birthday not yet reached this year stays the previous age. |
| Religions | `religion` | Profile religion equals **any** selected value. |
| Marital statuses | `marital_status` | Profile marital status equals **any** selected value. |
| Community, tongue, education, location, height | matching fields | Do not exclude. Used only to order For you when set. |

SQL uses `IN` lists (case-insensitive) and DOB bounds: `dob <= today - ageMin years` and `dob >= today - (ageMax + 1) years`. Node `candidateAge` + `passesHardFilters` is the authority on birthday-boundary days.

Order: newest 200 who pass the three gates, then internal fit (community 25, mother tongue 20, education 20, location 20, height 15). If no optional prefs are set, newest first. Never send `matchPercent`. Cards may show up to three reasons.

Home “Your top matches” is the first three of this list.

## Browse

Ignores saved partner preferences. Default list is every eligible profile, newest first. Age / city / community / More filters apply only when the member sets them. Browse age uses the same DOB math. Empty age means any age.

## Worked examples

Viewer: age 25–32, religions Hindu + Jain, marital Never Married + Divorced.

- 28, Hindu, Never Married → For you and Browse
- 30, Jain, Divorced → For you and Browse
- 28, Hindu, Widowed → Browse only
- 28, Muslim, Never Married → Browse only
- 24 or 33, Hindu, Never Married → Browse only
- Birthday tomorrow turning 25, pref min 25 → Browse only until that date
- Height or caste left blank → does not exclude from For you
