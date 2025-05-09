// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   matchmaking.js                                     :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/23 14:47:13 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/30 16:05:09 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //


const auth = require('../routes/auth');
const { matchmaking } = require('../handlers/matchmaking');

const errorResponse = {
  type: 'object',
  properties: { error: { type: 'string' } }
};

const AutoResponse = {
  type: 'object',
  properties: {
    pending_id: { type: 'integer', nullable: true },
    match_id:   { type: 'integer', nullable: true }
  }
};

function matchmakingRoutes(fastify, options, done) {
  const matchmakingSchema = {
    onRequest: [ fastify.authenticate ],
    schema: {
      response: {
        200: AutoResponse,
        400: errorResponse,
        409: errorResponse,
        500: errorResponse
      }
    },
    handler: matchmaking
  };

  fastify.post('/matchmaking', matchmakingSchema);

  done();
}

module.exports = matchmakingRoutes;
