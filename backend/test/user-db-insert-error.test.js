// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   user-db-insert-error.test.js                       :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/03 01:33:35 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/04 14:24:23 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const t = require('tap');

// Mock the db module but only fail the INSERT
const dbMock = {
	// Simulate "SELECT * FROM users WHERE username = ?" returning no user found.
	get: (sql, params, cb) => {
		if (/SELECT \* FROM users WHERE username/i.test(sql)) {
			cb(null, null); // No user found, so proceed to insert.
		} else {
			cb(new Error('Unexpected DB call in get()'));
		}
	},

	// Force an error on INSERT.
	run: (sql, params, cb) => {
		if (/INSERT INTO users/i.test(sql)) {
			cb(new Error('Simulated DB insert error'));
		} else {
			cb(new Error('Unexpected DB call in run()'));
		}
	},

	// Not used by this route, but must exist if other parts of the code call it.
	all: (sql, params, cb) => cb(new Error('Unexpected DB call in all()'), null),
};

const fastify = t.mockRequire('../server', {
	'../db': dbMock,
});

/**
 * Test 1: POST /user/register - Fails due to DB INSERT error.
 */
t.test('POST /user/register -> fails on INSERT', async t => {
	// Because "SELECT user" returns null, the code will try INSERT and fail.
	const response = await fastify.inject({
		method: 'POST',
		url: '/user/register',
		payload: {
			username: 'mockFail',
			password: 'somepass'
		}
	});

	t.equal(response.statusCode, 500, 'Should return 500 on INSERT error');
	const payload = JSON.parse(response.payload);
	t.match(payload.error, /internal server error/i, 'Matches the 500 error response');
	t.end();
});

/**
 * Test 2: GET /users - Returns 404 when no users exist (empty result).
 */
t.test('GET /users returns 404 when no users exist (empty result)', async t => {
	// Create a mock DB that returns an empty array for the query in getUsers.
	const dbEmptyMock = {
		all: (sql, params, cb) => {
			if (/SELECT id, username FROM users/.test(sql)) {
				// Return an empty array to simulate no users.
				cb(null, []);
			} else {
				cb(new Error('Unexpected DB call in all()'), null);
			}
		}
	};

	// Load the server with our mock DB.
	const fastifyEmpty = t.mockRequire('../server', {
		'../db': dbEmptyMock,
	});

	const res = await fastifyEmpty.inject({
		method: 'GET',
		url: '/users',
	});
	t.equal(res.statusCode, 404, 'Should return 404 when no users exist');
	const body = JSON.parse(res.payload);
	t.match(body.error, /No users found/i, 'Proper error message is returned');

	await fastifyEmpty.close();
	t.end();
});

/**
 * Test 3: PUT /user/update - Returns 500 when DB.get fails in updateUser.
 * This forces the catch block to be executed.
 */
t.test('PUT /user/update returns 500 when DB.get fails in updateUser', async t => {
	const dbFailUpdateMock = {
		get: (sql, params, cb) => {
			if (/SELECT id, username, password FROM users WHERE id = \?/.test(sql)) {
				cb(new Error('Simulated updateUser db.get error'));
			} else {
				cb(null, null);
			}
		}
	};

	// Load the server with the failing DB mock and mock JWT verification.
	const fastifyUpdateFail = t.mockRequire('../server', {
		'../db': dbFailUpdateMock,
		'@fastify/jwt': function(fastify, opts, done) {
			// Mock the jwtVerify directly.
			fastify.decorateRequest('jwtVerify', async function () {
				this.user = { id: 1, username: 'testuser' };
			});
			done();
		}
	});

	fastifyUpdateFail.decorateRequest('jwtVerify', async function () {
		this.user = { id: 1, username: 'testuser' };
	}, []);  // explicitly empty array of dependencies

	// Call the route, passing some Authorization header.
	const res = await fastifyUpdateFail.inject({
		method: 'PUT',
		url: '/user/update',
		headers: { Authorization: 'Bearer faketoken' },
		payload: { currentPassword: 'anything', newPassword: 'newpass' }
	});

	t.equal(res.statusCode, 500, 'updateUser should return 500 when DB error occurs');
	const body = JSON.parse(res.payload);
	t.match(body.error, /Internal server error/i, 'Error message matches expected output');

	await fastifyUpdateFail.close();
	t.end();
});

/**
 * Test 4: PUT /user/link_google_account - Returns 500 when DB.get fails in linkGoogleAccount.
 * This forces the catch block in linkGoogleAccount to be executed.
 */
t.test('PUT /user/link_google_account returns 500 when DB.get fails in linkGoogleAccount', async t => {
	// Create a mock DB that simulates an error when checking for an existing Google account.
	const dbFailLinkMock = {
		get: (sql, params, cb) => {
			if (/SELECT \* FROM users WHERE google_id = \?/.test(sql)) {
				cb(new Error('Simulated linkGoogleAccount db.get error'), null);
			} else {
				cb(null, null);
			}
		},
		// Provide a dummy run in case it is called later.
		run: (sql, params, cb) => {
			cb(null, { lastID: 1, changes: 1 });
		}
	};

	const fastifyLinkFail = t.mockRequire('../server', {
		'../db': dbFailLinkMock,
		'@fastify/jwt': function(fastify, opts, done) {
			fastify.decorateRequest('jwtVerify', async function () {
				this.user = { id: 1, username: 'dummy', password: '$2a$10$dummyhash' };
			});
			done();
		}
	});

	fastifyLinkFail.decorateRequest('jwtVerify', async function () {
		this.user = { id: 1, username: 'dummy', password: '$2a$10$dummyhash' };
	}, []);  // explicitly empty array of dependencies

	const res = await fastifyLinkFail.inject({
		method: 'PUT',
		url: '/user/link_google_account',
		headers: { Authorization: 'Bearer faketoken' },
		payload: { email: 'x@example.com', google_id: 'failTest' }
	});

	t.equal(res.statusCode, 500, 'linkGoogleAccount should return 500 when DB error occurs');
	const body = JSON.parse(res.payload);
	t.match(body.error, /Internal server error/i, 'Proper error message is returned');

	await fastifyLinkFail.close();
	t.end();
});

/**
 * Teardown: Close Fastify instance.
 */
t.teardown(async () => {
	await fastify.close();
});
