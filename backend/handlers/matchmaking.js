// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   matchmaking.js                                     :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/23 14:45:31 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/24 18:57:03 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const db = require('../db');
const { game_server } = require('./game_server');

const createMatchmaking = async (request, reply) => {
  const creatorId = request.user.id;
  try {
    // Create the pending match
    const pendingId = await new Promise((res, rej) =>
      db.run(
        'INSERT INTO pending_matches (creator_id) VALUES (?)',
        [creatorId],
        function (err) { err ? rej(err) : res(this.lastID) }
      )
    );

    // Join the creator so player_count starts at 1
    await new Promise((res, rej) =>
      db.run(
        'INSERT INTO pending_match_players (pending_id, user_id) VALUES (?, ?)',
        [pendingId, creatorId],
        err => err ? rej(err) : res()
      )
    );

    return reply.status(200).send({ pending_id: pendingId });
  } catch (err) {
    request.log.error(`Error creating pending match: ${err.message}`);
    return reply.status(500).send({ error: 'Internal server error' });
  }
};

// List all open pending matches
const listMatchmaking = async (request, reply) => {
  try {
    const rows = await new Promise((res, rej) =>
      db.all(
        `SELECT
           pm.id,
           pm.creator_id,
           COUNT(pmp.user_id) AS player_count
         FROM pending_matches pm
         LEFT JOIN pending_match_players pmp
           ON pmp.pending_id = pm.id
        WHERE pm.status = 'open'
        GROUP BY pm.id
        ORDER BY pm.created_at DESC`,
        [],
        (err, rows) => err ? rej(err) : res(rows)
      )
    );
    return reply.send(rows);
  } catch (err) {
    request.log.error(`Error listing pending matches: ${err.message}`);
    return reply.status(500).send({ error: 'Internal server error' });
  }
};

// Join an open pending match, create game and return gameid when 2 players
const joinMatchmaking = async (request, reply) => {
  const pendingId = Number(request.params.id);
  const userId    = request.user.id;

  try {
    const pm = await new Promise((res, rej) =>
      db.get(
        'SELECT status FROM pending_matches WHERE id = ?',
        [pendingId],
        (e, row) => e ? rej(e) : res(row)
      )
    );
    if (!pm) {
      return reply.status(404).send({ error: 'Match not found' });
    }
    if (pm.status !== 'open') {
      return reply.status(400).send({ error: 'Match is not open' });
    }

    // Add user to matchlobby
    await new Promise((res, rej) =>
      db.run(
        'INSERT INTO pending_match_players (pending_id, user_id) VALUES (?, ?)',
        [pendingId, userId],
        err => err ? rej(err) : res()
      )
    );

    // Count how many have joined
    const { count } = await new Promise((res, rej) =>
      db.get(
        'SELECT COUNT(*) AS count FROM pending_match_players WHERE pending_id = ?',
        [pendingId],
        (e, row) => e ? rej(e) : res(row)
      )
    );

    // If exactly 2 players, promote to a real match
    if (count === 2) {
      const players = await new Promise((res, rej) =>
        db.all(
          'SELECT user_id FROM pending_match_players WHERE pending_id = ?',
          [pendingId],
          (e, rows) => e ? rej(e) : res(rows.map(r => r.user_id)))
      );
      const [p1, p2] = players;

      const matchId = await new Promise((res, rej) =>
        db.run(
          'INSERT INTO matches (player1_id, player2_id) VALUES (?, ?)',
          [p1, p2],
          function(err) { err ? rej(err) : res(this.lastID) }
        )
      );

      // Mark pending as full + attach matchid
      await new Promise((res, rej) =>
        db.run(
          'UPDATE pending_matches SET status = ?, match_id = ? WHERE id = ?',
          ['full', matchId, pendingId],
          err => err ? rej(err) : res()
        )
      );

      game_server.createGame(matchId, p1, p2);
      return reply.send({
        message:  'Match ready',
        match_id: matchId
      });
    }

    return reply.send({ message: 'Joined pending match' });
  } catch (err) {
    request.log.error(`Error joining pending match: ${err.message}`);
    if (err.message.includes('UNIQUE constraint failed')) {
      return reply.status(409).send({ error: 'Already joined' });
    }
    return reply.status(500).send({ error: 'Internal server error' });
  }
};

module.exports = {
  createMatchmaking,
  listMatchmaking,
  joinMatchmaking
};
