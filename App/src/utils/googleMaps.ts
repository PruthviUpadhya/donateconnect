import { Linking, Platform } from "react-native";

export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * Opens Google Maps turn-by-turn navigation directly to the target destination.
 * If origin is provided, routes from origin to destination.
 * Works seamlessly on Android, iOS, and Web.
 */
export function openGoogleMapsNavigation(
  destination: string | LatLng,
  origin?: string | LatLng,
  travelMode: "driving" | "bicycling" | "walking" | "transit" = "driving"
) {
  const destQuery = typeof destination === "string"
    ? encodeURIComponent(destination)
    : `${destination.latitude},${destination.longitude}`;

  const originQuery = origin
    ? typeof origin === "string"
      ? `&origin=${encodeURIComponent(origin)}`
      : `&origin=${origin.latitude},${origin.longitude}`
    : "";

  // Universal Google Maps directions URL
  const url = `https://www.google.com/maps/dir/?api=1&destination=${destQuery}${originQuery}&travelmode=${travelMode}`;

  Linking.canOpenURL(url)
    .then((supported) => {
      if (supported || Platform.OS === "web") {
        return Linking.openURL(url);
      } else {
        // Fallback for native Android intent or apple maps if custom scheme fails
        const fallbackUrl = `https://maps.google.com/?q=${destQuery}`;
        return Linking.openURL(fallbackUrl);
      }
    })
    .catch((err) => {
      console.warn("Could not open Google Maps:", err);
    });
}

/**
 * Opens Google Maps to search or pin a specific location/address.
 */
export function openGoogleMapsSearch(addressOrQuery: string) {
  const encoded = encodeURIComponent(addressOrQuery);
  const url = `https://www.google.com/maps/search/?api=1&query=${encoded}`;
  Linking.openURL(url).catch((err) => {
    console.warn("Could not open Google Maps search:", err);
  });
}
