FROM alpine:latest

RUN apk add --no-cache sqlite npm nodejs openssl

RUN mkdir -p /etc/inception/certs
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
	-keyout /etc/inception/certs/ssl.key \
	-out /etc/inception/certs/ssl.crt \
	-subj "/C=FI/ST=UUSIMA/L=HLSINKI/O=42/OU=HIVE/CN=${USER}"

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

ENV SQLITE_DB_PATH=/data/database.sqlite

EXPOSE 8888

CMD ["npm", "run", "dev"]