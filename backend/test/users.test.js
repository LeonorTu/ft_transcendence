// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   users.test.js                                      :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/02 16:28:11 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/09 18:18:57 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const t = require('tap');
const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const db = require('../db');
const fastify = require('../server');

// Store a user ID and token for later use
let userId;
let authToken;


// Clear users table before running the tests

t.before(async () => {
	await new Promise((resolve, reject) => {
		db.run('DELETE FROM users', err => (err ? reject(err) : resolve()));
	});
});


// TEST 1: Registration (Positive)

t.test('Test 1: POST /user/register (Positive) - creates a new user', async t => {
	const payload = { username: 'testuser', password: 'secret' };

	const res = await fastify.inject({
		method: 'POST',
		url: '/user/register',
		payload,
	});

	t.equal(res.statusCode, 200, 'Should return 200 on successful registration');
	const body = JSON.parse(res.payload);
	t.ok(body.id, 'Response includes an id');
	t.equal(body.username, payload.username, 'Username matches');
	userId = body.id;
});


// TEST 2: Registration (Negative) - Duplicate username

t.test('Test 2: POST /user/register (Duplicate) - returns 400 if username already exists', async t => {
	const payload = { username: 'testuser', password: 'anothersecret' };

	const res = await fastify.inject({
		method: 'POST',
		url: '/user/register',
		payload,
	});

	t.equal(res.statusCode, 400, 'Duplicate registration returns 400');
	const body = JSON.parse(res.payload);
	t.match(body.error, /already exists/i, 'Error indicates duplicate username');
});


// TEST 3: Login (Positive)

t.test('Test 3: POST /user/login (Positive) - logs in existing user', async t => {
	const payload = { username: 'testuser', password: 'secret' };

	const res = await fastify.inject({
		method: 'POST',
		url: '/user/login',
		payload,
	});

	t.equal(res.statusCode, 200, 'Should return 200 on successful login');
	const body = JSON.parse(res.payload);
	t.ok(body.token, 'Response should have a JWT token');
	authToken = body.token;
});


// TEST 4: Login (Negative) - Wrong password

t.test('Test 4: POST /user/login (Wrong password) - returns 401', async t => {
	const payload = { username: 'testuser', password: 'wrongpassword' };

	const res = await fastify.inject({
		method: 'POST',
		url: '/user/login',
		payload,
	});

	t.equal(res.statusCode, 401, 'Should return 401 for wrong password');
	const body = JSON.parse(res.payload);
	t.match(body.error, /invalid credentials/i, 'Indicates invalid credentials');
});


// TEST 5: Login (Negative) - Non-existent user

t.test('Test 5: POST /user/login (No such user) - returns 400', async t => {
	const res = await fastify.inject({
		method: 'POST',
		url: '/user/login',
		payload: { username: 'nonexistent', password: 'whatever' },
	});
	t.equal(res.statusCode, 400, 'Should return 400 for non-existent user');
	const body = JSON.parse(res.payload);
	t.match(body.error, /invalid username or password/i, 'Error message indicates invalid credentials');
});


// TEST 6: updateUser => 400 if user not found

t.test('Test 6: PUT /user/:username/update => returns 400 if user is deleted first', async t => {
	// 1 Register
	const regRes = await fastify.inject({
		method: 'POST',
		url: '/user/register',
		payload: { username: 'tempuser', password: 'temp' },
	});
	t.equal(regRes.statusCode, 200, 'Temporary user registration succeeds');
	const regBody = JSON.parse(regRes.payload);
	const tempUserId = regBody.id;
	// 2 Login
	const loginRes = await fastify.inject({
		method: 'POST',
		url: '/user/login',
		payload: { username: 'tempuser', password: 'temp' },
	});
	t.equal(loginRes.statusCode, 200, 'Login of tempuser succeeds');
	const token = JSON.parse(loginRes.payload).token;

	// Delete the user from DB
	await new Promise((resolve, reject) => {
		db.run('DELETE FROM users WHERE id = ?', [tempUserId], err => (err ? reject(err) : resolve()));
	});

	// Attempt to update now-deleted user => 400
	const updateRes = await fastify.inject({
		method: 'PUT',
		url: '/user/tempuser/update',
		headers: { Authorization: `Bearer ${token}` },
		payload: { currentPassword: 'temp', newPassword: 'newtemp' },
	});
	t.equal(updateRes.statusCode, 400, 'Should return 400 when user not found');
	t.match(JSON.parse(updateRes.payload).error, /user not found/i);

	t.end();
});


// TEST 7: GET /user/:id (Positive)

t.test('Test 7: GET /user/:id => returns the registered user', async t => {
	t.ok(userId, 'User ID must be set from test #1');
	const res = await fastify.inject({
		method: 'GET',
		url: `/user/${userId}`,
	});
	t.equal(res.statusCode, 200, 'Should return 200 for existing user');
	const body = JSON.parse(res.payload);
	t.equal(body.id, Number(userId), 'Returned ID matches stored userId');
	t.equal(body.username, 'testuser', 'Returned username matches');
});


// TEST 8: GET /users => returns list with the new user

t.test('Test 8: GET /users => 200 + array containing testuser', async t => {
	const res = await fastify.inject({
		method: 'GET',
		url: '/users',
	});
	t.equal(res.statusCode, 200, 'GET /users returns 200');
	const list = JSON.parse(res.payload);
	t.ok(Array.isArray(list), 'Response is an array');
	const found = list.some(u => u.id === Number(userId));
	t.ok(found, 'Registered user is in the list');
});


// TEST 9: GET /user/:id => 404 if user not found

t.test('Test 9: GET /user/:id (Non-existent) => returns 404', async t => {
	const res = await fastify.inject({
		method: 'GET',
		url: '/user/999999',
	});
	t.equal(res.statusCode, 404, 'Non-existent user => 404');
	t.match(JSON.parse(res.payload).error, /not found/i);
});


// TEST 10: updateUser (Positive)

t.test('Test 10: PUT /user/:username/update (Positive) => updates password', async t => {
	const newData = {
		currentPassword: 'secret',
		newPassword: 'supersecret',
	};

	const res = await fastify.inject({
		method: 'PUT',
		url: '/user/testuser/update',
		headers: { Authorization: `Bearer ${authToken}` },
		payload: newData,
	});

	t.equal(res.statusCode, 200, 'Should return 200 on successful update');
	t.match(JSON.parse(res.payload).message, /updated successfully/i);
});


// TEST 11: updateUser => returns 401 if current password is wrong

t.test('Test 11: PUT /user/:username/update => 401 if wrong currentPassword', async t => {
	const newData = {
		currentPassword: 'not-the-right-password',
		newPassword: 'whatever',
	};

	const res = await fastify.inject({
		method: 'PUT',
		url: '/user/testuser/update',
		headers: { Authorization: `Bearer ${authToken}` },
		payload: newData,
	});

	t.equal(res.statusCode, 401, 'Wrong current password => 401');
	t.match(JSON.parse(res.payload).error, /current password is not correct/i);
});


// TEST 12: updateUser => 400 if new username already exists

t.test('Test 12: PUT /user/:username/update => 400 duplicate newUsername', async t => {
	const userA = { username: 'userA', password: 'passA' };
	const userB = { username: 'userB', password: 'passB' };

	// Register both:
	const regA = await fastify.inject({
		method: 'POST',
		url: '/user/register',
		payload: userA,
	});
	t.equal(regA.statusCode, 200, 'User A registration ok');

	const regB = await fastify.inject({
		method: 'POST',
		url: '/user/register',
		payload: userB,
	});
	t.equal(regB.statusCode, 200, 'User B registration ok');

	// Login as userB
	const loginB = await fastify.inject({
		method: 'POST',
		url: '/user/login',
		payload: userB,
	});
	t.equal(loginB.statusCode, 200, 'User B login ok');
	const tokenB = JSON.parse(loginB.payload).token;

	// Attempt to rename userB => userA
	const updateRes = await fastify.inject({
		method: 'PUT',
		url: '/user/userB/update',
		headers: { Authorization: `Bearer ${tokenB}` },
		payload: { currentPassword: 'passB', newUsername: 'userA' },
	});
	t.equal(updateRes.statusCode, 400, '400 for duplicate new username');
	t.match(JSON.parse(updateRes.payload).error, /already exists/i);
});


// TEST 13: linkGoogleAccount => positive and negative

t.test('Test 13: PUT /user/:username/link_google_account => positive/duplicate', async t => {
	// user1
	const user1 = { username: 'googleUser1', password: 'pass1' };
	const reg1 = await fastify.inject({
		method: 'POST',
		url: '/user/register',
		payload: user1,
	});
	t.equal(reg1.statusCode, 200, 'User1 registration ok');
	const login1 = await fastify.inject({
		method: 'POST',
		url: '/user/login',
		payload: user1,
	});
	t.equal(login1.statusCode, 200, 'User1 login ok');
	const token1 = JSON.parse(login1.payload).token;

	// Link google
	const linkRes1 = await fastify.inject({
		method: 'PUT',
		url: '/user/googleUser1/link_google_account',
		headers: { Authorization: `Bearer ${token1}` },
		payload: { email: 'google@example.com', google_id: 'GOOGLE123' },
	});
	t.equal(linkRes1.statusCode, 200, 'Google link for user1 => success');
	t.match(JSON.parse(linkRes1.payload).message, /Google account linked successfully/i);

	// user2
	const user2 = { username: 'googleUser2', password: 'pass2' };
	const reg2 = await fastify.inject({
		method: 'POST',
		url: '/user/register',
		payload: user2,
	});
	t.equal(reg2.statusCode, 200, 'User2 registration ok');
	const login2 = await fastify.inject({
		method: 'POST',
		url: '/user/login',
		payload: user2,
	});
	t.equal(login2.statusCode, 200, 'User2 login ok');
	const token2 = JSON.parse(login2.payload).token;

	// Try linking same google to user2 => 400
	const linkRes2 = await fastify.inject({
		method: 'PUT',
		url: '/user/googleUser2/link_google_account',
		headers: { Authorization: `Bearer ${token2}` },
		payload: { email: 'google@example.com', google_id: 'GOOGLE123' },
	});
	t.equal(linkRes2.statusCode, 400, 'Duplicate google account => 400');
	t.match(JSON.parse(linkRes2.payload).error, /already linked/i);

	t.end();
});


// TEST 14: Mismatch user => 400 in updateUser/linkGoogleAccount

t.test('Test 14: Mismatch user => returns 400 in updateUser/linkGoogleAccount', async t => {
	// Create mismatchUser
	const regRes = await fastify.inject({
		method: 'POST',
		url: '/user/register',
		payload: { username: 'mismatchUser', password: 'abc123' },
	});
	t.equal(regRes.statusCode, 200, 'mismatchUser registration ok');

	// login mismatchUser
	const loginRes = await fastify.inject({
		method: 'POST',
		url: '/user/login',
		payload: { username: 'mismatchUser', password: 'abc123' },
	});
	t.equal(loginRes.statusCode, 200, 'mismatchUser login ok');
	const mismatchToken = JSON.parse(loginRes.payload).token;

	// update mismatch => 400
	const mismatchUpdate = await fastify.inject({
		method: 'PUT',
		url: '/user/NotThisUser/update',
		headers: { Authorization: `Bearer ${mismatchToken}` },
		payload: { currentPassword: 'abc123', newPassword: 'neverUsed' },
	});
	t.equal(mismatchUpdate.statusCode, 400, 'Param mismatch => 400');
	t.match(JSON.parse(mismatchUpdate.payload).error, /permission|modify/i);

	// link mismatch => 400
	const mismatchLink = await fastify.inject({
		method: 'PUT',
		url: '/user/NotThisUser/link_google_account',
		headers: { Authorization: `Bearer ${mismatchToken}` },
		payload: { email: 'test@example.com', google_id: 'XYZ' },
	});
	t.equal(mismatchLink.statusCode, 400, 'Param mismatch => 400');
	t.match(JSON.parse(mismatchLink.payload).error, /permission|modify/i);

	t.end();
});


// TEST 15: uploadAvatar => invalid MIME, large file, mismatch, success

t.test('Test 15: uploadAvatar => checks for invalid mime, size limit, param mismatch, success', async t => {
	// Re-login testuser w/ new password from test #10
	const loginAgain = await fastify.inject({
		method: 'POST',
		url: '/user/login',
		payload: { username: 'testuser', password: 'supersecret' },
	});
	t.equal(loginAgain.statusCode, 200, 'Re-login success');
	const testuserToken = JSON.parse(loginAgain.payload).token;

	// Invalid MIME
	{
		const form = new FormData();
		form.append('file', Buffer.from('not an image'), {
			filename: 'test.txt',
			contentType: 'text/plain',
		});
		const invalidRes = await fastify.inject({
			method: 'PUT',
			url: '/user/testuser/upload_avatar',
			headers: { ...form.getHeaders(), Authorization: `Bearer ${testuserToken}`, },
			payload: await form.getBuffer(),
		});
		t.equal(invalidRes.statusCode, 400, '400 invalid mime');
		t.match(JSON.parse(invalidRes.payload).error, /Invalid file format/i);
	}

//	// File too large
//	{
//		const form = new FormData();
//		const bigBuffer = Buffer.alloc((2 * 1024 * 1024) + 1);
//		form.append('file', bigBuffer, {
//			filename: 'big.png',
//			contentType: 'image/png',
//		});
//		const bigRes = await fastify.inject({
//			method: 'PUT',
//			url: '/user/testuser/upload_avatar',
//			headers: { ...form.getHeaders(), Authorization: `Bearer ${testuserToken}`, },
//			payload: await form.getBuffer(),
//		});
//		t.equal(bigRes.statusCode, 400, '400 File is too large. Maximum size is 2MB.');
//		t.match(JSON.parse(bigRes.payload).error, /File is too large/i);
//	}

	// Param mismatch
	{
		const form = new FormData();
		// 1x1px valid PNG
		const tinyPngBuffer = Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==',
			'base64'
		);
		form.append('file', tinyPngBuffer, {
			filename: 'avatar.png',
			contentType: 'image/png',
		});
		const mismatchRes = await fastify.inject({
			method: 'PUT',
			url: '/user/SomeOtherUser/upload_avatar',
			headers: { ...form.getHeaders(), Authorization: `Bearer ${testuserToken}`, },
			payload: await form.getBuffer(),
		});
		t.equal(mismatchRes.statusCode, 400, '400 param mismatch');
		t.match(JSON.parse(mismatchRes.payload).error, /permission|modify/i);
	}

	// Success
	{
		const form = new FormData();
		const tinyPngBuffer = Buffer.from(
			'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==',
			'base64'
		);
		form.append('file', tinyPngBuffer, {
			filename: 'avatar.png',
			contentType: 'image/png',
		});
		const successRes = await fastify.inject({
			method: 'PUT',
			url: '/user/testuser/upload_avatar',
			headers: { ...form.getHeaders(), Authorization: `Bearer ${testuserToken}`, },
			payload: await form.getBuffer(),
		});
		t.equal(successRes.statusCode, 200, '200 success upload');
		t.match(JSON.parse(successRes.payload).message, /avatar uploaded succesfully/i);
	}

	t.end();
});


// TEST 16: getUserAvatar => 404 if no user, 200 if user found

t.test('Test 16: getUserAvatar => 404 not found user, 200 existing user', async t => {
	// 404 if user not found
	const notFoundRes = await fastify.inject({
		method: 'GET',
		url: '/user/NoSuchUser/avatar',
	});
	t.equal(notFoundRes.statusCode, 404, '404 if user not found');
	t.match(JSON.parse(notFoundRes.payload).error, /User not found/i);

	// 200 for existing testuser (assuming the file is physically present & fastify-static is configured)
	const avatarRes = await fastify.inject({
		method: 'GET',
		url: '/user/testuser/avatar',
	});
	t.equal(avatarRes.statusCode, 200, 'Returns 200 if user + avatar is found');
	t.end();
});


// TEST 17: removeAvatar => mismatch => 400, success => 200

t.test('Test 17: removeAvatar => param mismatch vs success', async t => {
	// Re-login to ensure a valid token
	const loginAgain = await fastify.inject({
		method: 'POST',
		url: '/user/login',
		payload: { username: 'testuser', password: 'supersecret' },
	});
	t.equal(loginAgain.statusCode, 200, 'Login again success');
	const testuserToken = JSON.parse(loginAgain.payload).token;

	// Mismatch
	const mismatchRes = await fastify.inject({
		method: 'PUT',
		url: '/user/NotTestuser/remove_avatar',
		headers: { Authorization: `Bearer ${testuserToken}` },
	});
	t.equal(mismatchRes.statusCode, 400, '400 mismatch');
	t.match(JSON.parse(mismatchRes.payload).error, /permission|modify/i);

	// Success
	const removeRes = await fastify.inject({
		method: 'PUT',
		url: '/user/testuser/remove_avatar',
		headers: { Authorization: `Bearer ${testuserToken}` },
	});
	t.equal(removeRes.statusCode, 200, '200 success remove');
	t.match(JSON.parse(removeRes.payload).message, /avatar removed succesfully/i);

	t.end();
});


// TEARDOWN: Clean up DB and close Fastify

t.teardown(async () => {
	try {
		await new Promise((resolve, reject) => {
			db.run('DELETE FROM users', err => (err ? reject(err) : resolve()));
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
