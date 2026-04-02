import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { useGetUnsafeZones } from "@workspace/api-client-react";
import { Route } from "@workspace/api-client-react/src/generated/api.schemas";
import { useToast } from "@/hooks/use-toast";

interface MapProps {
  currentLocation: { lat: number; lng: number };
  fastestRoute?: Route;
  safestRoute?: Route;
  selectedRouteType?: "fastest" | "safest" | "both";
  showPoliceStations?: boolean;
  showWashrooms?: boolean;
  showCctvZones?: boolean;
  showShoppingPlaces?: boolean;
}

// ─── Static Delhi Data ─────────────────────────────────────────────────────────

const POLICE_STATIONS = [
  { id: "ps1", name: "Connaught Place Police Station", lat: 28.6315, lng: 77.2167, phone: "011-2334-4000" },
  { id: "ps2", name: "Parliament Street Police Station", lat: 28.6234, lng: 77.2112, phone: "011-2336-2200" },
  { id: "ps3", name: "Chanakyapuri Police Station", lat: 28.5985, lng: 77.1854, phone: "011-2611-1561" },
  { id: "ps4", name: "New Delhi Railway Station Post", lat: 28.6414, lng: 77.2193, phone: "011-2323-4567" },
  { id: "ps5", name: "India Gate Police Post", lat: 28.6129, lng: 77.2295, phone: "011-2338-5566" },
  { id: "ps6", name: "Lodi Road Police Station", lat: 28.5951, lng: 77.2242, phone: "011-2469-3344" },
  { id: "ps7", name: "Hauz Khas Police Station", lat: 28.5494, lng: 77.2001, phone: "011-2685-2200" },
];

const HYGIENE_WASHROOMS = [
  { id: "wc1", name: "Sulabh Complex — Connaught Place", lat: 28.6337, lng: 77.2197, type: "Paid", open24h: true },
  { id: "wc2", name: "Rajiv Chowk Metro — Washroom", lat: 28.6328, lng: 77.2192, type: "Free", open24h: false },
  { id: "wc3", name: "India Gate Public Facility", lat: 28.6122, lng: 77.2302, type: "Free", open24h: false },
  { id: "wc4", name: "Lodi Garden — Public Washroom", lat: 28.5933, lng: 77.2302, type: "Free", open24h: false },
  { id: "wc5", name: "Chandni Chowk — Sulabh Complex", lat: 28.6507, lng: 77.2295, type: "Paid", open24h: true },
  { id: "wc6", name: "Kashmere Gate ISBT Facility", lat: 28.6639, lng: 77.2295, type: "Free", open24h: true },
  { id: "wc7", name: "Sarojini Nagar Market Washroom", lat: 28.5770, lng: 77.1934, type: "Free", open24h: false },
];

// ─── Women's Shopping Destinations in Delhi ───────────────────────────────────

const WOMEN_SHOPPING = [
  {
    id: "sh1",
    name: "Sarojini Nagar Market",
    lat: 28.5770, lng: 77.1934,
    type: "Street Market",
    specialty: "Trendy clothes, kurtis, Western wear at budget prices",
    timing: "10 AM – 8 PM (Closed Mon)",
    safetyNote: "Well-lit, crowded — safe during day",
  },
  {
    id: "sh2",
    name: "Janpath Market",
    lat: 28.6244, lng: 77.2156,
    type: "Street Market",
    specialty: "Ethnic wear, jewellery, handbags, handicrafts",
    timing: "10 AM – 8 PM (Closed Sun)",
    safetyNote: "Central Delhi — police presence nearby",
  },
  {
    id: "sh3",
    name: "Lajpat Nagar Central Market",
    lat: 28.5684, lng: 77.2435,
    type: "Market",
    specialty: "Salwar suits, sarees, bridal wear, accessories",
    timing: "10 AM – 8 PM (Closed Mon)",
    safetyNote: "Busy market — stay alert in alleys after 7 PM",
  },
  {
    id: "sh4",
    name: "Dilli Haat — INA",
    lat: 28.5736, lng: 77.2108,
    type: "Craft Bazaar",
    specialty: "Handloom, handicrafts, jewellery from all Indian states",
    timing: "10:30 AM – 10 PM (All days)",
    safetyNote: "Enclosed, well-managed — very safe",
  },
  {
    id: "sh5",
    name: "Select Citywalk Mall, Saket",
    lat: 28.5272, lng: 77.2192,
    type: "Shopping Mall",
    specialty: "Zara, H&M, Mango, Indian brands, jewellery, footwear",
    timing: "10 AM – 10 PM (All days)",
    safetyNote: "CCTV, security guards — very safe",
  },
  {
    id: "sh6",
    name: "Kamla Nagar Market",
    lat: 28.6841, lng: 77.2088,
    type: "Street Market",
    specialty: "College wear, indo-western, accessories, cosmetics",
    timing: "10 AM – 8 PM (Closed Sun)",
    safetyNote: "Near Delhi University — well populated during day",
  },
  {
    id: "sh7",
    name: "Palika Bazaar",
    lat: 28.6330, lng: 77.2196,
    type: "Underground Market",
    specialty: "Clothes, cosmetics, electronics, accessories",
    timing: "10 AM – 8 PM (Closed Mon)",
    safetyNote: "Underground — go with company, avoid late evening",
  },
  {
    id: "sh8",
    name: "Khan Market",
    lat: 28.6004, lng: 77.2279,
    type: "Boutique Market",
    specialty: "Designer boutiques, books, organic beauty, cafés",
    timing: "10 AM – 9 PM (Closed Sun)",
    safetyNote: "Premium area — very safe and well-patrolled",
  },
  {
    id: "sh9",
    name: "Ambience Mall, Vasant Kunj",
    lat: 28.5200, lng: 77.1560,
    type: "Shopping Mall",
    specialty: "Fashion, cosmetics, jewellery, food court, multiplex",
    timing: "11 AM – 10 PM (All days)",
    safetyNote: "Indoor, CCTV, security — very safe",
  },
  {
    id: "sh10",
    name: "Karol Bagh Market",
    lat: 28.6509, lng: 77.1897,
    type: "Market",
    specialty: "Lehengas, bridal jewellery, footwear, wedding shopping",
    timing: "10 AM – 8 PM (Closed Sun)",
    safetyNote: "Crowded market — keep belongings secure",
  },
];

// Delhi CCTV-monitored safe zones (well-surveilled areas)
const CCTV_ZONES = [
  { id: "cctv1", name: "Connaught Place", lat: 28.6315, lng: 77.2167, radius: 500, cameras: 120 },
  { id: "cctv2", name: "India Gate / Rajpath", lat: 28.6129, lng: 77.2295, radius: 400, cameras: 80 },
  { id: "cctv3", name: "Central Secretariat", lat: 28.6146, lng: 77.2118, radius: 350, cameras: 65 },
  { id: "cctv4", name: "Karol Bagh Market", lat: 28.6509, lng: 77.1897, radius: 300, cameras: 55 },
  { id: "cctv5", name: "Sarojini Nagar Market", lat: 28.5770, lng: 77.1934, radius: 300, cameras: 48 },
  { id: "cctv6", name: "Chandni Chowk", lat: 28.6507, lng: 77.2295, radius: 400, cameras: 95 },
  { id: "cctv7", name: "New Delhi Railway Station", lat: 28.6414, lng: 77.2193, radius: 350, cameras: 110 },
];

// ─── Custom Icons ──────────────────────────────────────────────────────────────

const createPulsingIcon = () =>
  L.divIcon({
    className: "",
    html: `<div style="position:relative;display:flex;align-items:center;justify-content:center;width:20px;height:20px">
             <span style="position:absolute;width:100%;height:100%;border-radius:50%;background:#f43f5e;opacity:0.5;animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite"></span>
             <span style="position:relative;width:14px;height:14px;border-radius:50%;background:#f43f5e;border:2.5px solid white;box-shadow:0 0 8px rgba(244,63,94,0.8)"></span>
           </div>
           <style>@keyframes ping{0%{transform:scale(1);opacity:0.5}75%,100%{transform:scale(2);opacity:0}}</style>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

const createPoliceIcon = () =>
  L.divIcon({
    className: "",
    html: `<div style="width:30px;height:30px;background:linear-gradient(135deg,#1e40af,#1d4ed8);border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(30,64,175,0.6);font-size:15px">🚔</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

const createWashroomIcon = () =>
  L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;background:linear-gradient(135deg,#0e7490,#0891b2);border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(14,116,144,0.6);font-size:14px">🚻</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const createCctvIcon = () =>
  L.divIcon({
    className: "",
    html: `<div style="width:26px;height:26px;background:linear-gradient(135deg,#065f46,#059669);border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,0.9);box-shadow:0 2px 8px rgba(5,150,105,0.7);font-size:13px">📹</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

const createShoppingIcon = (type: string) => {
  const isMall = type === "Shopping Mall";
  const isCraft = type === "Craft Bazaar";
  const bg = isMall
    ? "linear-gradient(135deg,#9333ea,#a855f7)"
    : isCraft
    ? "linear-gradient(135deg,#d97706,#f59e0b)"
    : "linear-gradient(135deg,#db2777,#ec4899)";
  const shadow = isMall ? "rgba(168,85,247,0.7)" : isCraft ? "rgba(245,158,11,0.7)" : "rgba(236,72,153,0.7)";
  const emoji = isMall ? "🛍️" : isCraft ? "🎨" : "👗";
  return L.divIcon({
    className: "",
    html: `<div style="width:30px;height:30px;background:${bg};border-radius:50%;display:flex;align-items:center;justify-content:center;border:2.5px solid white;box-shadow:0 2px 10px ${shadow};font-size:15px">${emoji}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

// ─── MapUpdater ────────────────────────────────────────────────────────────────

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function MapView({
  currentLocation,
  fastestRoute,
  safestRoute,
  selectedRouteType = "both",
  showPoliceStations = true,
  showWashrooms = true,
  showCctvZones = true,
  showShoppingPlaces = true,
}: MapProps) {
  const { data: unsafeZonesResponse } = useGetUnsafeZones();
  const unsafeZones = unsafeZonesResponse?.zones || [];
  const { toast } = useToast();
  const [alertedZones, setAlertedZones] = useState<Set<string>>(new Set());

  // Unsafe zone proximity alerts
  useEffect(() => {
    unsafeZones.forEach((zone) => {
      const dist = L.latLng(currentLocation.lat, currentLocation.lng).distanceTo(
        L.latLng(zone.lat, zone.lng)
      );
      if (dist <= zone.radius && !alertedZones.has(zone.id)) {
        if ("vibrate" in navigator) navigator.vibrate([200, 100, 200]);
        toast({
          title: "Safety Alert",
          description: `You entered a ${zone.riskLevel} risk zone: ${zone.name}. Stay vigilant.`,
          variant: "destructive",
        });
        setAlertedZones((prev) => new Set(prev).add(zone.id));
      }
    });
  }, [currentLocation, unsafeZones, alertedZones, toast]);

  return (
    <MapContainer
      center={[currentLocation.lat, currentLocation.lng]}
      zoom={14}
      className="w-full h-full z-0"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <MapUpdater center={[currentLocation.lat, currentLocation.lng]} />

      {/* CCTV Safe Zones — shown as green circles */}
      {showCctvZones &&
        CCTV_ZONES.map((zone) => (
          <Circle
            key={zone.id}
            center={[zone.lat, zone.lng]}
            radius={zone.radius}
            pathOptions={{
              color: "#10b981",
              fillColor: "#10b981",
              fillOpacity: 0.10,
              weight: 1.5,
              dashArray: "4 3",
            }}
          >
            <Popup>
              <div className="font-semibold text-sm text-emerald-800">
                📹 CCTV Safe Zone
              </div>
              <div className="font-medium text-sm mt-0.5">{zone.name}</div>
              <div className="text-xs text-gray-600 mt-1">
                {zone.cameras}+ surveillance cameras active
              </div>
              <div className="text-xs mt-1 font-bold text-emerald-700">
                Well-monitored area — Safer at night
              </div>
            </Popup>
          </Circle>
        ))}

      {/* CCTV Zone center markers */}
      {showCctvZones &&
        CCTV_ZONES.map((zone) => (
          <Marker key={`cm-${zone.id}`} position={[zone.lat, zone.lng]} icon={createCctvIcon()}>
            <Popup>
              <div className="font-semibold text-sm text-emerald-800">
                📹 {zone.name}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {zone.cameras}+ CCTV cameras
              </div>
              <div className="text-xs mt-1 font-bold text-emerald-700">
                Safe zone — Well-lit and monitored
              </div>
            </Popup>
          </Marker>
        ))}

      {/* User Location */}
      <Marker position={[currentLocation.lat, currentLocation.lng]} icon={createPulsingIcon()}>
        <Popup>
          <div className="font-semibold text-sm">Your Location</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {currentLocation.lat.toFixed(4)}, {currentLocation.lng.toFixed(4)}
          </div>
        </Popup>
      </Marker>

      {/* Fastest Route */}
      {(selectedRouteType === "both" || selectedRouteType === "fastest") && fastestRoute && (
        <Polyline
          positions={fastestRoute.points.map((p) => [p.lat, p.lng])}
          pathOptions={{
            color: "#3b82f6",
            weight: 5,
            opacity: selectedRouteType === "both" ? 0.65 : 0.9,
            dashArray: selectedRouteType === "both" ? "8 4" : undefined,
          }}
        />
      )}

      {/* Safest Route */}
      {(selectedRouteType === "both" || selectedRouteType === "safest") && safestRoute && (
        <Polyline
          positions={safestRoute.points.map((p) => [p.lat, p.lng])}
          pathOptions={{ color: "#10b981", weight: 6, opacity: 0.9 }}
        />
      )}

      {/* Unsafe Zones */}
      {unsafeZones.map((zone) => (
        <Circle
          key={zone.id}
          center={[zone.lat, zone.lng]}
          radius={zone.radius}
          pathOptions={{
            color: zone.riskLevel === "high" ? "#ef4444" : "#f59e0b",
            fillColor: zone.riskLevel === "high" ? "#ef4444" : "#f59e0b",
            fillOpacity: 0.18,
            weight: 1.5,
          }}
        >
          <Popup>
            <div className="font-semibold text-sm">{zone.name}</div>
            <div className="text-xs text-gray-600 mt-0.5">{zone.description}</div>
            <div
              className="text-xs mt-1 font-bold capitalize"
              style={{ color: zone.riskLevel === "high" ? "#ef4444" : "#f59e0b" }}
            >
              Risk Level: {zone.riskLevel}
            </div>
          </Popup>
        </Circle>
      ))}

      {/* Police Stations */}
      {showPoliceStations &&
        POLICE_STATIONS.map((ps) => (
          <Marker key={ps.id} position={[ps.lat, ps.lng]} icon={createPoliceIcon()}>
            <Popup>
              <div className="font-semibold text-sm text-blue-800">{ps.name}</div>
              <div className="text-xs text-gray-500 mt-1">Police Station</div>
              <div className="text-xs font-medium text-blue-700 mt-1">{ps.phone}</div>
              <a href="tel:100" className="text-xs text-white bg-blue-600 px-2 py-1 rounded mt-2 inline-block">
                Call 100
              </a>
            </Popup>
          </Marker>
        ))}

      {/* Hygiene Washrooms */}
      {showWashrooms &&
        HYGIENE_WASHROOMS.map((wc) => (
          <Marker key={wc.id} position={[wc.lat, wc.lng]} icon={createWashroomIcon()}>
            <Popup>
              <div className="font-semibold text-sm text-teal-800">{wc.name}</div>
              <div className="flex gap-2 mt-1">
                <span
                  className="text-xs px-1.5 py-0.5 rounded font-medium"
                  style={{
                    background: wc.type === "Free" ? "#d1fae5" : "#fef3c7",
                    color: wc.type === "Free" ? "#065f46" : "#92400e",
                  }}
                >
                  {wc.type}
                </span>
                {wc.open24h && (
                  <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-blue-100 text-blue-800">
                    24 Hours
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">Hygiene Washroom</div>
            </Popup>
          </Marker>
        ))}

      {/* Women's Shopping Places */}
      {showShoppingPlaces &&
        WOMEN_SHOPPING.map((shop) => (
          <Marker key={shop.id} position={[shop.lat, shop.lng]} icon={createShoppingIcon(shop.type)}>
            <Popup>
              <div style={{ minWidth: 190 }}>
                <div className="font-bold text-sm" style={{ color: shop.type === "Shopping Mall" ? "#7c3aed" : shop.type === "Craft Bazaar" ? "#b45309" : "#be185d" }}>
                  {shop.type === "Shopping Mall" ? "🛍️" : shop.type === "Craft Bazaar" ? "🎨" : "👗"} {shop.name}
                </div>
                <div
                  className="text-[10px] font-semibold px-1.5 py-0.5 rounded inline-block mt-1"
                  style={{
                    background: shop.type === "Shopping Mall" ? "#f3e8ff" : shop.type === "Craft Bazaar" ? "#fef3c7" : "#fce7f3",
                    color: shop.type === "Shopping Mall" ? "#6d28d9" : shop.type === "Craft Bazaar" ? "#92400e" : "#9d174d",
                  }}
                >
                  {shop.type}
                </div>
                <div className="text-xs text-gray-700 mt-1.5 font-medium">{shop.specialty}</div>
                <div className="text-xs text-gray-500 mt-1">⏰ {shop.timing}</div>
                <div
                  className="text-xs mt-1.5 px-1.5 py-1 rounded font-medium"
                  style={{
                    background: shop.safetyNote.includes("very safe") ? "#d1fae5" : shop.safetyNote.includes("safe") ? "#ecfdf5" : "#fef9c3",
                    color: shop.safetyNote.includes("very safe") ? "#065f46" : shop.safetyNote.includes("safe") ? "#047857" : "#713f12",
                  }}
                >
                  🛡️ {shop.safetyNote}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
