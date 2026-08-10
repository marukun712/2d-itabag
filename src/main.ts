import type { Pose } from "@kokoro/rig";
import {
	drawPSD,
	getSpatialParams,
	Rig,
	setupCanvas,
	walkPSD,
} from "@kokoro/rig";
import { Container } from "pixi.js";
import { Viewport } from "pixi-viewport";

const container = new Container();

const app = await setupCanvas(document.body);
const viewport = new Viewport({
	screenWidth: window.innerWidth,
	screenHeight: window.innerHeight,
	worldWidth: 1000,
	worldHeight: 1000,
	events: app.renderer.events,
});
app.stage.addChild(viewport);
viewport.drag().pinch().wheel();
viewport.addChild(container);

const layers = await walkPSD("/models/character.psd");
const nodes = drawPSD(layers, 50, 50);

for (const node of nodes) container.addChild(node.container);

const rig = new Rig(nodes);

const xPose: Pose = (u, v) => {
	const curve = (t: number) => t ** 4;
	const { fromTop } = getSpatialParams(u, v);
	return { tx: 500 * curve(fromTop), ty: 0 };
};

app.ticker.add(() => {
	rig.apply([xPose]);
});
