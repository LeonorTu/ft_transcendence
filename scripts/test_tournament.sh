#!/usr/bin/env bash
# End-to-end tournament flow test using HTTP endpoints
set -euo pipefail

BASE_URL="http://localhost:8888"
USERS=(alice bob carol dan)
TOKENS=()

# 1) Register (if needed) and log in users
for USER in "${USERS[@]}"; do
  echo "--- Processing user: $USER ---"
  # Attempt to register, ignore failure
  curl -s -X POST "$BASE_URL/user/register" \
    -H "Content-Type: application/json" \
    -d "{ \"username\": \"$USER\", \"password\": \"pass123\" }" || true

  # Log in and extract token
  LOGIN_RES=$(curl -s -X POST "$BASE_URL/user/login" \
    -H "Content-Type: application/json" \
    -d "{ \"username\": \"$USER\", \"password\": \"pass123\" }")
  TOKEN=$(echo "$LOGIN_RES" | jq -r '.token')
  if [[ $TOKEN == "null" || -z $TOKEN ]]; then
    echo "Login failed for $USER: $LOGIN_RES" >&2
    exit 1
  fi
  TOKENS+=("$TOKEN")
  echo "Logged in $USER"
done

# 2) Create tournament as first user
TOUR_NAME="TestTournament"
CREATE_RES=$(curl -s -X POST "$BASE_URL/tournament/new" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKENS[0]}" \
  -d "{ \"name\": \"$TOUR_NAME\" }")
TOUR_ID=$(echo "$CREATE_RES" | jq -r '.tournament_id')
if [[ $TOUR_ID == "null" || -z $TOUR_ID ]]; then
  echo "Tournament creation failed: $CREATE_RES" >&2
  exit 1
fi
echo "Created tournament ID: $TOUR_ID"

# 3) All users join
for i in "${!USERS[@]}"; do
  U=${USERS[$i]}
  T=${TOKENS[$i]}
  echo "User $U joining tournament $TOUR_ID"
  curl -s -X POST "$BASE_URL/tournament/$TOUR_ID/join" \
    -H "Authorization: Bearer $T"
  echo
done

# 4) Start tournament
echo "Starting tournament $TOUR_ID"
curl -s -X POST "$BASE_URL/tournament/$TOUR_ID/start" \
  -H "Authorization: Bearer ${TOKENS[0]}"
echo

# 5) Fetch initial bracket
echo "Initial bracket (round 1):"
BRACKET=$(curl -s -X GET "$BASE_URL/tournament/$TOUR_ID/bracket" \
  -H "Authorization: Bearer ${TOKENS[0]}")
echo "$BRACKET" | jq '.matches[] | select(.round==1) | {tm_id, player1_id, player2_id, tm_status}'
echo

# 6) Report round 1 winners (slot 1 wins all)
echo "Reporting round 1 winners..."
echo "$BRACKET" | jq -r '.matches[] | select(.round==1) | .tm_id' | while read TMID; do
  echo " - Reporting match $TMID"
  curl -s -X POST "$BASE_URL/tournament/$TOUR_ID/match/$TMID/result" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKENS[0]}" \
    -d '{"winner_slot":1}'
  echo
done

# 7) Fetch bracket after round 1
echo "Bracket after round 1 (look for new scheduled round 2):"
BRACKET=$(curl -s -X GET "$BASE_URL/tournament/$TOUR_ID/bracket" \
  -H "Authorization: Bearer ${TOKENS[0]}")
echo "$BRACKET" | jq '.matches[] | {tm_id, round, tm_status}'
echo

# 8) Report final round (round 2) winners
echo "Reporting final (round 2) winners..."
echo "$BRACKET" | jq -r '.matches[] | select(.round==2 and .tm_status=="scheduled") | .tm_id' | while read TMID; do
  echo " - Reporting match $TMID"
  curl -s -X POST "$BASE_URL/tournament/$TOUR_ID/match/$TMID/result" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKENS[0]}" \
    -d '{"winner_slot":1}'
  echo
done

# 9) Verify tournament completion
echo "Final tournament status:"
curl -s -X GET "$BASE_URL/tournament/list" \
  -H "Authorization: Bearer ${TOKENS[0]}" | jq '.[] | select(.id=='$TOUR_ID')'
echo

# End of script

