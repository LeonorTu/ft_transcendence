#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: $0 <tournament_id> <username> <password>"
  exit 1
fi

TOUR_ID="$1"
USERNAME="$2"
PASSWORD="$3"
BASE_URL="http://localhost:8888"
POLL_INTERVAL=2

echo "Logging in as $USERNAME…"
LOGIN_RES=$(curl -s -X POST "$BASE_URL/user/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")
TOKEN=$(echo "$LOGIN_RES" | jq -r .token)

if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  echo "❌ Login failed: $LOGIN_RES"
  exit 1
fi

#Fetch current bracket and report all scheduled matches
echo
echo "Reporting all scheduled matches for tournament #$TOUR_ID…"
BRACKET=$(curl -s -H "Authorization: Bearer $TOKEN" \
               "$BASE_URL/tournament/$TOUR_ID/bracket")

# For each match whose tm_status=="scheduled", post a result
echo "$BRACKET" \
  | jq -r '.matches[] 
            | select(.tm_status=="scheduled") 
            | .tm_id' \
  | while read -r TMID; do
      echo "Reporting tm_id=$TMID → winner_slot=1"
      RESP=$(curl -s -X POST "$BASE_URL/tournament/$TOUR_ID/match/$TMID/result" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"winner_slot":1}')
      echo "   Response: $RESP"
    done

# Now poll until tournament status == completed
echo
echo "Polling tournament #$TOUR_ID for completion every ${POLL_INTERVAL}s…"
while true; do
  ENTRY=$(curl -s -H "Authorization: Bearer $TOKEN" \
               "$BASE_URL/tournament/list" \
          | jq ".[] | select(.id==$TOUR_ID)")

  if [[ -z "$ENTRY" || "$ENTRY" == "null" ]]; then
    echo "❌ Tournament #$TOUR_ID not found."
    exit 1
  fi

  STATUS=$(echo "$ENTRY" | jq -r .status)
  echo "… status = $STATUS"

  if [[ "$STATUS" == "completed" ]]; then
    WINNER_ID=$(echo "$ENTRY" | jq -r .winner_id)
    echo "Tournament #$TOUR_ID completed! winner_id=$WINNER_ID"

    WINNER_NAME=$(curl -s -H "Authorization: Bearer $TOKEN" \
                    "$BASE_URL/users" \
                  | jq -r ".[] | select(.id==$WINNER_ID) | .username")

    echo "Winner: $WINNER_NAME"
    exit 0
  fi

  sleep "$POLL_INTERVAL"
done
