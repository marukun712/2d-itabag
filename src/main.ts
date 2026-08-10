import {
	drawPSD,
	lerpPose,
	Rig,
	setupCanvas,
	walkPSD,
	withParent,
} from "@kokoro/rig";
import { Viewport } from "pixi-viewport";
import { hairSwayPose } from "./hairTemplate";
import { PUPIL_TEMPLATE } from "./pupilTemplate";
import { TEMPLATE } from "./templates";

const HAIR_NAMES = ["後髪", "後ろの横毛", "横髪L", "横髪R", "前髪", "あほげ"];
const PUPIL_NAMES = ["瞳"];

const app = await setupCanvas(document.getElementById("main")!);
const layers = await walkPSD("/models/character.psd");
const nodes = drawPSD(layers, 50, 50);

const viewport = new Viewport({
	screenWidth: window.innerWidth,
	screenHeight: window.innerHeight,
	events: app.renderer.events,
});

app.stage.addChild(viewport);
viewport.drag().pinch().wheel().decelerate();

for (const node of nodes) {
	viewport.addChild(node.container);
}

const hairNodes = nodes.filter((n) => HAIR_NAMES.includes(n.name));
const pupilNodes = nodes.filter((n) => PUPIL_NAMES.includes(n.name));
const bodyNodes = nodes.filter(
	(n) => !HAIR_NAMES.includes(n.name) && !PUPIL_NAMES.includes(n.name),
);

const bodyRig = new Rig(bodyNodes);
const hairRig = new Rig(hairNodes);
const pupilRig = new Rig(pupilNodes);

let mouseX = 0.5;
let mouseY = 0.5;
let time = 0;

window.addEventListener("mousemove", (e) => {
	mouseX = e.clientX / window.innerWidth;
	mouseY = e.clientY / window.innerHeight;
});

app.ticker.add((ticker) => {
	time += ticker.deltaMS * 0.001;

	const bodyPoses = [
		lerpPose(TEMPLATE.left, TEMPLATE.right, mouseX),
		lerpPose(TEMPLATE.up, TEMPLATE.down, mouseY),
	];

	bodyRig.apply(bodyPoses);

	const applyWithBody = withParent(bodyRig, bodyPoses);

	applyWithBody(hairRig, [hairSwayPose(time)]);

	applyWithBody(pupilRig, [
		lerpPose(PUPIL_TEMPLATE.left, PUPIL_TEMPLATE.right, mouseX),
		lerpPose(PUPIL_TEMPLATE.up, PUPIL_TEMPLATE.down, mouseY),
	]);
});
