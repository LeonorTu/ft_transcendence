# 42_transcendence

create database

`cd SQLite`

`docker build -t db .`

`docker run -d --name sqlite-db -v $(pwd)/data:/data db`

to run backend:

`cd ../backend`

`npm install fastify uuid`

`npm install -D nodemon`

`npm install sqlite3`

`npm run dev`