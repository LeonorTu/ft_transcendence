#!/bin/bash

set -e

ID_1=$1
ID_2=$2

if [[ $ID_1 == "" || $ID_2 == "" ]]; then
	echo "Pass player ids as arugments e.g. ./create_game 1 2"
	exit
fi

curl -s -X POST http://localhost:8888/game/new-multiplayer \
	 -H "Content-Type: application/json" \
	 -d "{
			\"player1_id\": \"$ID_1\",
			\"player2_id\": \"$ID_2\"
		 }"

