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

const updateUserSchema = {
	schema: {
		response: {
			200: User,
			404: errorResponse,
			500: errorResponse,
		},
	},
	handler: updateUser
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

const linkGoogleAccountSchema = {
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
		}
	},
	// handler: linkGoogleAccount
}

function usersRoutes(fastify, options, done) {

	fastify.get('/users', getUsersSchema)

	fastify.get('/user/:id', getUserSchema)

	fastify.put('/user/:id', updateUserSchema)

	fastify.post('/user/register', registerUserSchema)

	fastify.post('/user/login', loginUserSchema)

	fastify.put('/user/link_google_account',
		{
			onRequest: [fastify.authenticate],
			schema: linkGoogleAccountSchema
		},
		linkGoogleAccount
	)
	
	done()
}

module.exports = usersRoutes