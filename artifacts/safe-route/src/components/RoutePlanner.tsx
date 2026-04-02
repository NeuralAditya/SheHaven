import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetRoute } from "@workspace/api-client-react";
import { RouteResponse } from "@workspace/api-client-react/src/generated/api.schemas";
import { MapPin, Navigation, Shield, Clock, AlertTriangle, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface RoutePlannerProps {
  currentLocation: { lat: number; lng: number };
  onRouteFound: (route: RouteResponse) => void;
  selectedRouteType: 'fastest' | 'safest' | 'both';
  onSelectRouteType: (type: 'fastest' | 'safest' | 'both') => void;
  onStartTrip: () => void;
  isTripActive: boolean;
}

export function RoutePlanner({ 
  currentLocation, 
  onRouteFound, 
  selectedRouteType, 
  onSelectRouteType,
  onStartTrip,
  isTripActive
}: RoutePlannerProps) {
  const [source, setSource] = useState("Current Location");
  const [destination, setDestination] = useState("Connaught Place");
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);

  const getRouteMutation = useGetRoute();

  const handleFindRoute = () => {
    // We are using a fixed destination for demo purposes
    getRouteMutation.mutate(
      {
        data: {
          sourceLat: currentLocation.lat,
          sourceLng: currentLocation.lng,
          destLat: 28.6304,
          destLng: 77.2177, // Connaught Place coordinates
          sourceName: source,
          destName: destination
        }
      },
      {
        onSuccess: (data) => {
          setRouteData(data);
          onRouteFound(data);
          onSelectRouteType('safest');
        }
      }
    );
  };

  return (
    <Card className="w-full max-w-sm border-none shadow-lg bg-card/95 backdrop-blur-md">
      <CardHeader className="pb-3 pt-4">
        <CardTitle className="text-lg font-bold flex items-center gap-2 text-primary">
          <Navigation className="w-5 h-5" />
          Smart Route Planner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pb-4">
        <div className="space-y-3 relative">
          <div className="absolute left-3 top-8 bottom-8 w-0.5 bg-border z-0"></div>
          <div className="space-y-1 relative z-10">
            <Label htmlFor="source" className="sr-only">Source</Label>
            <div className="relative">
              <div className="absolute left-2.5 top-2.5 w-2 h-2 rounded-full bg-primary ring-4 ring-background"></div>
              <Input 
                id="source" 
                value={source} 
                onChange={(e) => setSource(e.target.value)}
                className="pl-9 h-9 bg-background/50 border-border/50 text-sm"
              />
            </div>
          </div>
          <div className="space-y-1 relative z-10">
            <Label htmlFor="destination" className="sr-only">Destination</Label>
            <div className="relative">
              <MapPin className="absolute left-1.5 top-2 h-4 w-4 text-destructive bg-background" />
              <Input 
                id="destination" 
                value={destination} 
                onChange={(e) => setDestination(e.target.value)}
                className="pl-9 h-9 bg-background/50 border-border/50 text-sm"
              />
            </div>
          </div>
        </div>

        {!routeData ? (
          <Button 
            className="w-full" 
            onClick={handleFindRoute}
            disabled={getRouteMutation.isPending}
          >
            {getRouteMutation.isPending ? "Calculating..." : "Find Safe Route"}
          </Button>
        ) : (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                className={cn(
                  "p-3 rounded-lg border text-left transition-all",
                  selectedRouteType === 'fastest' 
                    ? "border-blue-500 bg-blue-500/10" 
                    : "border-border/50 bg-background/50 opacity-70 hover:opacity-100"
                )}
                onClick={() => onSelectRouteType('fastest')}
              >
                <div className="flex items-center gap-1.5 text-blue-500 font-semibold text-sm mb-1">
                  <Clock className="w-4 h-4" />
                  Fastest
                </div>
                <div className="text-xs text-muted-foreground mb-0.5">{routeData.fastest.estimatedMinutes} min • {routeData.fastest.distanceKm.toFixed(1)} km</div>
                <div className="text-xs font-medium flex items-center gap-1">
                  <AlertTriangle className={cn("w-3 h-3", routeData.fastest.riskLevel === 'high' ? 'text-destructive' : 'text-yellow-500')} />
                  Safety: <span className={cn(routeData.fastest.safetyScore < 50 ? 'text-destructive' : 'text-yellow-500')}>{routeData.fastest.safetyScore}/100</span>
                </div>
              </button>

              <button
                className={cn(
                  "p-3 rounded-lg border text-left transition-all",
                  selectedRouteType === 'safest' 
                    ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30" 
                    : "border-border/50 bg-background/50 opacity-70 hover:opacity-100"
                )}
                onClick={() => onSelectRouteType('safest')}
              >
                <div className="flex items-center gap-1.5 text-emerald-500 font-semibold text-sm mb-1">
                  <Shield className="w-4 h-4" />
                  Safest <span className="ml-auto text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded">Recommended</span>
                </div>
                <div className="text-xs text-muted-foreground mb-0.5">{routeData.safest.estimatedMinutes} min • {routeData.safest.distanceKm.toFixed(1)} km</div>
                <div className="text-xs font-medium flex items-center gap-1 text-emerald-500">
                  <Shield className="w-3 h-3" />
                  Safety: {routeData.safest.safetyScore}/100
                </div>
              </button>
            </div>

            <Button 
              className={cn("w-full gap-2 font-semibold", isTripActive ? "bg-red-500 hover:bg-red-600 text-white" : "bg-primary text-primary-foreground")} 
              size="lg"
              onClick={onStartTrip}
            >
              {isTripActive ? (
                "End Trip"
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Start Secure Trip
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}