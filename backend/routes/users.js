let users = require('../Users')
// const { v4: uuidv4 } = require('uuid')
// const sqlite3 = require('sqlite3').verbose();

const {
	getUsers,
	registerUser,
	getUser,
} = require('../handlers/users')

const User = {
	type: 'object',
	properties: {
		id: { type: 'integer' },
		username: { type: 'string' },
	}
}

const getUsersSchema = {
	response: {
		200: {
			type: 'array',
			items: User,
		},
	},
}

const getUserSchema = {
	response: {
		200: User
	}
}

const registerUserSchema = {
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
		200: User
	}
}

function usersRoutes(fastify, options, done) {

	fastify.get('/users', { schema: getUsersSchema}, getUsers)

	fastify.get('/user/:id', {schema: getUserSchema}, getUser)

	fastify.put('/user/:id', (req, res) => {
		const { id } = req.params
		const { username } = req.body
		users = users.map((user) =>
			(user.id === id ? { id, username } : user))
		const updatedUser = users.find((user) =>
			user.id === id)
		return res.send({
			id: updatedUser.id,
			username: updatedUser.username
		})
	})

	fastify.post('/user/register', { schema: registerUserSchema }, registerUser)
	
	done()
}

module.exports = usersRoutes