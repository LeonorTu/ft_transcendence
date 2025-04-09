const fastify = require('fastify')({
	logger: true,
})
const { WebSocketServer, WebSocket } = require('ws')
const PORT = 7777

fastify.listen({port: PORT}, (err, address) => {
	if (err) {
		console.error(err)
		process.exit(1)
	}
	console.log(`listening on ${address}`)

	const wss = new WebSocketServer({ noServer: true }) // Don't bind WebSocket handling to an HTTP server directly. I’ll manually handle the upgrade event.

	fastify.server.on('upgrade', (req, socket, head) => {
		// socket.on('error', onSocketPreError);
	
		// Simple auth check: reject if 'BadAuth' header exists
		// if (req.headers['badauth']) {
		// 	socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
		// 	socket.destroy();
		// 	return;
		// }
	
		// Handle the WebSocket upgrade
		wss.handleUpgrade(req, socket, head, (ws) => {
			// socket.removeListener('error', onSocketPreError);
			wss.emit('connection', ws, req);
		});
	});

	wss.on('connection', (ws, req) => {
		console.log('New WebSocket connection')
		ws.on('message', (msg, isBinary) => {
			wss.clients.forEach((client) => {
				if (client !== ws && client.readyState === WebSocket.OPEN) {
					client.send(msg, { binary: isBinary })
				}
			})
		})
		ws.on('close', () => {
			console.log('Connection closed')
		})
	})
})