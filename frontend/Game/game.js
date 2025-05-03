import { GameRenderer, GameType } from './render.js';

const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const origin = window.location.origin.split(':');

const SERVER_URI = origin[1];
const SERVER_PORT = 8888;
const GAME_ID = urlParams.get('game_id');
const USER_TOKEN = urlParams.get('token');
const GAME_TYPE = urlParams.get('type');

const renderer = new GameRenderer(SERVER_URI, SERVER_PORT, GAME_ID, USER_TOKEN, document, GAME_TYPE);
renderer.start();


