import { FastifyRequest, FastifyReply } from 'fastify';
import { Database } from 'sqlite3';
import { Mutex } from 'async-mutex';
import { AuthenticatedRequest } from '../types';
import db from '../db';
import { game_server } from './game_server';

const txMutex = new Mutex();

// Request body interfaces
interface TournamentBody {
  game_type: 'local' | 'online';
  player_id?: number;
  player_index?: number;
  tournament_id?: number;
}

interface ReportMatchResultBody {
  winner_slot: 1 | 2;
  game_type: 'local' | 'online';
}

// Request params interfaces
interface TournamentIdParams {
  id: string;
}

interface TournamentMatchParams {
  id: string;
  tm_id: string;
}

// Database row interfaces
interface TournamentStatusRow {
  status: 'pending' | 'active' | 'interrupted' | 'completed';
}

interface TournamentPlayerRow {
  id: number;
  user_id: number;
}

interface TournamentMatchRow {
  id: number;
  round: number;
}

interface ExistingTournamentRow {
  id: number;
  status: 'pending' | 'active' | 'interrupted' | 'completed';
}

interface TournamentCountRow {
  id: number;
  cnt: number;
}

interface PlayerCountRow {
  count: number;
}

interface UserRow {
  id: number;
  username: string;
}

interface BracketMatchRow {
  tm_id: number;
  game_id: number | null;
  tm_status: string;
  player1_id: number | null;
  player1_username: string | null;
  player2_id: number | null;
  player2_username: string | null;
}

interface FullBracketMatchRow extends BracketMatchRow {
  round: number;
  player1_score: number | null;
  player2_score: number | null;
  winner_id: number | null;
}

interface TournamentRow {
  id: number;
  name: string;
  owner_id: number;
  status: 'pending' | 'active' | 'interrupted' | 'completed';
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  winner_id: number | null;
}

interface TournamentPlayerInfoRow {
  id: number;
  tournament_id: number;
  user_id: number;
  seed: number | null;
}

interface TournamentMatchDetailsRow {
  player1_slot: number;
  player2_slot: number;
  next_match_slot: number | null;
}

interface MatchRow {
  id: number;
  status: string;
  player1_id: number;
  player2_id: number;
}

interface UserIdRow {
  user_id: number;
}

interface ThisContext {
  lastID: number;
  changes: number;
}

const startTournament = async (tournamentId: number, gameType: 'local' | 'online'): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    db.serialize(async () => {
      db.run('BEGIN TRANSACTION');

      try {
        const tourStatus = await new Promise<TournamentStatusRow['status']>((res, rej) => {
          db.get(
            'SELECT status FROM tournaments WHERE id = ?',
            [tournamentId],
            (err: Error | null, row: TournamentStatusRow) => (err ? rej(err) : res(row.status))
          );
        });

        if (tourStatus !== 'pending') {
          db.run('ROLLBACK');
          return resolve();
        }

        const players = await new Promise<TournamentPlayerRow[]>((res, rej) => {
          db.all(
            'SELECT id, user_id FROM tournament_players WHERE tournament_id = ?',
            [tournamentId],
            (err: Error | null, rows: TournamentPlayerRow[]) => (err ? rej(err) : res(rows))
          );
        });

        const shuffled = players.slice().sort(() => Math.random() - 0.5);
        for (let i = 0; i < shuffled.length; i += 2) {
          const p1 = shuffled[i], p2 = shuffled[i + 1];
          const matchId = await new Promise<number>((res, rej) => {
            db.run(
              'INSERT INTO matches (player1_id, player2_id) VALUES (?, ?)',
              [p1.user_id, p2.user_id],
              function(this: ThisContext, err: Error | null) {
                err ? rej(err) : res(this.lastID);
              }
            );
          });

          await new Promise<void>((res, rej) => {
            db.run(
              `INSERT INTO tournament_matches
                (tournament_id, player1_slot, player2_slot, round, match_id, status)
                VALUES (?, ?, ?, 1, ?, 'scheduled')`,
              [tournamentId, p1.id, p2.id, matchId],
              (err: Error | null) => err ? rej(err) : res()
            );
          });
          if (gameType === 'local') {
            game_server.createSingleplayerGame(matchId, p1.user_id, p2.user_id);
          } else {
            game_server.createMultiplayerGame(matchId, p1.user_id, p2.user_id);
          }
        }

        const rounds = Math.log2(shuffled.length);
        let prevCount = shuffled.length / 2;
        for (let r = 2; r <= rounds; r++) {
          for (let i = 0; i < prevCount / 2; i++) {
            await new Promise<void>((res, rej) => {
              db.run(
                `INSERT INTO tournament_matches (tournament_id, round, status)
                 VALUES (?, ?, 'not_scheduled')`,
                [tournamentId, r],
                (err: Error | null) => err ? rej(err) : res()
              );
            });
          }
          prevCount /= 2;
        }

        const all = await new Promise<TournamentMatchRow[]>((res, rej) => {
          db.all(
            'SELECT id, round FROM tournament_matches WHERE tournament_id = ? ORDER BY round, id',
            [tournamentId],
            (err: Error | null, rows: TournamentMatchRow[]) => (err ? rej(err) : res(rows))
          );
        });

        const byRound = all.reduce<Record<number, number[]>>((acc, m) => {
          (acc[m.round] ||= []).push(m.id);
          return acc;
        }, {});

        for (let r = 1; r < rounds; r++) {
          const curr = byRound[r], next = byRound[r + 1];
          for (let i = 0; i < next.length; i++) {
            const [m1, m2] = curr.slice(i * 2, i * 2 + 2);
            for (const mid of [m1, m2]) {
              await new Promise<void>((res, rej) => {
                db.run(
                  'UPDATE tournament_matches SET next_match_slot = ? WHERE id = ?',
                  [next[i], mid],
                  (err: Error | null) => err ? rej(err) : res()
                );
              });
            }
          }
        }

        await new Promise<void>((res, rej) => {
          db.run(
            `UPDATE tournaments SET status = 'active', started_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [tournamentId],
            (err: Error | null) => err ? rej(err) : res()
          );
        });

        db.run('COMMIT');
        resolve();

      } catch (err) {
        db.run('ROLLBACK');
        reject(err);
      }
    });
  });
};

// Combine the logic of creating, joining and starting the tournament under one endpoint
export const tournament = async (
  request: FastifyRequest<{ Body: TournamentBody }> & AuthenticatedRequest,
  reply: FastifyReply
): Promise<void> => {
  return txMutex.runExclusive(async () => {
    const gameType = request.body.game_type;
    const userId = gameType === 'local' ? request.body.player_id! : request.user.id;
    const playerIndex = request.body.player_index;
    const tournamentPendingId = request.body.tournament_id;

    try {
      // Check does the user already belong to a pending/active tournament
      const existing = await new Promise<ExistingTournamentRow | undefined>((res, rej) => {
        db.get(
          `SELECT t.id, t.status
            FROM tournaments t
            JOIN tournament_players tp
              ON tp.tournament_id = t.id
            WHERE tp.user_id = ?
              AND t.status IN ('pending','active')
              AND t.game_type = ?
            ORDER BY t.created_at DESC
            LIMIT 1`,
          [userId, gameType],
          (err: Error | null, row: ExistingTournamentRow) => (err ? rej(err) : res(row))
        );
      });

      let tournamentId: number;
      let tourStatus: 'pending' | 'active' | 'interrupted' | 'completed';

      if (existing) {
        // reuse whatever tournament we're already in (pending or active)
        tournamentId = existing.id;
        tourStatus = existing.status;
      } else {
        // Otherwise, find any other pending tournament with < 4 players
        let row: TournamentCountRow | undefined;
        if (gameType === 'local' && playerIndex === 1) {
          row = undefined;
        } else {
          row = await new Promise<TournamentCountRow | undefined>((res, rej) => {
            db.get(
              `SELECT t.id, COUNT(tp.user_id) AS cnt
                FROM tournaments t
                LEFT JOIN tournament_players tp
                  ON tp.tournament_id = t.id
                WHERE t.status = 'pending'
                  AND t.game_type = ?
                GROUP BY t.id
                HAVING cnt < 4
                ORDER BY t.created_at
                LIMIT 1`,
              [gameType],
              (err: Error | null, r: TournamentCountRow) => (err ? rej(err) : res(r))
            );
          });
        }

        if (row) {
          tournamentId = row.id;
          if (gameType === 'local' && playerIndex !== 1 && tournamentPendingId !== -1) {
            tournamentId = tournamentPendingId!;
          }
          tourStatus = 'pending';
        } else {
          // If no lobby to join, create a fresh one
          tournamentId = await new Promise<number>((res, rej) => {
            db.run(
              `INSERT INTO tournaments (name, owner_id, game_type) VALUES (?, ?, ?)`,
              ['Quick Tournament', userId, gameType],
              function(this: ThisContext, err: Error | null) {
                err ? rej(err) : res(this.lastID);
              }
            );
          });
          tourStatus = 'pending';
        }
      }

      // Auto-join the lobby if it's still pending
      if (tourStatus === 'pending') {
        const already = await new Promise<boolean>((res, rej) => {
          db.get(
            `SELECT 1
              FROM tournament_players
              WHERE tournament_id = ? AND user_id = ?`,
            [tournamentId, userId],
            (err: Error | null, r: any) => (err ? rej(err) : res(!!r))
          );
        });
        if (!already) {
          await new Promise<void>((res, rej) => {
            db.run(
              `INSERT OR IGNORE INTO tournament_players (tournament_id, user_id) VALUES (?, ?)`,
              [tournamentId, userId],
              (err: Error | null) => (err ? rej(err) : res())
            );
          });
        }
      }

      // Count how many players are now in
      const { count } = await new Promise<PlayerCountRow>((res, rej) => {
        db.get(
          `SELECT COUNT(*) AS count
            FROM tournament_players
            WHERE tournament_id = ?`,
          [tournamentId],
          (err: Error | null, r: PlayerCountRow) => (err ? rej(err) : res(r))
        );
      });

      // If we just hit 4 *and* it was still pending, start it
      if (tourStatus === 'pending' && count >= 4) {
        try {
          await startTournament(tournamentId, gameType);
          tourStatus = 'active';
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : '';
          if (errorMessage.includes('SQLITE_CONSTRAINT')) {
            request.log.warn('Tournament already started by concurrent request');
            tourStatus = 'active'; // Already active
          } else throw err;
        }
      }

      // Fetch the current lobby players
      const players = await new Promise<UserRow[]>((res, rej) => {
        db.all(
          `SELECT u.id, u.username
            FROM tournament_players tp
            JOIN users u ON u.id = tp.user_id
            WHERE tp.tournament_id = ?`,
          [tournamentId],
          (err: Error | null, rows: UserRow[]) => (err ? rej(err) : res(rows))
        );
      });

      // If active, fetch just Round 1 bracket with usernames
      let bracket: BracketMatchRow[] | null = null;
      if (tourStatus !== 'pending') {
        bracket = await new Promise<BracketMatchRow[]>((res, rej) => {
          db.all(
            `
              SELECT
                tm.id           AS tm_id,
                tm.match_id     AS game_id,
                tm.status       AS tm_status,
                p1.user_id      AS player1_id,
                u1.username     AS player1_username,
                p2.user_id      AS player2_id,
                u2.username     AS player2_username
              FROM tournament_matches tm
              LEFT JOIN tournament_players p1
                ON p1.id = tm.player1_slot
              LEFT JOIN users u1
                ON u1.id = p1.user_id
              LEFT JOIN tournament_players p2
                ON p2.id = tm.player2_slot
              LEFT JOIN users u2
                ON u2.id = p2.user_id
              WHERE tm.tournament_id = ? AND tm.round = 1
              ORDER BY tm.id
            `,
            [tournamentId],
            (err: Error | null, rows: BracketMatchRow[]) => (err ? rej(err) : res(rows))
          );
        });
      }

      // Return everything our front-end needs
      return reply.send({
        tournament_id: tournamentId,
        player_count: count,
        players,
        bracket,
        started: tourStatus !== 'pending',
        user_id: userId
      });
    }
    catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      request.log.error(`autoTournament error: ${errorMessage}`);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
};

// List all tournaments.
//
// URL: GET /tournament/list
// Response: [ { id, name, owner_id, status, created_at, … } ]
//
// Front-end usage:
//  • On the tournament overview page, fetch this list.
//  • Render "Join" buttons for pending ones; "View bracket" for active/completed.

export const listTournaments = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    const tours = await new Promise<TournamentRow[]>((resolve, reject) => {
      db.all('SELECT id, name, owner_id, status, created_at, started_at, finished_at, winner_id FROM tournaments', [], (err: Error | null, rows: TournamentRow[]) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
    return reply.send(tours);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    request.log.error(`Error listing tournaments: ${errorMessage}`);
    return reply.status(500).send({ error: 'Internal server error' });
  }
};

export const infoTournament = async (
  request: FastifyRequest<{ Params: TournamentIdParams }>,
  reply: FastifyReply
): Promise<void> => {
  const tournamentId = Number(request.params.id);
  try {
    const users = await new Promise<TournamentPlayerInfoRow[]>((resolve, reject) => {
      db.all('SELECT id, tournament_id, user_id, seed FROM tournament_players WHERE tournament_id = ?', [tournamentId], (err: Error | null, rows: TournamentPlayerInfoRow[]) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });
    if (!users || users.length === 0) {
      request.log.info('no users in tournament');
      return reply.status(400).send({ error: "no user found in tournament" });
    }
    return reply.send(users);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    request.log.error(`Error listing tournaments: ${errorMessage}`);
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
//  • For any `scheduled` match, show a "Play game" button that opens
//    /game.html?game_id={game_id}&token={JWT}.

export const getBracket = async (
  request: FastifyRequest<{ Params: TournamentIdParams }>,
  reply: FastifyReply
): Promise<void> => {
  const tournamentId = Number(request.params.id);

  try {
    const tour = await new Promise<TournamentRow | undefined>((resolve, reject) => {
      db.get(
        'SELECT id, name, status, winner_id FROM tournaments WHERE id = ?',
        [tournamentId],
        (err: Error | null, row: TournamentRow) => (err ? reject(err) : resolve(row))
      );
    });
    if (!tour) {
      return reply.status(404).send({ error: 'Tournament not found' });
    }

    const matches = await new Promise<FullBracketMatchRow[]>((resolve, reject) => {
      db.all(
        `
          SELECT
            tm.id           AS tm_id,
            tm.match_id     AS game_id,
            tm.round,
            tm.status       AS tm_status,

            p1.user_id      AS player1_id,
            u1.username     AS player1_username,

            p2.user_id      AS player2_id,
            u2.username     AS player2_username,

            m.player1_score,
            m.player2_score,
            m.winner_id
          FROM tournament_matches tm
          LEFT JOIN matches             m  ON m.id  = tm.match_id
          LEFT JOIN tournament_players  p1 ON p1.id = tm.player1_slot
          LEFT JOIN users              u1 ON u1.id = p1.user_id
          LEFT JOIN tournament_players  p2 ON p2.id = tm.player2_slot
          LEFT JOIN users              u2 ON u2.id = p2.user_id
          WHERE tm.tournament_id = ?
          ORDER BY tm.round, tm.id
        `,
        [tournamentId],
        (err: Error | null, rows: FullBracketMatchRow[]) => (err ? reject(err) : resolve(rows))
      );
    });

    for (const matchRow of matches) {
      const realMatch = await new Promise<MatchRow | undefined>((resolve, reject) => {
        db.get(
          `SELECT * FROM matches WHERE id = ?`,
          [matchRow.game_id],
          (err: Error | null, rowFromMatches: MatchRow) => {
            if (err) return reject(err);
            resolve(rowFromMatches);
          }
        );
      });
      if (matchRow.tm_status !== 'finished' && realMatch && realMatch.status === 'interrupted') {
        await new Promise<void>((resolve, reject) => {
          db.run(
            `UPDATE tournaments SET status = ? WHERE id = ?`,
            ['interrupted', tournamentId],
            function(err: Error | null) {
              if (err) return reject(err);
              resolve();
            }
          );
        });
        tour.status = 'interrupted';
      }
    }

    return reply.send({ tournament: tour, matches });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    request.log.error(`Error fetching bracket: ${errorMessage}`);
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

export const reportMatchResult = async (
  request: FastifyRequest<{ Params: TournamentMatchParams; Body: ReportMatchResultBody }>,
  reply: FastifyReply
): Promise<void> => {
  const tournamentId = Number(request.params.id);
  const tmId = Number(request.params.tm_id);
  const { winner_slot } = request.body; // 1 or 2
  const gameType = request.body.game_type;
  try {
    // Mark this tournament match as finished
    const { changes } = await new Promise<{ changes: number }>((resolve, reject) => {
      db.run(
        `UPDATE tournament_matches
           SET status = ?, winner_slot = ?
            WHERE id = ? AND tournament_id = ? AND status != ?`,
        ['finished', winner_slot, tmId, tournamentId, 'finished'],
        function(this: ThisContext, err: Error | null) {
          if (err) return reject(err);
          // this.changes = # of rows updated
          resolve({ changes: this.changes });
        }
      );
    });
    if (changes === 0) {
      // someone else already reported—nothing to do
      return reply.send({ message: 'Result already recorded' });
    }
    // Fetch details of this match
    const tm = await new Promise<TournamentMatchDetailsRow>((resolve, reject) => {
      db.get(
        'SELECT player1_slot, player2_slot, next_match_slot FROM tournament_matches WHERE id = ?',
        [tmId],
        (err: Error | null, row: TournamentMatchDetailsRow) => (err ? reject(err) : resolve(row))
      );
    });
    const winnerPlayerSlot = winner_slot === 1 ? tm.player1_slot : tm.player2_slot;
    if (tm.next_match_slot) {
      // Advance to next slot
      const nextId = tm.next_match_slot;
      // Determine available side
      const nextTm = await new Promise<TournamentMatchDetailsRow>((resolve, reject) => {
        db.get(
          'SELECT player1_slot, player2_slot FROM tournament_matches WHERE id = ?',
          [nextId],
          (err: Error | null, row: TournamentMatchDetailsRow) => (err ? reject(err) : resolve(row))
        );
      });
      const slotField = nextTm.player1_slot ? 'player2_slot' : 'player1_slot';
      // Update slot
      await new Promise<void>((resolve, reject) => {
        db.run(
          `UPDATE tournament_matches SET ${slotField} = ? WHERE id = ?`,
          [winnerPlayerSlot, nextId],
          function(err: Error | null) {
            if (err) return reject(err);
            resolve();
          }
        );
      });
      // Check if both slots filled -> schedule match
      const updatedNextTm = await new Promise<TournamentMatchDetailsRow>((resolve, reject) => {
        db.get(
          'SELECT player1_slot, player2_slot FROM tournament_matches WHERE id = ?',
          [nextId],
          (err: Error | null, row: TournamentMatchDetailsRow) => (err ? reject(err) : resolve(row))
        );
      });
      if (updatedNextTm.player1_slot && updatedNextTm.player2_slot) {
        // Fetch actual user IDs
        const p1 = await new Promise<number>((resolve, reject) => {
          db.get('SELECT user_id FROM tournament_players WHERE id = ?', [updatedNextTm.player1_slot], (err: Error | null, row: UserIdRow) => (err ? reject(err) : resolve(row.user_id)));
        });
        const p2 = await new Promise<number>((resolve, reject) => {
          db.get('SELECT user_id FROM tournament_players WHERE id = ?', [updatedNextTm.player2_slot], (err: Error | null, row: UserIdRow) => (err ? reject(err) : resolve(row.user_id)));
        });
        const newMatchId = await new Promise<number>((resolve, reject) => {
          db.run(
            'INSERT INTO matches (player1_id, player2_id) VALUES (?, ?)',
            [p1, p2],
            function(this: ThisContext, err: Error | null) {
              if (err) return reject(err);
              resolve(this.lastID);
            }
          );
        });
        await new Promise<void>((resolve, reject) => {
          db.run(
            'UPDATE tournament_matches SET match_id = ?, status = ? WHERE id = ?',
            [newMatchId, 'scheduled', nextId],
            function(err: Error | null) {
              if (err) return reject(err);
              resolve();
            }
          );
        });
        if (gameType === 'local') {
          game_server.createSingleplayerGame(newMatchId, p1, p2);
        } else {
          game_server.createMultiplayerGame(newMatchId, p1, p2);
        }
      }
    } else {
      // Final match -> complete tournament
      // Get user ID of winner
      const winnerUserId = await new Promise<number>((resolve, reject) => {
        db.get(
          'SELECT user_id FROM tournament_players WHERE id = ?',
          [winnerPlayerSlot],
          (err: Error | null, row: UserIdRow) => (err ? reject(err) : resolve(row.user_id))
        );
      });
      await new Promise<void>((resolve, reject) => {
        db.run(
          "UPDATE tournaments SET status = 'completed', finished_at = CURRENT_TIMESTAMP, winner_id = ? WHERE id = ?",
          [winnerUserId, tournamentId],
          function(err: Error | null) {
            if (err) return reject(err);
            resolve();
          }
        );
      });
    }
    return reply.send({ message: 'Result recorded' });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    request.log.error(`Error reporting match result: ${errorMessage}`);
    return reply.status(500).send({ error: 'Internal server error' });
  }
};
