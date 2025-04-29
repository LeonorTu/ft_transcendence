/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   tournaments.js                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: mpellegr <mpellegr@student.hive.fi>        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/22 16:59:55 by jmakkone          #+#    #+#             */
/*   Updated: 2025/04/29 14:00:52 by mpellegr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const auth = require('../routes/auth')

const {
	createTournament,
	joinTournament,
	startTournament,
	listTournaments,
	getBracket,
	reportMatchResult,
	infoTournament,
} = require('../handlers/tournaments')

const errorResponse = {
	type: 'object',
	properties: { error: { type: 'string' } },
}

const successResponse = {
	type: 'object',
	properties: { message: { type: 'string' } },
}

const Tournament = {
	type: 'object',
	properties: {
		id:          { type: 'integer' },
		name:        { type: 'string'  },
		owner_id:    { type: 'integer' },
		status:      { type: 'string'  },
		created_at:  { type: 'string'  },
		started_at:  { type: 'string'  },
		finished_at: { type: 'string'  },
		winner_id:   { type: 'integer', nullable: true },
	},
}

const TournamentMatch = {
	type: 'object',
	properties: {
		tm_id:         { type: 'integer' },
		game_id:       { type:'integer', nullable:true },
		round:         { type: 'integer' },
		tm_status:     { type: 'string'  },
		player1_id:    { type: 'integer', nullable: true },
		player2_id:    { type: 'integer', nullable: true },
		player1_score: { type: 'integer', nullable: true },
		player2_score: { type: 'integer', nullable: true },
		winner_id:     { type: 'integer', nullable: true },
	},
};

const TournamentPlayers = {
	type: 'object',
	properties: {
		id: { type: 'integer' },
		tournament_id: { type: 'integer' },
		user_id: { type: 'integer' },
		seed: { type: 'integer' },
	}
}

function tournamentRoutes(fastify, options, done) {

	const listTournamentsSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			response: {
				200: { type: 'array', items: Tournament },
				500: errorResponse,
			},
		},
		handler: listTournaments,
	}

	const createTournamentSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			body: {
				type: 'object',
				properties: { name: { type: 'string' } },
				required: ['name'],
			},
			response: {
				200: { type: 'object', properties: { tournament_id: { type: 'integer' } } },
				400: errorResponse,
				500: errorResponse,
			},
		},
		handler: createTournament,
	}

	const joinTournamentSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			response: {
				200: successResponse,
				400: errorResponse,
				404: errorResponse,
				409: errorResponse,
			},
		},
		handler: joinTournament,
	}

	const startTournamentSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			response: {
				200: successResponse,
				400: errorResponse,
				403: errorResponse,
				404: errorResponse,
				500: errorResponse,
			},
		},
		handler: startTournament,
	}

	const getBracketSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			response: {
				200: {
					type: 'object',
					properties: {
						tournament: Tournament,
						matches:    { type: 'array', items: TournamentMatch },
					},
				},
				404: errorResponse,
				500: errorResponse,
			},
		},
		handler: getBracket,
	}

	const reportMatchResultSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			body: {
				type: 'object',
				properties: { winner_slot: { type: 'integer', enum: [1, 2] } },
				required: ['winner_slot'],
			},
			response: {
				200: successResponse,
				400: errorResponse,
				404: errorResponse,
				500: errorResponse,
			},
		},
		handler: reportMatchResult,
	}

	const infoTournamentsSchema = {
		// onRequest: [fastify.authenticate],
		schema: {
			response: {
				200: { type: 'array', items: TournamentPlayers },
				400: errorResponse,
				500: errorResponse,
			},
		},
		handler: infoTournament,
	}

	fastify.get('/tournament/list', listTournamentsSchema)
	fastify.get('/tournament/info', infoTournamentsSchema)
	fastify.post('/tournament/new', createTournamentSchema)
	fastify.post('/tournament/:id/join', joinTournamentSchema)
	fastify.post('/tournament/:id/start', startTournamentSchema)
	fastify.get('/tournament/:id/bracket', getBracketSchema)
	fastify.post('/tournament/:id/match/:tm_id/result', reportMatchResultSchema)
	done()
}

module.exports = tournamentRoutes
