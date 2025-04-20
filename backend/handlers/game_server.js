// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   game_server.js                                     :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: pleander <pleander@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/16 10:03:53 by pleander          #+#    #+#             //
//   Updated: 2025/04/16 10:50:40 by pleander         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const { GameServer, MessageType, Error, ErrorType } = require('../game/game_server');
const db = require('../db');
const jwt = require("jsonwebtoken");

const game_server = new GameServer();

// Don't run the server async processes or they break the tests
if (process.env.NODE_ENV !== 'test') {
	game_server.setupIntervals();
}

const runServer = (ws, req) => {
	ws.on('message', (msg) => {
		try {
			const {type, payload} = JSON.parse(msg);
			if (type === MessageType.JOIN) {
				const user = jwt.verify(payload.token, "supersecret"); // TODO: Replace with env variable
				game_server.joinGame(Number(user.id), Number(payload.game_id));
				ws.game_id = payload.game_id;
				ws.user_id = user.id;
				game_server.sockets.add(ws);
				ws.send(JSON.stringify({type: MessageType.SETTINGS, payload: game_server.games.get(Number(payload.game_id)).getSettings()}));
				//console.log(`Player with id ${Number(payload.player_id)} joined game ${payload.game_id}`);
			}
			else if (type === MessageType.CONTROL_INPUT) {
				
				if (!game_server.games.has(Number(ws.game_id))) {
					throw new Error(ErrorType.GAME_DOES_NOT_EXIST, "The game does not exist");
				}
				const game = game_server.games.get(Number(ws.game_id));
				if (!game.getPlayer(ws.user_id).joined) {
					console.warn(`Player with id ${ws.user_id} has not joined the game yet`)
				}
				game.acceptPlayerInput(ws.user_id, payload.input);
			}
		}
		catch (e) {
			if (typeof e == Error) {
				ws.close(1008, e.msg);
			}
			else {
				ws.close(1008, "Invalid auth");
			}
		}
	});
};

const createNewGame = async (request, reply) => {
	const { player1_id, player2_id } = request.body;
	try {
		const p1_exists = await new Promise((resolve, reject) => {
			db.get('SELECT * FROM users WHERE id = ?', [player1_id], (err, row) => {
				if (err) return (reject(err));
					resolve(row);
			});
		});
		if (!p1_exists) {
			reply.status(400).send({ error: `player1_id ${player1_id} does not exist`});
		}
		const p2_exists = await new Promise((resolve, reject) => {
			db.get('SELECT * FROM users WHERE id = ?', [player2_id], (err, row) => {
				if (err) return (reject(err));
					resolve(row);
			});
		});
		if (!p2_exists) {
			reply.status(400).send({ error: `player2_id ${player2_id} does not exist`});
		}
		const gameId = await new Promise((resolve, reject) => {
			db.run(
				'INSERT INTO matches (player1_id, player2_id) VALUES (?, ?)',
				[player1_id, player2_id],
				function(err) {
					if (err) return (reject(err));
					resolve(this.lastID);
				}
			);
		});
		game_server.createGame(gameId, player1_id, player2_id);
		reply.status(200).send({
			"id": gameId
		});
	}
	catch (e) {
		request.log.error(e);
		if (e.error_type === ErrorType.BAD_PLAYER_ID || ErrorType.GAME_ID_ALREADY_EXISTS) {
			reply.status(400).send({ error: e.msg});
		}
		else {
			reply.status(500).send({ error: 'Internal Server Error' });
		}
	}
};

const listGames = (request, reply) => {
	db.all('SELECT * FROM matches', [], (err, rows) => {
		if (err) {
			request.log.error(`Error fetching games: ${err.message}`);
			return reply.status(500).send({error: `Database error: ${err.message}`});
		}
		if (rows.length === 0) {
			request.log.warn('No games in database')
			return reply.status(404).send({error: 'No games found'})
		}
		return reply.status(200).send(rows);
	});
};

const getGame = (request, reply) => {
	const { id } = request.params;
	console.log(`Fetching game with id ${id}`);
	db.get('SELECT * FROM matches WHERE id = ?', [id], (err, row) => {
		if (err) {
			request.log.error(`Error fetching game: ${err.message}`);
			return reply.status(500).send({error: `Database error: ${err.message}`});
		}
		if (!row) {
			request.log.warn(`Game with id ${id} not found`)
			return reply.status(404).send({error: `Game with id ${id} not found`})
		}
		return reply.status(200).send(row);
	})
};

module.exports = { runServer, createNewGame, listGames, getGame, game_server }
