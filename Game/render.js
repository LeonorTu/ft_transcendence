import { Game } from './game.js';

let controls_p1 = {up: 0, down: 0};
let controls_p2 = {up: 0, down: 0};

const game = new Game();

let board = document.querySelector('.board');
let paddle = document.querySelector('.paddle');
let paddle_1 = document.querySelector('.p1_paddle');
let paddle_2 = document.querySelector('.p2_paddle');

const centerHeight = board.getBoundingClientRect().height / 2;
const paddleHeight = paddle.getBoundingClientRect().height;

document.addEventListener('keydown', (e) => {
	if (e.key === 'w') {
		controls_p1.up = 1;
	}
	else if (e.key === 's') {
		controls_p1.down = 1;
	}
	else if (e.key === 'ArrowUp') {
		controls_p2.up = 1;
	}
	else if (e.key === 'ArrowDown') {
		controls_p2.down = 1;
	}
});

document.addEventListener('keyup', (e) => {
	if (e.key === 'w') {
		controls_p1.up = 0;
	}
	else if (e.key === 's') {
		controls_p1.down = 0;
	}
	else if (e.key === 'ArrowUp') {
		controls_p2.up = 0;
	}
	else if (e.key === 'ArrowDown') {
		controls_p2.down = 0;
	}
});

let state = game.getState();

function render() {
	state = game.getState();
	paddle_1.style.top = centerHeight + state.paddles[0];
	paddle_2.style.top = centerHeight + state.paddles[1];
}

function updatePaddles() {
	if (controls_p1.up == 1 && controls_p1.down == 0) {
		game.updatePaddle1(-10);
	}
	else if (controls_p1.up == 0 && controls_p1.down == 1) {
		game.updatePaddle1(10);
	}
	if (controls_p2.up == 1 && controls_p2.down == 0) {
		game.updatePaddle2(-10);
	}
	else if (controls_p2.up == 0 && controls_p2.down == 1) {
		game.updatePaddle2(10);
	}
}

setInterval(updatePaddles, 10);
setInterval(render, 10);


