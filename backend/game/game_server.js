// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   game_server.js                                     :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: pleander <pleander@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/04 09:40:51 by pleander          #+#    #+#             //
//   Updated: 2025/04/10 14:54:36 by pleander         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const { Game } = require('./game.js');

const ErrorType = {
	BAD_PLAYER_ID: 0,

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
		this.game_id_counter = 1;
		this.intervals = [];
	}

	createGame(player1_id, player2_id) {
		if (player1_id === player2_id) {
			throw new Error(ErrorType.BAD_PLAYER_ID, "Error: bad player id")
		}
		const id = this.game_id_counter;
		this.game_id_counter += 1;
		this.games.set(id, new Game(player1_id, player2_id));
		return id;
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
		});
	}

	setupIntervals() {
		this.intervals.push(
			setInterval(() => this.refreshGames(), 10)
		);
		this.intervals.push(
			setInterval(() => this.broadcastStates(), 1000 / 30)
		); // 30 FPS
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
