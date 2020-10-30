import Renderer from "./renderer.js";
import Keyboard from "./keyboard.js";
import Speaker from "./speaker.js";
import CPU from "./cpu.js";

// renderer object with a scale of 10
const renderer = new Renderer(10);
const keyboard = new Keyboard();
const speaker = new Speaker();

const cpu = new CPU(renderer, keyboard, speaker);

let fps = 60;
let loop, fpsInterval, startTime, now, then, elapsed;

function init() {
	fpsInterval = 1000 / fps; // interval b/w frames
	then = Date.now();
	startTime = then;

	cpu.loadSpritesIntoMemory();
	cpu.loadRom("BLINKY");

	loop = requestAnimationFrame(step);
}

function step() {
	now = Date.now();
	elapsed = now - then;

	if (elapsed > fpsInterval) {
		cpu.cycle();
	}

	loop = requestAnimationFrame(step);
}

init();
