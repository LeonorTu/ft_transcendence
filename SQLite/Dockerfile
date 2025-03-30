FROM alpine:latest

RUN apk add --no-cache sqlite

WORKDIR /data

VOLUME /data

COPY init.sql /docker-entrypoint-initdb.d/init.sql

CMD ["sh", "-c", "sqlite3 /data/database.sqlite < /docker-entrypoint-initdb.d/init.sql && tail -f /dev/null"]