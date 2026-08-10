import { curve, getSpatialParams, type Pose } from "@kokoro/rig";

const MAX_X = 200;
const FREQ = 2;

export function hairSwayPose(time: number): Pose {
	return (u, v) => {
		const { fromBottom } = getSpatialParams(u, v);
		return {
			tx: MAX_X * Math.sin(time * FREQ) * curve.power4(fromBottom),
			ty: 0,
		};
	};
}
