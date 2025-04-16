const fp = require("fastify-plugin")
const db = require('../db')

module.exports = fp(async function(fastify, opts) {
	// fastify.register(require("@fastify/jwt"), {
		// secret: "supersecret"
	// })

	fastify.decorate("authenticate", async function(request, reply) {
		try {
			await request.jwtVerify()
			
			const authHeader = request.headers.authorization
			const token = authHeader.split(' ')[1]
			if (!token)
				return reply.status(400).send({ error: "Missing token" });
			request.token = token

			const blacklisted = await new Promise((resolve, reject) => {
				db.get('SELECT 1 from token_blacklist WHERE token = ?', [token], (err, row) => {
					if (err)
						return reject(err)
					if (!row)
						return resolve(null)
					return resolve(row)
				})
			})
			if (blacklisted)
				return reply.status(401).send({ error: 'Token has been revoked' })
			
			return request.user
		} catch (err) {
			reply.send(err)
		}
	})
})