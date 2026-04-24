import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
	plugins: [
		VitePWA({
			registerType: "autoUpdate",

			workbox: {
				globPatterns: ["**/*.{js,css,html,psd}"],
				maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
				runtimeCaching: [
					{
						urlPattern: /\/models\/.+\.psd$/,
						handler: "CacheFirst",
						options: {
							cacheName: "psd-models",
							expiration: {
								maxEntries: 5,
								maxAgeSeconds: 60 * 60 * 24 * 30,
							},
						},
					},
				],
			},
			manifest: {
				name: "2d-itabag",
				short_name: "itabag",
				display: "fullscreen",
			},
		}),
	],
	server: {
		allowedHosts: ["nixos-develop.tail4618d.ts.net"],
	},
});
