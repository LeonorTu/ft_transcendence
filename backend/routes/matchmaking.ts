/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   matchmaking.ts                                     :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: mpellegr <mpellegr@student.hive.fi>        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/23 14:47:13 by jmakkone          #+#    #+#             */
/*   Updated: 2025/12/12 by Claude               ###   ########.fr           */
/*                                                                            */
/* ************************************************************************** */

import { FastifyPluginCallback } from 'fastify';
import auth from '../routes/auth';
import { matchmaking } from '../handlers/matchmaking';

interface ErrorResponse {
	error: string;
}

interface MatchmakingBody {
	player_id: number;
	game_type: string;
	player_index?: number;
	pending_id?: number;
}

interface AutoResponse {
	pending_id: number | null;
	match_id: number | null;
}

const errorResponse = {
	type: 'object',
	properties: { error: { type: 'string' } }
} as const;

const AutoResponseSchema = {
	type: 'object',
	properties: {
		pending_id: { type: 'integer', nullable: true },
		match_id: { type: 'integer', nullable: true }
	}
} as const;

const matchmakingRoutes: FastifyPluginCallback = (fastify, options, done) => {
	const matchmakingSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			body: {
				type: 'object',
				properties: {
					player_id: { type: 'integer' },
					game_type: { type: 'string' },
					player_index: { type: 'integer' },
					pending_id: { type: 'integer' }
				},
				required: ['player_id', 'game_type'],
			},
			response: {
				200: AutoResponseSchema,
				400: errorResponse,
				409: errorResponse,
				500: errorResponse
			}
		},
		handler: matchmaking
	};

	fastify.post<{ Body: MatchmakingBody; Reply: AutoResponse | ErrorResponse }>(
		'/matchmaking',
		matchmakingSchema
	);

	done();
};

export default matchmakingRoutes;
