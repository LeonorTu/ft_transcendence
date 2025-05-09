#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <tournament_id>"
  exit 1
fi

TOUR_ID=$1
BASE="http://localhost:8888"
FRONTEND_PORT=8000
USERS=(user1 user2 user3 user4)

declare -A TOKENS
declare -A USER_IDS

echo "=== Round-2 advance for tournament #$TOUR_ID ==="

#log in all users, collect tokens & ids
for U in "${USERS[@]}"; do
  echo "- logging in $U"
  TOK=$(curl -s -X POST "$BASE/user/login" \
           -H "Content-Type: application/json" \
           -d "{\"username\":\"$U\",\"password\":\"pass123\"}" \
       | jq -r .token)
  ID=$(curl -s -H "Authorization: Bearer $TOK" \
            "$BASE/user/$U" \
       | jq -r .id)
  TOKENS[$ID]=$TOK
  USER_IDS[$U]=$ID
done

OWNER_ID=${USER_IDS[${USERS[0]}]}
OWNER_TOKEN=${TOKENS[$OWNER_ID]}

#fetch the current bracket
echo
echo "Fetching round-1 scheduled matches…"
BRACKET=$(curl -s -H "Authorization: Bearer $OWNER_TOKEN" \
                "$BASE/tournament/$TOUR_ID/bracket")

echo "$BRACKET" \
  | jq '.matches[] 
        | select(.round==1 and .tm_status=="scheduled")
        | { tm_id, game_id, player1_id, player2_id }'

#for each round-1 match, fetch the actual game winner and report it
echo
echo "Reporting actual winners for round-1…"
echo "$BRACKET" \
  | jq -r '.matches[] 
           | select(.round==1 and .tm_status=="scheduled")
           | "\(.tm_id) \(.game_id) \(.player1_id) \(.player2_id)"' \
  | while read -r TMID GAMEID P1 P2; do
      echo " tm=$TMID → game=$GAMEID"

      # fetch the match record to get winner_id
      WINNER_ID=$(curl -s -H "Authorization: Bearer $OWNER_TOKEN" \
                        "$BASE/game/list/$GAMEID" \
                   | jq -r .winner_id)

      # determine slot
      if [[ "$WINNER_ID" -eq "$P1" ]]; then
        SLOT=1
      elif [[ "$WINNER_ID" -eq "$P2" ]]; then
        SLOT=2
      else
        echo "  unexpected winner_id=$WINNER_ID (not P1=$P1 or P2=$P2)"
        exit 1
      fi

      echo "    winner_id=$WINNER_ID → winner_slot=$SLOT"

      # report back to tournament
      curl -s -X POST "$BASE/tournament/$TOUR_ID/match/$TMID/result" \
           -H "Content-Type: application/json" \
           -H "Authorization: Bearer $OWNER_TOKEN" \
           -d "{\"winner_slot\":$SLOT}" \
        | jq .
    done

#fetch the updated bracket & print round-2 join links
echo
echo "Round-2 (final) join links:"
UPDATED=$(curl -s -H "Authorization: Bearer $OWNER_TOKEN" \
                 "$BASE/tournament/$TOUR_ID/bracket")

echo "$UPDATED" \
  | jq -r '.matches[]
            | select(.round==2 and .tm_status=="scheduled")
            | "\(.tm_id) \(.game_id) \(.player1_id) \(.player2_id)"' \
  | while read -r TMID GAMEID P1 P2; do
      T1=${TOKENS[$P1]}
      T2=${TOKENS[$P2]}
      echo "Match $TMID → game_id=$GAMEID"
      echo "  P1 → http://localhost:$FRONTEND_PORT/game.html?game_id=$GAMEID&token=$T1"
      echo "  P2 → http://localhost:$FRONTEND_PORT/game.html?game_id=$GAMEID&token=$T2"
    done
