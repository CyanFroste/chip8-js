export default class CPU {
	constructor(renderer, keyboard, speaker) {
		this.renderer = renderer;
		this.keyboard = keyboard;
		this.speaker = speaker;

		/* 
		Chip-8 has 16 general purpose 8-bit registers, usually referred to as Vx, where x is a hexadecimal digit (0 through F). There is also a 16-bit register called I. This register is generally used to store memory addresses, so only the lowest (rightmost) 12 bits are usually used.

		The VF register should not be used by any program, as it is used as a flag by some instructions.

		Chip-8 also has two special purpose 8-bit registers, for the delay and sound timers. When these registers are non-zero, they are automatically decremented at a rate of 60Hz.

		The program counter (PC) should be 16-bit, and is used to store the currently executing address. The stack pointer (SP) can be 8-bit, it is used to point to the topmost level of the stack.

		The stack is an array of 16 16-bit values, used to store the address that the interpreter shoud return to when finished with a subroutine. Chip-8 allows for up to 16 levels of nested subroutines.
		*/

		this.memory = new Uint8Array(4096); // 4KB (4096 bytes) of memory
		this.v = new Uint8Array(16); // 16x 8-bit registers
		this.i = 0;
		// timers
		this.delayTimer = 0;
		this.soundTimer = 0;
		this.pc = 0x200; // program counter
		this.stack = new Array(); // don't initialize this with a size in order to avoid empty results.
		this.paused = false; // some instructions require pausing, such as Fx0A.
		this.speed = 10;
	}

	// to load sprites into memory starting from 0x000
	loadSpritesIntoMemory() {
		// array of hex values for each sprite. Each sprite is 5 bytes.
		// prettier-ignore
		const sprites = [
        0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
        0x20, 0x60, 0x20, 0x20, 0x70, // 1
        0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
        0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
        0x90, 0x90, 0xF0, 0x10, 0x10, // 4
        0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
        0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
        0xF0, 0x10, 0x20, 0x40, 0x40, // 7
        0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
        0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
        0xF0, 0x90, 0xF0, 0x90, 0x90, // A
        0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
        0xF0, 0x80, 0x80, 0x80, 0xF0, // C
        0xE0, 0x90, 0x90, 0x90, 0xE0, // D
        0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
        0xF0, 0x80, 0xF0, 0x80, 0x80  // F
    ];

		// sprites are stored in the interpreter section of memory starting at hex 0x000
		for (let i = 0; i < sprites.length; i++) {
			this.memory[i] = sprites[i];
		}
	}

	// to load the ROM's program / instruction set into memory location starting from 0x200
	loadProgramIntoMemory(program) {
		for (let i = 0; i < program.length; i++) {
			this.memory[0x200 + i] = program[i]; // program[i] is the first instruction in the program
		}
	}

	// load ROM from file system
	loadRom(title) {
		let request = new XMLHttpRequest();
		// let self = this;

		request.onload = () => {
			if (request.response) {
				// store the contents of the response in an 8-bit array
				let program = new Uint8Array(request.response);
				// load the ROM/program into memory
				this.loadProgramIntoMemory(program);
			}
		};
		// initialize a GET request to retrieve the ROM from our roms folder
		request.open("GET", `../roms/${title}`);
		request.responseType = "arraybuffer";
		request.send();
	}

	//
	cycle() {
		for (let i = 0; i < this.speed; i++) {
			if (!this.paused) {
				// each instruction is 16 bits (2 bytes) long, but our memory is made up of 8 bit (1 byte) pieces.
				// we have to combine two pieces of memory in order to get the full opcode: this.pc and this.pc + 1
				// shift the value of this.memory[this.pc] 8 bits to the left
				// bitwise OR the next memory to get the instruction essentially combining the memory

				/* eg.
				this.memory[this.pc] = PC = 0x10
				this.memory[this.pc + 1] = PC + 1 = 0xF0
				Shift PC 8 bits (1 byte) left to make it 2 bytes: PC = 0x1000
				Bitwise OR PC and PC + 1: PC | PC + 1 = 0x10F0
															or	0x1000 | 0xF0 = 0x10F0
				*/

				let opcode = (this.memory[this.pc] << 8) | this.memory[this.pc + 1];
				this.executeInstruction(opcode);
			}
		}

		// update timers when not paused
		if (!this.paused) {
			this.updateTimers();
		}
		this.playSound(); // play sound
		this.renderer.render(); // render sprites after the instructions were executed
	}

	updateTimers() {
		// decrement timer by 1 every 60 frames
		if (this.delayTimer > 0) {
			this.delayTimer -= 1;
		}

		if (this.soundTimer > 0) {
			this.soundTimer -= 1;
		}
	}

	playSound() {
		if (this.soundTimer > 0) {
			this.speaker.play(440);
		} else {
			this.speaker.stop();
		}
	}

	// method to execute instruction based on opcode
	executeInstruction(opcode) {
		// each instruction is 2 bytes long, so increment the program counter by 2 after executing each instruction
		this.pc += 2;

		/* 
		Variables found in the opcode

		nnn or addr - A 12-bit value, the lowest 12 bits of the instruction
		n or nibble - A 4-bit value, the lowest 4 bits of the instruction
		x - A 4-bit value, the lower 4 bits of the high byte of the instruction
		y - A 4-bit value, the upper 4 bits of the low byte of the instruction
		kk or byte - An 8-bit value, the lowest 8 bits of the instruction
		*/

		/* eg. 
		Assume we have an instruction 0x5460. If we & (bitwise AND) that instruction with hex value 0x0F00 
		we'll end up with 0x0400. Shift that 8 bits right and we end up with 0x04 or 0x4
		Same thing with y. We & the instruction with hex value 0x00F0 and get 0x0060
		Shift that 4 bits right and we end up with 0x006 or 0x6
		*/

		// We only need the 2nd nibble, so grab the value of the 2nd nibble
		// and shift it right 8 bits to get rid of everything but that 2nd nibble.
		let x = (opcode & 0x0f00) >> 8;

		// We only need the 3rd nibble, so grab the value of the 3rd nibble
		// and shift it right 4 bits to get rid of everything but that 3rd nibble.
		let y = (opcode & 0x00f0) >> 4;

		/* Note:
		we're grabbing the upper 4 bits of the most significant byte of the opcode. 
		According to the instructions in the technical reference you'll notice that we can narrow down 
		the different opcodes by that very first nibble.
		*/
		switch (opcode & 0xf000) {
			case 0x0000:
				switch (opcode) {
					case 0x00e0:
						this.renderer.clear(); // clear display
						break;
					case 0x00ee:
						// Pop the last element in the stack array and store it in this.pc.
						// This will return us from a subroutine.
						this.pc = this.stack.pop();
						/* Note:
						The technical reference states this instruction also "subtracts 1 from the stack pointer". 
						The stack pointer is used to point to the topmost level of the stack. 
						But top of our stack is handled by this.stack array.
						*/
						break;
				}

				break;
			case 0x1000:
				// set the program counter to the value stored in nnn
				this.pc = opcode & 0xfff;
				break;
			case 0x2000:
				this.stack.push(this.pc);
				this.pc = opcode & 0xfff;
				break;
			case 0x3000:
				/*
				This instruction compares the value stored in the x register (Vx) to the value of kk.
				Note that V signifies a register, and the value following it, in this case x, is the register number. 
				If they are equal, we increment the program counter by 2, effectively skipping the next instruction.
				*/
				if (this.v[x] === (opcode & 0xff)) {
					this.pc += 2;
				}
				break;
			case 0x4000:
				// similar to above but if Vx !== kk
				if (this.v[x] !== (opcode & 0xff)) {
					this.pc += 2;
				}
				break;
			case 0x5000:
				// if Vx === Vy
				if (this.v[x] === this.v[y]) {
					this.pc += 2;
				}
				break;
			case 0x6000:
				// set the value of Vx to the value of kk
				this.v[x] = opcode & 0xff;
				break;
			case 0x7000:
				// adds kk to Vx
				this.v[x] += opcode & 0xff;
				break;
			case 0x8000:
				switch (opcode & 0xf) {
					case 0x0:
						// setting the value of Vx equal to the value of Vy
						this.v[x] = this.v[y];
						break;
					case 0x1:
						// set Vx to the value of Vx OR Vy
						this.v[x] |= this.v[y];
						break;
					case 0x2:
						// set Vx to the value of Vx AND Vy
						this.v[x] &= this.v[y];
						break;
					case 0x3:
						// set Vx to the value of Vx XOR Vy
						this.v[x] ^= this.v[y];
						break;
					case 0x4:
						// set Vx to Vx + Vy
						// set VF = V[0xf] = 1 if Vx + Vy > (255 or 0xFF) else 0
						let sum = (this.v[x] += this.v[y]);
						this.v[0xf] = 0;
						if (sum > 0xff) {
							this.v[0xf] = 1;
						}
						/* Note:
						this.v being a Uint8Array, any value over 8 bits automatically has the lower, rightmost, 8 bits 
						taken and stored in the array.
						*/
						this.v[x] = sum;
						/* eg.
						Assume we try to put decimal 257 into the this.v array. In binary that value is 100000001, a 9-bit value
						trying to store this will only include binary 00000001, which is 1 in decimal
						*/
						break;
					case 0x5:
						// similar to above
						this.v[0xf] = 0;
						if (this.v[x] > this.v[y]) {
							this.v[0xf] = 1;
						}
						//  underflow is automatically handled
						this.v[x] -= this.v[y];
						break;
					case 0x6:
						// (this.v[x] & 0x1) will determine the least-significant bit and set this.v[0xF] accordingly
						this.v[0xf] = this.v[x] & 0x1;
						this.v[x] >>= 1;
						break;
					case 0x7:
						// subtracts Vx from Vy and stores the result in Vx
						this.v[0xf] = 0;
						// If Vy is larger then Vx, store 1 in VF, otherwise 0
						if (this.v[y] > this.v[x]) {
							this.v[0xf] = 1;
						}
						this.v[x] = this.v[y] - this.v[x];
						break;
					case 0xe:
						// this.v[x] & 0x80 grabs the most significant bit of Vx and storing that in this.v[0xF]
						/* Note: 
						we have an 8-bit register, Vx, and we want to get the most significant, or leftmost, bit. 
						To do this we need to AND Vx with binary 10000000, or 0x80 in hex. 
						*/
						this.v[0xf] = this.v[x] & 0x80;
						//  multiply Vx by 2 by shifting it left 1
						this.v[x] <<= 1;
						break;
				}

				break;
			case 0x9000:
				//  increments the program counter by 2 if Vx !== Vy
				if (this.v[x] !== this.v[y]) {
					this.pc += 2;
				}
				break;
			case 0xa000:
				// Set the value of register i to nnn
				// eg. if opcode is 0xA740 then (opcode & 0xFFF) will return 0x740
				this.i = opcode & 0xfff;
				break;
			case 0xb000:
				// set this.pc = nnn + V0
				this.pc = (opcode & 0xfff) + this.v[0];
				break;
			case 0xc000:
				// Generate a random number in the range 0-255 and then AND that with the lowest byte of the opcode.
				// eg. if the opcode is 0xB849, then (opcode & 0xFF) = 0x49
				let rand = Math.floor(Math.random() * 0xff);
				this.v[x] = rand & (opcode & 0xff);
				break;
			case 0xd000:
				let width = 8; // hardcode width variable to 8 as each sprite is 8 pixels wide
				let height = opcode & 0xf; // set height to the value of the last nibble (n) of the opcode
				// set VF to 0, which if necessary, will be set to 1 later on if pixels are erased.
				this.v[0xf] = 0;

				for (let row = 0; row < height; row++) {
					// grabbing 8-bits of memory, or a single row of a sprite, that's stored at this.i + row
					let sprite = this.memory[this.i + row];
					for (let col = 0; col < width; col++) {
						// if the bit of the sprite is not 0, render/erase the pixel
						if ((sprite & 0x80) > 0) {
							// the x and y positions are located in Vx and Vy respectively.
							// Add the col number to Vx and the row number to Vy, and you get the desired position to draw/erase a pixel.
							if (this.renderer.setPixel(this.v[x] + col, this.v[y] + row)) {
								// if setPixel returns true, which means a pixel was erased, set VF to 1
								this.v[0xf] = 1;
							}
						}
						// shift the sprite left 1. This will move the next next col/bit of the sprite into the first position.
						// eg. 10010000 << 1 will become 0010000
						sprite <<= 1;
					}
				}
				break;
			case 0xe000:
				switch (opcode & 0xff) {
					case 0x9e:
						// skips the next instruction if the key stored in Vx is pressed, by incrementing the program counter by 2
						if (this.keyboard.isKeyPressed(this.v[x])) {
							this.pc += 2;
						}
						break;
					case 0xa1:
						// opposite of above
						if (!this.keyboard.isKeyPressed(this.v[x])) {
							this.pc += 2;
						}
						break;
				}

				break;
			case 0xf000:
				switch (opcode & 0xff) {
					case 0x07:
						// set Vx = delayTimer
						this.v[x] = this.delayTimer;
						break;
					case 0x0a:
						// pause the emulator
						this.paused = true;
						// initialize the onNextKeyPress method
						this.keyboard.onNextKeyPress = function (key) {
							this.v[x] = key;
							this.paused = false;
						}.bind(this);
						break;
					case 0x15:
						// set delayTimer = Vx
						this.delayTimer = this.v[x];
						break;
					case 0x18:
						// set soundTimer = Vx
						this.soundTimer = this.v[x];
						break;
					case 0x1e:
						// add Vx to register I
						this.i += this.v[x];
						break;
					case 0x29:
						// set I to the location of the sprite at Vx. It's multiplied by 5 as each sprite is 5 bytes long
						this.i = this.v[x] * 5;
						break;
					case 0x33:
						// Get the hundreds digit and place it in memory[I].
						this.memory[this.i] = parseInt(this.v[x] / 100);
						// Get tens digit and place it in memory[I+1].
						// Gets a value between 0 and 99, then divides by 10 to give us a value between 0 and 9.
						this.memory[this.i + 1] = parseInt((this.v[x] % 100) / 10);
						// Get the value of the ones (last) digit and place it in memory[I+2].
						this.memory[this.i + 2] = parseInt(this.v[x] % 10);
						break;
					case 0x55:
						// looping through registers V0 through Vx and storing its value in memory locations from memory[I]
						for (let registerIndex = 0; registerIndex <= x; registerIndex++) {
							this.memory[this.i + registerIndex] = this.v[registerIndex];
						}
						break;
					case 0x65:
						// reverse mapping of previous instruction
						for (let registerIndex = 0; registerIndex <= x; registerIndex++) {
							this.v[registerIndex] = this.memory[this.i + registerIndex];
						}
						break;
				}

				break;

			default:
				throw new Error("Unknown opcode " + opcode);
		}
	}
}
