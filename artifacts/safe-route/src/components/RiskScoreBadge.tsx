import { useGetRiskScore } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { getGetRiskScoreQueryKey } from "@workspace/api-client-react";
import { Shield, ShieldAlert, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";

interface RiskScoreProps {
  currentLocation: { lat: number; lng: number };
}

export function RiskScoreBadge({ currentLocation }: RiskScoreProps) {
  const { data: riskScore } = useGetRiskScore(
    { lat: currentLocation.lat, lng: currentLocation.lng },
    { query: { queryKey: getGetRiskScoreQueryKey({ lat: currentLocation.lat, lng: currentLocation.lng }) } }
  );

  if (!riskScore) return null;

  const getColorClass = (score: number) => {
    if (score >= 70) return "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
    if (score >= 40) return "bg-yellow-500/15 text-yellow-500 border-yellow-500/30";
    return "bg-destructive/15 text-destructive border-destructive/30";
  };

  const getIcon = (score: number) => {
    if (score >= 70) return <ShieldCheck className="w-4 h-4 mr-1.5" />;
    if (score >= 40) return <Shield className="w-4 h-4 mr-1.5" />;
    return <ShieldAlert className="w-4 h-4 mr-1.5" />;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="fixed top-6 right-6 z-40 outline-none hover:scale-105 transition-transform">
          <div className={cn("flex items-center px-3 py-2 rounded-full border backdrop-blur-md shadow-sm font-semibold text-sm", getColorClass(riskScore.score))}>
            {getIcon(riskScore.score)}
            Safety Score: {riskScore.score}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4 mr-6 mt-2" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">AI Area Analysis</h4>
            <Badge variant="outline" className="text-xs uppercase">{riskScore.level} Risk</Badge>
          </div>
          
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Time of Day Risk</span>
                <span className="font-medium">{riskScore.factors.timeOfDay}/100</span>
              </div>
              <Progress value={riskScore.factors.timeOfDay} className="h-1.5 bg-secondary" indicatorClassName={riskScore.factors.timeOfDay > 60 ? "bg-destructive" : "bg-emerald-500"} />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Crime Index</span>
                <span className="font-medium">{riskScore.factors.crimeIndex}/100</span>
              </div>
              <Progress value={riskScore.factors.crimeIndex} className="h-1.5 bg-secondary" indicatorClassName={riskScore.factors.crimeIndex > 50 ? "bg-destructive" : "bg-emerald-500"} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Lighting Quality</span>
                <span className="font-medium">{riskScore.factors.lighting}/100</span>
              </div>
              <Progress value={riskScore.factors.lighting} className="h-1.5 bg-secondary" indicatorClassName={riskScore.factors.lighting < 40 ? "bg-destructive" : "bg-emerald-500"} />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Crowd Density</span>
                <span className="font-medium">{riskScore.factors.crowdDensity}/100</span>
              </div>
              <Progress value={riskScore.factors.crowdDensity} className="h-1.5 bg-secondary" indicatorClassName={riskScore.factors.crowdDensity < 30 ? "bg-destructive" : "bg-emerald-500"} />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground text-center pt-2 border-t">Powered by real-time predictive analytics</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}