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

When building more tests it's useful to use docker compose run --rm backend npm test --show-full-coverage to see the full coverage listing.  

Tap will automatically run every file with test on it and also everything inside the test directory.  

To run the unit tests:  
`docker-compose run --rm backend npm test`  

To see full coverage report:  
`docker-compose run --rm backend npm test -- --show-full-coverage`  

To avoid tap returning 1 even if all tests would pass but the codebase coverage is not 100%:  
`docker-compose run --rm backend npm test -- --allow-incomplete-coverage`  

`Note: docker compose command can be system specific.`  
