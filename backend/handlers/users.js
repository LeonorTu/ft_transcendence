const db = require('../db')
const bcrypt = require('bcryptjs')

const getUsers = (req, res) => {
	db.all('SELECT id, username FROM users', [], (err, rows) => {
		if (err) {
			req.log.error(`Error fetching users: ${err.message}`);
			return res.status(500).send({error: 'Database error: ' +  + err.message });
		}
		if (rows.length === 0) {
			req.log.warn('No users in database')
			return res.status(404).send({error: 'No users found'})
		}
		return res.send(rows);
	})
}

const getUser = (req, res) => {
	const { id } = req.params
	db.get('SELECT * from users WHERE id = ?', [id], (err, row) => {
		if (err) {
			req.log.error(`Error fetching user: ${err.message}`);
			return res.status(500).send({ error: 'Database error: ' + err.message });
		}
		if (!row) {
			req.log.warn(`User with id ${id} not found`)
			return res.status(404).send({error: `User with id ${id} not found`})
		}
		return res.send(row)
	})
}

const updateUser = (req, res) => {
	const { id } = req.params
	const { username } = req.body
	db.run('UPDATE users SET username = ? WHERE id = ?', [username, id],
		function(err) {
			if (err) {
				req.log.error(`Error updating user: ${err.message}`);
				return res.status(500).send({ error: 'Database error: ' + err.message });
			}
			if (this.changes === 0) {
				req.log.warn(`User with id ${id} not found`)
				return res.status(404).send({ error: `User with id ${id} not found` });
			}
			req.log.info(`User with ID ${id} updated successfully`);
			return res.status(200).send({ id: Number(id), username });
		}
	)
}

const registerUser = async (req, res) => {
	const { username, password } = req.body;
	req.log.info(`Received registration request: ${username}`);

	try {
		const existingUser = await new Promise((resolve, reject) => {
			db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
				if (err) return reject(err);
					resolve(row);
			});
		});

		if (existingUser) {
			req.log.warn('User with this username already exists');
			return res.status(400).send({ error: "User with this username already exists" });
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		// console.log(hashedPassword);

		const newUser = {
			username,
			password: hashedPassword,
		};

		const userId = await new Promise((resolve, reject) => {
			db.run(
				'INSERT INTO users (username, password) VALUES (?, ?)',
				[newUser.username, newUser.password],
				function (err) {
					if (err) return reject(err);
						resolve(this.lastID);
				}
			);
		});

		req.log.info('User registered successfully');
		return res.status(200).send({
			id: userId,
			username: newUser.username,
		});

	} catch (err) {
		req.log.error(`Error: ${err.message}`);
		return res.status(500).send({ error: 'Internal server error' });
	}
};

const loginUser = async (req, reply) => {
	const { username, password } = req.body;
	req.log.info(`Received login request from: ${username}`);
	try {
		const user = await new Promise((resolve, reject) => {
			db.get('SELECT id, username, password FROM users WHERE username = ?', [username], (err, user) => {
				if (err)
					return reject(err);
				resolve(user);
			});
		});

		if (!user) {
			req.log.warn('Invalid username or password');
			return reply.status(400).send({ error: 'Invalid username or password' });
		}

		const match = await bcrypt.compare(password, user.password);
		if (!match) {
			req.log.warn('Password mismatch');
			return reply.status(401).send({ error: 'Invalid credentials' });
		}

		const token = await reply.jwtSign({ id: user.id, username: user.username });
		req.log.info(`Generated JWT token for user ${user.username}`);

		return reply.send({ token });
	} catch (err) {
		req.log.error(`Error during login: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
};

const linkGoogleAccount = async (request, reply) => {
	const { email, google_id } = request.body
	const userId = request.user.id
	try {
		const existingGoogleUser = await new Promise((resolve, reject) => {
			db.get('SELECT * FROM users WHERE google_id = ?', [google_id], (err, row) => {
				if (err)
					return reject(err);
				resolve(row);
			})
		})
		if (existingGoogleUser) {
			request.log.warn('This Google account is already linked with another user')
			return reply.status(400).send({ error: 'This Google account is already linked with another user'})
		}
		await new Promise((resolve, reject) => {
			db.run('UPDATE users SET email = ?, google_id = ? WHERE id = ?', [email, google_id, userId], function (err) {
				if (err) return reject(err);
				resolve(this.changes);
			})
		})
		request.log.info('Google account linked successfully')
		return reply.status(200).send({ messge: 'Google account linked successfully'})
	} catch (err) {
		request.log.error(`Error linking google account: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
}

module.exports = {
	getUsers,
	registerUser,
	getUser,
	updateUser,
	loginUser,
	linkGoogleAccount,
}