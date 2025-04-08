const { createNewGame } = require('../handlers/game_server')

const errorResponse = {
	type: 'object',
	properties: {
		error: { type: 'string' },
	}
}

const createGameSchema = {
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
					game_id: {type: 'integer'}
				}
			},
			400: errorResponse,
			500: errorResponse,
		},
	},
	handler: createNewGame
}

function gameRoutes(fastify, options, done) {
	

	fastify.post('/game/create_game', createGameSchema);

	done();
}

module.exports = gameRoutes;
