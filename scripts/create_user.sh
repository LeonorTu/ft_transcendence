#!/bin/bash

USER=$1
PASS=$2

if [[ $USER == "" || $PASS == "" ]]; then
	echo "Pass username and password as arguments. ./create_game username password"
	exit
fi

curl -X POST http://localhost:8888/user/register \
         -H "Content-Type: application/json" \
         -d "{
                   \"username\": \"$USER\",
                   \"password\": \"$PASS\"
            }"

