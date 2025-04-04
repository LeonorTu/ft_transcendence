// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   game_server.js                                     :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: pleander <pleander@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/04 09:40:51 by pleander          #+#    #+#             //
//   Updated: 2025/04/04 10:44:27 by pleander         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const { Game, Side } = require('./game.js');
const Websocket = require('ws');

const wss = new Websocket.Server({port: 8080});
const game = new Game();

const clients = new Set();

wss.on('connection', (ws) => {
	clients.add(ws);
	ws.on('message', (msg) => {
		const {type, payload} = JSON.parse(msg);

		if (type === 'register') {
			
			if (game.players.size >= 2) {
				console.log("Error: game already has 2 players"); // return error to client?
				return;
			}
			if (game.connected_players == 0) {
				game.players[0].id = payload.id;
				game.connected_players += 1;
				//game.addPlayer(payload.id, Side.LEFT); // verify int?
			}
			else if (game.connected_players == 1) {
				game.players[1].id = payload.id;
				game.connected_players += 1;
				//game.addPlayer(payload.id, Side.RIGHT); // verify int?
			}
			console.log(`Player with id ${payload.id} connected`);
			ws.send(JSON.stringify({type: 'settings', payload: game.getSettings()}));
		}
		if (type === 'input') {
			game.acceptPlayerInput(payload.id, payload.input);
		}
	});
});

console.log("Server started");

function broadcastState() {
	const state = game.state;
	const msg = JSON.stringify({type: 'state', payload: state});

	clients.forEach((client) => {
		if (client.readyState === WebSocket.OPEN) {
			client.send(msg);
		}
	});
}

setInterval(broadcastState, 1000 / 30); // 30 FPS
setInterval( () => {
	game.refreshGame();
}, 10);
