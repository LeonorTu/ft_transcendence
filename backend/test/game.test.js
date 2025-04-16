// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   game.test.js                                       :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: pleander <pleander@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/10 11:29:57 by pleander          #+#    #+#             //
//   Updated: 2025/04/10 15:16:18 by pleander         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const t = require('tap');
const fastify = require('../server');

// TEST 1: Create a new game
let gameId;

t.test('Test 1: POST /game/new - creates a new game', async t => {
	const payload = {player1_id: '1', player2_id: '2'};

	const res = await fastify.inject({
		method: 'POST',
		url: '/game/new',
		payload,
	});

	t.equal(res.statusCode, 200, 'Should return 200 on successful game creation');
	const body = JSON.parse(res.payload);
	t.ok(typeof body.id == 'number', 'Response includes a game id');
	gameId = body.id;
});


t.test('Test 2: POST /game/new - creates a new game fails - same player id)', async t => {
	const payload = {player1_id: '1', player2_id: '1'};

	const res = await fastify.inject({
		method: 'POST',
		url: '/game/new',
		payload,
	});

	t.equal(res.statusCode, 400, 'Should return 400 when player ids are equal');
});


t.test('Test 3: GET /game/list - lists games)', async t => {
	const res = await fastify.inject({
		method: 'GET',
		url: '/game/list'
	});

	t.equal(res.statusCode, 200, 'Should return 200 when listing succeeds');
	const body = JSON.parse(res.payload);
	t.ok(body.length > 0, 'There should be at least one game in the game list');
});

t.test('Test 4: GET /game/list:id - List specific game information', async t => {
	t.ok(gameId, 'Game ID must be set from earlier test');
	const res = await fastify.inject({
		method: 'GET',
		url: `game/list/${gameId}`
	});
	t.equal(res.statusCode, 200, 'Should return 200 for existing game');
	const body = JSON.parse(res.payload);
	t.equal(body.id, gameId, 'Should return the correct game');
});


t.test('Test 5: GET /game/list:id - Fail to list non existing game', async t => {
	t.ok(gameId, 'Game ID must be set from earlier test');
	const res = await fastify.inject({
		method: 'GET',
		url: `game/list/42`
	});
	t.equal(res.statusCode, 404, 'Should return 404 for non existing game');
	t.end();
});

t.teardown(async () => {
	try {
		await fastify.close();
	} catch (err) {
		console.error('Teardown error: ', err);
		throw err;
	}
});
