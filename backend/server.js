const fastify = require('fastify')({ logger: true })
const sqlite3 = require('sqlite3').verbose();

fastify.register(require('./routes/users'))

const PORT = 8888

const start = async () => {
	try {
		await fastify.listen({ port: PORT, host: '0.0.0.0' })
		console.log(`Server listening on http://localhost:${PORT}`)
	} catch (error) {
		fastify.log.error(error)
		process.exit(1)
	}
}

start()