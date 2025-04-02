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
	
	fastify.put('/user/update', updateUserSchema)

	fastify.put('/user/link_google_account', linkGoogleAccountSchema)

	fastify.get('/user/avatar',
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

	fastify.get('user/avatar/:id', async (request, reply) => {
		const id = request.user.id


	})
	
	
	done()
}

module.exports = usersRoutes