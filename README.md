# 42_transcendence

Run the docker compose

```
docker-compose up --build
```

OR run manually:

create database

`cd SQLite`

`docker build -t db .`

`docker run -d --name sqlite -v $(pwd)/data:/data db`

to run backend:

`cd backend`

`npm install fastify`

`npm install -D nodemon`

`npm install sqlite3`

`npm install @fastify/swagger @fastify/swagger-ui`

`npm run dev`

to create test users:

`cd SQLite`

`sh create_users.sh`

if you go to localhost:8888/documentation you can see the API endpoints instead

## Unit tests

To run the unit tests:  
`docker-compose run --rm backend npm test`
