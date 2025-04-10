// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   game.test.js                                       :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: pleander <pleander@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/10 11:29:57 by pleander          #+#    #+#             //
//   Updated: 2025/04/10 11:59:08 by pleander         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const t = require('tap');
const fastify = require('../server');

// TEST 1: Create a new game
let gameId;

t.test('Test 1: POST /game/new - creates a new game'), async t => {
	const payload = {player1_id: '1', player2_id: '2'};

	const res = await fastify.inject({
		method: 'POST',
		url: '/game/new',
		payload,
	});

	t.equal(res.statusCode, 200, 'Should return 200 on successful game creation');
	const body = JSON.parse(res.payload);
	t.ok(body.game_id, 'Response includes a game_id');
	gameId = body.game_id;
}
