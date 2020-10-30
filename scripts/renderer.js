export default class Renderer {
	constructor(scale) {
		// to scale up the pixels to display on the canvas
		this.scale = scale;
		// chip8 based consoles have 64 x 32 pixels
		this.cols = 64;
		this.rows = 32;
		// setting the canvas dimensions
		this.canvas = document.querySelector("canvas");
		this.ctx = this.canvas.getContext("2d");
		this.canvas.width = this.cols * this.scale;
		this.canvas.height = this.rows * this.scale;
		// array to represent the display
		this.display = new Array(this.cols * this.rows);
	}

	// toggles a pixel, 2D to display array mapping
	setPixel(x, y) {
		// returns boolean
		/*
		According to the technical reference, if a pixel is positioned outside of the bounds of the display, 
		it should wrap around to the opposite side, so we need to account for that.
		*/
		if (x > this.cols) {
			x -= this.cols;
		} else if (x < 0) {
			x += this.cols;
		}

		if (y > this.rows) {
			y -= this.rows;
		} else if (y < 0) {
			y += this.rows;
		}

		// with this mapping we can retrieve the pixel like
		let pixel = x + y * this.cols;

		// According to the technical reference, sprites are XORed onto the display
		// value at display[pixel] = 1 / 0 if it's 0 / 1
		this.display[pixel] ^= 1; // display[pixel] XOR 1

		// return a value to signify whether a pixel was erased or not.
		// returns true if a pixel was erased else false
		return !this.display[pixel];
	}

	// clear the display by resetting the display array
	clear() {
		this.display = new Array(this.cols * this.rows);
	}

	render() {
		// clear the canvas
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

		for (let i = 0; i < this.cols * this.rows; i++) {
			// based on the display array's index predict the position of x and y reflected onto the canvas
			let x = (i % this.cols) * this.scale;
			let y = Math.floor(i / this.cols) * this.scale;

			// if this.display[i] == 1, draw a pixel
			if (this.display[i]) {
				// Set the pixel color to black
				this.ctx.fillStyle = "#000";
				// draw a pixel at position (x, y) with a width and height of scale
				this.ctx.fillRect(x, y, this.scale, this.scale);
			}
		}
	}

	test() {
		this.setPixel(1, 1);
		this.setPixel(24, 24);
		this.render();
	}
}
