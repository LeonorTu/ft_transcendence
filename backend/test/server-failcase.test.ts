// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   server-failcase.test.ts                            :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: jmakkone <jmakkone@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/03 01:56:01 by jmakkone          #+#    #+#             //
//   Updated: 2025/04/09 17:27:19 by jmakkone         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const t = require('tap');
import { spawn, ChildProcess } from 'child_process';
import * as net from 'net';


// Test 1: server.js fails to bind port - Triggers catch block.
// This test occupies port 8888 to force a port bind failure when server.js is spawned.

t.test('server.js fails to bind port -> triggers catch block', (t) => {
	// Occupy port 8888 so the second server can't bind.
	const dummyServer = net.createServer();
	dummyServer.listen(8888, '127.0.0.1', () => {
		// Spawn server.js in a child process.
		const child: ChildProcess = spawn('node', ['server.js'], {
			env: {
				...process.env,
				// Override any DB path or other env if needed.
				SQLITE_DB_PATH: process.env.SQLITE_DB_PATH || ':memory:',
			},
			cwd: process.cwd()
		});

		let output: string = '';
		child.stdout?.on('data', (data: Buffer) => {
			output += data.toString();
		});
		child.stderr?.on('data', (data: Buffer) => {
			output += data.toString();
		});

		child.on('exit', (code: number | null, signal: string | null) => {
			t.equal(code, 1, 'Child process should exit with code 1 on port bind failure');
			t.match(output, /listen EADDRINUSE|fastify.log.error/, 'Error log or EADDRINUSE present');
			dummyServer.close();  // Release the port.
			t.end();
		});
	});

	dummyServer.on('error', (err: Error) => {
		t.fail('Failed to occupy port 8888: ' + err.message);
		t.end();
	});
});
