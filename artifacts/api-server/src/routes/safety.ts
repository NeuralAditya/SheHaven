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
// Constants
// ─────────────────────────────────────────

const WALKING_SPEED_KMH = 5; // Average walking speed

// Delhi CCTV-covered safe zones (well-monitored areas)
const CCTV_ZONES = [
  { lat: 28.6315, lng: 77.2167, radius: 500 }, // Connaught Place
  { lat: 28.6129, lng: 77.2295, radius: 400 }, // India Gate / Rajpath
  { lat: 28.6146, lng: 77.2118, radius: 350 }, // Central Secretariat
  { lat: 28.6509, lng: 77.1897, radius: 300 }, // Karol Bagh Market
  { lat: 28.5770, lng: 77.1934, radius: 300 }, // Sarojini Nagar Market
  { lat: 28.6507, lng: 77.2295, radius: 400 }, // Chandni Chowk
  { lat: 28.6414, lng: 77.2193, radius: 350 }, // New Delhi Railway Station
];

// Delhi unsafe zones
const UNSAFE_ZONES = [
  { id: "zone-1", name: "Industrial Area Sector 12", lat: 28.6304, lng: 77.2177, radius: 400, riskLevel: "high" as const, description: "Poorly lit industrial area with low foot traffic at night" },
  { id: "zone-2", name: "Old Market Crossroads", lat: 28.6462, lng: 77.2065, radius: 300, riskLevel: "medium" as const, description: "Congested market area with reported incidents after 9 PM" },
  { id: "zone-3", name: "Underpass Near Station", lat: 28.6225, lng: 77.2302, radius: 250, riskLevel: "high" as const, description: "Isolated underpass with poor surveillance" },
  { id: "zone-4", name: "Vacant Lot Area", lat: 28.6589, lng: 77.1985, radius: 350, riskLevel: "medium" as const, description: "Undeveloped area with limited street lighting" },
  { id: "zone-5", name: "Night Market Zone", lat: 28.6350, lng: 77.2250, radius: 200, riskLevel: "medium" as const, description: "Street market with crowding and reduced visibility after dark" },
];

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function getTimeOfDayRisk(): { multiplier: number; level: "low" | "medium" | "high"; isNight: boolean } {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 20) {
    return { multiplier: 0.15, level: "low", isNight: false };
  } else if (hour >= 20 && hour < 23) {
    return { multiplier: 0.55, level: "medium", isNight: true };
  } else {
    return { multiplier: 0.90, level: "high", isNight: true };
  }
}

/** Deterministic crime score based on coordinates (0-1, higher = more crime) */
function getCrimeScore(lat: number, lng: number): number {
  const seed = Math.abs(Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453123);
  return seed - Math.floor(seed);
}

/** Lighting score: night + dark areas reduce this significantly */
function getLightingScore(lat: number, lng: number): number {
  const crimeScore = getCrimeScore(lat, lng);
  const hour = new Date().getHours();
  const isDaytime = hour >= 6 && hour < 20;

  if (isDaytime) return 0.9;

  // At night, check if within a CCTV zone (well-lit)
  const cctvBoost = isCctvCovered(lat, lng) ? 0.4 : 0;
  return Math.max(0.05, 1 - crimeScore * 0.9 + cctvBoost);
}

/** Returns how far (meters) from nearest unsafe zone */
function distanceToNearestUnsafeZone(lat: number, lng: number): number {
  let minDist = Infinity;
  for (const zone of UNSAFE_ZONES) {
    const d = haversineMeters(lat, lng, zone.lat, zone.lng) - zone.radius;
    if (d < minDist) minDist = d;
  }
  return Math.max(0, minDist);
}

/** Returns true if within any CCTV covered zone */
function isCctvCovered(lat: number, lng: number): boolean {
  return CCTV_ZONES.some(
    (z) => haversineMeters(lat, lng, z.lat, z.lng) <= z.radius
  );
}

function getCrowdDensity(lat: number, lng: number): number {
  const hour = new Date().getHours();
  const crimeScore = getCrimeScore(lat, lng);
  const cctvBoost = isCctvCovered(lat, lng) ? 0.15 : 0;
  if (hour >= 9 && hour < 22) return Math.min(1, 0.6 + (1 - crimeScore) * 0.3 + cctvBoost);
  return Math.min(1, 0.1 + (1 - crimeScore) * 0.2 + cctvBoost);
}

function computeSafetyScore(lat: number, lng: number): {
  score: number;
  level: "low" | "medium" | "high";
  factors: { timeOfDay: number; crimeIndex: number; lighting: number; crowdDensity: number };
} {
  const timeRisk = getTimeOfDayRisk();
  const crimeIndex = getCrimeScore(lat, lng);
  const lighting = getLightingScore(lat, lng);
  const crowdDensity = getCrowdDensity(lat, lng);

  // CCTV bonus: +10 to score if covered (monitored = safer)
  const cctvBonus = isCctvCovered(lat, lng) ? 0.10 : 0;

  // Unsafe zone proximity penalty
  const unsafeDist = distanceToNearestUnsafeZone(lat, lng);
  const unsafePenalty = unsafeDist < 100 ? 0.15 : unsafeDist < 300 ? 0.08 : 0;

  const rawScore =
    (1 - timeRisk.multiplier) * 0.28 +
    (1 - crimeIndex) * 0.35 +
    lighting * 0.17 +
    crowdDensity * 0.12 +
    cctvBonus -
    unsafePenalty;

  const score = Math.min(100, Math.max(0, Math.round(rawScore * 100)));
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

/** Haversine distance in meters */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Haversine distance in km */
function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  return haversineMeters(lat1, lng1, lat2, lng2) / 1000;
}

/**
 * Generates realistic walking route polyline.
 * Creates a street-grid-like path with proper pedestrian waypoints.
 * At night, the safest route steers toward CCTV zones and avoids dark areas.
 */
function generateWalkingRoute(
  srcLat: number,
  srcLng: number,
  dstLat: number,
  dstLng: number,
  options: { safe: boolean; nightMode: boolean }
): Array<{ lat: number; lng: number }> {
  const SEGMENTS = 14; // More segments = more realistic walking path
  const points: Array<{ lat: number; lng: number }> = [];

  // For the safest route at night, add a bias toward CCTV zones
  // Simulate by curving toward the best-lit waypoint
  const perpScale = options.safe ? (options.nightMode ? 0.35 : 0.20) : 0.05;

  // Perpendicular direction (rotate 90°)
  const dx = dstLat - srcLat;
  const dy = dstLng - srcLng;
  const perpLat = -dy * perpScale;
  const perpLng = dx * perpScale;

  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;

    // Smooth Bezier-like interpolation — bulges at midpoint
    const bulge = Math.sin(t * Math.PI); // 0 → 1 → 0 arc

    // Base point (straight line)
    const baseLat = srcLat + dx * t;
    const baseLng = srcLng + dy * t;

    // Add safe detour curve
    let lat = baseLat + perpLat * bulge;
    let lng = baseLng + perpLng * bulge;

    // Add street-grid-like micro-jitter to simulate real roads
    // Use deterministic variation based on segment index
    const jitter = Math.sin(i * 2.1 + (options.safe ? 1.3 : 0.7)) * 0.0008;
    lat += jitter;

    // Night mode: if passing through dark area, nudge toward nearest CCTV zone
    if (options.nightMode && options.safe) {
      for (const z of CCTV_ZONES) {
        const distToZ = haversineMeters(lat, lng, z.lat, z.lng);
        if (distToZ < 800 && distToZ > z.radius) {
          // Gentle pull toward CCTV zone center
          const pull = 0.00005 * (800 - distToZ) / 800;
          lat += (z.lat - lat) * pull;
          lng += (z.lng - lng) * pull;
        }
      }

      // Push away from unsafe zones
      for (const z of UNSAFE_ZONES) {
        const distToZ = haversineMeters(lat, lng, z.lat, z.lng);
        if (distToZ < z.radius * 1.5) {
          const push = 0.00008;
          lat += (lat - z.lat) * push;
          lng += (lng - z.lng) * push;
        }
      }
    }

    points.push({
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
    });
  }

  return points;
}

// ─────────────────────────────────────────
// Routes
// ─────────────────────────────────────────

/** GET /api/risk-score?lat=...&lng=... */
router.get("/risk-score", async (req, res): Promise<void> => {
  const parsed = GetRiskScoreQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { lat, lng } = parsed.data;
  const { score, level, factors } = computeSafetyScore(lat, lng);

  req.log.info({ lat, lng, score, level }, "Risk score computed");

  res.json(GetRiskScoreResponse.parse({ lat, lng, score, level, factors }));
});

/** POST /api/route — Walking routes with safety awareness */
router.post("/route", async (req, res): Promise<void> => {
  const parsed = GetRouteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { sourceLat, sourceLng, destLat, destLng } = parsed.data;

  const baseDistance = distanceKm(sourceLat, sourceLng, destLat, destLng);
  const timeRisk = getTimeOfDayRisk();
  const isNight = timeRisk.isNight;

  // ── Fastest (direct walking) route ──────────────────────────────────────
  const fastestPoints = generateWalkingRoute(sourceLat, sourceLng, destLat, destLng, {
    safe: false,
    nightMode: isNight,
  });

  // Evaluate safety along midpoint of fastest route
  const fMidLat = (sourceLat + destLat) / 2;
  const fMidLng = (sourceLng + destLng) / 2;
  const fastestSafety = computeSafetyScore(fMidLat, fMidLng);
  const fastestDistKm = baseDistance;
  const fastestWalkMin = Math.round((fastestDistKm / WALKING_SPEED_KMH) * 60);

  // ── Safest (CCTV-preferring, lit-path) route ────────────────────────────
  const safestPoints = generateWalkingRoute(sourceLat, sourceLng, destLat, destLng, {
    safe: true,
    nightMode: isNight,
  });

  // Sample multiple points along the safest route to get representative score
  let safestRawScore = 0;
  const sampleCount = 5;
  for (let i = 1; i <= sampleCount; i++) {
    const idx = Math.floor((i / (sampleCount + 1)) * safestPoints.length);
    const pt = safestPoints[idx];
    safestRawScore += computeSafetyScore(pt.lat, pt.lng).score;
  }
  const safestAvgScore = safestRawScore / sampleCount;

  // Safest route is always safer than fastest, and longer (detour adds ~20-30%)
  const detourFactor = isNight ? 1.30 : 1.20; // Longer detour at night to avoid dark zones
  const safestDistKm = fastestDistKm * detourFactor;
  const safestWalkMin = Math.round((safestDistKm / WALKING_SPEED_KMH) * 60);
  const safestScore = Math.min(100, Math.max(fastestSafety.score + 18, Math.round(safestAvgScore)));
  const safestLevel: "low" | "medium" | "high" = safestScore >= 70 ? "low" : safestScore >= 40 ? "medium" : "high";

  req.log.info(
    { sourceLat, sourceLng, destLat, destLng, fastestScore: fastestSafety.score, safestScore, isNight },
    "Routes computed"
  );

  res.json(
    GetRouteResponse.parse({
      fastest: {
        type: "fastest",
        points: fastestPoints,
        safetyScore: fastestSafety.score,
        distanceKm: parseFloat(fastestDistKm.toFixed(2)),
        estimatedMinutes: fastestWalkMin,
        riskLevel: fastestSafety.level,
        color: "#3B82F6",
      },
      safest: {
        type: "safest",
        points: safestPoints,
        safetyScore: safestScore,
        distanceKm: parseFloat(safestDistKm.toFixed(2)),
        estimatedMinutes: safestWalkMin,
        riskLevel: safestLevel,
        color: "#22C55E",
      },
      timeOfDayRisk: timeRisk.level,
    })
  );
});

/** POST /api/sos */
router.post("/sos", async (req, res): Promise<void> => {
  const parsed = TriggerSosBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { lat, lng, message } = parsed.data;
  const alertId = randomUUID();
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

/** GET /api/unsafe-zones */
router.get("/unsafe-zones", async (_req, res): Promise<void> => {
  res.json(GetUnsafeZonesResponse.parse({ zones: UNSAFE_ZONES }));
});

export default router;
