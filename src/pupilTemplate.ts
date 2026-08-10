import type { Template } from "./templates";

const MAX = 15;

export const PUPIL_TEMPLATE: Template = {
	left: (_u, _v) => ({ tx: -MAX, ty: 0 }),
	right: (_u, _v) => ({ tx: MAX, ty: 0 }),
	up: (_u, _v) => ({ tx: 0, ty: -MAX }),
	down: (_u, _v) => ({ tx: 0, ty: MAX }),
};
