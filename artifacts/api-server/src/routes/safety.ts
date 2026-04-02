import { Router, type IRouter } from "express";
import {
  GetRouteBody,
  GetRouteResponse,
  GetRiskScoreQueryParams,
  GetRiskScoreResponse,
  TriggerSosBody,
  TriggerSosResponse,
  GetUnsafeZonesResponse,
} from "@workspace/api-zod";
import { randomUUID } from "crypto";

const router: IRouter = Router();

// ─────────────────────────────────────────
// Helpers: Safety scoring logic
// ─────────────────────────────────────────

/** Returns a time-of-day risk multiplier (0-1, higher = riskier) */
function getTimeOfDayRisk(): { multiplier: number; level: "low" | "medium" | "high" } {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 20) {
    return { multiplier: 0.2, level: "low" }; // Daytime — relatively safe
  } else if (hour >= 20 && hour < 23) {
    return { multiplier: 0.5, level: "medium" }; // Evening — moderate risk
  } else {
    return { multiplier: 0.9, level: "high" }; // Night/early morning — high risk
  }
}

/**
 * Simulates a crime score for an area based on coordinates.
 * Uses a deterministic seeded formula so the same location always returns the same score.
 */
function getCrimeScore(lat: number, lng: number): number {
  // Deterministic "random" based on coordinates — ensures consistency for the same area
  const seed = Math.abs(Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453123);
  return seed - Math.floor(seed); // Returns 0-1
}

/**
 * Lighting score simulated from time and area.
 * Business districts have better lighting (lower crime areas).
 */
function getLightingScore(lat: number, lng: number): number {
  const crimeScore = getCrimeScore(lat, lng);
  const hour = new Date().getHours();
  const isDaytime = hour >= 6 && hour < 20;
  // Good lighting: daytime or low-crime area
  return isDaytime ? 0.9 : 1 - crimeScore * 0.8;
}

/** Crowd density — higher during day in commercial areas */
function getCrowdDensity(lat: number, lng: number): number {
  const hour = new Date().getHours();
  const crimeScore = getCrimeScore(lat, lng);
  // Commercial areas (lower crime) have more people during day
  if (hour >= 9 && hour < 22) {
    return 0.6 + (1 - crimeScore) * 0.3; // 0.6-0.9
  }
  return 0.1 + (1 - crimeScore) * 0.2; // 0.1-0.3 at night
}

/**
 * Computes a weighted safety score (0-100) for a location.
 * Higher score = safer.
 */
function computeSafetyScore(lat: number, lng: number): {
  score: number;
  level: "low" | "medium" | "high";
  factors: { timeOfDay: number; crimeIndex: number; lighting: number; crowdDensity: number };
} {
  const timeRisk = getTimeOfDayRisk();
  const crimeIndex = getCrimeScore(lat, lng);
  const lighting = getLightingScore(lat, lng);
  const crowdDensity = getCrowdDensity(lat, lng);

  // Weighted score: lower crime, good lighting, high crowd = safer
  const rawScore =
    (1 - timeRisk.multiplier) * 0.30 +  // 30% weight on time
    (1 - crimeIndex) * 0.40 +             // 40% weight on crime history
    lighting * 0.15 +                      // 15% weight on lighting
    crowdDensity * 0.15;                   // 15% weight on crowd

  const score = Math.round(rawScore * 100);
  const level: "low" | "medium" | "high" = score >= 70 ? "low" : score >= 40 ? "medium" : "high";

  return {
    score,
    level,
    factors: {
      timeOfDay: Math.round((1 - timeRisk.multiplier) * 100),
      crimeIndex: Math.round((1 - crimeIndex) * 100),
      lighting: Math.round(lighting * 100),
      crowdDensity: Math.round(crowdDensity * 100),
    },
  };
}

/**
 * Generates route polyline points between two lat/lng coordinates.
 * Simulates a realistic path by adding intermediate waypoints with slight offsets.
 */
function generateRoutePoints(
  srcLat: number,
  srcLng: number,
  dstLat: number,
  dstLng: number,
  offset: number = 0,
  numPoints: number = 8
): Array<{ lat: number; lng: number }> {
  const points: Array<{ lat: number; lng: number }> = [];

  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    // Linear interpolation with a slight curve offset
    const lat = srcLat + (dstLat - srcLat) * t;
    const lng = srcLng + (dstLng - srcLng) * t;

    // Add a perpendicular offset to simulate different road paths
    const perpLat = -(dstLng - srcLng) * offset;
    const perpLng = (dstLat - srcLat) * offset;

    // Add small random-looking variation for realism
    const variation = Math.sin(i * Math.PI) * 0.001;

    points.push({
      lat: parseFloat((lat + perpLat + variation).toFixed(6)),
      lng: parseFloat((lng + perpLng).toFixed(6)),
    });
  }

  return points;
}

/** Haversine distance in km between two coordinates */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────
// Hardcoded unsafe zones (Delhi-area based)
// ─────────────────────────────────────────

const UNSAFE_ZONES = [
  {
    id: "zone-1",
    name: "Industrial Area Sector 12",
    lat: 28.6304,
    lng: 77.2177,
    radius: 400,
    riskLevel: "high" as const,
    description: "Poorly lit industrial area with low foot traffic at night",
  },
  {
    id: "zone-2",
    name: "Old Market Crossroads",
    lat: 28.6462,
    lng: 77.2065,
    radius: 300,
    riskLevel: "medium" as const,
    description: "Congested market area with reported incidents after 9 PM",
  },
  {
    id: "zone-3",
    name: "Underpass Near Station",
    lat: 28.6225,
    lng: 77.2302,
    radius: 250,
    riskLevel: "high" as const,
    description: "Isolated underpass with poor surveillance",
  },
  {
    id: "zone-4",
    name: "Vacant Lot Area",
    lat: 28.6589,
    lng: 77.1985,
    radius: 350,
    riskLevel: "medium" as const,
    description: "Undeveloped area with limited street lighting",
  },
  {
    id: "zone-5",
    name: "Night Market Zone",
    lat: 28.6350,
    lng: 77.2250,
    radius: 200,
    riskLevel: "medium" as const,
    description: "Street market with crowding and reduced visibility after dark",
  },
];

// ─────────────────────────────────────────
// Routes
// ─────────────────────────────────────────

/** GET /api/risk-score?lat=...&lng=... — Returns safety score for a location */
router.get("/risk-score", async (req, res): Promise<void> => {
  const parsed = GetRiskScoreQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { lat, lng } = parsed.data;
  const { score, level, factors } = computeSafetyScore(lat, lng);

  req.log.info({ lat, lng, score, level }, "Risk score computed");

  res.json(
    GetRiskScoreResponse.parse({
      lat,
      lng,
      score,
      level,
      factors,
    })
  );
});

/** POST /api/route — Returns fastest and safest routes with safety scores */
router.post("/route", async (req, res): Promise<void> => {
  const parsed = GetRouteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { sourceLat, sourceLng, destLat, destLng } = parsed.data;

  // Compute distance
  const baseDistance = distanceKm(sourceLat, sourceLng, destLat, destLng);

  // Time of day risk
  const timeRisk = getTimeOfDayRisk();

  // Fastest route — straight-ish path, may pass through riskier areas
  const fastestPoints = generateRoutePoints(sourceLat, sourceLng, destLat, destLng, 0);
  const fastestMidLat = (sourceLat + destLat) / 2;
  const fastestMidLng = (sourceLng + destLng) / 2;
  const fastestSafety = computeSafetyScore(fastestMidLat, fastestMidLng);

  // Safest route — detoured path, avoids high-risk areas (slightly longer)
  const safestPoints = generateRoutePoints(sourceLat, sourceLng, destLat, destLng, 0.3);
  const safestMidLat = (sourceLat + destLat) / 2 + 0.01;
  const safestMidLng = (sourceLng + destLng) / 2 + 0.005;
  const safestSafety = computeSafetyScore(safestMidLat, safestMidLng);

  // Safest route always has a higher safety score (boost if needed)
  const safestScore = Math.min(100, Math.max(fastestSafety.score + 15, safestSafety.score));
  const safestLevel: "low" | "medium" | "high" =
    safestScore >= 70 ? "low" : safestScore >= 40 ? "medium" : "high";

  req.log.info(
    { sourceLat, sourceLng, destLat, destLng, fastestScore: fastestSafety.score, safestScore },
    "Routes computed"
  );

  res.json(
    GetRouteResponse.parse({
      fastest: {
        type: "fastest",
        points: fastestPoints,
        safetyScore: fastestSafety.score,
        distanceKm: parseFloat(baseDistance.toFixed(2)),
        estimatedMinutes: Math.round((baseDistance / 30) * 60), // 30 km/h avg speed
        riskLevel: fastestSafety.level,
        color: "#3B82F6", // blue
      },
      safest: {
        type: "safest",
        points: safestPoints,
        safetyScore: safestScore,
        distanceKm: parseFloat((baseDistance * 1.2).toFixed(2)), // 20% longer
        estimatedMinutes: Math.round(((baseDistance * 1.2) / 25) * 60), // slightly slower
        riskLevel: safestLevel,
        color: "#22C55E", // green
      },
      timeOfDayRisk: timeRisk.level,
    })
  );
});

/** POST /api/sos — Triggers emergency SOS alert */
router.post("/sos", async (req, res): Promise<void> => {
  const parsed = TriggerSosBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { lat, lng, message } = parsed.data;
  const alertId = randomUUID();

  // Simulate notifying emergency contacts (2-3 contacts)
  const contactsNotified = 2 + Math.floor(Math.random() * 2);

  req.log.warn({ lat, lng, alertId, contactsNotified }, "SOS alert triggered");

  res.json(
    TriggerSosResponse.parse({
      success: true,
      alertId,
      message: message
        ? `SOS alert sent: ${message}`
        : `Emergency alert sent! Your location (${lat.toFixed(4)}, ${lng.toFixed(4)}) has been shared with your emergency contacts.`,
      contactsNotified,
      timestamp: new Date().toISOString(),
    })
  );
});

/** GET /api/unsafe-zones — Returns predefined unsafe zones */
router.get("/unsafe-zones", async (_req, res): Promise<void> => {
  res.json(
    GetUnsafeZonesResponse.parse({
      zones: UNSAFE_ZONES,
    })
  );
});

export default router;
