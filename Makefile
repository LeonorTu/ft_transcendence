COMPOSE := docker compose

up:
	$(COMPOSE) up -d

build:
	$(COMPOSE) build

logs:
	$(COMPOSE) logs

down:
	$(COMPOSE) down

test:
	$(COMPOSE) run --rm backend npm test -- --allow-incomplete-coverage

clean: down
	$(COMPOSE) rm

fclean:
	$(COMPOSE) down -v
	$(COMPOSE) rm


.PHONY: up down clean fclean logs build
