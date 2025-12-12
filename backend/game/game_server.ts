/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   game_server.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: mpellegr <mpellegr@student.hive.fi>        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/04 09:40:51 by pleander          #+#    #+#             */
/*   Updated: 2025/12/12 00:00:00 by Claude           ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

import { Game, GameState, Player } from './game.js';
import db from '../db.js';
import { WebSocket } from 'ws';

export enum ErrorType {
	BAD_PLAYER_ID = 0,
	GAME_ID_ALREADY_EXISTS = 1,
	GAME_DOES_NOT_EXIST = 2,
	PLAYER_NOT_IN_GAME = 3,
	TOO_MANY_SINGLEPLAYER_GAMES = 4,
	UNKNOWN_ARGUMENT = 5,
}

export enum MessageType {
	JOIN_MULTI = "join_multi",
	JOIN_SINGLE = "join_single",
	CONTROL_INPUT = "input",
	SETTINGS = "settings",
	STATE = "state",
}

export enum GameType {
	SINGLE_PLAYER = 1,
	MULTI_PLAYER = 2
}

export enum SinglePlayerIds {
	PLAYER_1 = -1,
	PLAYER_2 = -2
}

export interface UserRow {
	username: string;
}

export interface MatchRow {
	id: number;
	player1_id: number;
	player2_id: number;
	player1_score: number;
	player2_score: number;
	status: string;
	finished_rounds: number;
	winner_id?: number;
	loser_id?: number;
}

export interface GameSocket extends WebSocket {
	game_id?: string | number;
	game_type?: GameType;
	user_id?: number;
}

export interface GameMessage {
	type: MessageType;
	payload: any;
}

export class GameError extends Error {
	error_type: ErrorType;
	msg: string;

	constructor(error_type: ErrorType, msg: string) {
		super(msg);
		this.error_type = error_type;
		this.msg = msg;
		this.name = 'GameError';
	}
}

const getUserById = async (userId: number): Promise<UserRow> => {
	return new Promise((resolve, reject) => {
		db.get(
			'SELECT username FROM users WHERE id = ?',
			[userId],
			(err: Error | null, row: UserRow) => {
				if (err) return reject(err);
				resolve(row);
			}
		);
	});
};

export class GameServer {
	multiplayerGames: Map<number, Game>;
	singleplayerGames: Map<number, Game>;
	sockets: Set<GameSocket>;
	intervals: NodeJS.Timeout[];

	constructor() {
		this.multiplayerGames = new Map<number, Game>();
		this.singleplayerGames = new Map<number, Game>();
		this.sockets = new Set<GameSocket>();
		this.intervals = [];
		if (process.env.NODE_ENV !== 'test') {
			this.loadUnfinishedGamesFromDB();
		}
	}

	async createMultiplayerGame(
		game_id: number,
		player1_id: number,
		player2_id: number
	): Promise<void> {
		if (player1_id === player2_id) {
			throw new GameError(ErrorType.BAD_PLAYER_ID, "Error: bad player id");
		}
		if (this.multiplayerGames.has(game_id)) {
			throw new GameError(
				ErrorType.GAME_ID_ALREADY_EXISTS,
				`Error: game id ${game_id} already exists`
			);
		}
		const [user1, user2] = await Promise.all([
			getUserById(player1_id),
			getUserById(player2_id),
		]);
		const game = new Game(player1_id, user1.username, player2_id, user2.username);
		game.type = GameType.MULTI_PLAYER;
		this.multiplayerGames.set(game_id, game);
	}

	async createSingleplayerGame(
		game_id: number,
		player1_id: number,
		player2_id: number
	): Promise<void> {
		if (player1_id === player2_id) {
			throw new GameError(ErrorType.BAD_PLAYER_ID, "Error: bad player id");
		}
		const [user1, user2] = await Promise.all([
			getUserById(player1_id),
			getUserById(player2_id),
		]);
		const game = new Game(player1_id, user1.username, player2_id, user2.username);
		game.type = GameType.SINGLE_PLAYER;
		this.singleplayerGames.set(game_id, game);
	}

	joinGame(player_id: number, game_id: number): void {
		if (!this.multiplayerGames.has(game_id)) {
			throw new GameError(
				ErrorType.GAME_DOES_NOT_EXIST,
				`Error: game with id ${game_id} does not exist`
			);
		}
		const player = this.multiplayerGames.get(game_id)?.getPlayer(player_id);
		if (!player) {
			throw new GameError(
				ErrorType.PLAYER_NOT_IN_GAME,
				`Error: player with id ${player_id} is not in game ${game_id}`
			);
		}
		player.joined = true;
	}

	broadcastStates(): void {
		if (this.sockets) {
			this.sockets.forEach((sock) => {
				let game: Game | undefined;
				if (sock.game_type === GameType.MULTI_PLAYER) {
					if (!this.multiplayerGames.has(Number(sock.game_id))) {
						console.warn("Game id does not exist");
						return;
					}
					game = this.multiplayerGames.get(Number(sock.game_id));
				} else if (sock.game_type === GameType.SINGLE_PLAYER) {
					game = this.singleplayerGames.get(sock.game_id as number);
				} else {
					throw new GameError(
						ErrorType.UNKNOWN_ARGUMENT,
						`Game type ${sock.game_type} does not exist`
					);
				}
				if (!game) return;

				const msg = JSON.stringify({
					type: MessageType.STATE,
					payload: game.state
				} as GameMessage);

				if (sock.readyState === WebSocket.OPEN) {
					sock.send(msg);
				}
			});
		}
	}

	refreshGames(): void {
		this.multiplayerGames.forEach((game, game_id) => {
			game.refreshGame();
			if (game.pauseTimestamp && Date.now() - game.pauseTimestamp > 30_000) {
				game.resume();
				game.pauseTimestamp = null;
			}
			if (game.gameState === GameState.FINSIHED) {
				this.finishGame(game, game_id);
			}
		});

		this.singleplayerGames.forEach((game, game_id) => {
			game.refreshGame();
			if (game.pauseTimestamp && Date.now() - game.pauseTimestamp > 30_000) {
				game.pauseTimestamp = null;
				game.gameState = 'interrupted' as any;
				db.run(
					'UPDATE matches SET status = ? WHERE id = ?',
					['interrupted', game_id],
					function (err: Error | null) {
						if (err) {
							console.error(`Failed to update match ${game_id}:`, err);
							return;
						}
						console.log(`Match ${game_id} marked interrupted (rows changed: ${this.changes})`);
					}
				);
				this.singleplayerGames.delete(game_id);
			}

			// Single player game ending here
			if (game.gameState === GameState.FINSIHED) {
				new Promise<void>((resolve, reject) => {
					if (!game.winner || !game.loser) {
						return reject(new Error('Game has no winner or loser'));
					}

					db.run(
						'UPDATE matches SET winner_id = ?, loser_id = ?, \
						status = ?, player1_score = ?, player2_score = ?, \
						finished_rounds = ? WHERE id = ?',
						[
							game.winner.id,
							game.loser.id,
							game.gameState,
							game.players[0].score,
							game.players[1].score,
							game.finished_rounds,
							game_id
						],
						(err: Error | null) => {
							if (err) return reject(err);
							resolve();
						}
					);
				});

				const msg = JSON.stringify({
					type: MessageType.STATE,
					payload: game.state
				} as GameMessage);

				this.sockets.forEach((socket) => {
					if (socket.game_id === game_id) {
						socket.send(msg);
						socket.close(1000, "Game has finished");
						this.sockets.delete(socket);
					}
				});
				this.singleplayerGames.delete(game_id);
			}
		});
	}

	finishGame(game: Game, id: number): void {
		new Promise<void>((resolve, reject) => {
			if (!game.winner || !game.loser) {
				return reject(new Error('Game has no winner or loser'));
			}

			db.run(
				'UPDATE matches SET winner_id = ?, loser_id = ?, \
				status = ?, player1_score = ?, player2_score = ?, \
				finished_rounds = ? WHERE id = ?',
				[
					game.winner.id,
					game.loser.id,
					game.gameState,
					game.players[0].score,
					game.players[1].score,
					game.finished_rounds,
					id
				],
				(err: Error | null) => {
					if (err) return reject(err);
					resolve();
				}
			);
		});

		const msg = JSON.stringify({
			type: MessageType.STATE,
			payload: game.state
		} as GameMessage);

		this.sockets.forEach((sock) => {
			if (sock.game_id === id) {
				sock.send(msg);
				sock.close(1000, "Game has finished");
				this.sockets.delete(sock);
			}
		});
		this.multiplayerGames.delete(id);
	}

	/** Updates game information in the database */
	async updateDatabase(): Promise<void> {
		this.multiplayerGames.forEach((value, key) => {
			new Promise<void>((resolve, reject) => {
				db.run(
					`UPDATE matches SET status = ?, finished_rounds = ?, player1_score = ?, player2_score = ? WHERE id = ?`,
					[
						value.gameState,
						value.finished_rounds,
						value.players[0].score,
						value.players[1].score,
						key
					],
					(err: Error | null) => {
						if (err) return reject(err);
						resolve();
					}
				);
			});
		});

		this.singleplayerGames.forEach((value, key) => {
			new Promise<void>((resolve, reject) => {
				db.run(
					`UPDATE matches SET status = ?, finished_rounds = ?, player1_score = ?, player2_score = ? WHERE id = ?`,
					[
						value.gameState,
						value.finished_rounds,
						value.players[0].score,
						value.players[1].score,
						key
					],
					(err: Error | null) => {
						if (err) return reject(err);
						resolve();
					}
				);
			});
		});
	}

	async loadUnfinishedGamesFromDB(): Promise<void> {
		const rows = await new Promise<MatchRow[]>((resolve, reject) => {
			db.all(
				'SELECT * FROM matches WHERE status IN (?, ?, ?)',
				[GameState.ACTIVE, GameState.NOT_STARTED, GameState.RESETTING],
				(err: Error | null, rows: MatchRow[]) => {
					if (err) {
						return reject(err);
					}
					resolve(rows);
				}
			);
		});

		rows.forEach(async (row) => {
			if (this.multiplayerGames.has(row.id)) {
				throw new GameError(
					ErrorType.GAME_ID_ALREADY_EXISTS,
					`Error: game id ${row.id} already exists`
				);
			}

			const [user1, user2] = await Promise.all([
				getUserById(row.player1_id),
				getUserById(row.player2_id),
			]);

			const game = new Game(
				row.player1_id,
				user1.username,
				row.player2_id,
				user2.username
			);

			this.multiplayerGames.set(row.id, game);
			game.players[0].score = row.player1_score;
			game.players[1].score = row.player2_score;
			game.gameState = row.status as GameState;
			game.finished_rounds = row.finished_rounds;
		});
	}

	setupIntervals(): void {
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

	clearIntervals(): void {
		for (const id of this.intervals) {
			clearInterval(id);
		}
		this.intervals = [];
	}

	stop(): void {
		this.clearIntervals();
	}
}
