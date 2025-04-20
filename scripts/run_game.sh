#!/bin/bash

PORT="8000"

P1_ID=""
P2_ID=""

USERS=$(./list_users.sh | jq '.[].username' | xargs)

for u in $USERS
do
	if [[ "$u" == "foo" ]]; then
		P1_ID=$(curl -s http://localhost:8888/user/foo | jq '.id')
	fi
	if [[ "$u" == "bar" ]]; then
		P2_ID=$(curl -s http://localhost:8888/user/bar | jq '.id')
	fi
done

if [[ $P1_ID == "" ]]; then
	 P1_ID=$(./create_user "foo" "foo")
fi

if [[ $P2_ID == "" ]]; then
	 P2_ID=$(./create_user "bar" "bar")
fi

P1_TOKEN=$(./login_user.sh "foo" "foo" | jq '.token' | tr -d '"')
P2_TOKEN=$(./login_user.sh "bar" "bar" | jq '.token' | tr -d '"')

GAME_ID=$(./create_game.sh $P1_ID $P2_ID | jq '.id')



echo "Player 1 join link:"
echo "http://localhost:$PORT/game.html?game_id=$GAME_ID&token=$P1_TOKEN"
echo ""
echo "Player 2 join link:"
echo "http://localhost:$PORT/game.html?game_id=$GAME_ID&token=$P2_TOKEN"
