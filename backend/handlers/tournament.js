// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   tournament.js                                      :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/07 01:43:02 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/07 01:49:00 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const db = require('../db');

async function registerForTournament(request, reply) {
	const { id: userId } = request.user;
	try {
		// Check if the user is already registered in an open tournament
		const existing = await new Promise((resolve, reject) => {
			db.get(
				'SELECT * FROM tournament_registrations WHERE tournament_id = ? AND user_id = ?',
				[currentTournamentId, userId],
				(err, row) => err ? reject(err) : resolve(row)
			);
		});

		if (existing) {
			return reply.status(400).send({ error: 'Already registered for the tournament' });
		}

		// Register the user
		await new Promise((resolve, reject) => {
			db.run(
				'INSERT INTO tournament_registrations (tournament_id, user_id, registration_time) VALUES (?, ?, ?)',
				[currentTournamentId, userId, new Date().toISOString()],
				function (err) {
					if (err) return reject(err);
					resolve(this.lastID);
				}
			);
		});

		// Check if enough players are registered to generate a bracket.
		// A cool bracket generator here.

		return reply.send({ message: 'Successfully registered for the tournament' });
	} catch (err) {
		request.log.error(`Tournament registration error: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
}

async function getTournamentStatus(request, reply) {
	// Query tournament details, registered players, and current bracket
	// Return the data for the client
}

async function reportMatchResult(request, reply) {
	// Update match results, advance winner to the next round, etc.
}

module.exports = {
	registerForTournament,
	getTournamentStatus,
	reportMatchResult,
};
