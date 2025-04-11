const t = require('tap');
const db = require('../db');
const fastify = require('../server');

// Clear users && friends table before running the tests
t.before(async () => {
	await new Promise((resolve, reject) => {
		db.run('DELETE FROM users', err => (err ? reject(err) : resolve()));
		db.run('DELETE FROM friends', err => (err ? reject(err) : resolve()));
	});
});

t.test('test test', async t => {
	const userA = { username: 'userA', password: 'passA' };
	const userB = { username: 'userB', password: 'passB' };
	const userC = { username: 'userC', password: 'passC' };
	const regA = await fastify.inject({
		method: 'POST',
		url: '/user/register',
		payload: userA,
	});
	const userAId = JSON.parse(regA.payload).id;
	const userAUsername = JSON.parse(regA.payload).username;

	const regB = await fastify.inject({
		method: 'POST',
		url: '/user/register',
		payload: userB,
	});
	const userBId = JSON.parse(regB.payload).id;
	
	const regC = await fastify.inject({
		method: 'POST',
		url: '/user/register',
		payload: userC,
	});
	const userCId = JSON.parse(regC.payload).id;
	
	const loginA = await fastify.inject({
		method: 'POST',
		url: '/user/login',
		payload: userA,
	});
	const tokenA = JSON.parse(loginA.payload).token;

	// add friend_id 2
	const friend1 = await fastify.inject({
		method: 'POST',
		url: 'add_friend',
		headers: { Authorization: `Bearer ${tokenA}` },
		payload: { user_id: userAId, friend_id: userBId },
	});
	// t.equal(friend1.statusCode, 200, 'friend added succesfully')

	// add friend_id 3
	const friend2 = await fastify.inject({
		method: 'POST',
		url: 'add_friend',
		headers: { Authorization: `Bearer ${tokenA}` },
		payload: { user_id: userAId, friend_id: userCId },
	});
	// t.equal(friend2.statusCode, 200, 'friend added succesfully')

	const users = await fastify.inject({
		method: 'GET',
		url: `/user/${userAUsername}/friends`
	})
	t.equal(JSON.parse(users.payload)[0].user_id, userAId)
	t.equal(JSON.parse(users.payload)[0].friend_id, userBId)
	t.equal(JSON.parse(users.payload)[1].user_id, userAId)
	t.equal(JSON.parse(users.payload)[1].friend_id, userCId)

	const nonExistingFriend = await fastify.inject({
		method: 'POST',
		url: 'add_friend',
		headers: { Authorization: `Bearer ${tokenA}` },
		payload: { user_id: userAId, friend_id: '9999' },
	});
	t.equal(nonExistingFriend.statusCode, 400, 'not able to add a non existing user')
})

t.teardown(async () => {
	try {
		await new Promise((resolve, reject) => {
			db.run('DELETE FROM users', err => (err ? reject(err) : resolve()));
		});

		await new Promise((resolve, reject) => {
			db.run('DELETE FROM friends', err => (err ? reject(err) : resolve()));
		});

		await new Promise((resolve, reject) => {
			db.close(err => (err ? reject(err) : resolve()));
		});

		await fastify.close();
	} catch (err) {
		console.error('Teardown error:', err);
		throw err;
	}
});