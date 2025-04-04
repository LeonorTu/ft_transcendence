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

--- 

## Unit tests

The backend uses TAP for testing. TAP will automatically run every file with "test" in its name as well as everything inside the test directory.

### Running Unit Tests
To run all the unit tests, execute: 

`docker-compose run --rm backend npm test`  

### Viewing Full Coverage Report
If you want to see a detailed coverage report, run:  

`docker-compose run --rm backend npm test -- --show-full-coverage`  

### Allowing Incomplete coverage
By default, TAP may return a non-zero exit code if code coverage is not 100%. To allow incomplete coverage and avoid failing the build, use:  

`docker-compose run --rm backend npm test -- --allow-incomplete-coverage`  

`Note: The docker-compose command may be system specific. Adjust the command accordingly if your setup differs.`  
