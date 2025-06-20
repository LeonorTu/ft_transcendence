#!/bin/bash

USER=$1
PASS=$2

if [[ $USER == "" || $PASS == "" ]]; then
	echo "Pass username and password as arguments. ./login_user username password"
	exit
fi

curl -s -X POST http://localhost:8888/user/login \
         -H "Content-Type: application/json" \
         -d "{
                   \"username\": \"$USER\",
                   \"password\": \"$PASS\"
            }"

