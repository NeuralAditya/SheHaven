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
import { SplashScreen } from "@/components/SplashScreen";
import { SheHavenLogo } from "@/components/SheHavenLogo";

import { RouteResponse } from "@workspace/api-client-react/src/generated/api.schemas";

const queryClient = new QueryClient();

const DEFAULT_LOCATION = { lat: 28.6139, lng: 77.209 };

/** Live clock hook — returns formatted time string updated every second */
function useLiveClock() {
  const [time, setTime] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
          timeZone: "Asia/Kolkata",
        })
      );
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}

/** Night check — between 8 PM and 6 AM IST */
function isNightTime() {
  const hour = new Date().getHours();
  return hour >= 20 || hour < 6;
}

function Home() {
  const [currentLocation, setCurrentLocation] = useState(DEFAULT_LOCATION);
  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [selectedRouteType, setSelectedRouteType] = useState<"fastest" | "safest" | "both">("both");
  const [isTripActive, setIsTripActive] = useState(false);
  const [isFakeCallOpen, setIsFakeCallOpen] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  const time = useLiveClock();
  const nightMode = isNightTime();

  // Hide splash after 2.4s
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2400);
    return () => clearTimeout(t);
  }, []);

  // Simulate location movement when trip is active
  useEffect(() => {
    if (!isTripActive || !routeData || selectedRouteType === "both") return;
    const route = selectedRouteType === "safest" ? routeData.safest : routeData.fastest;
    const points = route.points;
    let pointIndex = 0;
    setCurrentLocation({ lat: points[0].lat, lng: points[0].lng });

    const interval = setInterval(() => {
      pointIndex++;
      if (pointIndex < points.length) {
        setCurrentLocation({ lat: points[pointIndex].lat, lng: points[pointIndex].lng });
      } else {
        clearInterval(interval);
        setIsTripActive(false);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isTripActive, routeData, selectedRouteType]);

  return (
    <>
      <SplashScreen visible={showSplash} />

      <div className="relative w-full h-[100dvh] overflow-hidden bg-background">
        {/* Background Map */}
        <div className="absolute inset-0 z-0">
          <MapView
            currentLocation={currentLocation}
            fastestRoute={routeData?.fastest}
            safestRoute={routeData?.safest}
            selectedRouteType={selectedRouteType}
            showPoliceStations={true}
            showWashrooms={true}
            showCctvZones={true}
            showShoppingPlaces={true}
          />
        </div>

        {/* Floating UI Layer */}
        <div className="absolute inset-0 z-10 pointer-events-none">

          {/* Top gradient + brand bar */}
          <div className="absolute top-0 left-0 right-0 pointer-events-auto">
            <div
              className="flex items-center gap-3 px-4 py-2"
              style={{
                background: "linear-gradient(180deg, rgba(15,23,42,0.94) 0%, rgba(15,23,42,0) 100%)",
              }}
            >
              <SheHavenLogo size="sm" variant="full" />

              {/* Spacer */}
              <div className="flex-1" />

              {/* Night indicator */}
              {nightMode && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium mr-1">
                  🌙 Night Mode
                </span>
              )}

              {/* Live clock */}
              <div className="flex flex-col items-end">
                <span className="text-white font-mono text-xs font-semibold tracking-wider leading-none">
                  {time}
                </span>
                <span className="text-white/40 text-[9px] tracking-wide mt-0.5">
                  IST · Delhi
                </span>
              </div>
            </div>
          </div>

          {/* Route planner panel */}
          <div className="absolute top-12 left-4 pointer-events-auto w-full max-w-sm">
            <RoutePlanner
              currentLocation={currentLocation}
              onRouteFound={setRouteData}
              onLocationUpdate={setCurrentLocation}
              selectedRouteType={selectedRouteType}
              onSelectRouteType={setSelectedRouteType}
              isTripActive={isTripActive}
              onStartTrip={() => setIsTripActive(!isTripActive)}
            />
          </div>

          {/* Top-right: Risk Score Badge */}
          <div className="pointer-events-auto">
            <RiskScoreBadge currentLocation={currentLocation} />
          </div>

          {/* Right side: Tracking & Utilities */}
          <div className="pointer-events-auto">
            <LiveTrackingPanel
              isTripActive={isTripActive}
              onFakeCall={() => setIsFakeCallOpen(true)}
            />
          </div>

          {/* Bottom Center: SOS Button */}
          <div className="pointer-events-auto">
            <SosButton currentLocation={currentLocation} />
          </div>
        </div>

        {/* Bottom-left copyright — same style as OpenStreetMap attribution */}
        <div
          className="absolute bottom-0 left-0 z-20 pointer-events-auto"
          style={{
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(4px)",
            borderTopRightRadius: "6px",
            padding: "2px 8px",
            fontSize: "11px",
            color: "#333",
            lineHeight: "1.6",
            borderTop: "1px solid rgba(0,0,0,0.10)",
            borderRight: "1px solid rgba(0,0,0,0.10)",
          }}
        >
          © Designed by <strong>Ariba &amp; Aditya</strong> · <span style={{ color: "#888" }}>SheHaven {new Date().getFullYear()}</span>
        </div>

        {/* Fullscreen overlays */}
        <FakeCallScreen isOpen={isFakeCallOpen} onClose={() => setIsFakeCallOpen(false)} />
      </div>
    </>
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
