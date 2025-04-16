// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   game_server.js                                     :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: pleander <pleander@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/04 09:40:51 by pleander          #+#    #+#             //
//   Updated: 2025/04/16 10:43:59 by pleander         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const { Game, GameState } = require('./game.js');
const db = require('../db');

const ErrorType = {
	BAD_PLAYER_ID: 0,
	GAME_ID_ALREADY_EXISTS: 1,

};

const MessageType = {
	JOIN: "join",
	CONTROL_INPUT: "input",
	SETTINGS: "settings",
	STATE: "state"
};

class Error {
	constructor(error_type, msg) {
		this.error_type = error_type;
		this.msg = msg;
	}
};

class GameServer {
	constructor() {
		this.games = new Map();
		this.socket_to_game = new Map();
		this.sockets = new Set();
		this.intervals = [];
		
		this.loadUnfinishedGamesFromDB();
	}


	createGame(game_id, player1_id, player2_id) {
		if (player1_id === player2_id) {
			throw new Error(ErrorType.BAD_PLAYER_ID, "Error: bad player id")
		}
		if (this.games.has(game_id)) {
			throw new Error(ErrorType.GAME_ID_ALREADY_EXISTS, `Error: game id ${game_id} already exists`);
		}
		this.games.set(game_id, new Game(player1_id, player2_id));
	}

	joinGame(player_id, game_id) {
		if (!this.games.has(game_id)) {
			console.error(`Game with id ${game_id} does not exist`);
			return false;
		}
		const player = this.games.get(game_id).getPlayer(player_id);
		if (!player) {
			console.error(`Player with id ${player_id} is not in game ${game_id}`);
			return false;
		}
		player.joined = true;
		return true;
	}

	broadcastStates() {
		if (this.socket_to_game) {
			this.socket_to_game.forEach( (game, socket) => {
				const msg = JSON.stringify({type: MessageType.STATE, payload: game.state});
				if (socket.readyState === WebSocket.OPEN) {
					socket.send(msg);
				}
			});
		}
	}

	refreshGames() {
		this.games.forEach((game, id) => {
			game.refreshGame();
			if (game.gameState === GameState.FINSIHED) {
				this.finishGame(game, id);
			}
		});
	}

	finishGame(game, id) {
		new Promise((resolve, reject) => {
			db.run('UPDATE matches SET winner_id = ?, loser_id = ?, status = ? WHERE id = ?', 
			[game.winner.id, game.loser.id, game.gameState, id],
				(err, game) => {
					if (err)
						return reject(err);
					resolve(game);
				});
		});
		this.games.delete(id); // Stop actively refreshing finished games
	}

	/** Updates game information in the database */
	async updateDatabase() {
		this.games.forEach( (value, key) => {
			new Promise ((resolve, reject) => {
				db.run(`UPDATE matches SET status = ?, finished_rounds = ?, player1_score = ?, player2_score = ? WHERE id = ?`, 
					[
						value.gameState,
						value.finished_rounds, 
						value.players[0].score,
						value.players[1].score,
						key
					], 
					(err, game) => {
					if (err)
						return reject(err);
					resolve(game);
				});
			});
		});
	}
	async loadUnfinishedGamesFromDB() {
		const rows = await new Promise((resolve, reject) => {
			db.all('SELECT * FROM matches WHERE status IN (?, ?, ?)', [GameState.ACTIVE, GameState.NOT_STARTED, GameState.RESETTING],
			(err, rows) => {
				if (err) {
					return (reject(err));
				}
				resolve(rows);
			});
		});

		if (this.games.has(rows.id)) {
			throw new Error(ErrorType.GAME_ID_ALREADY_EXISTS, `Error: game id ${game_id} already exists`);
		}
		rows.forEach((row) => {
			this.games.set(row.id, new Game(row.player1_id, row.player2_id));
			const game = this.games.get(row.id);
			game.players[0].score = row.player1_score;
			game.players[1].score = row.player2_score;
			game.gameState = row.status;
			game.finished_rounds = row.finished_rounds;
		});
	}

	setupIntervals() {
		this.intervals.push(
			setInterval(() => this.refreshGames(), 10)
		);
		this.intervals.push(
			setInterval(() => this.broadcastStates(), 1000 / 30)
		); // 30 FPS
		this.intervals.push(
			setInterval(() => this.updateDatabase(), 1000)
		);
	}

	clearIntervals() {
		for (const id of this.intervals) {
			clearInterval(id);
		}
		this.intervals = [];
	}

	stop() {
		this.clearIntervals();
	}
}

module.exports = { GameServer, MessageType, Error, ErrorType };
