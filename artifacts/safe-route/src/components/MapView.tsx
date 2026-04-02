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
    html: `<div style="width:30px;height:30px;background:linear-gradient(135deg,#1e40af,#1d4ed8);border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(30,64,175,0.6);font-size:15px">
             🚔
           </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });

const createWashroomIcon = () =>
  L.divIcon({
    className: "",
    html: `<div style="width:28px;height:28px;background:linear-gradient(135deg,#0e7490,#0891b2);border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(14,116,144,0.6);font-size:14px">
             🚻
           </div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

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
              <div className="text-xs font-medium text-blue-700 mt-1">
                {ps.phone}
              </div>
              <a
                href={`tel:100`}
                className="text-xs text-white bg-blue-600 px-2 py-1 rounded mt-2 inline-block"
              >
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
    </MapContainer>
  );
}
