const width = 1000;
const height = (3/4) * width;
const paddle_height = 20;

class Game {
	constructor() {
		this.players = [];
		this.state = {
			ball: {x: width/2, y: height/2, vx: 2, vy: 1},
			paddles: [0, 0] // offset from vertical center point
		};
	};

	getState() {
		return this.state;
	}

	updatePaddle1(change) {
		this.updatePaddle(change, 0);
	}

	updatePaddle2(change) {
		this.updatePaddle(change, 1);
	}

	updatePaddle(change, paddleInd) {

		if (change < 0) {
			let paddle_center = height / 2 + this.state.paddles[paddleInd];
			let paddle_top = paddle_center - paddle_height;
			if (paddle_top - change > 0) {
				this.state.paddles[paddleInd] += change;
			}
		}
		if (change > 0) {
			let paddle_center = height / 2 + this.state.paddles[paddleInd];
			let paddle_bottom = paddle_center + paddle_height;
			if (paddle_bottom + change < height)
				this.state.paddles[paddleInd] += change;
		}
	}
}
		

export {Game}
