/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   game_server.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: mpellegr <mpellegr@student.hive.fi>        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/16 10:03:53 by pleander          #+#    #+#             */
/*   Updated: 2025/06/02 14:26:48 by mpellegr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { FastifyRequest, FastifyReply } from 'fastify';
import { Database } from 'sqlite3';
import jwt from 'jsonwebtoken';
import WebSocket from 'ws';
import { GameServer, MessageType, Error as GameError, ErrorType, SinglePlayerIds, GameType } from '../game/game_server';
import db from '../db';

// Extend WebSocket with custom properties
interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  game_id?: number;
  user_id?: number;
  game_type?: GameType;
}

// JWT Payload interface
interface JWTPayload {
  id: number;
  username: string;
  email?: string;
}

// WebSocket message payloads
interface JoinMultiPayload {
  token: string;
  game_id: number;
}

interface JoinSinglePayload {
  token: string;
  game_id: number;
}

interface ControlInputPayload {
  input?: string;
  input_player1?: string;
  input_player2?: string;
}

interface WebSocketMessage {
  type: MessageType;
  payload: JoinMultiPayload | JoinSinglePayload | ControlInputPayload;
}

// Request body interfaces
interface CreateGameBody {
  player1_id: number;
  player2_id: number;
}

interface GetGameParams {
  id: string;
}

// Database row interface
interface UserRow {
  id: number;
  username: string;
  email?: string;
}

interface MatchRow {
  id: number;
  player1_id: number;
  player2_id: number;
  player1_score?: number;
  player2_score?: number;
  winner_id?: number | null;
  status: string;
  created_at: string;
}

const game_server = new GameServer();

const HEARTBEAT_INTERVAL = 5_000;

// Don't run the server async processes or they break the tests
if (process.env.NODE_ENV !== 'test') {
  game_server.setupIntervals();
}

export const runServer = (ws: ExtendedWebSocket, req: any): void => {
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('close', (code: number, reason: Buffer) => {
    const gamesMap = ws.game_type === GameType.MULTI_PLAYER ? game_server.multiplayerGames : game_server.singleplayerGames;
    const game = gamesMap.get(Number(ws.game_id));
    if (!game) return;

    const player = game.getPlayer(ws.user_id!);
    if (player) player.joined = false;

    game.pause();

    const msg = JSON.stringify({ type: MessageType.STATE, payload: game.state });
    game_server.sockets.forEach((s: ExtendedWebSocket) => {
      if (s.game_id == ws.game_id && s.readyState === WebSocket.OPEN) {
        s.send(msg);
      }
    });

    game_server.sockets.delete(ws);
  });

  ws.on('message', (msg: WebSocket.Data) => {
    try {
      const { type, payload } = JSON.parse(msg.toString()) as WebSocketMessage;

      if (type === MessageType.JOIN_MULTI) {
        const multiPayload = payload as JoinMultiPayload;
        const user = jwt.verify(multiPayload.token, process.env.JWT_SECRET!) as JWTPayload;
        const game = game_server.multiplayerGames.get(Number(multiPayload.game_id));
        if (!game) throw new GameError(ErrorType.GAME_DOES_NOT_EXIST, "Game not found");
        game_server.joinGame(Number(user.id), Number(multiPayload.game_id));
        ws.game_id = multiPayload.game_id;
        ws.user_id = user.id;
        ws.game_type = GameType.MULTI_PLAYER;
        game_server.sockets.add(ws);

        const me = game.getPlayer(user.id);
        if (me) me.joined = true;

        if (game.players.every((p: any) => p.joined) && game.resume) {
          game.resume();
        }

        ws.send(JSON.stringify({
          type: MessageType.SETTINGS,
          payload: game.getSettings()
        }));
      }
      else if (type === MessageType.JOIN_SINGLE) {
        const singlePayload = payload as JoinSinglePayload;
        const user = jwt.verify(singlePayload.token, process.env.JWT_SECRET!) as JWTPayload;
        const game = game_server.singleplayerGames.get(Number(singlePayload.game_id));
        if (!game) throw new GameError(ErrorType.GAME_DOES_NOT_EXIST, "Game not found");
        game.players[0].joined = true;
        game.players[1].joined = true;
        ws.game_id = singlePayload.game_id;
        ws.user_id = user.id;
        ws.game_type = GameType.SINGLE_PLAYER;
        game_server.sockets.add(ws);

        if (game.resume) game.resume();

        ws.send(JSON.stringify({
          type: MessageType.SETTINGS,
          payload: game.getSettings()
        }));
      }
      else if (type === MessageType.CONTROL_INPUT) {
        const inputPayload = payload as ControlInputPayload;
        let game;
        if (ws.game_type === GameType.MULTI_PLAYER) {
          game = game_server.multiplayerGames.get(Number(ws.game_id));
          if (!game) throw new GameError(ErrorType.GAME_DOES_NOT_EXIST, "Game not found");

          // only accept input if that player is "joined"
          if (game.getPlayer(ws.user_id!).joined) {
            game.acceptPlayerInput(ws.user_id!, inputPayload.input!);
          }
        }
        else if (ws.game_type === GameType.SINGLE_PLAYER) {
          game = game_server.singleplayerGames.get(Number(ws.game_id));
          if (!game) throw new GameError(ErrorType.GAME_DOES_NOT_EXIST, "Game not found");
          const player1_id = game.players[0].id;
          const player2_id = game.players[1].id;
          game.acceptPlayerInput(player1_id, inputPayload.input_player1!);
          game.acceptPlayerInput(player2_id, inputPayload.input_player2!);
        }
      }
    }
    catch (e) {
      if (e instanceof GameError && e.error_type !== undefined) {
        ws.close(1008, e.msg);
      }
      else {
        ws.close(1008, "Invalid auth or message");
      }
    }
  });
};

export const createNewMultiplayerGame = async (
  request: FastifyRequest<{ Body: CreateGameBody }>,
  reply: FastifyReply
): Promise<void> => {
  const { player1_id, player2_id } = request.body;
  try {
    const p1_exists = await new Promise<UserRow | undefined>((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [player1_id], (err: Error | null, row: UserRow) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
    if (!p1_exists) {
      reply.status(400).send({ error: `player1_id ${player1_id} does not exist` });
      return;
    }
    const p2_exists = await new Promise<UserRow | undefined>((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [player2_id], (err: Error | null, row: UserRow) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
    if (!p2_exists) {
      reply.status(400).send({ error: `player2_id ${player2_id} does not exist` });
      return;
    }
    const gameId = await new Promise<number>((resolve, reject) => {
      db.run(
        'INSERT INTO matches (player1_id, player2_id) VALUES (?, ?)',
        [player1_id, player2_id],
        function(this: { lastID: number }, err: Error | null) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
    await game_server.createMultiplayerGame(gameId, player1_id, player2_id);
    reply.status(200).send({
      "id": gameId
    });
  }
  catch (e) {
    request.log.error(e);
    if (e instanceof GameError && (e.error_type === ErrorType.BAD_PLAYER_ID || e.error_type === ErrorType.GAME_ID_ALREADY_EXISTS)) {
      reply.status(400).send({ error: e.msg });
    }
    else {
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  }
};

export const createNewSinglePlayerGame = async (
  request: FastifyRequest<{ Body: CreateGameBody }>,
  reply: FastifyReply
): Promise<void> => {
  const { player1_id, player2_id } = request.body;
  try {
    const p1_exists = await new Promise<UserRow | undefined>((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [player1_id], (err: Error | null, row: UserRow) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
    if (!p1_exists) {
      reply.status(400).send({ error: `player_id ${player1_id} does not exist` });
      return;
    }
    const p2_exists = await new Promise<UserRow | undefined>((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [player2_id], (err: Error | null, row: UserRow) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
    if (!p2_exists) {
      reply.status(400).send({ error: `player2_id ${player2_id} does not exist` });
      return;
    }
    const gameId = await new Promise<number>((resolve, reject) => {
      db.run(
        'INSERT INTO matches (player1_id, player2_id) VALUES (?, ?)',
        [player1_id, player2_id],
        function(this: { lastID: number }, err: Error | null) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
    await game_server.createSingleplayerGame(gameId, player1_id, player2_id);
    reply.status(200).send({
      "id": gameId
    });
  }
  catch (e) {
    request.log.error(e);
    if (e instanceof GameError && (e.error_type === ErrorType.BAD_PLAYER_ID || e.error_type === ErrorType.GAME_ID_ALREADY_EXISTS)) {
      reply.status(400).send({ error: e.msg });
    }
    else {
      reply.status(500).send({ error: 'Internal Server Error' });
    }
  }
};

export const listGames = (request: FastifyRequest, reply: FastifyReply): void => {
  db.all('SELECT * FROM matches', [], (err: Error | null, rows: MatchRow[]) => {
    if (err) {
      request.log.error(`Error fetching games: ${err.message}`);
      return reply.status(500).send({ error: `Database error: ${err.message}` });
    }
    if (rows.length === 0) {
      request.log.warn('No games in database');
      return reply.status(404).send({ error: 'No games found' });
    }
    return reply.status(200).send(rows);
  });
};

export const getGame = (
  request: FastifyRequest<{ Params: GetGameParams }>,
  reply: FastifyReply
): void => {
  const { id } = request.params;
  db.get('SELECT * FROM matches WHERE id = ?', [id], (err: Error | null, row: MatchRow) => {
    if (err) {
      request.log.error(`Error fetching game: ${err.message}`);
      return reply.status(500).send({ error: `Database error: ${err.message}` });
    }
    if (!row) {
      request.log.warn(`Game with id ${id} not found`);
      return reply.status(404).send({ error: `Game with id ${id} not found` });
    }
    return reply.status(200).send(row);
  });
};

if (process.env.NODE_ENV !== 'test') {
  const interval = setInterval(() => {
    for (let ws of game_server.sockets) {
      const extWs = ws as ExtendedWebSocket;
      if (extWs.isAlive === false) {
        console.log(`Terminating dead connection for user ${extWs.user_id}`);
        extWs.terminate();
        continue;
      }
      extWs.isAlive = false;
      extWs.ping();
    }
  }, HEARTBEAT_INTERVAL);
}

export { game_server };
