import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import db from '../db';
import { verify2FACode } from '../handlers/auth';
import { JWTPayload } from '../types';

interface Verify2FACodeBody {
	code: string;
	username: string;
}

interface ErrorResponse {
	error: string;
}

interface TokenResponse {
	token: string;
}

const errorResponse = {
	type: 'object',
	properties: {
		error: { type: 'string' },
	}
} as const;

const verify2FACodeSchema = {
	schema: {
		body: {
			type: 'object',
			properties: {
				code: { type: 'string' },
				username: { type: 'string' },
			},
			required: ['code', 'username'],
		},
		response: {
			200: {
				type: 'object',
				properties: {
					token: { type: 'string' }
				}
			},
			400: errorResponse,
			401: errorResponse,
			500: errorResponse,
		},
	},
	handler: verify2FACode
};

declare module 'fastify' {
	interface FastifyRequest {
		token?: string;
	}
}

const authPlugin: FastifyPluginAsync = async (fastify, opts) => {
	fastify.decorate('authenticate', async function(request: FastifyRequest, reply: FastifyReply): Promise<JWTPayload | void> {
		try {
			await request.jwtVerify();

			const authHeader = request.headers.authorization;
			if (!authHeader) {
				return reply.status(400).send({ error: 'Missing authorization header' });
			}

			const token = authHeader.split(' ')[1];
			if (!token) {
				return reply.status(400).send({ error: 'Missing token' });
			}
			request.token = token;

			const blacklisted = await new Promise<{ token: string } | null>((resolve, reject) => {
				db.get('SELECT 1 from token_blacklist WHERE token = ?', [token], (err: Error | null, row: { token: string }) => {
					if (err) {
						return reject(err);
					}
					if (!row) {
						return resolve(null);
					}
					return resolve(row);
				});
			});

			if (blacklisted) {
				return reply.status(401).send({ error: 'Token has been revoked' });
			}

			const now = Math.floor(Date.now() / 1000);
			await new Promise<number>((resolve, reject) => {
				db.run('UPDATE users SET last_seen = ? WHERE id = ?',
					[now, (request.user as JWTPayload).id],
					function (err: Error | null) {
						if (err) {
							return reject(err);
						}
						resolve(this.changes);
					}
				);
			});

			return request.user as JWTPayload;
		} catch (err) {
			reply.send(err);
		}
	});

	fastify.post<{ Body: Verify2FACodeBody; Reply: TokenResponse | ErrorResponse }>(
		'/api/verify_2fa_code',
		verify2FACodeSchema
	);
};

export default fp(authPlugin);
