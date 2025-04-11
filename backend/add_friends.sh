echo "registering 3 users"

curl -X POST http://localhost:8888/user/register \
	 -H "Content-Type: application/json" \
	 -d '{
			"username": "aaa",
			"password": "AAA"
		 }'

echo

curl -X POST http://localhost:8888/user/register \
	 -H "Content-Type: application/json" \
	 -d '{
			"username": "bbb",
			"password": "BBB"
		 }'

echo

curl -X POST http://localhost:8888/user/register \
	 -H "Content-Type: application/json" \
	 -d '{
			"username": "ccc",
			"password": "CCC"
		 }'

echo "\n\nlogin user aaa"

LOGIN=$(curl -s -X POST http://localhost:8888/user/login \
	 -H "Content-Type: application/json" \
	 -d '{
			"username": "aaa",
			"password": "AAA"
		 }')

echo "\nuser aaa adds bbb and ccc as friends"

TOKEN=$(echo "$LOGIN" | jq -r .token)

curl -X POST http://localhost:8888/add_friend \
	 -H "Content-Type: application/json" \
	 -H "authorization: Bearer ${TOKEN}" \
	 -d '{ "user_id": "1", "friend_id": "2" }'

echo

curl -X POST http://localhost:8888/add_friend \
	 -H "Content-Type: application/json" \
	 -H "authorization: Bearer ${TOKEN}" \
	 -d '{ "user_id": "1", "friend_id": "3" }'

echo "\n\ngetting current list of friends"

curl -s -X GET http://localhost:8888/user/aaa/friends

echo "\n\nuser aaa adds a non existing user as friend"

curl -X POST http://localhost:8888/add_friend \
	 -H "Content-Type: application/json" \
	 -H "authorization: Bearer ${TOKEN}" \
	 -d '{ "user_id": "1", "friend_id": "10" }'

FRIENDS=$(curl -s -X GET http://localhost:8888/user/aaa/friends)

ID=$(echo "$FRIENDS" | jq .[0].id)

echo "\n\nuser aaa removing user bbb as friend"

curl -X DELETE http://localhost:8888/remove_friend/${ID} \
	 -H "authorization: Bearer ${TOKEN}"

echo "\n\ngetting updated list of friends"

curl -X GET http://localhost:8888/user/aaa/friends

echo "\n\nlogin user bbb"

LOGIN1=$(curl -s -X POST http://localhost:8888/user/login \
	 -H "Content-Type: application/json" \
	 -d '{
			"username": "bbb",
			"password": "BBB"
		 }')

TOKEN1=$(echo "$LOGIN1" | jq -r .token)

FRIENDS=$(curl -s -X GET http://localhost:8888/user/aaa/friends)

ID=$(echo "$FRIENDS" | jq .[0].id)

echo "\nuser bbb tries to remove user ccc from friend list of aaa"

curl -X DELETE http://localhost:8888/remove_friend/${ID} \
	 -H "authorization: Bearer ${TOKEN1}"

echo "\n\nthe friend list should remain the same"

curl -s -X GET http://localhost:8888/user/aaa/friends

echo "\n\nbbb tries to add himself as friend of aaa"

curl -X POST http://localhost:8888/add_friend \
	 -H "Content-Type: application/json" \
	 -H "authorization: Bearer ${TOKEN1}" \
	 -d '{ "user_id": "1", "friend_id": "2" }'

echo "\n\nthe friend list should remain the same"

curl -s -X GET http://localhost:8888/user/aaa/friends