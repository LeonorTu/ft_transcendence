FROM alpine:latest

RUN apk add --no-cache sqlite

WORKDIR /data

VOLUME /data

# Copy init.sql into the container
COPY init.sql /docker-entrypoint-initdb.d/init.sql

# Initialize the database and keep the container running
CMD ["sh", "-c", "sqlite3 /data/database.sqlite < /docker-entrypoint-initdb.d/init.sql && tail -f /dev/null"]