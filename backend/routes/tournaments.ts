import { FastifyPluginCallback } from 'fastify';
import auth from './auth';
import db from '../db';

import {
	tournament,
	listTournaments,
	getBracket,
	reportMatchResult,
	infoTournament,
} from '../handlers/tournaments';

interface ErrorResponse {
	error: string;
}

interface SuccessResponse {
	message: string;
}

interface Tournament {
	id: number;
	name: string;
	owner_id: number;
	status: string;
	created_at: string;
	started_at: string;
	finished_at: string;
	winner_id: number | null;
}

interface TournamentMatch {
	tm_id: number;
	game_id: number | null;
	round: number;
	tm_status: string;
	player1_id: number | null;
	player1_username: string | null;
	player2_id: number | null;
	player2_username: string | null;
	player1_score: number | null;
	player2_score: number | null;
	winner_id: number | null;
}

interface TournamentPlayers {
	id: number;
	tournament_id: number;
	user_id: number;
}

interface TournamentBody {
	player_id: number;
	game_type: string;
	player_index?: number;
	tournament_id?: number;
}

interface TournamentResponse {
	tournament_id: number;
	player_count: number;
	players: Array<{
		id: number;
		username: string;
	}>;
	started: boolean;
	bracket: Array<{
		tm_id: number;
		game_id: number | null;
		tm_status: string;
		player1_id: number | null;
		player1_username: string | null;
		player2_id: number | null;
		player2_username: string | null;
	}> | null;
	user_id: number;
}

interface TournamentIdParams {
	id: number;
}

interface TournamentMatchParams {
	id: number;
	tm_id: number;
}

interface ReportMatchResultBody {
	winner_slot: 1 | 2;
	game_type: string;
}

interface BracketResponse {
	tournament: Tournament;
	matches: TournamentMatch[];
}

const errorResponse = {
	type: 'object',
	properties: {
		error: { type: 'string' }
	}
} as const;

const successResponse = {
	type: 'object',
	properties: {
		message: { type: 'string' }
	}
} as const;

const TournamentSchema = {
	type: 'object',
	properties: {
		id: { type: 'integer' },
		name: { type: 'string' },
		owner_id: { type: 'integer' },
		status: { type: 'string' },
		created_at: { type: 'string' },
		started_at: { type: 'string' },
		finished_at: { type: 'string' },
		winner_id: { type: 'integer', nullable: true },
	}
} as const;

const TournamentMatchSchema = {
	type: 'object',
	properties: {
		tm_id: { type: 'integer' },
		game_id: { type: 'integer', nullable: true },
		round: { type: 'integer' },
		tm_status: { type: 'string' },
		player1_id: { type: 'integer', nullable: true },
		player1_username: { type: 'string', nullable: true },
		player2_id: { type: 'integer', nullable: true },
		player2_username: { type: 'string', nullable: true },
		player1_score: { type: 'integer', nullable: true },
		player2_score: { type: 'integer', nullable: true },
		winner_id: { type: 'integer', nullable: true },
	}
} as const;

const TournamentPlayersSchema = {
	type: 'object',
	properties: {
		id: { type: 'integer' },
		tournament_id: { type: 'integer' },
		user_id: { type: 'integer' },
	}
} as const;

const TournamentResponseSchema = {
	type: 'object',
	properties: {
		tournament_id: { type: 'integer' },
		player_count: { type: 'integer' },
		players: {
			type: 'array',
			items: {
				type: 'object',
				properties: {
					id: { type: 'integer' },
					username: { type: 'string' },
				}
			}
		},
		started: { type: 'boolean' },
		bracket: {
			anyOf: [
				{ type: 'null' },
				{
					type: 'array',
					items: {
						type: 'object',
						properties: {
							tm_id: { type: 'integer' },
							game_id: { type: 'integer', nullable: true },
							tm_status: { type: 'string' },
							player1_id: { type: 'integer', nullable: true },
							player1_username: { type: 'string', nullable: true },
							player2_id: { type: 'integer', nullable: true },
							player2_username: { type: 'string', nullable: true },
						}
					}
				}
			]
		},
		user_id: { type: 'integer' }
	}
} as const;

const tournamentRoutes: FastifyPluginCallback = (fastify, options, done) => {
	// List all tournaments
	const listTournamentsSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			response: {
				200: { type: 'array', items: TournamentSchema },
				500: errorResponse,
			}
		},
		handler: listTournaments,
	};

	// Auto-join or create lobby, await 4 players, then start & return lobby+bracket
	const tournamentSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			body: {
				type: 'object',
				properties: {
					player_id: { type: 'integer' },
					game_type: { type: 'string' },
					player_index: { type: 'integer' },
					tournament_id: { type: 'integer' }
				},
				required: ['player_id', 'game_type'],
			},
			response: {
				200: TournamentResponseSchema,
				500: errorResponse,
			}
		},
		handler: tournament,
	};

	// Fetch full bracket for any round
	const getBracketSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			params: {
				type: 'object',
				properties: { id: { type: 'integer' } },
				required: ['id'],
			},
			response: {
				200: {
					type: 'object',
					properties: {
						tournament: TournamentSchema,
						matches: { type: 'array', items: TournamentMatchSchema },
					}
				},
				404: errorResponse,
				500: errorResponse,
			}
		},
		handler: getBracket,
	};

	// Report result of one tournament match and advance bracket
	const reportMatchResultSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			params: {
				type: 'object',
				properties: {
					id: { type: 'integer' },
					tm_id: { type: 'integer' }
				},
				required: ['id', 'tm_id']
			},
			body: {
				type: 'object',
				properties: {
					winner_slot: { type: 'integer', enum: [1, 2] },
					game_type: { type: 'string' },
				},
				required: ['winner_slot', 'game_type']
			},
			response: {
				200: successResponse,
				400: errorResponse,
				404: errorResponse,
				500: errorResponse,
			}
		},
		handler: reportMatchResult,
	};

	// List players in a tournament
	const infoTournamentsSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			params: {
				type: 'object',
				properties: { id: { type: 'integer' } },
				required: ['id'],
			},
			response: {
				200: { type: 'array', items: TournamentPlayersSchema },
				400: errorResponse,
				500: errorResponse,
			}
		},
		handler: infoTournament,
	};

	fastify.get<{ Reply: Tournament[] | ErrorResponse }>(
		'/tournament/list',
		listTournamentsSchema
	);

	fastify.post<{ Body: TournamentBody; Reply: TournamentResponse | ErrorResponse }>(
		'/tournament/auto',
		tournamentSchema
	);

	fastify.get<{ Params: TournamentIdParams; Reply: TournamentPlayers[] | ErrorResponse }>(
		'/tournament/:id/info',
		infoTournamentsSchema
	);

	fastify.get<{ Params: TournamentIdParams; Reply: BracketResponse | ErrorResponse }>(
		'/tournament/:id/bracket',
		getBracketSchema
	);

	fastify.post<{ Params: TournamentMatchParams; Body: ReportMatchResultBody; Reply: SuccessResponse | ErrorResponse }>(
		'/tournament/:id/match/:tm_id/result',
		reportMatchResultSchema
	);

	done();
};

export default tournamentRoutes;
