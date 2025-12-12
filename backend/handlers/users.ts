import { FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import nodemailer from 'nodemailer';
import db from '../db';
import { User, AuthenticatedRequest } from '../types';

const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: process.env.TWOFA_GMAIL_USER,
		pass: process.env.TWOFA_GMAIL_PASSWORD
	}
});

interface RegisterUserBody {
	username: string;
	email: string;
	password: string;
}

interface LoginUserBody {
	username: string;
	password: string;
}

interface UpdateUserBody {
	currentPassword: string;
	newPassword?: string;
	newUsername?: string;
	twoFA?: string;
	newEmail?: string;
}

interface AddFriendBody {
	user_id: number;
	friend_id: number;
}

interface UpdateOnlineStatusBody {
	status: 'online' | 'offline' | 'away';
}

interface CheckPasswordBody {
	selected: string;
	password: string;
}

interface UsernameParams {
	username: string;
}

interface FriendshipParams {
	friendshipId: string;
}

const getUsers = (request: FastifyRequest, reply: FastifyReply): void => {
	db.all('SELECT id, username, email FROM users', [], (err: Error | null, rows: User[]) => {
		if (err) {
			request.log.error(`Error fetching users: ${err.message}`);
			reply.status(500).send({ error: 'Database error: ' + err.message });
			return;
		}
		if (rows.length === 0) {
			request.log.warn('No users in database');
			reply.status(404).send({ error: 'No users found' });
			return;
		}
		reply.send(rows);
	});
};

const getUser = (request: FastifyRequest<{ Params: UsernameParams }>, reply: FastifyReply): void => {
	const identifier = request.params.username;
	const isId = /^\d+$/.test(identifier);

	const sql = isId ? 'SELECT * FROM users WHERE id = ?' : 'SELECT * FROM users WHERE username = ?';
	const value = isId ? Number(identifier) : identifier;
	db.get(sql, [value], (err: Error | null, row: User) => {
		if (err) {
			request.log.error(`Error fetching user: ${err.message}`);
			reply.status(500).send({ error: 'Database error: ' + err.message });
			return;
		}
		if (!row) {
			request.log.warn(`User ${identifier} not found`);
			reply.status(404).send({ error: `User ${identifier} not found` });
			return;
		}
		reply.send(row);
	});
};

const registerUser = async (request: FastifyRequest<{ Body: RegisterUserBody }>, reply: FastifyReply): Promise<void> => {
	const { username, email, password } = request.body;
	request.log.info(`Received registration request: ${username}`);
	try {
		const existingUser = await new Promise<User | undefined>((resolve, reject) => {
			db.get('SELECT * FROM users WHERE username = ?', [username], (err: Error | null, row: User) => {
				if (err) return reject(err);
				resolve(row);
			});
		});

		if (existingUser) {
			request.log.warn('User with this username already exists');
			reply.status(400).send({ error: "User with this username already exists" });
			return;
		}

		const existingEmail = await new Promise<User | undefined>((resolve, reject) => {
			db.get('SELECT * FROM users WHERE email = ?', [email], (err: Error | null, row: User) => {
				if (err) return reject(err);
				resolve(row);
			});
		});

		if (existingEmail) {
			request.log.warn('User with this email already exists');
			reply.status(400).send({ error: "Email address already registered. Please login or use a different email." });
			return;
		}

		const hashedPassword = await bcrypt.hash(password, 10);
		let fileName: string;
		try {
			const avatarResponse = await fetch(`https://api.dicebear.com/9.x/fun-emoji/svg?seed=${username}`);
			if (!avatarResponse.ok) {
				throw new Error('External avatar API returned an error');
			}
			const svg = await avatarResponse.text();
			fileName = `${username}_default.png`;
			const filePath = path.join(__dirname, '../uploads/avatars', fileName);
			await sharp(Buffer.from(svg)).resize(256, 256).png().toFile(filePath);
			request.log.info('Default avatar downloaded and converted to PNG');
		} catch (avatarError) {
			const error = avatarError as Error;
			request.log.error(`Avatar generation failed: ${error.message}. Using fallback avatar.`);
			fileName = 'fallback.jpeg';
		}

		const newUser = {
			username,
			email,
			password: hashedPassword,
			avatar: fileName,
		};

		const userId = await new Promise<number>((resolve, reject) => {
			db.run(
				'INSERT INTO users (username, email, password, avatar, online_status, two_fa) VALUES (?, ?, ?, ?, ?, ?)',
				[newUser.username, newUser.email, newUser.password, newUser.avatar, 'offline', false],
				function (err: Error | null) {
					if (err) return reject(err);
					resolve(this.lastID);
				}
			);
		});

		request.log.info('User registered successfully');
		reply.status(200).send({
			id: userId,
			username: newUser.username,
			email: newUser.email
		});

	} catch (err) {
		const error = err as Error;
		request.log.error(`Error: ${error.message}`);
		reply.status(500).send({ error: 'Internal server error' });
	}
};

const loginUser = async (request: FastifyRequest<{ Body: LoginUserBody }>, reply: FastifyReply): Promise<void> => {
	const { username, password } = request.body;
	request.log.info(`Received login request from: ${username}`);

	try {
		const user = await new Promise<User | undefined>((resolve, reject) => {
			db.get('SELECT id, username, password, email FROM users WHERE username = ?', [username], (err: Error | null, user: User) => {
				if (err) {
					return reject(err);
				}
				resolve(user);
			});
		});

		if (!user) {
			request.log.warn('Invalid username or password');
			reply.status(400).send({ error: 'Invalid username or password' });
			return;
		}

		const match = await bcrypt.compare(password, user.password || '');
		if (!match) {
			request.log.warn('Password mismatch');
			reply.status(401).send({ error: 'Invalid credentials' });
			return;
		}

		const loginWith2FA = await new Promise<{ two_fa: number } | undefined>((resolve, reject) => {
			db.get('SELECT two_fa FROM users WHERE username = ?', [username], (err: Error | null, loginWith2FA: { two_fa: number }) => {
				if (err) {
					return reject(err);
				}
				resolve(loginWith2FA);
			});
		});

		if (Number(loginWith2FA?.two_fa) === 0) {
			const token = await reply.jwtSign({ id: user.id, username: user.username }, { expiresIn: '24h' });
			request.log.info(`Generated JWT token for user ${user.username}`);

			const now = Math.floor(Date.now() / 1000);
			await new Promise<void>((resolve, reject) => {
				db.run(`UPDATE users
						SET online_status = ?,
							last_seen = ?,
							google_id = ?
						WHERE id = ?`,
					['online', now, null, user.id], (err: Error | null) => {
						if (err) {
							return reject(err);
						}
						resolve();
					});
			});
			reply.send({ token });
		} else {
			const code = Math.floor(100000 + Math.random() * 900000).toString();
			await new Promise<void>((resolve, reject) => {
				db.run('UPDATE users SET two_fa_code = ?, two_fa_code_expiration = ? WHERE username = ?',
					[
						code,
						Date.now() + 5 * 60 * 1000,
						username,
					],
					(err: Error | null) => {
						if (err) {
							reject(err);
							return;
						}
						resolve();
					}
				);
			});
			const info = await transporter.sendMail({
				from: `"Transcendence" <${process.env.TWOFA_GMAIL_USER}>`,
				to: user.email,
				subject: '2FA Code',
				text: `Your 2FA code is: ${code}`,
				html: `<p>Your 2FA code is: <b>${code}</b></p>`,
			});
			console.log("Message sent: %s", info.messageId);
			reply.status(200).send({ message: '2FA code sent' });
		}
	} catch (err) {
		const error = err as Error;
		request.log.error(`Error during login: ${error.message}`);
		reply.status(500).send({ error: 'Internal server error' });
	}
};

const logoutUser = async (request: AuthenticatedRequest, reply: FastifyReply): Promise<void> => {
	try {
		const userId = request.user.id;
		const token = request.token;

		if (!token) {
			reply.status(400).send({ error: 'Missing token' });
			return;
		}

		const decoded = request.jwtDecode<{ exp: number }>(token);
		const expiresAt = decoded.exp;

		await new Promise<void>((resolve, reject) => {
			db.run('INSERT INTO token_blacklist (token, expiration) VALUES (?, ?)', [token, expiresAt], (err: Error | null) => {
				if (err) {
					return reject(err);
				}
				resolve();
			});
		});

		await new Promise<void>((resolve, reject) => {
			db.run('UPDATE users SET online_status = ? where id = ?', ['offline', userId], (err: Error | null) => {
				if (err) {
					return reject(err);
				}
				resolve();
			});
		});

		reply.status(200).send({ message: 'Logged out successfully' });
	} catch (err) {
		request.log.warn('Invalid token');
		reply.status(401).send({ error: 'Invalid token' });
	}
};

const updateUser = async (request: AuthenticatedRequest & FastifyRequest<{ Body: UpdateUserBody; Params: UsernameParams }>, reply: FastifyReply): Promise<void> => {
	const { currentPassword, newPassword, newUsername, twoFA, newEmail } = request.body;
	const userId = request.user.id;
	request.log.info(`Received update credentials request from: ${request.user.username}`);
	try {
		const user = await new Promise<User | undefined>((resolve, reject) => {
			db.get('SELECT id, username, password FROM users WHERE id = ?', [userId], (err: Error | null, user: User) => {
				if (err) {
					return reject(err);
				}
				resolve(user);
			});
		});

		if (!user) {
			request.log.warn('User not found');
			reply.status(400).send({ error: 'User not found' });
			return;
		}

		const match = await bcrypt.compare(currentPassword, user.password || '');
		if (!match) {
			request.log.warn('Password mismatch');
			reply.status(401).send({ error: 'Current password is not correct' });
			return;
		}

		if (request.params.username !== request.user.username) {
			request.log.warn(`${request.user.username} is trying to update ${request.params.username}`);
			reply.status(400).send({ error: `You don't have permission to modify ${request.params.username}` });
			return;
		}

		if (newPassword) {
			const hashedPassword = await bcrypt.hash(newPassword, 10);
			await new Promise<number>((resolve, reject) => {
				db.run('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId], function (err: Error | null) {
					if (err) {
						return reject(err);
					}
					resolve(this.changes);
				});
			});
		}

		if (twoFA !== 'undefined') {
			await new Promise<number>((resolve, reject) => {
				db.run('UPDATE users SET two_fa = ? WHERE id = ?', [twoFA, userId], function (err: Error | null) {
					if (err) {
						return reject(err);
					}
					resolve(this.changes);
				});
			});
		}

		if (newUsername) {
			const existingUser = await new Promise<User | undefined>((resolve, reject) => {
				db.get('SELECT * FROM users WHERE username = ?', [newUsername], (err: Error | null, row: User) => {
					if (err) return reject(err);
					resolve(row);
				});
			});

			if (existingUser) {
				request.log.warn('User with this username already exists');
				reply.status(400).send({ error: "User with this username already exists" });
				return;
			}

			await new Promise<number>((resolve, reject) => {
				db.run('UPDATE users SET username = ? WHERE id = ?', [newUsername, userId], function (err: Error | null) {
					if (err) {
						return reject(err);
					}
					resolve(this.changes);
				});
			});
		}

		if (newEmail) {
			const existingEmail = await new Promise<User | undefined>((resolve, reject) => {
				db.get('SELECT * FROM users WHERE email = ?', [newEmail], (err: Error | null, row: User) => {
					if (err) return reject(err);
					resolve(row);
				});
			});

			if (existingEmail) {
				request.log.warn('User with this email already exists');
				reply.status(400).send({ error: "User with this email already exists" });
				return;
			}

			await new Promise<number>((resolve, reject) => {
				db.run('UPDATE users SET email = ? WHERE id = ?', [newEmail, userId], function (err: Error | null) {
					if (err) {
						return reject(err);
					}
					resolve(this.changes);
				});
			});
		}

		request.log.info(`User with ID ${userId} updated successfully`);
		reply.status(200).send({ message: 'User credentials updated successfully' });
	} catch (err) {
		const error = err as Error;
		request.log.error(`Error updting user credentials: ${error.message}`);
		reply.status(500).send({ error: 'Internal server error' });
	}
};

const uploadAvatar = async (request: AuthenticatedRequest & FastifyRequest<{ Params: UsernameParams }>, reply: FastifyReply): Promise<void> => {
	const data = await request.file();
	if (!data) {
		reply.status(400).send({ error: 'No file provided' });
		return;
	}
	const chunks: Buffer[] = [];
	for await (const chunk of data.file) {
		chunks.push(chunk);
	}
	const fileBuffer = Buffer.concat(chunks);
	const allowedMimeTypes = ['image/png', 'image/jpeg'];
	try {
		if (!allowedMimeTypes.includes(data.mimetype)) {
			reply.status(400).send({ error: 'Invalid file format. Only PNG and JPEG are allowed.' });
			return;
		}

		if (fileBuffer.length >= 1 * 1024 * 1024) {
			reply.status(400).send({ error: 'File is too large. Maximum size is 1MB.' });
			return;
		}

		const fileName = `${request.user.username}_custom.${data.mimetype.split('/')[1]}`;
		const filePath = path.join(__dirname, '../uploads/avatars', fileName);

		if (request.params.username !== request.user.username) {
			request.log.warn(`${request.user.username} is trying to update ${request.params.username}`);
			reply.status(400).send({ error: `You don't have permission to modify ${request.params.username}` });
			return;
		}

		await sharp(fileBuffer).resize(256, 256, { fit: 'inside' }).toFile(filePath);

		await new Promise<void>((resolve, reject) => {
			db.run('UPDATE users SET avatar = ? WHERE username = ?',
				[fileName, request.user.username],
				(err: Error | null) => {
					if (err) {
						return reject(err);
					}
					resolve();
				}
			);
		});
		request.log.info('avatar uploaded succesfully');
		reply.status(200).send({ message: 'avatar uploaded succesfully' });
	} catch (err) {
		const error = err as Error;
		request.log.error(`Error uploading avatar: ${error.message}`);
		reply.status(500).send({ error: 'Internal server error' });
	}
};

const getUserAvatar = async (request: FastifyRequest<{ Params: UsernameParams }>, reply: FastifyReply): Promise<void> => {
	const userName = request.params.username;
	try {
		const user = await new Promise<{ avatar: string } | undefined>((resolve, reject) => {
			db.get('SELECT avatar FROM users WHERE username = ?', [userName], (err: Error | null, row: { avatar: string }) => {
				if (err) return reject(err);
				resolve(row);
			});
		});
		if (!user) {
			reply.status(404).send({ error: 'User not found' });
			return;
		}
		return reply.sendFile(user.avatar);
	} catch (err) {
		const error = err as Error;
		request.log.error(`Error fetching avatar: ${error.message}`);
		reply.status(500).send({ error: 'Internal server error' });
	}
};

const removeAvatar = async (request: AuthenticatedRequest & FastifyRequest<{ Params: UsernameParams }>, reply: FastifyReply): Promise<void> => {
	try {
		if (request.params.username !== request.user.username) {
			request.log.warn(`${request.user.username} is trying to update ${request.params.username}`);
			reply.status(400).send({ error: `You don't have permission to modify ${request.params.username}` });
			return;
		}
		const defaultAvatar = `${request.user.username}_default.png`;
		await new Promise<void>((resolve, reject) => {
			db.run('UPDATE users SET avatar = ? WHERE username = ?', [defaultAvatar, request.user.username], (err: Error | null) => {
				if (err) {
					return reject(err);
				}
				resolve();
			});
		});
		request.log.info('avatar removed succesfully');
		reply.status(200).send({ message: 'avatar removed succesfully' });
	} catch (err) {
		const error = err as Error;
		request.log.error(`Error removing avatar: ${error.message}`);
		reply.status(500).send({ error: 'Internal server error' });
	}
};

const addFriend = async (request: AuthenticatedRequest & FastifyRequest<{ Body: AddFriendBody }>, reply: FastifyReply): Promise<void> => {
	const { user_id, friend_id } = request.body;
	const userId = request.user.id;
	try {
		if (user_id === friend_id) {
			reply.status(400).send({ error: "Can't add youself as friend" });
			return;
		}
		if (user_id !== userId) {
			reply.status(400).send({ error: `You don't have permission to modify another user` });
			return;
		}
		await new Promise<void>((resolve, reject) => {
			db.run('INSERT INTO friends (user_id, friend_id) VALUES (?, ?)', [user_id, friend_id], (err: Error | null) => {
				if (err) {
					return reject(err);
				}
				resolve();
			});
		});
		reply.status(200).send({ message: 'Friend added!' });
	} catch (err) {
		const error = err as Error;
		if (error.message.includes('FOREIGN KEY constraint failed')) {
			reply.status(400).send({ error: 'User or friend not found' });
			return;
		}
		if (error.message.includes('UNIQUE constraint failed')) {
			reply.status(409).send({ error: 'You are already friends with this user' });
			return;
		}
		request.log.error(`Error adding friend: ${error.message}`);
		reply.status(500).send({ error: 'Internal server error' });
	}
};

const getUserFriends = async (request: FastifyRequest<{ Params: UsernameParams }>, reply: FastifyReply): Promise<void> => {
	const username = request.params.username;
	try {
		const user = await new Promise<{ id: number } | undefined>((resolve, reject) => {
			db.get('SELECT id FROM users WHERE username = ?', [username],
				(err: Error | null, row: { id: number }) => {
					if (err) {
						return reject(err);
					}
					if (!row) {
						resolve(undefined);
						return;
					}
					resolve(row);
				}
			);
		});
		if (!user) {
			reply.status(404).send({ error: 'User not found' });
			return;
		}

		const friendsList = await new Promise<{ id: number; user_id: number; friend_id: number }[]>((resolve, reject) => {
			db.all('SELECT id, user_id, friend_id FROM friends WHERE user_id = ?', [user.id],
				(err: Error | null, rows: { id: number; user_id: number; friend_id: number }[]) => {
					if (err) {
						return reject(err);
					}
					resolve(rows);
				}
			);
		});

		const friendsPromises = friendsList.map(friend => {
			return new Promise((resolve, reject) => {
				db.get(
					'SELECT id, username, avatar, online_status FROM users WHERE id  = ?',
					[friend.friend_id],
					(err: Error | null, friendData: any) => {
						if (err) return reject(err);
						if (friendData) friendData.friendshipId = friend.id;
						resolve(friendData);
					}
				);
			});
		});
		const friends = await Promise.all(friendsPromises);
		reply.send(friends);
	} catch (err) {
		const error = err as Error;
		request.log.error(`Error fetching friends: ${error.message}`);
		reply.status(500).send({ error: 'Internal server error' });
	}
};

const removeFriend = async (request: AuthenticatedRequest & FastifyRequest<{ Params: FriendshipParams }>, reply: FastifyReply): Promise<void> => {
	const { friendshipId } = request.params;
	const userId = request.user.id;
	try {
		const user = await new Promise<{ user_id: number } | undefined>((resolve, reject) => {
			db.get('Select user_id FROM friends WHERE id = ?', [friendshipId], (err: Error | null, row: { user_id: number }) => {
				if (err) {
					return reject(err);
				}
				resolve(row);
			});
		});
		if (!user) {
			reply.status(404).send({ error: 'Friendship not found' });
			return;
		}
		if (user.user_id !== userId) {
			reply.status(400).send({ error: `You don't have permission to modify another user` });
			return;
		}
		await new Promise<void>((resolve, reject) => {
			db.run('DELETE FROM friends WHERE id = ?', [friendshipId], function (err: Error | null) {
				if (err) {
					return reject(err);
				}
				if (this.changes === 0) {
					return reject(new Error('Friendship not found'));
				}
				resolve();
			});
		});
		reply.status(200).send({ message: 'friend removed' });
	} catch (err) {
		const error = err as Error;
		if (error.message === 'Friendship not found') {
			reply.status(404).send({ error: 'Friendship not found' });
			return;
		}
		request.log.error(`Error removing friend: ${error.message}`);
		reply.status(500).send({ error: 'Internal server error' });
	}
};

const updateOnlineStatus = async (request: AuthenticatedRequest & FastifyRequest<{ Body: UpdateOnlineStatusBody; Params: UsernameParams }>, reply: FastifyReply): Promise<void> => {
	const username = request.params.username;
	const { status } = request.body;
	const allowedStatus: Array<'online' | 'offline' | 'away'> = ['online', 'offline', 'away'];
	if (!allowedStatus.includes(status)) {
		reply.status(400).send({ error: 'Invalid status' });
		return;
	}
	if (request.params.username !== request.user.username) {
		request.log.warn(`${request.user.username} is trying to update ${request.params.username}`);
		reply.status(400).send({ error: `You don't have permission to modify ${request.params.username}` });
		return;
	}
	try {
		const userId = await new Promise<number | undefined>((resolve, reject) => {
			db.get('SELECT id FROM users WHERE username = ?',
				[username],
				(err: Error | null, row: { id: number } | undefined) => {
					if (err) {
						return reject(err);
					}
					if (!row) {
						request.log.warn(`User not found`);
						reply.status(404).send({ error: `User not found` });
						return;
					}
					resolve(row.id);
				}
			);
		});
		if (!userId) return;

		await new Promise<void>((resolve, reject) => {
			db.run('UPDATE users SET online_status = ? WHERE id = ?',
				[status, userId],
				(err: Error | null) => {
					if (err) {
						return reject(err);
					}
					resolve();
				}
			);
		});
		reply.status(200).send({ message: 'online status updated succesfully' });
	} catch (err) {
		const error = err as Error;
		request.log.error(`Error updating user online tatus: ${error.message}`);
		reply.status(500).send({ error: 'Internal server error' });
	}
};

const getCurrentUser = async (request: AuthenticatedRequest, reply: FastifyReply): Promise<void> => {
	const userId = request.user.id;
	try {
		const user = await new Promise<User | undefined>((resolve, reject) => {
			db.get(
				'SELECT id, username, email, avatar, online_status, two_fa, google_id FROM users WHERE id = ?',
				[userId],
				(err: Error | null, row: User) => {
					if (err) return reject(err);
					resolve(row);
				}
			);
		});

		if (!user) {
			request.log.warn(`User with ID ${userId} not found`);
			reply.status(404).send({ error: 'User not found' });
			return;
		}

		reply.send(user);
	} catch (err) {
		const error = err as Error;
		request.log.error(`Error fetching current user: ${error.message}`);
		reply.status(500).send({ error: 'Internal server error' });
	}
};

const checkPassword = async (request: FastifyRequest<{ Body: CheckPasswordBody }>, reply: FastifyReply): Promise<void> => {
	const username = request.body.selected;
	const inPwd = request.body.password;
	try {
		const storedPwd = await new Promise<string | null>((resolve, reject) => {
			db.get('SELECT password FROM users WHERE username = ?', [username], (err: Error | null, row: { password: string } | undefined) => {
				if (err) {
					return reject(err);
				}
				if (!row) {
					return resolve(null);
				}
				resolve(row.password);
			});
		});
		if (storedPwd === null) {
			reply.status(404).send({ error: 'User not found' });
			return;
		}
		const passwordsMatch = await bcrypt.compare(inPwd, storedPwd);
		if (!passwordsMatch) {
			reply.send({ ok: false, error: 'Invalid password' });
			return;
		}
		reply.send({ ok: true });
	} catch (err) {
		const error = err as Error;
		request.log.error(`Error checking password for ${username}: ${error.message}`);
		reply.status(500).send({ error: 'Internal server error' });
	}
};

interface Match {
	id: number;
	player1_id: number;
	player2_id: number;
	player1_score: number;
	player2_score: number;
	winner_id: number;
	loser_id: number;
	match_time: number;
}

const getUserMatchList = async (request: FastifyRequest<{ Params: UsernameParams }>, reply: FastifyReply): Promise<void> => {
	const { username } = request.params;

	try {
		const userRow = await new Promise<{ id: number } | undefined>((res, rej) =>
			db.get('SELECT id FROM users WHERE username = ?', [username],
				(err: Error | null, row: { id: number }) => err ? rej(err) : res(row)
			)
		);

		if (!userRow) {
			reply.status(404).send({ error: 'User not found' });
			return;
		}
		const userId = userRow.id;

		const matches = await new Promise<Match[]>((res, rej) =>
			db.all(
				`SELECT
					id,
					player1_id,
					player2_id,
					player1_score,
					player2_score,
					winner_id,
					loser_id,
					match_time
				FROM matches
				WHERE
					(player1_id = ? OR player2_id = ?)
					AND status = 'finished'
				ORDER BY match_time DESC`,
				[userId, userId],
				(err: Error | null, rows: Match[]) => err ? rej(err) : res(rows)
			)
		);

		const result = await Promise.all(matches.map(async (m: Match) => {
			const isPlayer1 = m.player1_id === userId;
			const opponentId = isPlayer1 ? m.player2_id : m.player1_id;
			const userScore = isPlayer1 ? m.player1_score : m.player2_score;
			const oppScore = isPlayer1 ? m.player2_score : m.player1_score;
			const result = m.winner_id === userId ? 'win' : 'loss';

			const row = await new Promise<{ username: string; avatar: string } | undefined>((res, rej) => {
				db.get('SELECT username, avatar FROM users where id = ?', [opponentId],
					(err: Error | null, row: { username: string; avatar: string }) => err ? rej(err) : res(row)
				);
			});
			const opponent = row ? row.username : null;
			const opponentAvatar = `/api/user/${opponent}/avatar`;

			return {
				id: m.id,
				opponent: opponent,
				opponentAvatar: opponentAvatar,
				result: result,
				score: `${userScore}-${oppScore}`,
				date: m.match_time,
			};
		}));

		reply.send(result);
	} catch (err) {
		const error = err as Error;
		request.log.error(`Error fetching matches for ${username}: ${error.stack}`);
		reply.status(500).send({ error: 'Internal server error' });
	}
};

const getUserStats = async (request: FastifyRequest<{ Params: UsernameParams }>, reply: FastifyReply): Promise<void> => {
	const { username } = request.params;

	try {
		const userRow = await new Promise<{ id: number } | undefined>((res, rej) =>
			db.get('SELECT id FROM users WHERE username = ?', [username],
				(err: Error | null, row: { id: number }) => err ? rej(err) : res(row)
			)
		);

		if (!userRow) {
			reply.status(404).send({ error: 'User not found' });
			return;
		}
		const userId = userRow.id;

		const rows = await new Promise<Match[]>((res, rej) =>
			db.all(
				`SELECT
					player1_id,
					player2_id,
					player1_score,
					player2_score,
					winner_id
				FROM matches
				WHERE
					(player1_id = ? OR player2_id = ?)
					AND status = 'finished'
				ORDER BY match_time DESC`,
				[userId, userId],
				(err: Error | null, rows: Match[]) => err ? rej(err) : res(rows)
			)
		);
		const rowsTournament = await new Promise<{ id: number }[]>((res, rej) => {
			db.all('SELECT id FROM tournaments WHERE winner_id = ?', [userId],
				(err: Error | null, rowsTournament: { id: number }[]) => err ? rej(err) : res(rowsTournament)
			);
		});
		const tournamentsWon = rowsTournament ? rowsTournament.length : 0;
		const totalMatches = rows.length;
		let wins = 0;
		let totalScored = 0;
		let totalConceded = 0;

		for (const m of rows) {
			if (m.winner_id === userId) {
				wins++;
			}
			const isPlayer1 = m.player1_id === userId;
			const scored = isPlayer1 ? m.player1_score : m.player2_score;
			const conceded = isPlayer1 ? m.player2_score : m.player1_score;
			totalScored += scored;
			totalConceded += conceded;
		}
		const losses = totalMatches - wins;
		const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
		reply.status(200).send({
			totalMatches,
			wins,
			losses,
			winRate,
			totalScored,
			totalConceded,
			tournamentsWon
		});
	} catch (err) {
		const error = err as Error;
		request.log.error(`Error fetching matches for ${username}: ${error.stack}`);
		reply.status(500).send({ error: 'Internal server error' });
	}
};

export {
	getUsers,
	registerUser,
	getUser,
	getCurrentUser,
	updateUser,
	loginUser,
	logoutUser,
	uploadAvatar,
	getUserAvatar,
	removeAvatar,
	addFriend,
	updateOnlineStatus,
	getUserFriends,
	removeFriend,
	checkPassword,
	getUserMatchList,
	getUserStats
};
