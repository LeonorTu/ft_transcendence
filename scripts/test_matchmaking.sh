#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 4 ]]; then
  echo "Usage: $0 <creator_username> <creator_password> <joiner_username> <joiner_password>"
  exit 1
fi

CREATOR=$1
CREATOR_PW=$2
JOINER=$3
JOINER_PW=$4

API_URL="http://localhost:8888"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:8000}"

register_and_login() {
  local USER=$1
  local PW=$2
  >&2 echo "--- Processing user: $USER ---"

  #register
  curl -s -X POST "$API_URL/user/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USER\",\"password\":\"$PW\"}" >/dev/null || true

  #log in
  local LOGIN_RES
  LOGIN_RES=$(curl -s -X POST "$API_URL/user/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USER\",\"password\":\"$PW\"}")

  local TOKEN
  TOKEN=$(echo "$LOGIN_RES" | jq -r '.token')
  if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
    >&2 echo "Login failed for $USER: $LOGIN_RES"
    exit 1
  fi

  >&2 echo "Logged in $USER"
  # Only emit the token on stdout
  echo "$TOKEN"
}

>&2 echo ""
TOKEN1=$(register_and_login "$CREATOR" "$CREATOR_PW")
TOKEN2=$(register_and_login "$JOINER" "$JOINER_PW")
>&2 echo ""

# 2) Creator makes a pending match (auto‐joined)
>&2 echo "Creating pending match as $CREATOR..."
CREATE_RES=$(curl -s -X POST "$API_URL/matchmaking/new" -H "Authorization: Bearer $TOKEN1")
PENDING_ID=$(echo "$CREATE_RES" | jq -r '.pending_id // empty')
if [[ -z "$PENDING_ID" ]]; then
  >&2 echo "Failed to create pending match: $CREATE_RES"
  exit 1
fi
>&2 echo "pending_match_id = $PENDING_ID"
>&2 echo ""

#List open pending matches
>&2 echo "Open pending matches:"
curl -s -X GET "$API_URL/matchmaking/list" \
  -H "Authorization: Bearer $TOKEN1" \
  | jq ".[] | select(.id==$PENDING_ID)"
>&2 echo ""

#Join as second user to get match_id
>&2 echo "$JOINER joining pending match $PENDING_ID..."
JOIN_RES=$(curl -s -X POST "$API_URL/matchmaking/$PENDING_ID/join" \
  -H "Authorization: Bearer $TOKEN2")
echo "$JOIN_RES" | jq .
MATCH_ID=$(echo "$JOIN_RES" | jq -r '.match_id // empty')
if [[ -z "$MATCH_ID" ]]; then
  >&2 echo "Did not receive match_id on join. Response was:"
  >&2 echo "$JOIN_RES"
  exit 1
fi
>&2 echo "Match created: id = $MATCH_ID"
>&2 echo ""

# 5) Show join URLs
echo "Game join links:"
echo "  $CREATOR → $FRONTEND_URL/game.html?game_id=$MATCH_ID&token=$TOKEN1"
echo "  $JOINER  → $FRONTEND_URL/game.html?game_id=$MATCH_ID&token=$TOKEN2"
echo ""
echo "Matchmaking flow all set!"
