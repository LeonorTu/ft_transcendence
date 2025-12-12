import { GameRenderer, GameType } from './render.js';

const queryString: string = window.location.search;
const urlParams: URLSearchParams = new URLSearchParams(queryString);
const origin: string[] = window.location.origin.split(':');

const SERVER_URI: string = origin[1];
const SERVER_PORT: number = 8888;
const GAME_ID: string | null = urlParams.get('game_id');
const USER_TOKEN: string | null = urlParams.get('token');
const GAME_TYPE: string | null = urlParams.get('type');

if (!GAME_ID || !USER_TOKEN || !GAME_TYPE) {
	throw new Error('Missing required URL parameters: game_id, token, or type');
}

const renderer: GameRenderer = new GameRenderer(GAME_ID, USER_TOKEN, document, GAME_TYPE);
renderer.start();
