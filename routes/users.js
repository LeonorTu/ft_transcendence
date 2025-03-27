let users = require('../Users')
const { v4: uuidv4 } = require('uuid')

function usersRoutes(fastify, options, done) {
	
	fastify.get('/users', (req, res) => {
		const returnUsers = users.map(user => ({
			id: user.id,
			username: user.username
		}))
		return res.send(returnUsers)
	})

	fastify.get('/user/:id', (req, res) => {
		const { id } = req.params
		const user = users.find((user) => user.id === id)
		return res.status(200).send({
			id: user.id,
			username: user.username
		})
	})

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

	fastify.post('/user/register', (req, res) => {
		const { username, email, password } = req.body
		if (!username || !email || !password) {
			return res.status(400).send({
				error: "Missing required fields: username, email, password"
			})
		}
		const existingUser = users.find((user) => user.email === email);
		if (existingUser) {
			return res.status(400).send({
				error: "User with this email already exists"
			})
		}
		const newUser = {
			id: uuidv4(),
			username,
			email,
			password,
		}
		users.push(newUser)
		return res.status(200).send({
			id: newUser.id,
			username: newUser.username
		})
	})
	
	done()
}

module.exports = usersRoutes