#!/usr/bin/env bash
set -euo pipefail

BASE="http://localhost:8888"
FRONTEND_PORT=8000
USERS=(user1 user2 user3 user4)
declare -A TOKENS
declare -A USER_IDS

echo "=== Round 1 Setup ==="

#Register & login all users
for U in "${USERS[@]}"; do
  echo "- ensuring & logging in $U"
  curl -s -X POST "$BASE/user/register" \
       -H "Content-Type: application/json" \
       -d "{\"username\":\"$U\", \"password\":\"pass123\", \"email\":\"'$U'email123@mail.com\"}" \
    >/dev/null || true

  TOKEN=$(curl -s -X POST "$BASE/user/login" \
             -H "Content-Type: application/json" \
             -d "{\"username\":\"$U\",\"password\":\"pass123\"}" \
           | jq -r '.token')
  if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
    echo "✖ login failed for $U" >&2
    exit 1
  fi

  #Fetch user ID
  USER_ID=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE/user/$U" | jq -r '.id')
  USER_IDS[$U]=$USER_ID
  TOKENS[$USER_ID]=$TOKEN
done

OWNER=${USERS[0]}
OWNER_ID=${USER_IDS[$OWNER]}
OWNER_TOKEN=${TOKENS[$OWNER_ID]}

#Create tournament
TOUR_NAME="TestTournament_$(date +%s)"
TOUR_ID=$(curl -s -X POST "$BASE/tournament/new" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $OWNER_TOKEN" \
                -d "{\"name\":\"$TOUR_NAME\"}" \
          | jq -r .tournament_id)

echo
echo "Tournament created: id=$TOUR_ID"
echo

#Join users to tournament
for U in "${USERS[@]}"; do
  USER_ID=${USER_IDS[$U]}
  TOKEN=${TOKENS[$USER_ID]}
  echo "- $U (id=$USER_ID) joining"
  curl -s -X POST "$BASE/tournament/$TOUR_ID/join" \
       -H "Authorization: Bearer $TOKEN" \
    | jq .
done

#Start tournament
echo
echo "Starting tournament $TOUR_ID"
curl -s -X POST "$BASE/tournament/$TOUR_ID/start" \
     -H "Authorization: Bearer $OWNER_TOKEN" \
  | jq .
echo

#Get bracket
BR=$(curl -s -H "Authorization: Bearer $OWNER_TOKEN" \
          "$BASE/tournament/$TOUR_ID/bracket")

echo "Round 1 generate join links:"
echo "$BR" \
  | jq -r '.matches[] | select(.round==1 and .tm_status=="scheduled")
            | "\(.tm_id) \(.game_id) \(.player1_id) \(.player2_id)"' \
  | while read -r TM GAME P1 P2; do
      T1=${TOKENS[$P1]}
      T2=${TOKENS[$P2]}
      echo "Match $TM → game_id=$GAME"
      echo "  P1 → http://localhost:$FRONTEND_PORT/game.html?game_id=$GAME&token=$T1"
      echo "  P2 → http://localhost:$FRONTEND_PORT/game.html?game_id=$GAME&token=$T2"
    done
