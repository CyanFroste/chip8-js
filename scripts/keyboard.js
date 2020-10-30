export default class Keyboard {
	constructor() {
		// map keycode to chip8 system's hexadecimal code
		this.keymap = {
			49: 0x1, // 1
			50: 0x2, // 2
			51: 0x3, // 3
			52: 0xc, // 4
			81: 0x4, // Q
			87: 0x5, // W
			69: 0x6, // E
			82: 0xd, // R
			65: 0x7, // A
			83: 0x8, // S
			68: 0x9, // D
			70: 0xe, // F
			90: 0xa, // Z
			88: 0x0, // X
			67: 0xb, // C
			86: 0xf, // V
		};

		// tracking of pressed keys
		this.keysPressed = {};

		// some Chip-8 instructions require waiting for the next keypress
		// initially this method has no body
		this.onNextKeyPress = null;

		window.addEventListener("keydown", this.onKeyDown.bind(this), false);
		window.addEventListener("keyup", this.onKeyUp.bind(this), false);
	}

	isKeyPressed(keyCode) {
		return this.keysPressed[keyCode];
	}

	//
	onKeyDown(event) {
		// event.which returns the event's keyCode which is used as key for keymap to get the Chip-8 key
		let key = this.keymap[event.which];
		this.keysPressed[key] = true;

		// if onNextKeyPress is initialized and the pressed key is actually mapped to a Chip-8 key
		// eg. pause and resume
		if (this.onNextKeyPress !== null && key) {
			this.onNextKeyPress(parseInt(key));
			this.onNextKeyPress = null;
		}
	}

	onKeyUp(event) {
		let key = this.keymap[event.which];
		this.keysPressed[key] = false;
	}
}
