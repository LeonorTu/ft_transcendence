#!/bin/bash

# echo "Waiting for Fastify server to be ready..."
# until curl -s http://localhost:8888/users | grep -q "[]" || curl -s http://localhost:8888/users | grep -q "error"; do
#   echo "Waiting for server to be ready"
#   sleep 2
# done

echo "Fastify server is up! Creating test users..."

curl -X POST http://localhost:8888/user/register \
	 -H "Content-Type: application/json" \
	 -d '{
		   "username": "aaa",
		   "password": "AAA"
		 }'

curl -X POST http://localhost:8888/user/register \
	 -H "Content-Type: application/json" \
	 -d '{
		   "username": "bbb",
		   "password": "BBB"
		 }'

curl -X POST http://localhost:8888/user/register \
	 -H "Content-Type: application/json" \
	 -d '{
		   "username": "ccc",
		   "password": "CCC"
		 }'

echo "Test users created!"
