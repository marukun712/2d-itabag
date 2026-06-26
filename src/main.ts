import {
	byName,
	drawPSD,
	getSpatialParams,
	groupNodes,
	lerpPose,
	or,
	type Pose,
	psdGroup,
	Rig,
	Switcher,
	setupCanvas,
	walkPSD,
	withParent,
} from "@kokoro/rig";
import { DEPTH_TEMPLATE, getDepth } from "@kokoro/rig/depth";
import gsap from "gsap";
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

const layers = await walkPSD("/models/character.psd", {
	hide: byName("笑顔　口"),
	show: byName("口　閉じ"),
});
const nodes = drawPSD(layers, 50, 50);

for (const node of nodes) container.addChild(node.container);

const root = new Rig(nodes);
const hairFront = new Rig(
	groupNodes(nodes, or(psdGroup("前　髪"), psdGroup("もみあげ"))).nodes,
);
const hairBack = new Rig(groupNodes(nodes, psdGroup("後　髪")).nodes);
const eyeL = new Rig(
	groupNodes(nodes, or(psdGroup("左　瞳"), psdGroup("左　ハイライト"))).nodes,
);
const eyeR = new Rig(
	groupNodes(nodes, or(psdGroup("右　瞳"), psdGroup("右　ハイライト"))).nodes,
);
const skirt = new Rig(groupNodes(nodes, psdGroup("スカート")).nodes);
const ribbon = new Rig(groupNodes(nodes, psdGroup("リボン")).nodes);
const leftArm = new Rig(groupNodes(nodes, psdGroup("左腕")).nodes);
const rightArm = new Rig(groupNodes(nodes, psdGroup("右腕")).nodes);

const switcher = new Switcher(nodes, [
	"左　目　閉じ",
	"右　目　閉じ",
	"左　ハイライト",
	"右　ハイライト",
	"左　まつ毛",
	"右　まつ毛",
	"左　瞳",
	"右　瞳",
	"左　白目",
	"右　白目",
]);

switcher.apply({
	"左　目　閉じ": false,
	"右　目　閉じ": false,
	"左　ハイライト": true,
	"右　ハイライト": true,
	"左　まつ毛": true,
	"右　まつ毛": true,
	"左　瞳": true,
	"右　瞳": true,
	"左　白目": true,
	"右　白目": true,
});

function blink() {
	switcher.apply({
		"左　目　閉じ": true,
		"右　目　閉じ": true,
		"左　ハイライト": false,
		"右　ハイライト": false,
		"左　まつ毛": false,
		"右　まつ毛": false,
		"左　瞳": false,
		"右　瞳": false,
		"左　白目": false,
		"右　白目": false,
	});

	setTimeout(() => {
		switcher.apply({
			"左　目　閉じ": false,
			"右　目　閉じ": false,
			"左　ハイライト": true,
			"右　ハイライト": true,
			"左　まつ毛": true,
			"右　まつ毛": true,
			"左　瞳": true,
			"右　瞳": true,
			"左　白目": true,
			"右　白目": true,
		});

		setTimeout(blink, 2000 + Math.random() * 3000);
	}, 150);
}

setTimeout(blink, 1000);

const params = { x: 0.5, y: 0.5 };

window.addEventListener("mousemove", (e) => {
	gsap.to(params, {
		x: e.clientX / window.innerWidth,
		y: e.clientY / window.innerHeight,
		duration: 0.5,
		ease: "sine.out",
	});
});

const { getDepthFromUV } = await getDepth(container, app.renderer).catch(
	(e) => {
		console.error("getDepth failed", e);
		throw e;
	},
);
const depthTemplate = (scale: number) =>
	DEPTH_TEMPLATE(getDepthFromUV, scale, scale);

const SWING_TEMPLATE =
	(t: number, scaleR: number, scaleT: number, strength: number) =>
	(u: number, v: number) => {
		const { fromBottom } = getSpatialParams(u, v);
		const w = fromBottom ** strength;
		const swing = Math.sin(t * scaleT);

		return {
			tx: 0,
			ty: 0,
			rot: scaleR * swing * w,
			pivot: { u: 0.5, v: 0.0 },
		};
	};

const BASE_DEPTH = 80;

const parts = [
	{ rig: hairFront, swing: { scaleR: 0.1, scaleT: 1, strength: 2 } },
	{ rig: hairBack, swing: { scaleR: 0.1, scaleT: 1, strength: 2 } },
	{ rig: eyeL },
	{ rig: eyeR },
	{ rig: ribbon, swing: { scaleR: 0.2, scaleT: 2, strength: 1 } },
	{ rig: skirt },
	{ rig: leftArm, swing: { scaleR: 0.1, scaleT: 1, strength: 0.2 } },
	{ rig: rightArm, swing: { scaleR: 0.1, scaleT: 1, strength: 0.2 } },
] as const;

app.ticker.add((ticker) => {
	const t = ticker.lastTime / 1000;
	const rootTemplate = depthTemplate(BASE_DEPTH);

	const rootPoses = [
		lerpPose(rootTemplate.left, rootTemplate.right, params.x),
		lerpPose(rootTemplate.up, rootTemplate.down, params.y),
	];

	const inheritPoses = withParent(root, rootPoses);

	root.apply(rootPoses);

	for (const part of parts) {
		const poses: Pose[] = [];

		if ("swing" in part) {
			const s = part.swing;
			poses.push(SWING_TEMPLATE(t, s.scaleR, s.scaleT, s.strength));
		}

		inheritPoses(part.rig, poses);
	}
});
