#!/bin/bash

set -e
set -o pipefail

PORT="8000"

P1_ID=""

USERS=$(./list_users.sh | (jq '.[].username' 2>/dev/null || echo "") | xargs)

for u in $USERS
do
	if [[ "$u" == "foo" ]]; then
		P1_ID=$(curl -s http://localhost:8888/user/foo | jq '.id')
	fi
done

if [[ $P1_ID == "" ]]; then
	 P1_ID=$(./create_user.sh "foo" "foo" "foo@foo.com" | jq '.id')
fi

P1_TOKEN=$(./login_user.sh "foo" "foo" | jq '.token' | tr -d '"')
GAME_ID=$(./create_local_game.sh "$P1_ID" | jq '.id')

echo "Join link:"
echo "http://localhost:$PORT/game.html?token=$P1_TOKEN&type=single"
