import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { useGetUnsafeZones } from "@workspace/api-client-react";
import { Route, UnsafeZone } from "@workspace/api-client-react/src/generated/api.schemas";
import { useToast } from "@/hooks/use-toast";

interface MapProps {
  currentLocation: { lat: number; lng: number };
  fastestRoute?: Route;
  safestRoute?: Route;
  selectedRouteType?: 'fastest' | 'safest' | 'both';
}

// Custom pulsing marker for user location
const createPulsingIcon = () => {
  return L.divIcon({
    className: "custom-pulsing-icon",
    html: `<div class="relative flex h-4 w-4">
             <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
             <span class="relative inline-flex rounded-full h-4 w-4 bg-primary border-2 border-white shadow-md"></span>
           </div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export function MapView({ currentLocation, fastestRoute, safestRoute, selectedRouteType = 'both' }: MapProps) {
  const { data: unsafeZonesResponse } = useGetUnsafeZones();
  const unsafeZones = unsafeZonesResponse?.zones || [];
  const { toast } = useToast();
  
  const [alertedZones, setAlertedZones] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Check if user is in any unsafe zone
    unsafeZones.forEach(zone => {
      const dist = L.latLng(currentLocation.lat, currentLocation.lng).distanceTo(L.latLng(zone.lat, zone.lng));
      if (dist <= zone.radius && !alertedZones.has(zone.id)) {
        // Vibrate if possible
        if ("vibrate" in navigator) {
          navigator.vibrate([200, 100, 200]);
        }
        toast({
          title: "Safety Alert",
          description: `You have entered a ${zone.riskLevel} risk zone: ${zone.name}. Please stay vigilant.`,
          variant: "destructive",
        });
        setAlertedZones(prev => new Set(prev).add(zone.id));
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
        <Popup>Your current location</Popup>
      </Marker>

      {/* Routes */}
      {(selectedRouteType === 'both' || selectedRouteType === 'fastest') && fastestRoute && (
        <Polyline 
          positions={fastestRoute.points.map(p => [p.lat, p.lng])} 
          pathOptions={{ color: '#3b82f6', weight: 5, opacity: selectedRouteType === 'both' ? 0.6 : 0.9 }} 
        />
      )}

      {(selectedRouteType === 'both' || selectedRouteType === 'safest') && safestRoute && (
        <Polyline 
          positions={safestRoute.points.map(p => [p.lat, p.lng])} 
          pathOptions={{ color: '#10b981', weight: 6, opacity: 0.9 }} 
        />
      )}

      {/* Unsafe Zones */}
      {unsafeZones.map((zone) => (
        <Circle
          key={zone.id}
          center={[zone.lat, zone.lng]}
          radius={zone.radius}
          pathOptions={{
            color: zone.riskLevel === 'high' ? '#ef4444' : '#f59e0b',
            fillColor: zone.riskLevel === 'high' ? '#ef4444' : '#f59e0b',
            fillOpacity: 0.2,
            weight: 1
          }}
        >
          <Popup>
            <div className="font-semibold">{zone.name}</div>
            <div className="text-sm">{zone.description}</div>
            <div className="text-xs mt-1 font-medium capitalize text-destructive">Risk: {zone.riskLevel}</div>
          </Popup>
        </Circle>
      ))}
    </MapContainer>
  );
}