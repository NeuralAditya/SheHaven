import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import { MapView } from "@/components/MapView";
import { RoutePlanner } from "@/components/RoutePlanner";
import { SosButton } from "@/components/SosButton";
import { RiskScoreBadge } from "@/components/RiskScoreBadge";
import { LiveTrackingPanel } from "@/components/LiveTrackingPanel";
import { FakeCallScreen } from "@/components/FakeCallScreen";

import { RouteResponse } from "@workspace/api-client-react/src/generated/api.schemas";

const queryClient = new QueryClient();

// Default location (New Delhi)
const DEFAULT_LOCATION = { lat: 28.6139, lng: 77.2090 };

function Home() {
  const [currentLocation, setCurrentLocation] = useState(DEFAULT_LOCATION);
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [selectedRouteType, setSelectedRouteType] = useState<'fastest' | 'safest' | 'both'>('both');
  const [isTripActive, setIsTripActive] = useState(false);
  const [isFakeCallOpen, setIsFakeCallOpen] = useState(false);

  // Simulate location movement when trip is active
  useEffect(() => {
    if (!isTripActive || !routeData || selectedRouteType === 'both') return;
    
    const route = selectedRouteType === 'safest' ? routeData.safest : routeData.fastest;
    const points = route.points;
    let pointIndex = 0;
    
    // Start at beginning of route
    setCurrentLocation({ lat: points[0].lat, lng: points[0].lng });

    const interval = setInterval(() => {
      pointIndex++;
      if (pointIndex < points.length) {
        setCurrentLocation({ lat: points[pointIndex].lat, lng: points[pointIndex].lng });
      } else {
        clearInterval(interval);
        setIsTripActive(false); // Trip finished
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isTripActive, routeData, selectedRouteType]);

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-background">
      {/* Background Map */}
      <div className="absolute inset-0 z-0">
        <MapView 
          currentLocation={currentLocation}
          fastestRoute={routeData?.fastest}
          safestRoute={routeData?.safest}
          selectedRouteType={selectedRouteType}
        />
      </div>

      {/* Floating UI Elements */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        
        {/* Top Right: Risk Score */}
        <div className="pointer-events-auto">
          <RiskScoreBadge currentLocation={currentLocation} />
        </div>

        {/* Right Side: Tracking & Utilities */}
        <div className="pointer-events-auto">
          <LiveTrackingPanel 
            isTripActive={isTripActive} 
            onFakeCall={() => setIsFakeCallOpen(true)} 
          />
        </div>

        {/* Top Left: Route Planner */}
        <div className="absolute top-6 left-6 pointer-events-auto w-full max-w-sm">
          <RoutePlanner 
            currentLocation={currentLocation}
            onRouteFound={setRouteData}
            selectedRouteType={selectedRouteType}
            onSelectRouteType={setSelectedRouteType}
            isTripActive={isTripActive}
            onStartTrip={() => setIsTripActive(!isTripActive)}
          />
        </div>

        {/* Bottom Center: SOS Button */}
        <div className="pointer-events-auto">
          <SosButton currentLocation={currentLocation} />
        </div>
      </div>

      {/* Fullscreen Overlays */}
      <FakeCallScreen 
        isOpen={isFakeCallOpen} 
        onClose={() => setIsFakeCallOpen(false)} 
      />
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
