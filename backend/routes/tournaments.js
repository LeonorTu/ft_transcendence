// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   tournaments.js                                     :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/22 16:59:55 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/23 11:31:40 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

// routes/tournaments.js
const auth = require('../routes/auth')    // just to ensure the auth decorator is registered
const {
  createTournament,
  joinTournament,
  startTournament,
  listTournaments,
  getBracket,
  reportMatchResult,
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

function tournamentRoutes(fastify, options, done) {
  // List tournaments
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
  fastify.get('/tournament/list', listTournamentsSchema)

  // Create a new tournament
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
  fastify.post('/tournament/new', createTournamentSchema)

  // Join
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
  fastify.post('/tournament/:id/join', joinTournamentSchema)

  // Start
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
  fastify.post('/tournament/:id/start', startTournamentSchema)

  // Bracket
  const getBracketSchema = {
    onRequest: [fastify.authenticate],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            tournament: Tournament,
            matches:    { type: 'array', items: { type: 'object' } },
          },
        },
        404: errorResponse,
        500: errorResponse,
      },
    },
    handler: getBracket,
  }
  fastify.get('/tournament/:id/bracket', getBracketSchema)

  // Report a match result
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
  fastify.post(
    '/tournament/:id/match/:tm_id/result',
    reportMatchResultSchema
  )

  done()
}

module.exports = tournamentRoutes
