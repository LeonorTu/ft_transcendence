const db = require('../db')

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

const registerUser = (req, res) => {
	const { username, email, password } = req.body;
	req.log.info(`Received registration request: ${username}, ${email}`);

	db.get('SELECT * FROM users WHERE email = ?', [email], (err, existingUser) => {
		if (err) {
			req.log.error(`Database error: ${err.message}`);
			return res.status(500).send({ error: 'Database error: ' + err.message });
		}
		if (existingUser) {
			req.log.warn('User with this email already exists');
			return res.status(400).send({ error: "User with this email already exists" });
		}

		const newUser = {
			username,
			email,
			password,
		};

		db.run(
			'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
			[newUser.username, newUser.email, newUser.password],
			function (err) {
				if (err) {
					req.log.error(`Error inserting user: ${err.message}`);
					return res.status(500).send({ error: 'Database error: ' + err.message });
				}

				const userId = this.lastID

				req.log.info('User registered successfully');
				return res.status(200).send({
					id: userId,
					username: newUser.username,
				});
			}
		)
	})
}

module.exports = {
	getUsers,
	registerUser,
	getUser,
	updateUser,
}