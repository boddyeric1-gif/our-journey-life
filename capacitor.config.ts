import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.ourjourney.couple",
  appName: "Our Journey",
  webDir: "dist",
  bundledWebRuntime: false,
  ios: {
    scheme: "Our Journey",
    contentInset: "always",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#1A1426",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#1A1426",
      overlaysWebView: false,
    },
  },
};

export default config;
