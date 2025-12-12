import fs from 'fs';
import path from 'path';
import Fastify from 'fastify';

const fastify = Fastify({
	logger: true,
	bodyLimit: 5 * 1024 * 1024 * 1024,
});

import './cron';

if (process.env.NODE_ENV !== 'test') {
	import('dotenv').then((dotenv) => {
		dotenv.config();
		// Check credential works
		try {
			console.log("Environment loaded. GOOGLE_CLIENT_ID exists:", !!process.env.GOOGLE_CLIENT_ID);
			console.log(process.env.GOOGLE_CLIENT_ID);
		} catch (error) {
			const err = error as Error;
			console.error("Error loading dotenv:", err.message);
		}
	});
}

fastify.register(import('@fastify/swagger'), {
	swagger: {
		securityDefinitions: {
			bearerAuth: {
				type: 'apiKey',
				name: 'Authorization',
				in: 'header',
				description: 'Enter JWT token in the format: Bearer token',
			},
		},
		security: [{ bearerAuth: [] }],
	},
});

fastify.register(import('@fastify/swagger-ui'), {
	routePrefix: '/api/documentation',
	uiConfig: {
		docExpansion: 'full',
		deepLinking: false
	},
	uiHooks: {
		onRequest: function (request, reply, next) { next(); },
		preHandler: function (request, reply, next) { next(); }
	},
	staticCSP: true,
	transformStaticCSP: (header) => header,
	transformSpecification: (swaggerObject, request, reply) => { return swaggerObject; },
	transformSpecificationClone: true
});

fastify.register(import('@fastify/jwt'), {
	secret: process.env.JWT_SECRET || 'supersecret'
});

fastify.register(import('@fastify/static'), {
	root: path.join(__dirname, '/uploads/avatars'),
	prefix: '/avatars/',
});

fastify.register(import('@fastify/multipart'), {
	limits: {
		fileSize: 5 * 1024 * 1024 * 1024
	}
});

fastify.register(import('@fastify/websocket'));

// Import routes - these need to be converted to .ts
fastify.register(import('./routes/auth'), { prefix: '/api' });
fastify.register(import('./routes/users'), { prefix: '/api' });
fastify.register(import('./routes/google'), { prefix: '/api' });
fastify.register(import('./routes/game'), { prefix: '/api' });
fastify.register(import('./routes/tournaments'), { prefix: '/api' });
fastify.register(import('./routes/matchmaking'), { prefix: '/api' });

const PORT = 8888;

export = fastify;

const start = async (): Promise<void> => {
	try {
		await fastify.listen({ port: PORT, host: '0.0.0.0' });
		/* c8 ignore start */
		console.log(`Server running on port ${PORT}`);
		/* c8 ignore stop */
	} catch (error) {
		fastify.log.error(error);
		process.exit(1);
	}
};

if (require.main === module) {
	start();
}
