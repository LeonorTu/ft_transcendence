#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 4 ]]; then
  echo "Usage: $0 <user1> <user1_password> <user2> <user2_password>"
  exit 1
fi

CREATOR=$1
CREATOR_PW=$2
JOINER=$3
JOINER_PW=$4

API_URL="http://localhost:8888"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:8000}"

# Registers (if needed) and logs in a user, returning their JWT.
register_and_login() {
  local USER=$1
  local PW=$2
  >&2 echo "--- Processing user: $USER ---"

  # Attempt registration (ignore failures if user already exists)
 curl -s -X POST "$API_URL/user/register" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$USER\", \"password\":\"$PW\", \"email\":\"'$USER'email123@mail.com\"}" >/dev/null || true

  # Log in
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
  echo "$TOKEN"
}

>&2 echo ""
TOKEN1=$(register_and_login "$CREATOR" "$CREATOR_PW")
TOKEN2=$(register_and_login "$JOINER"  "$JOINER_PW")
>&2 echo ""

# 1) First user hits the single “auto” endpoint
>&2 echo "$CREATOR matchmaking..."
AUTO1=$(curl -s -X POST "$API_URL/matchmaking" \
             -H "Authorization: Bearer $TOKEN1")
PENDING_ID=$(echo "$AUTO1" | jq -r '.pending_id // empty')
MATCH_ID1=$(echo "$AUTO1" | jq -r '.match_id   // empty')

if [[ -n "$MATCH_ID1" ]]; then
  >&2 echo "Unexpected match_id on first call: $MATCH_ID1"
  exit 1
fi
if [[ -z "$PENDING_ID" ]]; then
  >&2 echo "Failed to get pending_id: $AUTO1"
  exit 1
fi
>&2 echo "Lobby created, pending_id = $PENDING_ID"
>&2 echo ""

# 2) Second user calls the same endpoint and should get a match_id
>&2 echo "$JOINER matchmaking..."
AUTO2=$(curl -s -X POST "$API_URL/matchmaking" \
             -H "Authorization: Bearer $TOKEN2")
MATCH_ID=$(echo "$AUTO2" | jq -r '.match_id   // empty')
PENDING_ID2=$(echo "$AUTO2" | jq -r '.pending_id // empty')

if [[ -n "$PENDING_ID2" ]]; then
  >&2 echo "Second call still returned a pending_id ($PENDING_ID2), expected match_id"
  exit 1
fi
if [[ -z "$MATCH_ID" ]]; then
  >&2 echo "Failed to get match_id: $AUTO2"
  exit 1
fi
>&2 echo "Match ready, match_id = $MATCH_ID"
>&2 echo ""

# 3) Print the URLs to join the WebSocket game
echo "Game join links:"
echo "  $CREATOR → $FRONTEND_URL/game.html?game_id=$MATCH_ID&token=$TOKEN1"
echo "  $JOINER  → $FRONTEND_URL/game.html?game_id=$MATCH_ID&token=$TOKEN2"
echo ""
echo "Matchmaking flow complete!"
