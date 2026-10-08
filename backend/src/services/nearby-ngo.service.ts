import { prisma } from "../db/prisma";
import { NgoVerificationStatus } from "@prisma/client";

export interface NearbyNgoResult {
  id: string;
  name: string;
  officialEmail: string;
  contactNumber: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number;
  verificationStatus: NgoVerificationStatus;
}

/**
 * Calculates Haversine distance in kilometers between two geo points
 */
export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Finds verified NGOs near given coordinates within radiusKm,
 * ordered by proximity.
 */
export async function findNearbyVerifiedNgos(
  latitude: number,
  longitude: number,
  radiusKm: number = 25
): Promise<NearbyNgoResult[]> {
  // Approximate 1 deg latitude ~ 111 km, 1 deg longitude ~ 111 * cos(lat)
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos((latitude * Math.PI) / 180));

  const minLat = latitude - latDelta;
  const maxLat = latitude + latDelta;
  const minLon = longitude - lonDelta;
  const maxLon = longitude + lonDelta;

  // Bounding box query filtered strictly to APPROVED verified NGOs
  const ngos = await prisma.ngo.findMany({
    where: {
      verificationStatus: NgoVerificationStatus.APPROVED,
      latitude: {
        gte: minLat,
        lte: maxLat,
      },
      longitude: {
        gte: minLon,
        lte: maxLon,
      },
    },
    select: {
      id: true,
      name: true,
      officialEmail: true,
      contactNumber: true,
      address: true,
      latitude: true,
      longitude: true,
      verificationStatus: true,
    },
  });

  // Calculate exact Haversine distance and filter within radius
  const withDistance: NearbyNgoResult[] = [];

  for (const ngo of ngos) {
    if (ngo.latitude !== null && ngo.longitude !== null) {
      const dist = haversineDistanceKm(latitude, longitude, ngo.latitude, ngo.longitude);
      if (dist <= radiusKm) {
        withDistance.push({
          ...ngo,
          distanceKm: dist,
        });
      }
    }
  }

  // Sort by ascending distance (closest first)
  return withDistance.sort((a, b) => a.distanceKm - b.distanceKm);
}
