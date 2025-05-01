#!/bin/bash

ID_1=$1

if [[ $ID_1 == "" ]]; then
	echo "Pass player id as arugments e.g. ./create_game 1"
	exit
fi

curl -s -X POST http://localhost:8888/game/new-singleplayer \
	 -H "Content-Type: application/json" \
	 -d "{
			\"player_id\": \"$ID_1\",
		 }"

