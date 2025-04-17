// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   match.js                                           :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/07 15:09:07 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/07 15:48:07 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const {
	createMatch,
	getMatch,
	updateMatch,
	registerForMatch,
} = require('../handlers/match');

const Match = {
	type: 'object',
	properties: {
		id: { type: 'integer' },
		tournament_id: { type: ['integer', 'null'] },
		round: { type: 'integer' },
		player1_id: { type: 'integer' },
		player2_id: { type: 'integer' },
		result: { type: ['string', 'null'] },
		winner_id: { type: ['integer', 'null'] },
		loser_id: { type: ['integer', 'null'] },
		match_time: { type: 'string' },
		status: { type: 'string' }
	}
};

const errorResponse = {
	type: 'object',
	properties: {
		error: { type: 'string' },
	}
};

const createMatchSchema = {
	//onRequest: [fastify => fastify.authenticate],
	schema: {
		body: {
			type: 'object',
			properties: {
				tournament_id: { type: ['integer', 'null'] },
				round: { type: 'integer' },
				player1_id: { type: 'integer' },
				player2_id: { type: 'integer' },
				result: { type: ['string', 'null'] },
				winner_id: { type: ['integer', 'null'] },
				loser_id: { type: ['integer', 'null'] }
			},
			required: ['round', 'player1_id', 'player2_id']
		},
		response: {
			200: Match,
			500: errorResponse
		}
	},
	handler: createMatch
};

const getMatchSchema = {
	//onRequest: [fastify => fastify.authenticate],
	schema: {
		response: {
			200: Match,
			404: errorResponse,
			500: errorResponse
		}
	},
	handler: getMatch
};

const updateMatchSchema = {
	//onRequest: [fastify => fastify.authenticate],
	schema: {
		body: {
			type: 'object',
			properties: {
				tournament_id: { type: ['integer', 'null'] },
				round: { type: 'integer' },
				player1_id: { type: 'integer' },
				player2_id: { type: 'integer' },
				result: { type: ['string', 'null'] },
				winner_id: { type: ['integer', 'null'] },
				loser_id: { type: ['integer', 'null'] }
			},
			required: ['round', 'player1_id', 'player2_id']
		},
		response: {
			200: Match,
			404: errorResponse,
			500: errorResponse
		}
	},
	handler: updateMatch
};

const registerForMatchSchema = {
	//onRequest: [fastify => fastify.authenticate],
	schema: {
		body: {
			type: 'object',
			properties: {
				match_id: { type: 'integer' }
			},
			required: ['match_id']
		},
		response: {
			200: {
				type: 'object',
				properties: {
					message: { type: 'string' }
				}
			},
			400: errorResponse,
			404: errorResponse,
			500: errorResponse
		}
	},
	handler: registerForMatch
};

function matchesRoutes(fastify, options, done) {
	fastify.post('/match', createMatchSchema);
	fastify.get('/match/:id', getMatchSchema);
	fastify.put('/match/:id', updateMatchSchema);
	fastify.post('/match/register', registerForMatchSchema);
	done();
}

module.exports = matchesRoutes;
