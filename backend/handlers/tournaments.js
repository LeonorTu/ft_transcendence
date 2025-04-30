/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   tournaments.js                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: mpellegr <mpellegr@student.hive.fi>        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/22 16:51:28 by jmakkone          #+#    #+#             */
/*   Updated: 2025/04/29 14:59:58 by mpellegr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const db = require('../db');
const { game_server } = require('./game_server');

//function isPowerOfTwo(n) {
//	return (n > 0) && ((n & (n - 1)) === 0);
//}


// Create a new tournament.
// 
// URL: POST /tournament/new
// Body: { name: string }
// Response: { tournament_id: number }
// 
// Front-end usage:
//  • User fills in a “Create Tournament” form (name).
//  • Client sends this request with the user’s JWT.
//  • On success, navigates to the tournament lobby or details page,
//    using the returned tournament_id for subsequent calls.

const createTournament = async (request, reply) => {
	const { name } = request.body;
	const ownerId = request.user.id;
	try {
		const tournamentId = await new Promise((resolve, reject) => {
			db.run(
				'INSERT INTO tournaments (name, owner_id) VALUES (?, ?)',
				[name, ownerId],
				function (err) {
					if (err) return reject(err);
					resolve(this.lastID);
				}
			);
		});
		await new Promise((resolve, reject) => {
			db.run(
				'INSERT INTO tournament_players (tournament_id, user_id) VALUES (?, ?)',
				[tournamentId, ownerId],
				function (err) {
					if (err) return reject(err);
					resolve();
				}
			);
		});
		return reply.status(200).send({ tournament_id: tournamentId });
	} catch (err) {
		request.log.error(`Error creating tournament: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
};


// Join an existing, pending tournament.
// 
// URL: POST /tournament/:id/join
// Response: { message: 'Joined tournament' }
// 
// Front-end usage:
//  • After listing or viewing a pending tournament, user clicks “Join.”
//  • Client sends this request with the user’s JWT.
//  • On 200, update UI to show the user is in the participant list.
//  • On 409, disable the “Join” button (already joined).

const joinTournament = async (request, reply) => {
	const tournamentId = Number(request.params.id);
	const userId = request.user.id;
	try {
		const tour = await new Promise((resolve, reject) => {
			db.get('SELECT status FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
				if (err) return reject(err);
				resolve(row);
			});
		});
		if (!tour) {
			return reply.status(404).send({ error: 'Tournament not found' });
		}
		if (tour.status !== 'pending') {
			return reply.status(400).send({ error: 'Cannot join a tournament that has already started' });
		}

		const players = await new Promise((resolve, reject) => {
			db.all('SELECT id, user_id FROM tournament_players WHERE tournament_id = ?', [tournamentId], (err, rows) => {
				if (err) return reject(err);
				resolve(rows);
			});
		});

		if (players.length >= 4) {
			return reply.status(400).send({ error: 'Cannot join tournament is already full' });
		}

		await new Promise((resolve, reject) => {
			db.run(
				'INSERT INTO tournament_players (tournament_id, user_id) VALUES (?, ?)',
				[tournamentId, userId],
				function (err) {
					if (err) return reject(err);
					resolve();
				}
			);
		});
		return reply.send({ message: 'Joined tournament' });
	} catch (err) {
		request.log.error(`Error joining tournament: ${err.message}`);
		if (err.message.includes('UNIQUE constraint failed')) {
			return reply.status(409).send({ error: 'Already joined' });
		}
		return reply.status(500).send({ error: 'Internal server error' });
	}
};


// Start the tournament: build the full bracket and schedule round-1 matches.
// 
// URL: POST /tournament/:id/start
// Response: { message: 'Tournament started' }
// 
// Front-end usage:
//  • Only the tournament owner can press “Start Tournament.”
//  • Client sends this request with the owner’s JWT.
//  • On success, the UI polls GET /tournament/:id/bracket to render the bracket,
//    showing scheduled games for round 1.

const startTournament = async (request, reply) => {
	const tournamentId = Number(request.params.id);
	const userId = request.user.id;
	try {
		// Verify owner and status
		const tour = await new Promise((resolve, reject) => {
			db.get('SELECT owner_id, status FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
				if (err) return reject(err);
				resolve(row);
			});
		});
		if (!tour) {
			return reply.status(404).send({ error: 'Tournament not found' });
		}
		if (tour.owner_id !== userId) {
			return reply.status(403).send({ error: 'Only the owner can start the tournament' });
		}
		if (tour.status !== 'pending') {
			return reply.status(400).send({ error: 'Tournament already started or completed' });
		}

		const players = await new Promise((resolve, reject) => {
			db.all('SELECT id, user_id FROM tournament_players WHERE tournament_id = ?', [tournamentId], (err, rows) => {
				if (err) return reject(err);
				resolve(rows);
			});
		});

		if (players.length < 4) {
			return reply.status(400).send({ error: 'At least 4 players required to start' });
		}

		//if (!isPowerOfTwo(players.length)) {
		//	return reply.status(400).send({ error: 'Player count must be a power of two (4, 8, 16)' });
		//}
		// Shuffle players
		const shuffled = players.slice().sort(() => Math.random() - 0.5);
		// Pair and create matches for round 1
		for (let i = 0; i + 1 < shuffled.length; i += 2) {
			const p1 = shuffled[i];
			const p2 = shuffled[i + 1];
			const matchId = await new Promise((resolve, reject) => {
				db.run(
					'INSERT INTO matches (player1_id, player2_id) VALUES (?, ?)',
					[p1.user_id, p2.user_id],
					function (err) {
						if (err) return reject(err);
						resolve(this.lastID);
					}
				);
			});
			await new Promise((resolve, reject) => {
				db.run(
					'INSERT INTO tournament_matches (tournament_id, player1_slot, player2_slot, round, match_id, status) VALUES (?, ?, ?, ?, ?, ?)',
					[tournamentId, p1.id, p2.id, 1, matchId, 'scheduled'],
					function (err) {
						if (err) return reject(err);
						resolve();
					}
				);
			});
			game_server.createGame(matchId, p1.user_id, p2.user_id)
		}
		// Initialize next round placeholders
		const rounds = Math.log2(shuffled.length);
		let prevRoundCount = shuffled.length / 2;
		for (let r = 2; r <= rounds; r++) {
			for (let i = 0; i < prevRoundCount / 2; i++) {
				await new Promise((resolve, reject) => {
					db.run(
						'INSERT INTO tournament_matches (tournament_id, round, status) VALUES (?, ?, ?)',
						[tournamentId, r, 'not_scheduled'],
						function (err) {
							if (err) return reject(err);
							resolve(this.lastID);
						}
					);
				});
			}
			prevRoundCount /= 2;
		}
		// Link next_match_slot pointers
		// Fetch all matches by round
		const allMatches = await new Promise((resolve, reject) => {
			db.all('SELECT id, round FROM tournament_matches WHERE tournament_id = ? ORDER BY round, id', [tournamentId], (err, rows) => {
				if (err) return reject(err);
				resolve(rows);
			});
		});
		const matchesByRound = allMatches.reduce((acc, m) => {
			acc[m.round] = acc[m.round] || [];
			acc[m.round].push(m.id);
			return acc;
		}, {});
		for (let r = 1; r < rounds; r++) {
			const current = matchesByRound[r];
			const next = matchesByRound[r + 1];
			for (let i = 0; i < next.length; i++) {
				const [m1, m2] = current.slice(i * 2, i * 2 + 2);
				for (let mid of [m1, m2]) {
					await new Promise((resolve, reject) => {
						db.run(
							'UPDATE tournament_matches SET next_match_slot = ? WHERE id = ?',
							[next[i], mid],
							function (err) {
								if (err) return reject(err);
								resolve();
							}
						);
					});
				}
			}
		}
		// Update tournament status
		await new Promise((resolve, reject) => {
			db.run(
				"UPDATE tournaments SET status = 'active', started_at = CURRENT_TIMESTAMP WHERE id = ?",
				[tournamentId],
				function (err) {
					if (err) return reject(err);
					resolve();
				}
			);
		});
		return reply.send({ message: 'Tournament started' });
	} catch (err) {
		request.log.error(`Error starting tournament: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
};

// List all tournaments.
// 
// URL: GET /tournament/list
// Response: [ { id, name, owner_id, status, created_at, … } ]
// 
// Front-end usage:
//  • On the tournament overview page, fetch this list.
//  • Render “Join” buttons for pending ones; “View bracket” for active/completed.

const listTournaments = async (request, reply) => {
	try {
		const tours = await new Promise((resolve, reject) => {
			db.all('SELECT id, name, owner_id, status, created_at, started_at, finished_at, winner_id FROM tournaments', [], (err, rows) => {
				if (err) return reject(err);
				resolve(rows);
			});
		});
		return reply.send(tours);
	} catch (err) {
		request.log.error(`Error listing tournaments: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
};

const infoTournament = async (request, reply) => {
	const tournamentId = Number(request.params.id);
	try {
		const users = await new Promise((resolve, reject) => {
			db.all('SELECT id, tournament_id, user_id, seed FROM tournament_players WHERE tournament_id = ?', [tournamentId], (err, rows) => {
				if (err) return reject(err);
				resolve(rows);
			});
		});
		if (!users) {
			request.log.info('no users in tournament')
			return reply.status(400).send({ error: "no user found in tournament"})
		}
		return reply.send(users);
	} catch (err) {
		request.log.error(`Error listing tournaments: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
};

// Fetch the full bracket for a tournament.
// 
// URL: GET /tournament/:id/bracket
// Response: {
//   tournament: { id,name,status,winner_id },
//   matches: [ { tm_id, game_id, round, tm_status, player1_id, player2_id, … } ]
// }
// 
// Front-end usage:
//  • After starting (or for any active/completed), fetch this once.
//  • Draw a bracket UI grouped by `round`.
//  • For any `scheduled` match, show a “Play game” button that opens
//    /game.html?game_id={game_id}&token={JWT}.

const getBracket = async (request, reply) => {
	const tournamentId = Number(request.params.id);
	try {
		const tour = await new Promise((resolve, reject) => {
			db.get('SELECT id, name, status, winner_id FROM tournaments WHERE id = ?', [tournamentId], (err, row) => {
				if (err) return reject(err);
				resolve(row);
			});
		});
		if (!tour) {
			return reply.status(404).send({ error: 'Tournament not found' });
		}
		const matches = await new Promise((resolve, reject) => {
			db.all(
				`SELECT tm.id AS tm_id, tm.match_id AS game_id, tm.round,
				tm.status AS tm_status, p1.user_id AS player1_id,
				p2.user_id AS player2_id, m.player1_score, m.player2_score, m.winner_id
		 FROM tournament_matches tm
		 LEFT JOIN matches m ON tm.match_id = m.id
		 LEFT JOIN tournament_players p1 ON tm.player1_slot = p1.id
		 LEFT JOIN tournament_players p2 ON tm.player2_slot = p2.id
		 WHERE tm.tournament_id = ?
		 ORDER BY tm.round, tm.id`,
				[tournamentId],
				(err, rows) => {
					if (err) return reject(err);
					resolve(rows);
				}
			);
		});
		return reply.send({ tournament: tour, matches });
	} catch (err) {
		request.log.error(`Error fetching bracket: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
};


// Report the result of one tournament match, and advance the bracket.
// 
// URL: POST /tournament/:id/match/:tm_id/result
// Body: { winner_slot: 1 | 2 }
// Response: { message: 'Result recorded' }
// 
// Front-end usage:
//  • After a real-time game finishes, front-end POSTs this with the slot
//    number that won.
//  • On success, client should re-fetch /tournament/:id/bracket to get
//    updated `scheduled` or `finished` statuses.

const reportMatchResult = async (request, reply) => {
	const tournamentId = Number(request.params.id);
	const tmId = Number(request.params.tm_id);
	const { winner_slot } = request.body; // 1 or 2
	try {
		// Mark this tournament match as finished
		await new Promise((resolve, reject) => {
			db.run(
				'UPDATE tournament_matches SET status = ?, winner_slot = ? WHERE id = ? AND tournament_id = ?',
				['finished', winner_slot, tmId, tournamentId],
				function (err) {
					if (err) return reject(err);
					resolve();
				}
			);
		});
		// Fetch details of this match
		const tm = await new Promise((resolve, reject) => {
			db.get(
				'SELECT player1_slot, player2_slot, next_match_slot FROM tournament_matches WHERE id = ?',
				[tmId],
				(err, row) => (err ? reject(err) : resolve(row))
			);
		});
		const winnerPlayerSlot = winner_slot === 1 ? tm.player1_slot : tm.player2_slot;
		if (tm.next_match_slot) {
			// Advance to next slot
			const nextId = tm.next_match_slot;
			// Determine available side
			const nextTm = await new Promise((resolve, reject) => {
				db.get(
					'SELECT player1_slot, player2_slot FROM tournament_matches WHERE id = ?',
					[nextId],
					(err, row) => (err ? reject(err) : resolve(row))
				);
			});
			const slotField = nextTm.player1_slot ? 'player2_slot' : 'player1_slot';
			// Update slot
			await new Promise((resolve, reject) => {
				db.run(
					`UPDATE tournament_matches SET ${slotField} = ? WHERE id = ?`,
					[winnerPlayerSlot, nextId],
					function (err) {
						if (err) return reject(err);
						resolve();
					}
				);
			});
			// Check if both slots filled -> schedule match
			const updatedNextTm = await new Promise((resolve, reject) => {
				db.get(
					'SELECT player1_slot, player2_slot FROM tournament_matches WHERE id = ?',
					[nextId],
					(err, row) => (err ? reject(err) : resolve(row))
				);
			});
			if (updatedNextTm.player1_slot && updatedNextTm.player2_slot) {
				// Fetch actual user IDs
				const p1 = await new Promise((resolve, reject) => {
					db.get('SELECT user_id FROM tournament_players WHERE id = ?', [updatedNextTm.player1_slot], (err, row) => (err ? reject(err) : resolve(row.user_id)));
				});
				const p2 = await new Promise((resolve, reject) => {
					db.get('SELECT user_id FROM tournament_players WHERE id = ?', [updatedNextTm.player2_slot], (err, row) => (err ? reject(err) : resolve(row.user_id)));
				});
				const newMatchId = await new Promise((resolve, reject) => {
					db.run(
						'INSERT INTO matches (player1_id, player2_id) VALUES (?, ?)',
						[p1, p2],
						function (err) {
							if (err) return reject(err);
							resolve(this.lastID);
						}
					);
				});
				await new Promise((resolve, reject) => {
					db.run(
						'UPDATE tournament_matches SET match_id = ?, status = ? WHERE id = ?',
						[newMatchId, 'scheduled', nextId],
						function (err) {
							if (err) return reject(err);
							resolve();
						}
					);
				});
				game_server.createGame(newMatchId, p1, p2);
			}
		} else {
			// Final match -> complete tournament
			// Get user ID of winner
			const winnerUserId = await new Promise((resolve, reject) => {
				db.get(
					'SELECT user_id FROM tournament_players WHERE id = ?',
					[winnerPlayerSlot],
					(err, row) => (err ? reject(err) : resolve(row.user_id))
				);
			});
			await new Promise((resolve, reject) => {
				db.run(
					"UPDATE tournaments SET status = 'completed', finished_at = CURRENT_TIMESTAMP, winner_id = ? WHERE id = ?",
					[winnerUserId, tournamentId],
					function (err) {
						if (err) return reject(err);
						resolve();
					}
				);
			});
		}
		return reply.send({ message: 'Result recorded' });
	} catch (err) {
		request.log.error(`Error reporting match result: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
};

module.exports = {
	createTournament,
	joinTournament,
	startTournament,
	listTournaments,
	getBracket,
	reportMatchResult,
	infoTournament,
};
