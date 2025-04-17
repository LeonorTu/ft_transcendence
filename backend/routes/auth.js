const fp = require("fastify-plugin")
const db = require('../db')
const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.TWOFA_GMAIL_USER,
		pass: process.env.TWOFA_GMAIL_PASSWORD
	}
})

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

	fastify.post('/2fa/send_email', async(request, reply) => {
		const userEmail = request.body.email
		// const code = '0000' // to change using a code generator
		const code = Math.floor(100000 + Math.random() * 900000).toString();
		/*
		Math.random() -> generates a random number between 0 and 1
		Math.random() * 900000 -> scales that number between 0 and 899999.999....
		100000 + Math.random() * 900000 -> shifts the range up to 100000 - 999999.999...
		*/
		try {
			await new Promise((resolve, reject) => {
				db.run('UPDATE users SET email = ?, 2fa_code = ?, 2fa_code_expiration = ?',
					[
						userEmail,
						code,
						Date.now() + 5 * 60 * 1000
					],
					(err) => {
						if (err)
							reject (err)
						return resolve()
					}
				)
			})
			const info = await transporter.sendMail({
				from: `"Transcendence" <${process.env.TWOFA_GMAIL_USER}>`,
				to: userEmail,
				subject: '2FA Code',
				text: `Your 2FA code is: ${code}`,
				html: `<p>Your 2FA code is: <b>${code}</b></p>`,
			})
			console.log("Message sent: %s", info.messageId);
			return reply.status(200).send({ message: '2FA code sent' });
		} catch (err) {
			console.error('Error sending email:', err);
			return reply.status(500).send({ error: 'Failed to send 2FA code' });
		}
	})
})

