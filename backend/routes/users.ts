import { FastifyPluginCallback, FastifyRequest, FastifyReply } from 'fastify';
import db from '../db';

import {
	getUsers,
	registerUser,
	getUser,
	getCurrentUser,
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
	checkPassword,
	getUserMatchList,
	getUserStats,
} from '../handlers/users';

interface UserResponse {
	id: number;
	username: string;
	email: string;
	avatar: string;
	online_status: string;
	two_fa: number;
	google_id: number;
}

interface ErrorResponse {
	error: string;
}

interface SuccessResponse {
	message: string;
}

interface TokenResponse {
	token: string;
}

interface RegisterUserBody {
	username: string;
	password: string;
	email: string;
}

interface LoginUserBody {
	username: string;
	password: string;
}

interface UpdateUserBody {
	currentPassword: string;
	newPassword?: string;
	newUsername?: string;
	twoFA?: 0 | 1;
	newEmail?: string;
}

interface AddFriendBody {
	user_id: number;
	friend_id: number;
}

interface UpdateOnlineStatusBody {
	status: string;
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

interface FriendResponse {
	id: number;
	username: string;
	avatar: string;
	online_status: string;
	friendshipId: number;
}

interface MatchResponse {
	id: number;
	opponent: string;
	opponentAvatar: string;
	result: string;
	score: string;
	date: string;
}

interface StatsResponse {
	totalMatches: number;
	wins: number;
	losses: number;
	winRate: number;
	totalScored: number;
	totalConceded: number;
	tournamentsWon: number;
}

interface AvatarResponse {
	file: string;
}

interface CheckPasswordResponse {
	ok: boolean;
}

const User = {
	type: 'object',
	properties: {
		id: { type: 'integer' },
		username: { type: 'string' },
		email: { type: 'string' },
		avatar: { type: 'string' },
		online_status: { type: 'string' },
		two_fa: { type: 'integer' },
		google_id: { type: 'integer' }
	}
} as const;

const errorResponse = {
	type: 'object',
	properties: {
		error: { type: 'string' },
	}
} as const;

const successResponse = {
	type: 'object',
	properties: {
		message: { type: 'string' },
	}
} as const;

const getUsersSchema = {
	schema: {
		response: {
			200: {
				type: 'array',
				items: User,
			},
			404: errorResponse,
			500: errorResponse,
		},
	},
	handler: getUsers
};

const getUserSchema = {
	schema: {
		response: {
			200: User,
			404: errorResponse,
			500: errorResponse,
		},
	},
	handler: getUser
};

const registerUserSchema = {
	schema: {
		body: {
			type: 'object',
			properties: {
				username: {
					type: 'string',
					minLength: 3,
					maxLength: 20,
					pattern: '^(?!\\d+$)[A-Za-z0-9_]+$'
				},
				password: {
					type: 'string',
					minLength: 8,
					pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$'
				},
				email: {
					type: 'string',
					format: 'email',
				},
			},
			required: ['username', 'password', 'email'],
		},
		response: {
			200: User,
			400: errorResponse,
			500: errorResponse,
		},
	},
	handler: registerUser
};

const loginUserSchema = {
	schema: {
		body: {
			type: 'object',
			properties: {
				username: {
					type: 'string',
					minLength: 3,
					maxLength: 20,
					pattern: '^(?!\\d+$)[A-Za-z0-9_]+$'
				},
				password: {
					type: 'string',
					minLength: 1
				},
			},
			required: ['username', 'password']
		},
		response: {
			200: {
				anyOf: [
					{
						type: 'object',
						properties: {
							token: { type: 'string' }
						},
						required: ['token'],
					},
					successResponse
				]
			},
			400: errorResponse,
			500: errorResponse,
		},
	},
	handler: loginUser
};

const getUserAvatarSchema = {
	schema: {
		response: {
			200: {
				type: 'object',
				properties: {
					file: {
						type: 'string',
						example: 'username_default.png'
					},
				}
			},
			404: errorResponse,
			500: errorResponse
		}
	},
	handler: getUserAvatar
};

const getUserFriendsSchema = {
	schema: {
		response: {
			200: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						id: { type: 'integer' },
						username: { type: 'string' },
						avatar: { type: 'string' },
						online_status: { type: 'string' },
						friendshipId: { type: 'integer' }
					}
				}
			},
			404: errorResponse,
			500: errorResponse
		}
	},
	handler: getUserFriends
};

const checkPasswordSchema = {
	schema: {
		body: {
			type: 'object',
			properties: {
				selected: { type: 'string' },
				password: { type: 'string' },
			},
			required: ['selected', 'password'],
		},
		response: {
			200: {
				type: 'object',
				properties: {
					ok: { type: 'boolean' },
				},
				required: ['ok'],
			},
			404: errorResponse,
			500: errorResponse,
		},
		security: [{ bearerAuth: [] }],
	},
	handler: checkPassword,
};

const usersRoutes: FastifyPluginCallback = (fastify, options, done) => {
	const logoutUserSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			response: {
				200: successResponse,
				400: errorResponse,
				401: errorResponse,
			},
			security: [{ bearerAuth: [] }],
		},
		handler: logoutUser
	};

	const updateUserSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			body: {
				type: 'object',
				properties: {
					currentPassword: {
						type: 'string',
						minLength: 1
					},
					newPassword: {
						type: 'string',
						minLength: 8,
						pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$'
					},
					newUsername: {
						type: 'string',
						minLength: 3,
						maxLength: 20,
						pattern: '^(?!\\d+$)[A-Za-z0-9_]+$'
					},
					twoFA: {
						type: 'integer',
						enum: [0, 1]
					},
					newEmail: {
						type: 'string',
						format: 'email'
					},
				},
				required: ['currentPassword'],
				anyOf: [
					{ required: ['newPassword'] },
					{ required: ['newUsername'] },
					{ required: ['twoFA'] },
					{ required: ['newEmail'] },
				],
			},
			response: {
				200: successResponse,
				404: errorResponse,
				500: errorResponse,
			},
			security: [{ bearerAuth: [] }],
		},
		handler: updateUser
	};

	const uploadAvatarSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			response: {
				200: {
					type: 'object',
					properties: {
						message: { type: 'string' }
					}
				},
				400: errorResponse,
				500: errorResponse,
			},
			security: [{ bearerAuth: [] }],
		},
		handler: uploadAvatar
	};

	const removeAvatarSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			response: {
				200: {
					type: 'object',
					properties: {
						message: { type: 'string' }
					}
				},
				400: errorResponse,
				500: errorResponse,
			},
			security: [{ bearerAuth: [] }],
		},
		handler: removeAvatar
	};

	const addFriendSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			body: {
				type: 'object',
				properties: {
					user_id: { type: 'integer' },
					friend_id: { type: 'integer' },
				},
				required: ['user_id', 'friend_id'],
			},
			response: {
				200: successResponse,
				400: errorResponse,
				409: errorResponse,
				500: errorResponse
			},
			security: [{ bearerAuth: [] }],
		},
		handler: addFriend
	};

	const removeFriendSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			response: {
				200: successResponse,
				400: errorResponse,
				500: errorResponse
			},
			security: [{ bearerAuth: [] }],
		},
		handler: removeFriend
	};

	const updateOnlineStatusSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			body: {
				type: 'object',
				properties: {
					status: { type: 'string' },
				},
				required: ['status'],
			},
			response: {
				200: successResponse,
				400: errorResponse,
				500: errorResponse,
			},
			security: [{ bearerAuth: [] }],
		},
		handler: updateOnlineStatus,
	};

	const getCurrentUserSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			response: {
				200: User,
				404: errorResponse,
				500: errorResponse,
			},
			security: [{ bearerAuth: [] }],
		},
		handler: getCurrentUser,
	};

	const getUserMatchListSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			params: {
				type: 'object',
				properties: {
					username: { type: 'string' }
				},
				required: ['username']
			},
			response: {
				200: {
					type: 'array',
					items: {
						type: 'object',
						properties: {
							id: { type: 'integer' },
							opponent: { type: 'string' },
							opponentAvatar: { type: 'string' },
							result: { type: 'string' },
							score: { type: 'string' },
							date: { type: 'string' }
						},
						required: [
							'id',
							'opponent',
							'opponentAvatar',
							'result',
							'score',
							'date'
						]
					}
				},
				404: errorResponse,
				500: errorResponse
			}
		},
		handler: getUserMatchList,
	};

	const getUserStatsSchema = {
		onRequest: [fastify.authenticate],
		schema: {
			params: {
				type: 'object',
				properties: {
					username: { type: 'string' }
				},
				required: ['username']
			},
			response: {
				200: {
					type: 'object',
					properties: {
						totalMatches: { type: 'integer' },
						wins: { type: 'integer' },
						losses: { type: 'integer' },
						winRate: { type: 'integer' },
						totalScored: { type: 'integer' },
						totalConceded: { type: 'integer' },
						tournamentsWon: { type: 'integer' },
					},
					required: [
						'totalMatches',
						'wins',
						'losses',
						'winRate',
						'totalScored',
						'totalConceded',
						'tournamentsWon'
					]
				},
				404: errorResponse,
				500: errorResponse
			}
		},
		handler: getUserStats
	};

	fastify.get<{ Reply: UserResponse[] | ErrorResponse }>('/users', getUsersSchema);

	fastify.get<{ Params: UsernameParams; Reply: UserResponse | ErrorResponse }>('/user/:username', getUserSchema);

	fastify.post<{ Body: RegisterUserBody; Reply: UserResponse | ErrorResponse }>('/user/register', registerUserSchema);

	fastify.post<{ Body: LoginUserBody; Reply: TokenResponse | SuccessResponse | ErrorResponse }>('/user/login', loginUserSchema);

	fastify.post<{ Reply: SuccessResponse | ErrorResponse }>('/user/logout', logoutUserSchema);

	fastify.put<{ Params: UsernameParams; Body: UpdateUserBody; Reply: SuccessResponse | ErrorResponse }>('/user/:username/update', updateUserSchema);

	fastify.get<{ Params: UsernameParams; Reply: AvatarResponse | ErrorResponse }>('/user/:username/avatar', getUserAvatarSchema);

	fastify.put<{ Params: UsernameParams; Reply: SuccessResponse | ErrorResponse }>('/user/:username/upload_avatar', uploadAvatarSchema);

	fastify.put<{ Params: UsernameParams; Reply: SuccessResponse | ErrorResponse }>('/user/:username/remove_avatar', removeAvatarSchema);

	fastify.post<{ Body: AddFriendBody; Reply: SuccessResponse | ErrorResponse }>('/add_friend', addFriendSchema);

	fastify.get<{ Params: UsernameParams; Reply: FriendResponse[] | ErrorResponse }>('/user/:username/friends', getUserFriendsSchema);

	fastify.delete<{ Params: FriendshipParams; Reply: SuccessResponse | ErrorResponse }>('/remove_friend/:friendshipId', removeFriendSchema);

	fastify.put<{ Params: UsernameParams; Body: UpdateOnlineStatusBody; Reply: SuccessResponse | ErrorResponse }>('/update_online_status/:username', updateOnlineStatusSchema);

	fastify.get<{ Reply: UserResponse | ErrorResponse }>('/user/me', getCurrentUserSchema);

	fastify.post<{ Body: CheckPasswordBody; Reply: CheckPasswordResponse | ErrorResponse }>('/check_password', checkPasswordSchema);

	fastify.get<{ Params: UsernameParams; Reply: MatchResponse[] | ErrorResponse }>('/user/:username/matches', getUserMatchListSchema);

	fastify.get<{ Params: UsernameParams; Reply: StatsResponse | ErrorResponse }>('/user/:username/stats', getUserStatsSchema);

	done();
};

export default usersRoutes;
