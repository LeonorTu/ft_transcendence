// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   tournament.js                                      :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/07 01:41:19 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/07 01:54:17 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const {
	registerForTournament,
	getTournamentStatus,
	reportMatchResult,
} = require('../handlers/tournament');

function tournamentRoutes(fastify, options, done) {
	fastify.post('/tournament/register', { preHandler: [fastify.authenticate] }, registerForTournament);
	fastify.get('/tournament/status', { preHandler: [fastify.authenticate] }, getTournamentStatus);
	fastify.post('/tournament/report', { preHandler: [fastify.authenticate] }, reportMatchResult);
	done();
}

module.exports = tournamentRoutes;
