const db = require('../db')

const {
	getUsers,
	registerUser,
	getUser,
	updateUser,
	loginUser,
	linkGoogleAccount,
	uploadAvatar,
	getUserAvatar,
	removeAvatar,
	addFriend,
	updateOnlineStatus,
	getUserFriends,
	removeFriend,
} = require('../handlers/users')

const User = {
	type: 'object',
	properties: {
		id: { type: 'integer' },
		username: { type: 'string' },
		avatar: { type: 'string'},
		online_status: {typ : 'string' },
	}
}

const errorResponse = {
	type: 'object',
	properties: {
		error: { type: 'string' },
	}
}

const successResponse = {
	type: 'object',
	properties: {
		message: { type: 'string' },
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

const getUserAvatarSchema = {
	schema: {
		response: {
			200: {
				type: 'object',
				properties: {
					file: {
						type: 'string',
						example: 'username_default.png' },
				}
			},
			404: errorResponse,
			500: errorResponse
		}
	},
	handler: getUserAvatar
}

const getUserFriendsSchema = {
	schema: {
		response: {
			200: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						id: { type: 'integer' },
						user_id: { type : 'integer' },
						friend_id: { type: 'integer' },
					}
				}
			},
			404: errorResponse,
			500: errorResponse
		}
	},
	handler: getUserFriends
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
				200: successResponse,
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
				200: successResponse,
				400: errorResponse,
				500: errorResponse,
			},
			security: [{ bearerAuth: [] }],
		},
		handler: linkGoogleAccount
	}

	const uploadAvatarSchema = {
		onRequest: [fastify.authenticate],
		schema: {
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
		handler: uploadAvatar
	}

	const removeAvatarSchema = {
		onRequest: [fastify.authenticate],
		schema: {
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
		handler: removeAvatar
	}

	const addFriendSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			body: {
				type: 'object',
				properties: {
					user_id: { type: 'integer' },
					friend_id: { type: 'integer' },
				},
				required: [ 'user_id', 'friend_id' ],
			},
			response: {
				200: successResponse,
				400: errorResponse,
				409: errorResponse,
				500: errorResponse
			},
			security: [{ bearerAuth: [] }],
		},
		handler: addFriend
	}

	const removeFriendSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			response: {
				200: successResponse,
				400: errorResponse,
				500: errorResponse
			},
			security: [{ bearerAuth: [] }],
		},
		handler: removeFriend
	}

	const updateOnlineStatusSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			body: {
				type: 'object',
				properties: {
					status: { type: 'string' },
				},
				required: [ 'status' ],
			},
			response: {
				200: successResponse,
				400: errorResponse,
				500: errorResponse
			},
			security: [{ bearerAuth: [] }],
		},
		handler: updateOnlineStatus
	}

	fastify.get('/users', getUsersSchema)

	fastify.get('/user/:id', getUserSchema)

	fastify.post('/user/register', registerUserSchema)

	fastify.post('/user/login', loginUserSchema)

	fastify.post('/user/logout', { onRequest: [fastify.authenticate] }, async(request, reply) => {
		try{
			const authHeader = request.headers.authorization
			const userId = request.user.id
			
			// console.log(`header = ${authHeader}`)
			
			if (!authHeader || !authHeader.startsWith('Bearer'))
				return reply.status(400).send({ error: 'No token provided' })
			
			const token = authHeader.split(' ')[1]
			
			await request.jwtVerify()
			
			// console.log(`token = ${token}`)

			const decoded = fastify.jwt.decode(token)
			const expiresAt = decoded.exp
			// console.log(`expires at: ${expiresAt}`)
			// const now = Math.floor(Date.now() / 1000)
			// console.log(`now = ${now}`)
			// console.log(`real time = ${(expiresAt - now) / 60 / 60}`)

			await new Promise((resolve, reject) => {
				db.run('INSERT INTO token_blacklist (token, expiration) VALUES (?, ?)', [token, expiresAt], (err) => {
					if (err)
						return reject(err)
					resolve()
				})
			})

			await new Promise((resolve, reject) => {
				db.run('UPDATE users SET online_status = ? where id = ?', ['offline', userId], (err) => {
					if (err)
						return reject(err)
					return resolve()
				})
			})

			return reply.send({ message: 'Logged out successfully' });
		} catch (err) {
			return reply.status(401).send({ error: 'Invalid token' });
		}
	})

	fastify.put('/user/:username/update', updateUserSchema)

	fastify.put('/user/:username/link_google_account', linkGoogleAccountSchema)

	fastify.get('/user/:username/avatar', getUserAvatarSchema)

	fastify.put('/user/:username/upload_avatar', uploadAvatarSchema)

	fastify.put('/user/:username/remove_avatar', removeAvatarSchema)

	fastify.post('/add_friend', addFriendSchema)

	fastify.get('/user/:username/friends', getUserFriendsSchema)

	fastify.delete('/remove_friend/:friendshipId', removeFriendSchema)

	fastify.put('/update_online_status/:username', updateOnlineStatusSchema)

	done()
}

module.exports = usersRoutes