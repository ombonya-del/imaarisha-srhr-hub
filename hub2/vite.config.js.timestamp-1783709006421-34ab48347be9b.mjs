// vite.config.js
import { defineConfig } from "file:///sessions/clever-wizardly-pasteur/mnt/femsaidiakenya/itika/node_modules/vite/dist/node/index.js";
import react from "file:///sessions/clever-wizardly-pasteur/mnt/femsaidiakenya/itika/node_modules/@vitejs/plugin-react/dist/index.js";
import { VitePWA } from "file:///sessions/clever-wizardly-pasteur/mnt/femsaidiakenya/itika/node_modules/vite-plugin-pwa/dist/index.js";
import { fileURLToPath } from "url";
var __vite_injected_original_import_meta_url = "file:///sessions/clever-wizardly-pasteur/mnt/imaarisha-srhr-hub/hub2/vite.config.js";
var vite_config_default = defineConfig({
  resolve: { alias: { "iceberg-js": fileURLToPath(new URL("./src/lib/iceberg-stub.js", __vite_injected_original_import_meta_url)) } },
  css: { postcss: { plugins: [] } },
  // don't inherit the parent repo's postcss.config.mjs
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "ImaarishaSRHR Hub",
        short_name: "Imaarisha",
        description: "The ImaarishaSRHR Collective Hub \u2014 radar, truth, community.",
        theme_color: "#F7F5EF",
        background_color: "#F7F5EF",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: { globPatterns: ["**/*.{js,css,html,svg,png}"], navigateFallbackDenylist: [/privacy\.html$/] }
    })
  ],
  base: "/"
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvc2Vzc2lvbnMvY2xldmVyLXdpemFyZGx5LXBhc3RldXIvbW50L2ltYWFyaXNoYS1zcmhyLWh1Yi9odWIyXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvc2Vzc2lvbnMvY2xldmVyLXdpemFyZGx5LXBhc3RldXIvbW50L2ltYWFyaXNoYS1zcmhyLWh1Yi9odWIyL3ZpdGUuY29uZmlnLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9zZXNzaW9ucy9jbGV2ZXItd2l6YXJkbHktcGFzdGV1ci9tbnQvaW1hYXJpc2hhLXNyaHItaHViL2h1YjIvdml0ZS5jb25maWcuanNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHsgVml0ZVBXQSB9IGZyb20gJ3ZpdGUtcGx1Z2luLXB3YSdcblxuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ3VybCdcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcmVzb2x2ZTogeyBhbGlhczogeyAnaWNlYmVyZy1qcyc6IGZpbGVVUkxUb1BhdGgobmV3IFVSTCgnLi9zcmMvbGliL2ljZWJlcmctc3R1Yi5qcycsIGltcG9ydC5tZXRhLnVybCkpIH0gfSxcbiAgY3NzOiB7IHBvc3Rjc3M6IHsgcGx1Z2luczogW10gfSB9LCAgLy8gZG9uJ3QgaW5oZXJpdCB0aGUgcGFyZW50IHJlcG8ncyBwb3N0Y3NzLmNvbmZpZy5tanNcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAgVml0ZVBXQSh7XG4gICAgICByZWdpc3RlclR5cGU6ICdhdXRvVXBkYXRlJyxcbiAgICAgIGluY2x1ZGVBc3NldHM6IFsnZmF2aWNvbi5zdmcnXSxcbiAgICAgIG1hbmlmZXN0OiB7XG4gICAgICAgIG5hbWU6ICdJbWFhcmlzaGFTUkhSIEh1YicsXG4gICAgICAgIHNob3J0X25hbWU6ICdJbWFhcmlzaGEnLFxuICAgICAgICBkZXNjcmlwdGlvbjogJ1RoZSBJbWFhcmlzaGFTUkhSIENvbGxlY3RpdmUgSHViIFx1MjAxNCByYWRhciwgdHJ1dGgsIGNvbW11bml0eS4nLFxuICAgICAgICB0aGVtZV9jb2xvcjogJyNGN0Y1RUYnLFxuICAgICAgICBiYWNrZ3JvdW5kX2NvbG9yOiAnI0Y3RjVFRicsXG4gICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcbiAgICAgICAgb3JpZW50YXRpb246ICdwb3J0cmFpdCcsXG4gICAgICAgIHN0YXJ0X3VybDogJy8nLFxuICAgICAgICBpY29uczogW1xuICAgICAgICAgIHsgc3JjOiAnL2ljb24tMTkyLnBuZycsIHNpemVzOiAnMTkyeDE5MicsIHR5cGU6ICdpbWFnZS9wbmcnIH0sXG4gICAgICAgICAgeyBzcmM6ICcvaWNvbi01MTIucG5nJywgc2l6ZXM6ICc1MTJ4NTEyJywgdHlwZTogJ2ltYWdlL3BuZycgfSxcbiAgICAgICAgICB7IHNyYzogJy9pY29uLTUxMi5wbmcnLCBzaXplczogJzUxMng1MTInLCB0eXBlOiAnaW1hZ2UvcG5nJywgcHVycG9zZTogJ21hc2thYmxlJyB9XG4gICAgICAgIF1cbiAgICAgIH0sXG4gICAgICB3b3JrYm94OiB7IGdsb2JQYXR0ZXJuczogWycqKi8qLntqcyxjc3MsaHRtbCxzdmcscG5nfSddLCBuYXZpZ2F0ZUZhbGxiYWNrRGVueWxpc3Q6IFsvcHJpdmFjeVxcLmh0bWwkL10gfVxuICAgIH0pXG4gIF0sXG4gIGJhc2U6ICcvJ1xufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBeVcsU0FBUyxvQkFBb0I7QUFDdFksT0FBTyxXQUFXO0FBQ2xCLFNBQVMsZUFBZTtBQUV4QixTQUFTLHFCQUFxQjtBQUpvTSxJQUFNLDJDQUEyQztBQU1uUixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLEVBQUUsT0FBTyxFQUFFLGNBQWMsY0FBYyxJQUFJLElBQUksNkJBQTZCLHdDQUFlLENBQUMsRUFBRSxFQUFFO0FBQUEsRUFDekcsS0FBSyxFQUFFLFNBQVMsRUFBRSxTQUFTLENBQUMsRUFBRSxFQUFFO0FBQUE7QUFBQSxFQUNoQyxTQUFTO0FBQUEsSUFDUCxNQUFNO0FBQUEsSUFDTixRQUFRO0FBQUEsTUFDTixjQUFjO0FBQUEsTUFDZCxlQUFlLENBQUMsYUFBYTtBQUFBLE1BQzdCLFVBQVU7QUFBQSxRQUNSLE1BQU07QUFBQSxRQUNOLFlBQVk7QUFBQSxRQUNaLGFBQWE7QUFBQSxRQUNiLGFBQWE7QUFBQSxRQUNiLGtCQUFrQjtBQUFBLFFBQ2xCLFNBQVM7QUFBQSxRQUNULGFBQWE7QUFBQSxRQUNiLFdBQVc7QUFBQSxRQUNYLE9BQU87QUFBQSxVQUNMLEVBQUUsS0FBSyxpQkFBaUIsT0FBTyxXQUFXLE1BQU0sWUFBWTtBQUFBLFVBQzVELEVBQUUsS0FBSyxpQkFBaUIsT0FBTyxXQUFXLE1BQU0sWUFBWTtBQUFBLFVBQzVELEVBQUUsS0FBSyxpQkFBaUIsT0FBTyxXQUFXLE1BQU0sYUFBYSxTQUFTLFdBQVc7QUFBQSxRQUNuRjtBQUFBLE1BQ0Y7QUFBQSxNQUNBLFNBQVMsRUFBRSxjQUFjLENBQUMsNEJBQTRCLEdBQUcsMEJBQTBCLENBQUMsZ0JBQWdCLEVBQUU7QUFBQSxJQUN4RyxDQUFDO0FBQUEsRUFDSDtBQUFBLEVBQ0EsTUFBTTtBQUNSLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
