import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetRoute } from "@workspace/api-client-react";
import { RouteResponse } from "@workspace/api-client-react/src/generated/api.schemas";
import { MapPin, Navigation, Shield, Clock, AlertTriangle, Play, LocateFixed, Loader2, Footprints } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// Named destinations in Delhi with coordinates
const DESTINATIONS: Record<string, { lat: number; lng: number }> = {
  "Connaught Place":          { lat: 28.6315, lng: 77.2167 },
  "India Gate":               { lat: 28.6129, lng: 77.2295 },
  "Chandni Chowk":            { lat: 28.6507, lng: 77.2295 },
  "Hauz Khas":                { lat: 28.5494, lng: 77.2001 },
  "Lajpat Nagar":             { lat: 28.5684, lng: 77.2435 },
  "Sarojini Nagar Market":    { lat: 28.5770, lng: 77.1934 },
  "Karol Bagh":               { lat: 28.6509, lng: 77.1897 },
  "Rajiv Chowk Metro":        { lat: 28.6328, lng: 77.2192 },
  "Janpath Market":           { lat: 28.6244, lng: 77.2156 },
  "Dilli Haat INA":           { lat: 28.5736, lng: 77.2108 },
  "Select Citywalk Saket":    { lat: 28.5272, lng: 77.2192 },
  "Kamla Nagar Market":       { lat: 28.6841, lng: 77.2088 },
  "Palika Bazaar":            { lat: 28.6330, lng: 77.2196 },
  "Khan Market":              { lat: 28.6004, lng: 77.2279 },
  "Ambience Mall Vasant Kunj":{ lat: 28.5200, lng: 77.1560 },
};

interface RoutePlannerProps {
  currentLocation: { lat: number; lng: number };
  onRouteFound: (route: RouteResponse) => void;
  onLocationUpdate: (loc: { lat: number; lng: number }) => void;
  selectedRouteType: "fastest" | "safest" | "both";
  onSelectRouteType: (type: "fastest" | "safest" | "both") => void;
  onStartTrip: () => void;
  isTripActive: boolean;
}

export function RoutePlanner({
  currentLocation,
  onRouteFound,
  onLocationUpdate,
  selectedRouteType,
  onSelectRouteType,
  onStartTrip,
  isTripActive,
}: RoutePlannerProps) {
  const [source, setSource] = useState("Current Location");
  const [destination, setDestination] = useState("Connaught Place");
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  const getRouteMutation = useGetRoute();
  const { toast } = useToast();

  // Resolve destination coordinates from name or fall back to Connaught Place
  const resolveDestCoords = (name: string) => {
    for (const [key, coords] of Object.entries(DESTINATIONS)) {
      if (name.toLowerCase().includes(key.toLowerCase())) return coords;
    }
    // Default destination: Connaught Place
    return DESTINATIONS["Connaught Place"];
  };

  const handleFindRoute = () => {
    const destCoords = resolveDestCoords(destination);
    getRouteMutation.mutate(
      {
        data: {
          sourceLat: currentLocation.lat,
          sourceLng: currentLocation.lng,
          destLat: destCoords.lat,
          destLng: destCoords.lng,
          sourceName: source,
          destName: destination,
        },
      },
      {
        onSuccess: (data) => {
          setRouteData(data);
          onRouteFound(data);
          onSelectRouteType("safest");
        },
      }
    );
  };

  const handleGetGpsLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast({ title: "GPS not supported", description: "Your browser does not support geolocation.", variant: "destructive" });
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        onLocationUpdate(loc);
        setSource(`GPS: ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`);
        setGpsLoading(false);
        toast({ title: "Location found", description: "Map centered on your GPS location." });
      },
      (err) => {
        setGpsLoading(false);
        // Fall back to Delhi default if GPS denied/fails
        const fallback = { lat: 28.6139, lng: 77.209 };
        onLocationUpdate(fallback);
        setSource("New Delhi (simulated)");
        toast({
          title: "GPS unavailable",
          description: err.code === 1
            ? "Location access denied. Using simulated Delhi location."
            : "Could not get location. Using simulated Delhi location.",
        });
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, [onLocationUpdate, toast]);

  return (
    <Card className="w-full max-w-sm border-none shadow-xl bg-card/96 backdrop-blur-md">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-base font-bold flex items-center gap-2 text-primary">
          <Navigation className="w-4 h-4" />
          SheHaven Route Planner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-3">
        {/* Source + GPS button */}
        <div className="space-y-2 relative">
          <div className="absolute left-3 top-8 bottom-8 w-0.5 bg-border/50 z-0" />

          <div className="relative z-10">
            <Label htmlFor="source" className="sr-only">From</Label>
            <div className="flex gap-1.5 items-center">
              <div className="relative flex-1">
                <div className="absolute left-2.5 top-2.5 w-2 h-2 rounded-full bg-primary ring-4 ring-background z-10" />
                <Input
                  id="source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  placeholder="Starting location"
                  className="pl-9 h-9 bg-background/50 border-border/50 text-sm pr-2"
                />
              </div>
              {/* GPS Locate Me button */}
              <Button
                size="icon"
                variant="outline"
                className="h-9 w-9 flex-shrink-0 border-primary/40 text-primary hover:bg-primary/10"
                onClick={handleGetGpsLocation}
                disabled={gpsLoading}
                title="Get current GPS location"
              >
                {gpsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <LocateFixed className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="relative z-10">
            <Label htmlFor="destination" className="sr-only">To</Label>
            <div className="relative">
              <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-destructive" />
              <Input
                id="destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Destination in Delhi"
                className="pl-8 h-9 bg-background/50 border-border/50 text-sm"
                list="destinations-list"
              />
              <datalist id="destinations-list">
                {Object.keys(DESTINATIONS).map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
          </div>
        </div>

        {!routeData ? (
          <Button
            className="w-full h-9 text-sm gap-2"
            onClick={handleFindRoute}
            disabled={getRouteMutation.isPending}
          >
            {getRouteMutation.isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Calculating walk...</>
            ) : (
              <><Footprints className="w-4 h-4" /> Find Safe Walking Route</>
            )}
          </Button>
        ) : (
          <div className="space-y-2">
            {/* Night warning if applicable */}
            {routeData.timeOfDayRisk !== "low" && (
              <div className={cn(
                "text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1.5 font-medium",
                routeData.timeOfDayRisk === "high"
                  ? "bg-red-500/15 text-red-400 border border-red-500/20"
                  : "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20"
              )}>
                <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                {routeData.timeOfDayRisk === "high"
                  ? "Night mode: Route avoids dark areas, prefers CCTV zones"
                  : "Evening: Stay on well-lit streets"}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {/* Fastest */}
              <button
                className={cn(
                  "p-2.5 rounded-lg border text-left transition-all",
                  selectedRouteType === "fastest"
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-border/50 bg-background/40 opacity-75 hover:opacity-100"
                )}
                onClick={() => onSelectRouteType("fastest")}
              >
                <div className="flex items-center gap-1.5 text-blue-400 font-semibold text-xs mb-1">
                  <Clock className="w-3.5 h-3.5" />
                  Fastest
                </div>
                <div className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                  <Footprints className="w-3 h-3" />
                  {routeData.fastest.estimatedMinutes} min walk
                </div>
                <div className="text-[10px] text-muted-foreground">{routeData.fastest.distanceKm.toFixed(1)} km</div>
                <div className="text-xs font-medium flex items-center gap-1 mt-1">
                  <AlertTriangle className={cn("w-3 h-3", routeData.fastest.riskLevel === "high" ? "text-destructive" : "text-yellow-500")} />
                  <span className={cn(routeData.fastest.safetyScore < 50 ? "text-destructive" : "text-yellow-500")}>
                    {routeData.fastest.safetyScore}/100
                  </span>
                </div>
              </button>

              {/* Safest */}
              <button
                className={cn(
                  "p-2.5 rounded-lg border text-left transition-all",
                  selectedRouteType === "safest"
                    ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/20"
                    : "border-border/50 bg-background/40 opacity-75 hover:opacity-100"
                )}
                onClick={() => onSelectRouteType("safest")}
              >
                <div className="flex items-center gap-1 text-emerald-400 font-semibold text-xs mb-1">
                  <Shield className="w-3.5 h-3.5" />
                  Safest
                  <span className="ml-auto text-[9px] bg-emerald-500/20 px-1 py-0.5 rounded text-emerald-300">Best</span>
                </div>
                <div className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                  <Footprints className="w-3 h-3" />
                  {routeData.safest.estimatedMinutes} min walk
                </div>
                <div className="text-[10px] text-muted-foreground">{routeData.safest.distanceKm.toFixed(1)} km</div>
                <div className="text-xs font-medium flex items-center gap-1 mt-1 text-emerald-400">
                  <Shield className="w-3 h-3" />
                  {routeData.safest.safetyScore}/100
                </div>
              </button>
            </div>

            <div className="flex gap-2">
              <Button
                className={cn("flex-1 h-9 gap-1.5 font-semibold text-sm", isTripActive ? "bg-red-500 hover:bg-red-600 text-white" : "")}
                onClick={onStartTrip}
              >
                {isTripActive ? "End Trip" : <><Play className="w-3.5 h-3.5 fill-current" /> Start Trip</>}
              </Button>
              <Button
                variant="outline"
                className="h-9 px-3 text-xs"
                onClick={() => { setRouteData(null); onSelectRouteType("both"); }}
              >
                Reset
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
