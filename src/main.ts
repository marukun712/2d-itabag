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
const hairOrnament = new Rig(groupNodes(nodes, psdGroup("髪飾り")).nodes);
const eyebrowL = new Rig(groupNodes(nodes, psdGroup("左　眉毛")).nodes);
const eyebrowR = new Rig(groupNodes(nodes, psdGroup("右　眉毛")).nodes);
const skirt = new Rig(groupNodes(nodes, psdGroup("スカート")).nodes);
const ribbon = new Rig(groupNodes(nodes, psdGroup("リボン")).nodes);
const leftArm = new Rig(
	groupNodes(
		nodes,
		or(psdGroup("左腕"), psdGroup("左　二の腕"), psdGroup("左　袖")),
	).nodes,
);
const rightArm = new Rig(
	groupNodes(
		nodes,
		or(psdGroup("右腕"), psdGroup("右　二の腕"), psdGroup("右　袖")),
	).nodes,
);

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
	"笑顔　左　目",
	"笑顔　右　目",
	"笑顔　口",
	"口　閉じ",
	"驚き　口",
	"驚き　左　瞳",
	"驚き　右　瞳",
	"驚き　左　まつ毛",
	"驚き　右　まつ毛",
]);

type Expression = "normal" | "smile" | "surprised";
let currentExpression: Expression = "normal";
let expressionTimer: ReturnType<typeof setTimeout> | null = null;
const eyebrowParams = { raise: 0 };

function setExpression(expr: Expression, duration?: number) {
	if (expressionTimer !== null) {
		clearTimeout(expressionTimer);
		expressionTimer = null;
	}
	currentExpression = expr;

	gsap.to(eyebrowParams, {
		raise: expr === "surprised" ? 1 : 0,
		duration: expr === "surprised" ? 0.15 : 0.3,
	});

	switch (expr) {
		case "normal":
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
				"笑顔　左　目": false,
				"笑顔　右　目": false,
				"笑顔　口": false,
				"口　閉じ": true,
				"驚き　口": false,
				"驚き　左　瞳": false,
				"驚き　右　瞳": false,
				"驚き　左　まつ毛": false,
				"驚き　右　まつ毛": false,
			});
			break;
		case "smile":
			switcher.apply({
				"左　目　閉じ": false,
				"右　目　閉じ": false,
				"左　ハイライト": false,
				"右　ハイライト": false,
				"左　まつ毛": false,
				"右　まつ毛": false,
				"左　瞳": false,
				"右　瞳": false,
				"左　白目": false,
				"右　白目": false,
				"笑顔　左　目": true,
				"笑顔　右　目": true,
				"笑顔　口": true,
				"口　閉じ": false,
				"驚き　口": false,
				"驚き　左　瞳": false,
				"驚き　右　瞳": false,
				"驚き　左　まつ毛": false,
				"驚き　右　まつ毛": false,
			});
			break;
		case "surprised":
			switcher.apply({
				"左　目　閉じ": false,
				"右　目　閉じ": false,
				"左　ハイライト": true,
				"右　ハイライト": true,
				"左　まつ毛": false,
				"右　まつ毛": false,
				"左　瞳": false,
				"右　瞳": false,
				"左　白目": true,
				"右　白目": true,
				"笑顔　左　目": false,
				"笑顔　右　目": false,
				"笑顔　口": false,
				"口　閉じ": false,
				"驚き　口": true,
				"驚き　左　瞳": true,
				"驚き　右　瞳": true,
				"驚き　左　まつ毛": true,
				"驚き　右　まつ毛": true,
			});
			break;
	}

	if (duration !== undefined) {
		expressionTimer = setTimeout(() => setExpression("normal"), duration);
	}
}

setExpression("normal");

function blink() {
	if (currentExpression !== "normal") {
		setTimeout(blink, 2000 + Math.random() * 3000);
		return;
	}

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
		if (currentExpression === "normal") {
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
		}
		setTimeout(blink, 2000 + Math.random() * 3000);
	}, 150);
}

setTimeout(blink, 1000);

const params = { x: 0.5, y: 0.5 };

// touch: look at finger + smile
window.addEventListener("touchstart", (e) => {
	const touch = e.touches[0];
	gsap.to(params, {
		x: touch.clientX / window.innerWidth,
		y: touch.clientY / window.innerHeight,
		duration: 0.5,
		ease: "sine.out",
	});
	if (currentExpression !== "surprised") {
		setExpression("smile", 2000);
	}
});

window.addEventListener("touchmove", (e) => {
	const touch = e.touches[0];
	gsap.to(params, {
		x: touch.clientX / window.innerWidth,
		y: touch.clientY / window.innerHeight,
		duration: 0.3,
		ease: "sine.out",
	});
});

// device orientation: tilt phone to move head
// gamma: left/right (-90 to 90), beta: ~90 when upright
window.addEventListener("deviceorientation", (e) => {
	if (e.gamma === null || e.beta === null) return;
	const x = Math.max(0, Math.min(1, e.gamma / 60 + 0.5));
	const y = Math.max(0, Math.min(1, -(e.beta - 90) / 60 + 0.5));
	gsap.to(params, { x, y, duration: 0.3, ease: "sine.out" });
});

// device motion: shake -> surprised
let prevAccelMag = 0;
window.addEventListener("devicemotion", (e) => {
	const a = e.accelerationIncludingGravity;
	if (!a || a.x === null || a.y === null || a.z === null) return;
	const mag = Math.sqrt(a.x ** 2 + a.y ** 2 + a.z ** 2);
	const delta = Math.abs(mag - prevAccelMag);
	prevAccelMag = mag;
	if (delta > 15 && currentExpression !== "surprised") {
		if (navigator.vibrate) navigator.vibrate([40, 20, 40]);
		setExpression("surprised", 1500);
	}
});

const { getDepthFromUV } = await getDepth(container, app.renderer);

const depthTemplate = (scale: number) =>
	DEPTH_TEMPLATE(getDepthFromUV, scale, scale);

const SWING_TEMPLATE =
	(t: number, scaleR: number, scaleT: number, strength: number, phase = 0) =>
	(u: number, v: number) => {
		const { fromBottom } = getSpatialParams(u, v);
		const w = fromBottom ** strength;
		const swing = Math.sin(t * scaleT + phase);
		return {
			tx: 0,
			ty: 0,
			rot: scaleR * swing * w,
			pivot: { u: 0.5, v: 0.0 },
		};
	};

// gentle full-body breathing oscillation
const BREATHE_POSE =
	(t: number): Pose =>
	(_u, _v) => ({ tx: 0, ty: Math.sin(t * 1.2) * 2 });

// eyebrow vertical shift (raise > 0 = move up)
const EYEBROW_RAISE_POSE =
	(raise: number): Pose =>
	(_u, _v) => ({ tx: 0, ty: -raise * 5 });

const BASE_DEPTH = 40;

app.ticker.add((ticker) => {
	const t = ticker.lastTime / 1000;
	const rootTemplate = depthTemplate(BASE_DEPTH);

	const rootPoses = [
		lerpPose(rootTemplate.left, rootTemplate.right, params.x),
		lerpPose(rootTemplate.up, rootTemplate.down, params.y),
		BREATHE_POSE(t),
	];
	const inheritPoses = withParent(root, rootPoses);

	root.apply(rootPoses);

	inheritPoses(hairFront, [SWING_TEMPLATE(t, 0.1, 1, 2)]);
	inheritPoses(hairBack, [SWING_TEMPLATE(t, 0.1, 1, 2)]);
	inheritPoses(hairOrnament, [SWING_TEMPLATE(t, 0.15, 1.5, 1)]);
	inheritPoses(eyebrowL, [EYEBROW_RAISE_POSE(eyebrowParams.raise)]);
	inheritPoses(eyebrowR, [EYEBROW_RAISE_POSE(eyebrowParams.raise)]);
	inheritPoses(ribbon, [SWING_TEMPLATE(t, 0.2, 2, 1)]);
	inheritPoses(skirt, [SWING_TEMPLATE(t, 0.05, 0.8, 0)]);
	inheritPoses(leftArm, [SWING_TEMPLATE(t, 0.1, 1, 0.2)]);
	inheritPoses(rightArm, [SWING_TEMPLATE(t, 0.1, 1, 0.2, Math.PI)]);
});
