import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Automatically resolves the backend API URL:
 * 1. If EXPO_PUBLIC_BACKEND_URL is explicitly provided and not localhost, use it.
 * 2. If running on a physical phone/Expo Go (iOS / Android):
 *    - Uses the host IP where the Metro bundler is served (e.g. 172.20.0.40)
 * 3. Fallback to localhost:3000 for web and simulators.
 */
function getBackendUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL;

  // If set to an explicit LAN IP or remote URL, use it directly
  if (envUrl && !envUrl.includes("localhost") && !envUrl.includes("127.0.0.1")) {
    return envUrl;
  }

  // When running on iOS / Android physical device, localhost points to the phone itself.
  // We extract Metro's hostUri (the computer's IP) automatically.
  if (Platform.OS !== "web") {
    const hostUri =
      Constants.expoConfig?.hostUri ||
      (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
      (Constants as any).manifest?.debuggerHost;

    if (hostUri) {
      const hostIp = hostUri.split(":")[0];
      if (hostIp && hostIp !== "localhost" && hostIp !== "127.0.0.1") {
        return `http://${hostIp}:3000`;
      }
    }

    // Default to deployed backend in standalone builds / when no dev server host is present
    return "https://donateconnect-zpx6.onrender.com";
  }

  return envUrl || "http://localhost:3000";
}

export const API_URL = getBackendUrl();
