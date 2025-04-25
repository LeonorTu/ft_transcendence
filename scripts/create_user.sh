#!/bin/bash

USER=$1
PASS=$2
EMAIL=$3

if [[ $USER == "" || $PASS == "" || $EMAIL == "" ]]; then
	echo "Pass username, password and email as arguments. ./create_game username password email"
	exit
fi

curl -s -X POST http://localhost:8888/user/register \
         -H "Content-Type: application/json" \
         -d "{
                   \"username\": \"$USER\",
                   \"password\": \"$PASS\",
                   \"email\": \"$EMAIL\"
            }"

