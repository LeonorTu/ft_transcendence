// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   tournament.js                                      :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/07 01:41:19 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/07 15:15:14 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const {
  registerForTournament,
  getTournamentStatus,
  reportMatchResult,
} = require('../handlers/tournament');

const TournamentStatus = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    created_at: { type: 'string' },
    status: { type: 'string' },
    // bracket, players, etc.
  }
};

const errorResponse = {
  type: 'object',
  properties: {
    error: { type: 'string' },
  }
};

const registerTournamentSchema = {
  onRequest: [fastify => fastify.authenticate],
  schema: {
    response: {
      200: {
        type: 'object',
        properties: {
          message: { type: 'string' }
        }
      },
      400: errorResponse,
      500: errorResponse,
    }
  },
  handler: registerForTournament
};

const getTournamentStatusSchema = {
  onRequest: [fastify => fastify.authenticate],
  schema: {
    response: {
      200: TournamentStatus,
      500: errorResponse,
    }
  },
  handler: getTournamentStatus
};

const reportMatchResultSchema = {
  onRequest: [fastify => fastify.authenticate],
  schema: {
    body: {
      type: 'object',
      properties: {
        tournament_id: { type: 'integer' },
        match_id: { type: 'integer' },
        winner_id: { type: 'integer' },
        // Additional fields like score, etc. can be added here.
      },
      required: ['tournament_id', 'match_id', 'winner_id']
    },
    response: {
      200: {
        type: 'object',
        properties: {
          message: { type: 'string' }
        }
      },
      500: errorResponse,
    }
  },
  handler: reportMatchResult
};

function tournamentRoutes(fastify, options, done) {
  fastify.post('/tournament/register', registerTournamentSchema);
  fastify.get('/tournament/status', getTournamentStatusSchema);
  fastify.post('/tournament/report', reportMatchResultSchema);
  done();
}

module.exports = tournamentRoutes;
