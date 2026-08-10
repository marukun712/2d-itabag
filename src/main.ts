import type { Pose } from "@kokoro/rig";
import {
	byName,
	curve,
	drawPSD,
	follow,
	getSpatialParams,
	groupNodes,
	or,
	psdGroup,
	Rig,
	walkPSD,
} from "@kokoro/rig";
import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";

const app = new PIXI.Application();
await app.init({
	resizeTo: window,
	background: "#111118",
	antialias: true,
});
document.getElementById("main")?.appendChild(app.canvas);

const viewport = new Viewport({
	screenWidth: window.innerWidth,
	screenHeight: window.innerHeight,
	events: app.renderer.events,
});
app.stage.addChild(viewport);
viewport.drag().pinch().wheel().decelerate();

// 半目と涙をデフォルトで非表示にして通常表情にする
const layers = await walkPSD("/models/character.psd", {
	hide: or(psdGroup("半"), psdGroup("涙")),
});
const nodes = drawPSD(layers, 50, 50);
for (const node of nodes) {
	viewport.addChild(node.container);
}

// 全身バウンディングボックスの参照リグ (apply() は呼ばない)
const bodyRef = new Rig(nodes);

const charCX = bodyRef.minX + bodyRef.w / 2;
const charCY = bodyRef.minY + bodyRef.h / 2;
const fitScale =
	Math.min(window.innerWidth / bodyRef.w, window.innerHeight / bodyRef.h) *
	0.85;
viewport.setZoom(fitScale);
viewport.moveCenter(charCX, charCY);

// --- 非重複の機能リグ (各ノードはいずれか1つのリグに属する) ---

const lowerRig = new Rig(
	groupNodes(nodes, or(byName("下半身"), byName("足"))).nodes,
);

const upperRig = new Rig(
	groupNodes(
		nodes,
		or(
			byName("上半身"),
			byName("胸当て"),
			byName("振袖"),
			byName("腕"),
			byName("たすき左"),
			byName("たすき右"),
			byName("帯りぼん"),
		),
	).nodes,
);

const headRig = new Rig(
	groupNodes(
		nodes,
		or(
			byName("首"),
			byName("耳L"),
			byName("耳R"),
			byName("輪郭"),
			psdGroup("頬"),
			psdGroup("目"),
			psdGroup("眉影"),
			psdGroup("眉"),
			psdGroup("クチ"),
			byName("鼻"),
		),
	).nodes,
);

// 横髪・前髪: 下端が毛先 (fromBottom = v で重み)
const frontHairRig = new Rig(
	groupNodes(nodes, or(byName("前髪"), byName("横髪L"), byName("横髪R"))).nodes,
);

// あほげ: 上端が毛先 (fromTop = 1-v で重み)
const ahogeRig = new Rig(groupNodes(nodes, byName("あほげ")).nodes);

// 後髪: 下端が毛先
const backHairRig = new Rig(
	groupNodes(nodes, or(byName("後髪"), byName("後ろの横毛"))).nodes,
);

// 帯りぼん・たすきひらひら
const ribbonRig = new Rig(
	groupNodes(nodes, or(byName("帯りぼんひらひら"), byName("たすきひらひら")))
		.nodes,
);

// 瞳はコンテナ平行移動で目線を合わせる
const pupilGroup = groupNodes(nodes, byName("瞳"));

// --- マウス追跡状態 ---
let targetMX = 0; // -1 ~ 1
let targetMY = 0;
let smoothMX = 0;
let smoothMY = 0;
let prevSmoothMX = 0;

window.addEventListener("mousemove", (e) => {
	targetMX = (e.clientX / window.innerWidth - 0.5) * 2;
	targetMY = (e.clientY / window.innerHeight - 0.5) * 2;
});

// --- ポーズ定義 (bodyRef UV 空間で表現) ---
// getSpatialParams: fromTop = 1-v (上端=1, 下端=0), fromBottom = v (上端=0, 下端=1)

// 呼吸: 上半身ほど大きく上下する (power2 × fromTop)
function makeBreath(t: number): Pose {
	const y = Math.sin(t * 0.0008) * 20;
	return (u, v) => {
		const { fromTop } = getSpatialParams(u, v);
		return { tx: 0, ty: -y * curve.power2(fromTop) };
	};
}

// 体全体のゆらぎ: 上半身ほど大きく横に揺れる (power3 × fromTop)
function makeSway(t: number): Pose {
	const x = Math.sin(t * 0.0006) * 35;
	return (u, v) => {
		const { fromTop } = getSpatialParams(u, v);
		return { tx: x * curve.power3(fromTop), ty: 0 };
	};
}

// 体全体がマウスを追う: 上半身ほど大きく傾く (power2 × fromTop)
function makeBodyMouse(mx: number, my: number): Pose {
	return (u, v) => {
		const { fromTop } = getSpatialParams(u, v);
		return {
			tx: mx * 50 * curve.power2(fromTop),
			ty: my * 28 * curve.power2(fromTop),
		};
	};
}

// 頭がさらにマウスへ傾く (bodyMouse に加算)
function makeHeadMouse(mx: number, my: number): Pose {
	return (u, v) => {
		const { fromTop } = getSpatialParams(u, v);
		return {
			tx: mx * 40 * curve.power2(fromTop),
			ty: my * 22 * curve.power2(fromTop),
		};
	};
}

// 垂れ髪の揺れ: 毛先 (下端, v=1) ほど大きく揺れる (power3 × fromBottom)
function makeHairWobble(t: number, vel: number, phase: number): Pose {
	const x = Math.sin(t * 0.003 + phase) * 30 + vel * 150;
	return (u, v) => {
		const { fromBottom } = getSpatialParams(u, v);
		return { tx: x * curve.power3(fromBottom), ty: 0 };
	};
}

// あほげの揺れ: 毛先 (上端, v=0) ほど大きく揺れる (power3 × fromTop)
function makeAhogeWobble(t: number, vel: number): Pose {
	const x = Math.sin(t * 0.0045 + 1.2) * 40 + vel * 200;
	return (u, v) => {
		const { fromTop } = getSpatialParams(u, v);
		return { tx: x * curve.power3(fromTop), ty: 0 };
	};
}

// りぼん・ひらひらの揺れ: 先端ほど大きく (power2 × fromBottom)
function makeRibbonFlutter(t: number): Pose {
	const x = Math.sin(t * 0.007) * 45 + Math.cos(t * 0.004) * 25;
	const y = Math.sin(t * 0.005 + 0.5) * 20;
	return (u, v) => {
		const { fromBottom } = getSpatialParams(u, v);
		return {
			tx: x * curve.power2(fromBottom),
			ty: y * curve.power2(fromBottom),
		};
	};
}

// bodyRef UV 空間のポーズを指定リグの UV 空間に変換する
function fromBody(rig: Rig, ...poses: Pose[]): Pose[] {
	return poses.map((p) => follow(rig, bodyRef, p));
}

// --- アニメーションループ ---
app.ticker.add(() => {
	const t = performance.now();

	prevSmoothMX = smoothMX;
	smoothMX += (targetMX - smoothMX) * 0.04;
	smoothMY += (targetMY - smoothMY) * 0.04;
	const vel = smoothMX - prevSmoothMX;

	const breath = makeBreath(t);
	const sway = makeSway(t);
	const bodyMouse = makeBodyMouse(smoothMX, smoothMY);
	const headMouse = makeHeadMouse(smoothMX, smoothMY);

	// 下半身: 体揺れのみ (上半身より小さい)
	lowerRig.apply(fromBody(lowerRig, breath, sway, bodyMouse));

	// 上半身胴: 体揺れ + マウス追跡
	upperRig.apply(fromBody(upperRig, breath, sway, bodyMouse));

	// 頭・顔: 体揺れ + 追加の頭部傾き
	headRig.apply(fromBody(headRig, breath, sway, bodyMouse, headMouse));

	// 前髪・横髪: 頭の動き + 毛先の揺れ (power3, 下端が毛先)
	frontHairRig.apply([
		...fromBody(frontHairRig, breath, sway, bodyMouse, headMouse),
		makeHairWobble(t, vel, 0),
	]);

	// あほげ: 頭の動き + 毛先の揺れ (power3, 上端が毛先)
	ahogeRig.apply([
		...fromBody(ahogeRig, breath, sway, bodyMouse, headMouse),
		makeAhogeWobble(t, vel),
	]);

	// 後髪: 頭の動き + 揺れ (位相ずらしで差をつける)
	backHairRig.apply([
		...fromBody(backHairRig, breath, sway, bodyMouse, headMouse),
		makeHairWobble(t, vel, 0.7),
	]);

	// リボン・たすきひらひら: 体の揺れ + ひらひら
	ribbonRig.apply([
		...fromBody(ribbonRig, breath, sway, bodyMouse),
		makeRibbonFlutter(t),
	]);

	// 瞳のコンテナをマウス方向にずらして目線を合わせる (±20px)
	pupilGroup.x = smoothMX * 20;
	pupilGroup.y = smoothMY * 12;
});
