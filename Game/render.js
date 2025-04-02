import { Game } from './game.js';

// colors
const BLACK = "#000000";
const WHITE = "#ffffff";

const game = new Game();
const settings = game.getSettings();

const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

canvas.setAttribute("height", settings.board_height);
canvas.setAttribute("width", settings.board_width);

// settings
const paddle_height = settings.paddle_height;
const paddle_width = settings.paddle_width;
const paddle_margin = settings.paddle_wall_dist;
const paddle_start = (canvas.height / 2) - (paddle_height / 2);
const ball_radius = settings.ball_radius;

let controls_p1 = {up: 0, down: 0};
let controls_p2 = {up: 0, down: 0};

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

let state = game.state;

function draw_paddle_1(offset) {
	ctx.fillStyle = WHITE;
	ctx.fillRect(paddle_margin, paddle_start + offset, paddle_width, paddle_height);
}

function draw_paddle_2(offset) {
	ctx.fillStyle = WHITE;
	ctx.fillRect(canvas.width - paddle_margin - paddle_width, paddle_start + offset, paddle_width, paddle_height);
}

function draw_ball(ball_state) {
	ctx.fillStyle = WHITE;
	ctx.beginPath();
	ctx.arc(ball_state.x, ball_state.y, ball_radius, 0, Math.PI * 2, true);
	ctx.fill();
}

function draw_scores(players) {
	console.log(players);
	ctx.font = "48px serif";
	ctx.fillText(players['player_1'].score, settings.board_width / 4, 50);
	ctx.fillText(players['player_2'].score, settings.board_width * (3/4), 50);
}

function draw_center_line()
{
	ctx.setLineDash([10, 10]);
	ctx.strokeStyle = WHITE;
	ctx.lineWidth = paddle_width / 2;
	ctx.beginPath();
	ctx.moveTo(canvas.width / 2, 0);
	ctx.lineTo(canvas.width / 2, canvas.height);
	ctx.stroke();
}

function render() {
	state = game.state;
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	draw_center_line();
	draw_scores(state.players);
	draw_paddle_1(state.objects.left_paddle.y_offset);
	draw_paddle_2(state.objects.right_paddle.y_offset);
	draw_ball(state.objects.ball);
}

function updatePaddles() {
	if (controls_p1.up == 1 && controls_p1.down == 0) {
		game.movePaddle1("up");
	}
	else if (controls_p1.up == 0 && controls_p1.down == 1) {
		game.movePaddle1("down");
	}
	if (controls_p2.up == 1 && controls_p2.down == 0) {
		game.movePaddle2("up");
	}
	else if (controls_p2.up == 0 && controls_p2.down == 1) {
		game.movePaddle2("down");
	}
}


// Temporary function to refresh game
function refreshGame() {
	game.refreshGame();
}

setInterval(updatePaddles, 10);
setInterval(render, 10);
setInterval(refreshGame, 10);

