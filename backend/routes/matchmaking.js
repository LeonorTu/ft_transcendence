// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   matchmaking.js                                     :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/23 14:47:13 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/24 19:00:44 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const auth = require('../routes/auth');
const {
  createMatchmaking,
  listMatchmaking,
  joinMatchmaking
} = require('../handlers/matchmaking');

const errorResponse = {
  type: 'object',
  properties: { error: { type: 'string' } },
};

const PendingMatch = {
  type: 'object',
  properties: {
    id:           { type: 'integer' },
    creator_id:   { type: 'integer' },
    player_count: { type: 'integer' }
  }
};

const CreateResponse = {
  type: 'object',
  properties: {
    pending_id: { type: 'integer' }
  }
};

const JoinResponse = {
  type: 'object',
  properties: {
    message:  { type: 'string' },
    match_id: { type: 'integer', nullable: true }
  }
};

function matchmakingRoutes(fastify, options, done) {
  const createSchema = {
    onRequest: [ fastify.authenticate ],
    schema: {
      response: {
        200: CreateResponse,
        500: errorResponse
      }
    },
    handler: createMatchmaking
  };

  const listSchema = {
    onRequest: [ fastify.authenticate ],
    schema: {
      response: {
        200: { type: 'array', items: PendingMatch },
        500: errorResponse
      }
    },
    handler: listMatchmaking
  };

  const joinSchema = {
    onRequest: [ fastify.authenticate ],
    schema: {
      response: {
        200: JoinResponse,
        400: errorResponse,
        404: errorResponse,
        409: errorResponse,
        500: errorResponse
      }
    },
    handler: joinMatchmaking
  };

  fastify.post('/matchmaking/new',      createSchema);
  fastify.get ('/matchmaking/list',     listSchema);
  fastify.post('/matchmaking/:id/join', joinSchema);

  done();
}

module.exports = matchmakingRoutes;
