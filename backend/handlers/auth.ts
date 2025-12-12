import { FastifyRequest, FastifyReply } from 'fastify';
import db from '../db';
import { User } from '../types';

interface Verify2FACodeBody {
	code: string;
	username: string;
}

const verify2FACode = async (request: FastifyRequest<{ Body: Verify2FACodeBody }>, reply: FastifyReply): Promise<void> => {
	const { code, username } = request.body;
	try {
		const user = await new Promise<User | undefined>((resolve, reject) => {
			db.get('SELECT id, username, two_fa_code, two_fa_code_expiration FROM users WHERE username = ?', [username], (err: Error | null, row: User) => {
				if (err) {
					return reject(err);
				}
				resolve(row);
			});
		});

		if (!user) {
			request.log.warn('Invalid username');
			reply.status(400).send({ error: 'Invalid username' });
			return;
		}

		if (user.two_fa_code !== code || Date.now() > (user.two_fa_code_expiration || 0)) {
			reply.status(401).send({ error: 'Invalid or expired 2FA code' });
			return;
		}
		const now = Math.floor(Date.now() / 1000);
		await new Promise<void>((resolve, reject) => {
			db.run(`UPDATE users
					SET two_fa_code = ?,
						two_fa_code_expiration = ?,
						online_status = ?,
						last_seen = ?,
						google_id = ?
					WHERE id = ?`,
				[null, null, 'online', now, null, user.id],
				(err: Error | null) => {
					if (err) {
						return reject(err);
					}
					resolve();
				});
		});
		const token = await reply.jwtSign({ id: user.id, username: user.username }, { expiresIn: '24h' });
		request.log.info(`Generated JWT token for user ${user.username}`);
		reply.status(200).send({ token });
	} catch (err) {
		const error = err as Error;
		request.log.error(`Error during during verification of 2FA code: ${error.message}`);
		reply.status(500).send({ error: 'Internal server error' });
	}
};

export {
	verify2FACode,
};
