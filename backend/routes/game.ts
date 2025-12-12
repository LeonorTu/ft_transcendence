import { FastifyPluginCallback } from 'fastify';
import {
	runServer,
	createNewMultiplayerGame,
	createNewSinglePlayerGame,
	listGames,
	getGame
} from '../handlers/game_server';

interface ErrorResponse {
	error: string;
}

interface GameListElement {
	id: number;
	player1_id: number;
	player2_id: number;
	status: string;
}

interface Game {
	id: number;
	player1_id: number;
	player2_id: number;
	player1_score: number;
	player2_score: number;
	status: string;
	finished_rounds: number;
	winner_id: number;
	loser_id: number;
	match_time: string;
}

interface CreateMultiplayerGameBody {
	player1_id: number;
	player2_id: number;
}

interface CreateSingleplayerGameBody {
	player1_id: number;
	player2_id: number;
}

interface GameIdResponse {
	id: number;
}

interface GameIdParams {
	id: string;
}

const errorResponse = {
	type: 'object',
	properties: {
		error: { type: 'string' },
	}
} as const;

const GameListElementSchema = {
	type: 'object',
	properties: {
		id: { type: 'integer' },
		player1_id: { type: 'integer' },
		player2_id: { type: 'integer' },
		status: { type: 'string' },
	}
} as const;

const GameSchema = {
	type: 'object',
	properties: {
		id: { type: 'integer' },
		player1_id: { type: 'integer' },
		player2_id: { type: 'integer' },
		player1_score: { type: 'integer' },
		player2_score: { type: 'integer' },
		status: { type: 'string' },
		finished_rounds: { type: 'integer' },
		winner_id: { type: 'integer' },
		loser_id: { type: 'integer' },
		match_time: { type: 'string' }
	}
} as const;

const createMultiplayerGameSchema = {
	schema: {
		body: {
			type: 'object',
			properties: {
				player1_id: { type: 'integer' },
				player2_id: { type: 'integer' }
			},
			required: ['player1_id', 'player2_id'],
		},
		response: {
			200: {
				type: 'object',
				properties: {
					id: { type: 'integer' }
				}
			},
			400: errorResponse,
			500: errorResponse,
		},
	},
	handler: createNewMultiplayerGame
};

const createSingleplayerGameSchema = {
	schema: {
		body: {
			type: 'object',
			properties: {
				player1_id: { type: 'integer' },
				player2_id: { type: 'integer' }
			},
			required: ['player1_id', 'player2_id']
		},
		response: {
			200: {
				type: 'object',
				properties: {
					id: { type: 'integer' }
				}
			},
			400: errorResponse,
			500: errorResponse,
		},
	},
	handler: createNewSinglePlayerGame
};

const listGamesSchema = {
	schema: {
		response: {
			200: {},
			400: errorResponse,
			500: errorResponse,
		},
	},
	handler: listGames
};

const getGameSchema = {
	schema: {
		response: {
			200: GameSchema,
			404: errorResponse,
			500: errorResponse,
		},
	},
	handler: getGame
};

const gameRoutes: FastifyPluginCallback = (fastify, options, done) => {
	fastify.post<{ Body: CreateMultiplayerGameBody; Reply: GameIdResponse | ErrorResponse }>(
		'/game/new-multiplayer',
		createMultiplayerGameSchema
	);

	fastify.post<{ Body: CreateSingleplayerGameBody; Reply: GameIdResponse | ErrorResponse }>(
		'/game/new-singleplayer',
		createSingleplayerGameSchema
	);

	fastify.get<{ Reply: GameListElement[] | ErrorResponse }>(
		'/game/list',
		listGamesSchema
	);

	fastify.get<{ Params: GameIdParams; Reply: Game | ErrorResponse }>(
		'/game/list/:id',
		getGameSchema
	);

	fastify.get('/game', { websocket: true }, runServer);

	done();
};

export default gameRoutes;
