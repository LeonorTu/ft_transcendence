const { runServer, createNewMultiplayerGame, createNewSinglePlayerGame, listGames, getGame} = require('../handlers/game_server')

const errorResponse = {
	type: 'object',
	properties: {
		error: { type: 'string' },
	}
}

const GameListElement = {
	type: 'object',
	properties: {
		id: {type: 'integer'},
		player1_id: {type: 'integer'},
		player2_id: {type: 'integer'},
		status: {type: 'string'},
	}
}

const Game = {
	type: 'object',
	properties: {
		id: {type: 'integer'},
		player1_id: {type: 'integer'},
		player2_id: {type: 'integer'},
		player1_score: {type: 'integer'},
		player2_score: {type: 'integer'},
		status: {type: 'string'},
		finished_rounds: {type: 'integer'},
		winner_id: {type: 'integer'},
		loser_id: {type: 'integer'},
		match_time: {type: 'string'}
	}
}

const createMultiplayerGameSchema = {
	schema: {
		body: {
			type: 'object',
			properties: {
				player1_id: {type: 'integer'},
				player2_id: {type: 'integer'}
			},
			required: ['player1_id', 'player2_id'],
		},
		response: {
			200: {
				type: 'object',
				properties: {
					id: {type: 'integer'}
				}
			},
			400: errorResponse,
			500: errorResponse,
		},
	},
	handler: createNewMultiplayerGame
}


const createSingleplayerGameSchema = {
	schema: {
		body: {
			type: 'object',
			properties: {
				// player_id: {type: 'integer'},
				player1_id: {type: 'integer'},
				player2_id: {type: 'integer'}
			},
			// required: ['player_id'],
			required: ['player1_id', 'player2_id']
		},
		response: {
			200: {
				type: 'object',
				properties: {
					id: {type: 'integer'}
				}
			},
			400: errorResponse,
			500: errorResponse,
		},
	},
	handler: createNewSinglePlayerGame
}
const listGamesSchema = {
	schema: {
		response: {
			200: {},
			400: errorResponse,
			500: errorResponse,
		},
	},
	handler: listGames
}

const getGameSchema = {
	schema: {
		response: {
			200: Game,
			404: errorResponse,
			500: errorResponse,
		},
	},
	handler: getGame
}

function gameRoutes(fastify, options, done) {
	

	fastify.post('/game/new-multiplayer', createMultiplayerGameSchema);

	fastify.post('/game/new-singleplayer', createSingleplayerGameSchema);

	fastify.get('/game/list', listGamesSchema);
	
	fastify.get('/game/list/:id', getGameSchema);

	fastify.get('/game', { websocket: true }, runServer);

	done();
}

module.exports = gameRoutes;
