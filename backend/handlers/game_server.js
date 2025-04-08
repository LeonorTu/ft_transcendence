const db = require('../db')
const bcrypt = require('bcryptjs')
const { GameServer } = require('../game/game_server')

const game_server = new GameServer();

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

module.exports = {createNewGame}
