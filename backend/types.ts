import { FastifyRequest, FastifyReply } from 'fastify';
import { Database } from 'sqlite3';

export interface User {
  id: number;
  username: string;
  password?: string;
  email?: string;
  two_fa_code?: string | null;
  two_fa_code_expiration?: number | null;
  online_status?: 'online' | 'offline' | 'away';
  last_seen?: number;
  google_id?: string | null;
  avatar_url?: string | null;
}

export interface JWTPayload {
  id: number;
  username: string;
}

export interface AuthenticatedRequest extends FastifyRequest {
  user: JWTPayload;
  token?: string;
}

export interface Game {
  id: string;
  player1_id: number;
  player2_id: number;
  status: 'waiting' | 'playing' | 'finished';
  winner_id?: number | null;
  created_at: number;
  type?: string;
}

export interface Tournament {
  id: number;
  name: string;
  status: 'pending' | 'ongoing' | 'finished';
  created_at: number;
  winner_id?: number | null;
}

export interface TokenBlacklist {
  token: string;
  expiration: number;
}

export type DbCallback<T = any> = (err: Error | null, result?: T) => void;

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<JWTPayload | void>;
  }
}
