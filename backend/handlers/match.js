// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   match.js                                           :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/07 15:07:05 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/07 15:07:58 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const db = require('../db');

const createMatch = async (request, reply) => {
	const { tournament_id, round, player1_id, player2_id, result, winner_id, loser_id } = request.body;
	try {
		const userId = await new Promise((resolve, reject) => {
			db.run(
				`INSERT INTO matches (
		  tournament_id, round, player1_id, player2_id, result, winner_id, loser_id
		) VALUES (?,?,?,?,?,?,?)`,
				[tournament_id || null, round, player1_id, player2_id, result || null, winner_id || null, loser_id || null],
				function (err) {
					if (err) return reject(err);
					resolve(this.lastID);
				}
			);
		});
		reply.send({
			id: userId,
			tournament_id: tournament_id || null,
			round,
			player1_id,
			player2_id,
			result,
			winner_id,
			loser_id,
		});
	} catch (err) {
		request.log.error(`Error creating match: ${err.message}`);
		reply.status(500).send({ error: 'Internal server error' });
	}
};

const getMatch = async (request, reply) => {
	const { id } = request.params;
	try {
		const match = await new Promise((resolve, reject) => {
			db.get('SELECT * FROM matches WHERE id = ?', [id], (err, row) => {
				if (err) return reject(err);
				resolve(row);
			});
		});
		if (!match) {
			return reply.status(404).send({ error: 'Match not found' });
		}
		// Optionally transform result field (if stored as CSV) into an array.
		if (match.result) {
			match.result = match.result.split(',').map(Number);
		}
		reply.send(match);
	} catch (err) {
		request.log.error(`Error retrieving match: ${err.message}`);
		reply.status(500).send({ error: 'Internal server error' });
	}
};

const updateMatch = async (request, reply) => {
	const { id } = request.params;
	const { tournament_id, round, player1_id, player2_id, result, winner_id, loser_id } = request.body;
	try {
		await new Promise((resolve, reject) => {
			db.run(
				`UPDATE matches
		 SET tournament_id = ?, round = ?, player1_id = ?, player2_id = ?, result = ?, winner_id = ?, loser_id = ?
		 WHERE id = ?`,
				[tournament_id || null, round, player1_id, player2_id, result || null, winner_id || null, loser_id || null, id],
				function (err) {
					if (err) return reject(err);
					if (this.changes === 0) return reject(new Error('Match not found'));
					resolve();
				}
			);
		});
		const updatedMatch = await new Promise((resolve, reject) => {
			db.get('SELECT * FROM matches WHERE id = ?', [id], (err, row) => {
				if (err) return reject(err);
				resolve(row);
			});
		});
		if (updatedMatch && updatedMatch.result) {
			updatedMatch.result = updatedMatch.result.split(',').map(Number);
		}
		reply.send(updatedMatch);
	} catch (err) {
		request.log.error(`Error updating match: ${err.message}`);
		reply.status(500).send({ error: 'Internal server error' });
	}
};

const registerForMatch = async (request, reply) => {
	const { match_id } = request.body;
	const { id: userId } = request.user;
	try {
		const match = await new Promise((resolve, reject) => {
			db.get('SELECT * FROM matches WHERE id = ?', [match_id], (err, row) => {
				if (err) return reject(err);
				resolve(row);
			});
		});
		if (!match) {
			return reply.status(404).send({ error: 'Match not found' });
		}
		if (!match.player1_id) {
			await new Promise((resolve, reject) => {
				db.run('UPDATE matches SET player1_id = ? WHERE id = ?', [userId, match_id], function (err) {
					if (err) return reject(err);
					resolve();
				});
			});
			return reply.send({ message: 'Registered as player1' });
		} else if (!match.player2_id) {
			await new Promise((resolve, reject) => {
				db.run('UPDATE matches SET player2_id = ? WHERE id = ?', [userId, match_id], function (err) {
					if (err) return reject(err);
					resolve();
				});
			});
			return reply.send({ message: 'Registered as player2' });
		} else {
			return reply.status(400).send({ error: 'Match already has two players' });
		}
	} catch (err) {
		request.log.error(`Error registering for match: ${err.message}`);
		reply.status(500).send({ error: 'Internal server error' });
	}
};

module.exports = {
	createMatch,
	getMatch,
	updateMatch,
	registerForMatch,
};
