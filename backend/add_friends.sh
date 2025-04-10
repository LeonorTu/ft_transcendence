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

LOGIN=$(curl -s -X POST http://localhost:8888/user/login \
	 -H "Content-Type: application/json" \
	 -d '{
			"username": "aaa",
			"password": "AAA"
		 }')

echo

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

echo

curl -X GET http://localhost:8888/user/aaa/friends