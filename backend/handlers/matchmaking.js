// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   matchmaking.js                                     :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/23 14:45:31 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/30 15:36:28 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const db = require('../db');
const { game_server } = require('./game_server');


// Atomically find-or-create a matchmaking lobby:
// 
// 1. Look for an open lobby with exactly one other player (not you).
//    • If found: join it, promote to a real match, spin up the GameServer,
//      and return { match_id }.
// 2. Otherwise: create a new lobby, auto-join you, and return { pending_id }.
// 
// Route: POST /matchmaking/matchmaking
// Auth:   required (JWT)
// 
// Front-end usage:
//   const res = await fetch('/matchmaking/matchmaking', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
//   const body = await res.json();
//   if (body.match_id) {
//     // go play
//     window.location = `/game.html?game_id=${body.match_id}&token=${token}`;
//   } else {
//     // waiting for opponent in lobby body.pending_id
//     showWaitingScreen(body.pending_id);
//   }


const matchmaking = async (request, reply) => {
  const userId = request.user.id;

  try {
    // Try to find a lobby with exactly 1 other player
    const row = await new Promise((res, rej) => {
      db.get(
        `
          SELECT pm.id AS pending_id
            FROM pending_matches pm
            JOIN pending_match_players pmp
              ON pmp.pending_id = pm.id
           WHERE pm.status = 'open'
             AND pmp.user_id != ?
           GROUP BY pm.id
           HAVING COUNT(*) = 1
           ORDER BY pm.created_at ASC
           LIMIT 1
        `,
        [userId],
        (err, row) => err ? rej(err) : res(row)
      );
    });

    if (row) {
      // Join that lobby
      const pendingId = row.pending_id;
      await new Promise((res, rej) =>
        db.run(
          'INSERT INTO pending_match_players (pending_id, user_id) VALUES (?, ?)',
          [pendingId, userId],
          err => err ? rej(err) : res()
        )
      );

      // Fetch both players
      const players = await new Promise((res, rej) =>
        db.all(
          'SELECT user_id FROM pending_match_players WHERE pending_id = ?',
          [pendingId],
          (e, rows) => e ? rej(e) : res(rows.map(r => r.user_id)))
      );
      const [p1, p2] = players;

      // Create the real match row
      const matchId = await new Promise((res, rej) =>
        db.run(
          'INSERT INTO matches (player1_id, player2_id) VALUES (?, ?)',
          [p1, p2],
          function(err) { err ? rej(err) : res(this.lastID) }
        )
      );

      // Mark the lobby full & attach match_id
      await new Promise((res, rej) =>
        db.run(
          'UPDATE pending_matches SET status = ?, match_id = ? WHERE id = ?',
          ['full', matchId, pendingId],
          err => err ? rej(err) : res()
        )
      );

      // Spin up the in-memory game
      game_server.createGame(matchId, p1, p2);

      // Tell the client to go play
      return reply.send({ match_id: matchId });
    }

    // No suitable lobby found → create one and auto-join
    const pendingId = await new Promise((res, rej) =>
      db.run(
        'INSERT INTO pending_matches (creator_id) VALUES (?)',
        [userId],
        function(err) { err ? rej(err) : res(this.lastID) }
      )
    );

    // auto-join the creator
    await new Promise((res, rej) =>
      db.run(
        'INSERT INTO pending_match_players (pending_id, user_id) VALUES (?, ?)',
        [pendingId, userId],
        err => err ? rej(err) : res()
      )
    );

    return reply.send({ pending_id: pendingId });
  } catch (err) {
    request.log.error(`Error in autoMatchmaking: ${err.message}`);
    if (err.message.includes('UNIQUE constraint failed')) {
      return reply.status(409).send({ error: 'Already joined this lobby' });
    }
    return reply.status(500).send({ error: 'Internal server error' });
  }
}

module.exports = { matchmaking };
