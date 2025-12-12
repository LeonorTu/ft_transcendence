/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   server.test.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: mpellegr <mpellegr@student.hive.fi>        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/02 16:27:49 by jmakkone          #+#    #+#             */
/*   Updated: 2025/05/26 15:09:53 by mpellegr         ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const t = require('tap');
import { FastifyInstance } from 'fastify';
import { Database } from 'sqlite3';
import { spawn, ChildProcess } from 'child_process';

const fastify: FastifyInstance = require('../server');
const db: Database = require('../db');


// Test 1: Server initialization via fastify.ready() - Should start without errors.

t.test('Server initializes correctly via fastify.ready()', (t) => {
	fastify.ready((err: Error | null) => {
		t.error(err, 'Server started without errors');
		t.end();
	});
});


// Test 2: Server start() function - Runs when executed as main.

t.test('Server start() function runs when executed as main', (t) => {
	const child: ChildProcess = spawn('node', ['server.js'], {
		env: {
			...process.env,
			// Use an in-memory database for testing if not set.
			SQLITE_DB_PATH: process.env.SQLITE_DB_PATH || ':memory:',
		}
	});

	let output: string = '';

	child.stdout?.on('data', (data: Buffer) => {
		output += data.toString();
		if (output.includes(`Server running on port 8888`)) {
			t.match(
				output,
				/Server running on port 8888/,
				'Output contains the expected listening message'
			);
			// Send SIGINT to attempt a graceful shutdown.
			child.kill('SIGINT');
		}
	});

	child.on('exit', (code: number | null, signal: string | null) => {
		t.pass(`Child process exited with code ${code} and signal ${signal}`);
		t.end();
	});

	child.on('error', (err: Error) => {
		t.fail('Failed to spawn server.js: ' + err.message);
		t.end();
	});
});


// Test 3: Teardown - Close database and Fastify instance to clean up resources.

t.teardown(async () => {
	await new Promise<void>((resolve, reject) => {
		db.close((err) => (err ? reject(err) : resolve()));
	});
	await fastify.close();
});
