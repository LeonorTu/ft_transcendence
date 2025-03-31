const {
	getUsers,
	registerUser,
	getUser,
	updateUser,
	loginUser,
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
				email: { type: 'string'},
				password: { type: 'string'},
			},
			required: ['username', 'email', 'password'],
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
				email: { type: 'string'},
				password: { type: 'string'},
			},
			required: ['email', 'password']
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

	fastify.get('/users', getUsersSchema)

	fastify.get('/user/:id', getUserSchema)

	fastify.put('/user/:id', updateUserSchema)

	fastify.post('/user/register', registerUserSchema)

	fastify.post('/user/login', loginUserSchema)
	
	done()
}

module.exports = usersRoutes