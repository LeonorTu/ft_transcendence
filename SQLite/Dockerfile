FROM alpine:latest

RUN apk add --no-cache sqlite

WORKDIR /data

VOLUME /data

COPY init.sql /docker-entrypoint-initdb.d/

CMD ["sh", "-c", "\
  [ ! -f /data/database.sqlite ] && sqlite3 /data/database.sqlite < /docker-entrypoint-initdb.d/init.sql; \
  [ ! -f /data/test.sqlite ] && sqlite3 /data/test.sqlite < /docker-entrypoint-initdb.d/init.sql; \
  tail -f /dev/null"]
