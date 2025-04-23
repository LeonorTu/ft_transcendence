const db = require('../db')
const bcrypt = require('bcryptjs')
const fs = require('fs')
const path = require('path')
// const { pipeline } = require('node:stream/promises')
const sharp = require('sharp');

const getUsers = (request, reply) => {
	db.all('SELECT id, username, email FROM users', [], (err, rows) => {
		if (err) {
			request.log.error(`Error fetching users: ${err.message}`);
			return reply.status(500).send({error: 'Database error: ' + err.message });
		}
		if (rows.length === 0) {
			request.log.warn('No users in database')
			return reply.status(404).send({error: 'No users found'})
		}
		return reply.send(rows);
	})
}

const getUser = (request, reply) => {
	const { username } = request.params
	db.get('SELECT * from users WHERE username = ?', [username], (err, row) => {
		if (err) {
			request.log.error(`Error fetching user: ${err.message}`);
			return reply.status(500).send({ error: 'Database error: ' + err.message });
		}
		if (!row) {
			request.log.warn(`User ${username} not found`)
			return reply.status(404).send({error: `User ${username} not found`})
		}
		// row.avatar = `http://localhost:8888/user/${row.username}/avatar`
		return reply.send(row)
	})
}

const registerUser = async (request, reply) => {
	const { username, email, password } = request.body;
	request.log.info(`Received registration request: ${username}`);

	try {
		const existingUser = await new Promise((resolve, reject) => {
			db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
				if (err) return reject(err);
					resolve(row);
			});
		});

		if (existingUser) {
			request.log.warn('User with this username already exists');
			return reply.status(400).send({ error: "User with this username already exists" });
		}

		const existingEmail = await new Promise((resolve, reject) => {
			db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
				if (err) return reject(err);
				resolve(row);
			});
		});

		if (existingEmail) {
			request.log.warn('User with this email already exists');
			return reply.status(400).send({ error: "Email address already registered. Please login or use a different email." });
		  }

		const hashedPassword = await bcrypt.hash(password, 10);
		// console.log(hashedPassword);
		let fileName
		try {
			const avatarResponse = await fetch(`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${username}`)
			if (!avatarResponse.ok)
				throw new Error('External avatar API returned an error')
			const svg = await avatarResponse.text()
			fileName = `${username}_default.png`
			const filePath = path.join(__dirname, '../uploads/avatars', fileName)
			await sharp(Buffer.from(svg)).resize(256, 256).png().toFile(filePath)
			request.log.info('Default avatar downloaded and converted to PNG');
		} catch (avatarError) {
			request.log.error(`Avatar generation failed: ${avatarError.message}. Using fallback avatar.`)
			fileName = 'fallback.jpeg'
		}

		const newUser = {
			username,
			email,
			password: hashedPassword,
			avatar: fileName,
		};

		const userId = await new Promise((resolve, reject) => {
			db.run(
				'INSERT INTO users (username, email, password, avatar, online_status) VALUES (?, ?, ?, ?, ?)',
				[newUser.username, newUser.email, newUser.password, newUser.avatar, 'offline'],
				function (err) {
					if (err) return reject(err);
						resolve(this.lastID);
				}
			);
		});

		request.log.info('User registered successfully');
		return reply.status(200).send({
			id: userId,
			username: newUser.username,
			email: newUser.email
		});

	} catch (err) {
		request.log.error(`Error: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
};

const loginUser = async (request, reply) => {
	const { username, password } = request.body;
	request.log.info(`Received login request from: ${username}`);
	try {
		const user = await new Promise((resolve, reject) => {
			db.get('SELECT id, username, password FROM users WHERE username = ?', [username], (err, user) => {
				if (err)
					return reject(err);
				resolve(user);
			});
		});

		if (!user) {
			request.log.warn('Invalid username or password');
			return reply.status(400).send({ error: 'Invalid username or password' });
		}

		const match = await bcrypt.compare(password, user.password);
		if (!match) {
			request.log.warn('Password mismatch');
			return reply.status(401).send({ error: 'Invalid credentials' });
		}

		const token = await reply.jwtSign({ id: user.id, username: user.username } ,{ expiresIn: '24h'});
		request.log.info(`Generated JWT token for user ${user.username}`);

		await new Promise((resolve, reject) => {
			db.run('UPDATE users SET online_status = ? WHERE id = ?', ['online', user.id], (err) => {
				if (err)
					return reject(err)
				resolve()
			})
		})
		return reply.send({ token });
	} catch (err) {
		request.log.error(`Error during login: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
};

const logoutUser = async(request, reply) => {
	try{
		const userId = request.user.id
		const token = request.token

		const decoded = request.jwtDecode(token)
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

		return reply.status(200).send({ message: 'Logged out successfully' });
	} catch (err) {
		request.log.warn('Invalid token')
		return reply.status(401).send({ error: 'Invalid token' });
	}
}

const updateUser = async (request, reply) => {
	const { currentPassword, newPassword, newUsername } = request.body
	const userId = request.user.id
	request.log.info(`Received update credentials request from: ${request.user.username}`);
	try {
		const user = await new Promise((resolve, reject) => {
			db.get('SELECT id, username, password FROM users WHERE id = ?', [userId], (err, user) => {
				if (err)
					return reject(err);
				resolve(user);
			});
		})
		
		if (!user) {
			request.log.warn('User not found');
			return reply.status(400).send({ error: 'User not found' });
		}
		
		const match = await bcrypt.compare(currentPassword, user.password);
		if (!match) {
			request.log.warn('Password mismatch');
			return reply.status(401).send({ error: 'Current password is not correct' });
		}

		if (request.params.username != request.user.username) {
			request.log.warn(`${request.user.username} is trying to update ${request.params.username}`)
			return reply.status(400).send({ error: `You don't have permission to modify ${request.params.username}` });
		}

		if (newPassword) {
			const hashedPassword = await bcrypt.hash(newPassword, 10);
			await new Promise((resolve, reject) => {
				db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId], function (err) {
					if (err)
						return reject(err)
					resolve(this.changes)
				})
			})
		}

		if (newUsername) {
			const existingUser = await new Promise((resolve, reject) => {
				db.get('SELECT * FROM users WHERE username = ?', [newUsername], (err, row) => {
					if (err) return reject(err);
						resolve(row);
				});
			});
	
			if (existingUser) {
				request.log.warn('User with this username already exists');
				return reply.status(400).send({ error: "User with this username already exists" });
			}

			await new Promise((resolve, reject) => {
				db.run('UPDATE users SET username = ? WHERE id = ?', [newUsername, userId], function (err) {
					if (err)
						return reject(err)
					resolve(this.changes)
				})
			})
		}
		request.log.info(`User with ID ${userId} updated successfully`);
		return reply.status(200).send({ message: 'User credentials updated successfully'})
	} catch (err) {
		request.log.error(`Error updting user credentials: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
}

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
		if (request.params.username != request.user.username) {
			request.log.warn(`${request.user.username} is trying to update ${request.params.username}`)
			return reply.status(400).send({ error: `You don't have permission to modify ${request.params.username}` });
		}
		await new Promise((resolve, reject) => {
			db.run('UPDATE users SET email = ?, google_id = ? WHERE id = ?', [email, google_id, userId], function (err) {
				if (err)
					return reject(err);
				resolve(this.changes);
			})
		})
		request.log.info('Google account linked successfully')
		return reply.status(200).send({ message: 'Google account linked successfully'})
	} catch (err) {
		request.log.error(`Error linking google account: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
}

const uploadAvatar = async (request, reply) => {
	const data = await request.file()
	const chunks = []
	for await (const chunk of data.file) {
		chunks.push(chunk)
	}
	const fileBuffer = Buffer.concat(chunks)
	const allowedMimeTypes = [ 'image/png', 'image/jpeg' ]
	try {
		if (!allowedMimeTypes.includes(data.mimetype))
			return reply.status(400).send({ error: 'Invalid file format. Only PNG and JPEG are allowed.' })

		// console.log(fileBuffer.length)
		if (fileBuffer.length >= 1 * 1024 * 1024)
			return reply.status(400).send({ error: 'File is too large. Maximum size is 1MB.' })

		const fileName = `${request.user.username}_custom.${data.mimetype.split('/')[1]}`
		const filePath = path.join(__dirname, '../uploads/avatars', fileName)

		if (request.params.username != request.user.username) {
			request.log.warn(`${request.user.username} is trying to update ${request.params.username}`)
			return reply.status(400).send({ error: `You don't have permission to modify ${request.params.username}` });
		}

		await sharp(fileBuffer).resize(256, 256, { fit: 'inside' }).toFile(filePath)
/* 		await pipeline(
			data.file,
			sharp().resize(256, 256, { fit: 'inside' }),
			fs.createWriteStream(filePath)
		) */
		
		await new Promise((resolve, reject) => {
			db.run('UPDATE users SET avatar = ? WHERE username = ?',
				[fileName, request.user.username],
				(err) => {
					if (err)
						return reject(err)
					resolve()
				}
			)
		})
		request.log.info('avatar uploaded succesfully')
		return reply.status(200).send({ message: 'avatar uploaded succesfully'})
	} catch (err) {
		request.log.error(`Error uploading avatar: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
}

const getUserAvatar = async (request, reply) => {
	const userName = request.params.username;
	try {
		const user = await new Promise((resolve, reject) => {
			db.get('SELECT avatar FROM users WHERE username = ?', [userName], (err, row) => {
				if (err) return reject(err);
					resolve(row);
				}
			);
		});
		if (!user) {
			return reply.status(404).send({ error: 'User not found' });
		}
		return reply.sendFile(user.avatar)
	} catch (err) {
		request.log.error(`Error fetching avatar: ${err.message}`);
		reply.status(500).send({ error: 'Internal server error' });
	}
}

const removeAvatar = async (request, reply) => {
	try {
		if (request.params.username != request.user.username) {
			request.log.warn(`${request.user.username} is trying to update ${request.params.username}`)
			return reply.status(400).send({ error: `You don't have permission to modify ${request.params.username}` });
		}
		defaultAvatar = `${request.user.username}_default.png`
		await new Promise((resolve, reject) => {
			db.run('UPDATE users SET avatar = ? WHERE username = ?', [defaultAvatar, request.user.username], (err) => {
				if (err)
					return reject(err)
				resolve()
			})
		})
		request.log.info('avatar removed succesfully')
		return reply.status(200).send({ message: 'avatar removed succesfully'})
	} catch (err) {
		request.log.error(`Error removing avatar: ${err.message}`);
		reply.status(500).send({ error: 'Internal server error' });
	}
}

const addFriend = async (request, reply) => {
	const { user_id, friend_id } = request.body
	const userId = request.user.id
	try{
		if (user_id === friend_id)
			return reply.status(400).send({ error: "Can't add youself as friend" })
		if (user_id !== userId)
			return reply.status(400).send({ error: `You don't have permission to modify another user` });
		await new Promise ((resolve, reject) => {
			db.run('INSERT INTO friends (user_id, friend_id) VALUES (?, ?)', [user_id, friend_id], (err) => {
				if (err)
					return reject(err)
				resolve ()
			})
		})
		return reply.status(200).send({ message: 'Friend added!' });
	} catch (err) {
		if (err.message.includes('FOREIGN KEY constraint failed'))
			return reply.status(400).send({ error: 'User or friend not found' });
		if (err.message.includes('UNIQUE constraint failed'))
			return reply.status(409).send({ error: 'You are already friends with this user' });
		request.log.error(`Error adding friend: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
}

const getUserFriends = async (request, reply) => {
	const username = request.params.username
	const { page = 1, limit = 10 } = request.query
	const offset = (page - 1) * limit
	try {
		const user = await new Promise((resolve, reject) => {
			db.get('SELECT id FROM users WHERE username = ?', [username],
				(err, row) => {
					if (err)
						return reject(err)
					if (!row)
						resolve(null)
					resolve(row)
				}
			)
		})
		if (!user)
			return reply.status(404).send({ error: 'User not found' });
		const friendsList = await new Promise((resolve, reject) => {
			db.all('SELECT id, user_id, friend_id FROM friends WHERE user_id = ? LIMIT ? OFFSET ?', [user.id, limit, offset],
				(err, rows) => {
					if (err)
						return reject(err)
					resolve(rows)
				}
			)
		})
		return reply.send(friendsList)
	} catch (err) {
		request.log.error(`Error fetching friends: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
}

const removeFriend = async(request, reply) => {
	const { friendshipId } = request.params
	const userId = request.user.id
	try {
		const user = await new Promise((resolve, reject) => {
			db.get('Select user_id FROM friends WHERE id = ?', [friendshipId], (err, row) => {
				if (err)
					return reject(err)
				resolve(row)
			})
		})
		if (user.user_id !== userId)
			return reply.status(400).send({ error: `You don't have permission to modify another user` });
		await new Promise((resolve, reject) => {
			db.run('DELETE FROM friends WHERE id = ?', [friendshipId], function (err) {
				if (err)
					return reject(err)
				if (this.changes === 0)
					return reject(new Error('Friendship not found'))
				resolve()
			})
		})
		return reply.status(200).send({ message: 'friend removed' })
	} catch (err) {
		if (err.message === 'Friendship not found')
			return reply.status(404).send({ error: 'Friendship not found' });
		request.log.error(`Error removing friend: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
}

const updateOnlineStatus = async (request, reply) => {
	const username = request.params.username
	const { status } = request.body
	const allowedStatus = [ 'online', 'offline', 'away']
	if (!allowedStatus.includes(status))
		return reply.status(400).send({ error: 'Invalid status' })
	if (request.params.username != request.user.username) {
		request.log.warn(`${request.user.username} is trying to update ${request.params.username}`)
		return reply.status(400).send({ error: `You don't have permission to modify ${request.params.username}` });
	}
	try {
		const userId = await new Promise((resolve, reject) => {
			db.get('SELECT id FROM users WHERE username = ?',
				[username],
				(err, row) => {
					if (err)
						return reject(err)
					if (!row) {
						request.log.warn(`User not found`)
						return reply.status(404).send({error: `User not found`})
					}
					resolve(row.id)
				}
			)
		})
		await new Promise((resolve, reject) => {
			db.run('UPDATE users SET online_status = ? WHERE id = ?',
				[status, userId],
				(err) => {
				if (err)
					return reject(err)
				resolve()
				}
			)
		})
		return reply.status(200).send({ message: 'online status updated succesfully'})
	} catch (err) {
		request.log.error(`Error updating user online tatus: ${err.message}`);
		return reply.status(500).send({ error: 'Internal server error' });
	}
}

module.exports = {
	getUsers,
	registerUser,
	getUser,
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
}