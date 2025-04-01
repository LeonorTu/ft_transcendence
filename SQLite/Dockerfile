FROM alpine:latest

RUN apk add --no-cache sqlite

WORKDIR /data

VOLUME /data

COPY init.sql /docker-entrypoint-initdb.d/

CMD ["sh", "-c", "if [ ! -f /data/database.sqlite ]; then sqlite3 /data/database.sqlite < /docker-entrypoint-initdb.d/init.sql; fi && tail -f /dev/null"]