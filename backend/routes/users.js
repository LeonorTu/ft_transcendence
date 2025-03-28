let users = require('../Users')
const { v4: uuidv4 } = require('uuid')
const sqlite3 = require('sqlite3').verbose();

function usersRoutes(fastify, options, done) {

	const db = new sqlite3.Database('../SQLite/data/database.sqlite', (err) => {
		if (err) {
		  fastify.log.error(`Error opening database: ${err.message}`);
		  return;
		}
		fastify.log.info('Connected to the SQLite database.');
	});

	fastify.get('/users', (req, res) => {
		db.all('SELECT id, username FROM users', [], (err, rows) => {
			if (err) {
				fastify.log.error(`Error fetching users: ${err.message}`);
				return res.status(500).send({ error: 'Database error' });
			  }
			  return res.send(rows);
		})
		// const returnUsers = users.map(user => ({
		// 	id: user.id,
		// 	username: user.username
		// }))
		// return res.send(returnUsers)
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
		const { username, email, password } = req.body;
		fastify.log.info(`Received registration request: ${username}, ${email}`);
	
		if (!username || !email || !password) {
			fastify.log.error('Missing required fields');
			return res.status(400).send({
				error: "Missing required fields: username, email, password"
			});
		}
	
		db.get('SELECT * FROM users WHERE email = ?', [email], (err, existingUser) => {
			if (err) {
				fastify.log.error(`Database error: ${err.message}`);
				return res.status(500).send({ error: 'Database error: ' + err.message });
			}
			if (existingUser) {
				fastify.log.warn('User with this email already exists');
				return res.status(400).send({ error: "User with this email already exists" });
			}
	
			const newUser = {
				id: uuidv4(),
				username,
				email,
				password,
			};
	
			db.run(
				'INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)',
				[newUser.id, newUser.username, newUser.email, newUser.password],
				(err) => {
					if (err) {
						fastify.log.error(`Error inserting user: ${err.message}`);
						return res.status(500).send({ error: 'Database error: ' + err.message });
					}
					fastify.log.info('User registered successfully');
					return res.status(200).send({
						id: newUser.id,
						username: newUser.username,
					});
				}
			)
		})
	
		// const existingUser = users.find((user) => user.email === email);
		// if (existingUser) {
		// 	return res.status(400).send({
		// 		error: "User with this email already exists"
		// 	})
		// }
		// const newUser = {
		// 	id: uuidv4(),
		// 	username,
		// 	email,
		// 	password,
		// }
		// users.push(newUser)
		// return res.status(200).send({
		// 	id: newUser.id,
		// 	username: newUser.username
		// })
	})
	
	done()
}

module.exports = usersRoutes