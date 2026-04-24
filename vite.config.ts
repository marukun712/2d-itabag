import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
	plugins: [VitePWA()],
	server: {
		allowedHosts: ["nixos-develop.tail4618d.ts.net"],
	},
});
