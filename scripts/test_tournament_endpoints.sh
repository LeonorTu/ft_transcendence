#!/usr/bin/env bash
set -euo pipefail

BASE_URL="http://localhost:8888"
USERS=(user1 user2 user3 user4)
TOKENS=()

for USER in "${USERS[@]}"; do
  echo "--- Processing user: $USER ---"
  curl -s -X POST "$BASE_URL/user/register" \
    -H "Content-Type: application/json" \
    -d "{ \"username\": \"$USER\", \"password\": \"pass123\", \"email\": \"'$USER'email123@mail.com\" }" || true
  
  echo
  LOGIN_RES=$(curl -s -X POST "$BASE_URL/user/login" \
    -H "Content-Type: application/json" \
    -d "{ \"username\": \"$USER\", \"password\": \"pass123\" }")

  TOKEN=$(echo "$LOGIN_RES" | jq -r '.token')
  if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
    echo "Login failed for $USER: $LOGIN_RES" >&2
    exit 1
  fi
  TOKENS+=("$TOKEN")
  echo "Logged in $USER"
done

TOUR_NAME="TestTournament_$(date +%s)"
CREATE_RES=$(curl -s -X POST "$BASE_URL/tournament/new" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKENS[0]}" \
  -d "{ \"name\": \"$TOUR_NAME\" }")
TOUR_ID=$(echo "$CREATE_RES" | jq -r '.tournament_id')

if [[ -z "$TOUR_ID" || "$TOUR_ID" == "null" ]]; then
  echo "Tournament creation failed: $CREATE_RES" >&2
  exit 1
fi
echo
echo
echo "Created tournament ID: $TOUR_ID"

for i in "${!USERS[@]}"; do
  echo "${USERS[$i]} joining tournament $TOUR_ID"
  curl -s -X POST "$BASE_URL/tournament/$TOUR_ID/join" \
    -H "Authorization: Bearer ${TOKENS[$i]}" \
    | jq .
  echo
done

echo "Starting tournament $TOUR_ID"
curl -s -X POST "$BASE_URL/tournament/$TOUR_ID/start" \
  -H "Authorization: Bearer ${TOKENS[0]}" \
  | jq .

BRACKET=$(curl -s -X GET "$BASE_URL/tournament/$TOUR_ID/bracket" \
  -H "Authorization: Bearer ${TOKENS[0]}")
MAX_ROUND=$(echo "$BRACKET" \
  | jq '[.matches[].round] | max')

echo
echo "Tournament has $MAX_ROUND rounds."
echo

for R in $(seq 1 $MAX_ROUND); do
  echo "=== Round $R ==="

  BRACKET=$(curl -s -X GET "$BASE_URL/tournament/$TOUR_ID/bracket" \
    -H "Authorization: Bearer ${TOKENS[0]}")

  echo "Matches:"
  echo "$BRACKET" \
    | jq ".matches[] | select(.round==$R) 
        | { tm_id, player1_id, player2_id, tm_status }"

  echo "Reporting winners for round $R..."
  echo "$BRACKET" \
    | jq -r ".matches[] 
        | select(.round==$R and .tm_status==\"scheduled\") 
        | .tm_id" \
    | while read -r TMID; do
        echo " • Match $TMID → winner_slot=1"
        curl -s -X POST "$BASE_URL/tournament/$TOUR_ID/match/$TMID/result" \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer ${TOKENS[0]}" \
          -d '{"winner_slot":1}' \
        | jq .
      done

  echo
done

echo "Final tournament status:"
curl -s -X GET "$BASE_URL/tournament/list" \
  -H "Authorization: Bearer ${TOKENS[0]}" \
| jq ".[] | select(.id==$TOUR_ID)"
echo
