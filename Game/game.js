const height = 200;
const width = 500;

class Game {
    constructor() {
		this.players = [];
		this.state = {
			ball: {x: width/2, y: height/2, vx: 2, vy: 1},
			paddles: [0, 0]
		};
	};

	getState() {
		return this.state;
	}
}

export {Game}
