import { curve, getSpatialParams, type Pose } from "@kokoro/rig";

export type Template = {
	left: Pose;
	right: Pose;
	up: Pose;
	down: Pose;
};

const MAX_X = 100;
const MAX_Y = 100;

export const TEMPLATE: Template = {
	left: (u, v) => {
		const { fromTop } = getSpatialParams(u, v);
		return { tx: -MAX_X * curve.power4(fromTop), ty: 0 };
	},
	right: (u, v) => {
		const { fromTop } = getSpatialParams(u, v);
		return { tx: MAX_X * curve.power4(fromTop), ty: 0 };
	},
	up: (u, v) => {
		const { fromTop, isUpperBody } = getSpatialParams(u, v);
		if (!isUpperBody) return { tx: 0, ty: 0 };
		const w = fromTop * 2 - 1;
		return { tx: 0, ty: -MAX_Y * curve.power2(w) };
	},
	down: (u, v) => {
		const { fromTop, isUpperBody } = getSpatialParams(u, v);
		if (!isUpperBody) return { tx: 0, ty: 0 };
		const w = fromTop * 2 - 1;
		return { tx: 0, ty: MAX_Y * curve.power2(w) };
	},
};
