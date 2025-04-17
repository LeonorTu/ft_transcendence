COMPOSE := docker compose

up:
	$(COMPOSE) up -d

logs:
	$(COMPOSE) logs

down:
	$(COMPOSE) down

test:
	$(COMPOSE) run --rm backend npm test -- --allow-incomplete-coverage

clean:
	$(COMPOSE) rm

.PHONY: up down clean
