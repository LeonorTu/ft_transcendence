const db = require('../db')
const bcrypt = require('bcryptjs')

const {
	getUsers,
	registerUser,
	getUser,
	getCurrentUser,
	updateUser,
	loginUser,
	logoutUser,
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
		email: { type: 'string' },
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
				email: { type: 'string' },
			},
			required: ['username', 'password', 'email' ],
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
				anyOf: [
					{
						type: 'object',
						properties: {
							token: { type: 'string' }
						},
						required: ['token'],
					},
					successResponse
				]
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
		querystring: {
			type: 'object',
			properties: {
				page: { type: 'integer', default: 1 },
				limit: { type: 'integer', default: 10 }
			}
		},
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

	const logoutUserSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			response: {
				200: successResponse,
				400: errorResponse,
				401: errorResponse,
			},
			security: [{ bearerAuth: [] }],
		},
		handler: logoutUser
	}

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

	const getCurrentUserSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			response: {
				200: User,
				404: errorResponse,
				500: errorResponse,
			},
			security: [{ bearerAuth: [] }],
		},
		handler: getCurrentUser,
	};

	fastify.get('/users', getUsersSchema)

	fastify.get('/user/:username', getUserSchema)

	fastify.post('/user/register', registerUserSchema)

	fastify.post('/user/login', loginUserSchema)

	fastify.post('/user/logout', logoutUserSchema)

	fastify.put('/user/:username/update', updateUserSchema)

	fastify.get('/user/:username/avatar', getUserAvatarSchema)

	fastify.put('/user/:username/upload_avatar', uploadAvatarSchema)

	fastify.put('/user/:username/remove_avatar', removeAvatarSchema)

	fastify.post('/add_friend', addFriendSchema)

	fastify.get('/user/:username/friends', getUserFriendsSchema)

	fastify.delete('/remove_friend/:friendshipId', removeFriendSchema)

	fastify.put('/update_online_status/:username', updateOnlineStatusSchema)

	fastify.get('/user/me', getCurrentUserSchema);

	fastify.post('/check_password', async(request, reply) => {
		const username = request.body.selected
		const inPwd = request.body.password
		console.log(username)
		console.log(inPwd)
		try {
			const storedPwd = await new Promise((resolve, reject) => {
				db.get('SELECT password FROM users WHERE username = ?', [username], (err, row) => {
					if (err)
						return reject(err)
					if (!row)
						return resolve(null)
					resolve(row.password)
				})
			})
			if (storedPwd === null) {
				return reply.status(404).send({ error: 'User not found' });
			}
			// Use bcrypt to compare the plain‑text input to the stored hash
			const passwordsMatch = await bcrypt.compare(inPwd, storedPwd);
			if (!passwordsMatch) {
				return reply.status(401).send({ error: 'Invalid password' });
			}
			// If we get here, the password is correct:
			return reply.send({ ok: true });
		} catch (err) {
			request.log.error(`Error checking password for ${username}: ${err.message}`);
			return reply.status(500).send({ error: 'Internal server error' });
		}
	})

	done()
}

module.exports = usersRoutes