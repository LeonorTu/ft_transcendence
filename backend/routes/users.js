const db = require('../db')
const fs = require('fs')
const path = require('path')
const { pipeline } = require('node:stream/promises')

const {
	getUsers,
	registerUser,
	getUser,
	updateUser,
	loginUser,
	linkGoogleAccount,
} = require('../handlers/users')

const User = {
	type: 'object',
	properties: {
		id: { type: 'integer' },
		username: { type: 'string' },
	}
}

const errorResponse = {
	type: 'object',
	properties: {
		error: { type: 'string' },
	}
}

const getUsersSchema = {
	schema: {
		response: {
			200: {
				type: 'array',
				items: User,
			},
			404: errorResponse,
			500: errorResponse,
		},
	},
	handler: getUsers
}

const getUserSchema = {
	schema: {
		response: {
			200: User,
			404: errorResponse,
			500: errorResponse,
		},
	},
	handler: getUser
}

const registerUserSchema = {
	schema: {
		body: {
			type: 'object',
			properties: {
				username: { type: 'string'},
				password: { type: 'string'},
			},
			required: ['username', 'password'],
		},
		response: {
			200: User,
			400: errorResponse,
			500: errorResponse,
		},
	},
	handler: registerUser
}

const loginUserSchema = {
	schema: {
		body: {
			type: 'object',
			properties: {
				username: { type: 'string'},
				password: { type: 'string'},
			},
			required: ['username', 'password']
		},
		response: {
			200: {
				type: 'object',
				properties: {
					token: { type: 'string' }
				}
			},
			400: errorResponse,
			500: errorResponse,
		},
	},
	handler: loginUser
}

function usersRoutes(fastify, options, done) {

	const updateUserSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			body: {
				type: 'object',
				properties: {
					currentPassword: { type: 'string' },
					newPassword: { type: 'string' },
					newUsername: { type: 'string' },
				},
				required: ['currentPassword'],
				anyOf: [
					{ required: ['newPassword'] },
					{ required: ['newUsername'] },
				],
			},
			response: {
				200: {
				type: 'object',
					properties: {
						message: { type: 'string' }
					}
				},
				404: errorResponse,
				500: errorResponse,
			},
			security: [{ bearerAuth: [] }],
		},
		handler: updateUser
	};

	const linkGoogleAccountSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			body: {
				type: 'object',
				properties: {
					email: { type: 'string' },
					google_id: { type: 'string' },
				},
				required: [ 'email', 'google_id' ],
			},
			response: {
				200: {
					type: 'object',
					properties: {
						message: { type: 'string' }
					}
				},
				400: errorResponse,
				500: errorResponse,
			},
			security: [{ bearerAuth: [] }],
		},
		handler: linkGoogleAccount
	}

	fastify.get('/users', getUsersSchema)

	fastify.get('/user/:id', getUserSchema)

	fastify.post('/user/register', registerUserSchema)

	fastify.post('/user/login', loginUserSchema)
	
	fastify.put('/user/:username/update', updateUserSchema)

	fastify.put('/user/:username/link_google_account', linkGoogleAccountSchema)

	fastify.get('/user/:username/avatar',
	// {
		// onRequest: [fastify.authenticate],
		// schema: {
			// security: [{ bearerAuth: [] }],
		// }
	// },
	async (request, reply) => {
		// const avatarUrl = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${request.user.username}`;
		const avatarUrl = `https://api.dicebear.com/9.x/fun-emoji/svg?seed=user`;
		// request.log.info(`Fetching avatar for user: ${request.user.username}`);
	
		const avatarResponse = await fetch(avatarUrl);
		const svg = await avatarResponse.text();
	
		reply.type('image/svg+xml').send(svg);
	});

	fastify.get('/user/:username/avatar/', async (request, reply) => {
		const userName = request.params.username;

		try {
			const user = await new Promise((resolve, reject) => {
				db.get('SELECT avatar FROM users WHERE username = ?', [userName], (err, row) => {
					if (err) return reject(err);
						resolve(row);
					});
				});

			if (!user) {
				return reply.status(404).send({ error: 'User not found' });
			}
			const avatar = user.avatar
			if (avatar.startsWith('http'))
				return reply.redirect(avatar)
			else
				return reply.sendFile(path.basename(avatar), path.dirname(avatar))
		} catch (err) {
			request.log.error(`Error fetching avatar: ${err.message}`);
			reply.status(500).send({ error: 'Internal server error' });
		}
	});

/* 	fastify.put('/user/:username/update_avatar', async (request, reply) => {
		const customAvatar = request.body

		try {
			await new Promise((resolve, reject) => {
				db.run('UPDATE users SET avatar = ? WHERE username = ?', [customAvatar, request.user.username],
					(err) => {
						if (err)
							return reject(err)
						resolve()
					}
				)
			})
			return reply.status(200).send({ message: 'Avatar updated successfully'})
		} catch (err) {
			request.log.error(`Error updting avatar: ${err.message}`);
			return reply.status(500).send({ error: 'Internal server error' });
		}
	}) */

	fastify.post('/user/:username/upload_avatar', async (request, reply) => {
		const data = await request.file()
		request.log.info(request.params.username)
		filePath = path.join(__dirname, '../uploads/avatars', `${request.params.username}.png`)
		request.log.info(filePath)
		try {
			await pipeline(data.file, fs.createWriteStream(filePath))
			await new Promise((resolve, reject) => {
				db.run('UPDATE users SET avatar = ? WHERE username = ?',
					[filePath, request.params.username], // when adding auth check to update to request.user.username
					(err) => {
						if (err)
							return reject(err)
						resolve()
					}
				)
			})
			request.log.info('avatar uploaded succesfully')
			return reply.status(200).send({ message: 'avatar uploaded succesfully'})
		} catch (err) {
			request.log.error(`Error uploading avatar: ${err.message}`);
			return reply.status(500).send({ error: 'Internal server error' });
		}
	})

	done()
}

module.exports = usersRoutes

/* 
curl -X POST http://localhost:8888/user/register \
                                               -H "Content-Type: application/json" \
                                               -d '{"username": "aaa", "password": "AAA"}'
 */

/* 
curl -X POST http://localhost:8888/user/aaa/upload_avatar \
                                                  -F "file=@/home/mpellegr/Downloads/spike-2372543_1280.png"
 */