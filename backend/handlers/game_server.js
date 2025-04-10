const { GameServer, MessageType } = require('../game/game_server')

const game_server = new GameServer();

// Don't run the server async processes or they break the tests
if (process.env.NODE_ENV !== 'test') {
	game_server.setupIntervals();
}

const runServer = (ws, req) => {
	ws.on('message', (msg) => {
		const {type, payload} = JSON.parse(msg);
		if (type === MessageType.JOIN) {
			if (!game_server.joinGame(Number(payload.player_id), Number(payload.game_id))) {
				return;
			}
			game_server.socket_to_game.set(ws, game_server.games.get(Number(payload.game_id)));
			ws.send(JSON.stringify({type: MessageType.SETTINGS, payload: game_server.games.get(Number(payload.game_id)).getSettings()}));
			//console.log(`Player with id ${Number(payload.player_id)} joined game ${payload.game_id}`);
		}
		else if (type === MessageType.CONTROL_INPUT) {
			if (!game_server.socket_to_game.has(ws)) {
				throw new Error(ErrorType.GAME_DOES_NOT_EXIST_ERROR, "The client has not joined any games");
			}
			game_server.socket_to_game.get(ws).acceptPlayerInput(payload.player_id, payload.input);
		}
	});
};

const createNewGame = (request, reply) => {
	const { player1_id, player2_id } = request.body;
	try {
		const game_id = game_server.createGame(player1_id, player2_id);
		reply.status(200).send({
			game_id: game_id
		});
	}
	catch (e) {
		console.error(e.msg);
	}
};

const listGames = (request, reply) => {
	let games = [];
	for (const [key, value] of game_server.games) {
		games.push({
			game_id: key,
			player1_id: value.players[0].id,
			player2_id: value.players[1].id,
		});
	}
	return reply.send(games);
};

const getGame = (request, reply) => {
	const { id } = request.params;
	if (!game_server.games.has(Number(id))) {
		return reply.status(404).send({error: `Game with id ${id} does not exist`});
	}
	const game = game_server.games.get(Number(id));
	const gameObj = {
				game_id: id,
				finished_rounds: game.finished_rounds,
				total_rounds: game.total_rounds,
				winner: game.winner,
				player1_id: game.players[0].id,
				player2_id: game.players[1].id,
				game_state: game.gameState,
	};
	return reply.send(JSON.stringify(gameObj));
};

module.exports = { runServer, createNewGame, listGames, getGame, game_server }
