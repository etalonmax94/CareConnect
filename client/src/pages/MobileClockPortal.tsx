import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Clock, CheckCircle, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Staff } from "@shared/schema";

interface ClockStatus {
  isClockedIn: boolean;
  activeEvents: {
    recordId: string;
    appointmentId?: string;
    clockInTime: Date;
  }[];
}

interface ClockResult {
  success: boolean;
  recordId?: string;
  errors: string[];
  warnings: string[];
  gpsCompliant?: boolean;
  distance?: number;
}

export default function MobileClockPortal() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [locationError, setLocationError] = useState("");
  const [gettingLocation, setGettingLocation] = useState(false);

  // Fetch current user's staff record
  const { data: staffRecord, isLoading: loadingStaffRecord, error: staffError } = useQuery<Staff>({
    queryKey: ["/api/staff/me"],
  });

  // Get current location
  const getCurrentLocation = () => {
    setGettingLocation(true);
    setLocationError("");

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(position);
        setGettingLocation(false);
        toast({
          title: "Location Acquired",
          description: `Accuracy: ${position.coords.accuracy.toFixed(0)}m`,
        });
      },
      (error) => {
        setLocationError(error.message);
        setGettingLocation(false);
        toast({
          title: "Location Error",
          description: error.message,
          variant: "destructive",
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  // Auto-get location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Fetch clock status
  const { data: clockStatus } = useQuery<ClockStatus>({
    queryKey: [`/api/staff/${staffRecord?.id}/clock-status`],
    enabled: !!staffRecord?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Clock in mutation
  const clockInMutation = useMutation({
    mutationFn: async () => {
      if (!location) throw new Error("Location not available");
      if (!staffRecord?.id) throw new Error("Staff record not found");

      const res = await fetch(`/api/staff/${staffRecord.id}/clock-in`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          deviceType: navigator.userAgent,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to clock in");
      return data as ClockResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${staffRecord?.id}/clock-status`] });

      if (data.success) {
        toast({
          title: "Clocked In Successfully",
          description: data.gpsCompliant
            ? "Location verified"
            : `Location warning: ${data.distance?.toFixed(0)}m from expected`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Clock In Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Clock out mutation
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!location) throw new Error("Location not available");
      if (!staffRecord?.id) throw new Error("Staff record not found");

      const res = await fetch(`/api/staff/${staffRecord.id}/clock-out`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          deviceType: navigator.userAgent,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to clock out");
      return data as ClockResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/staff/${staffRecord?.id}/clock-status`] });

      if (data.success) {
        toast({
          title: "Clocked Out Successfully",
          description: data.gpsCompliant
            ? "Location verified"
            : `Location warning: ${data.distance?.toFixed(0)}m from expected`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Clock Out Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClockIn = () => {
    if (!location) {
      toast({
        title: "Location Required",
        description: "Please enable GPS and refresh location",
        variant: "destructive",
      });
      return;
    }
    clockInMutation.mutate();
  };

  const handleClockOut = () => {
    if (!location) {
      toast({
        title: "Location Required",
        description: "Please enable GPS and refresh location",
        variant: "destructive",
      });
      return;
    }
    clockOutMutation.mutate();
  };

  const isClockedIn = clockStatus?.isClockedIn || false;
  const isProcessing = clockInMutation.isPending || clockOutMutation.isPending;

  // Loading state while fetching staff record
  if (loadingStaffRecord) {
    return (
      <div className="container max-w-md mx-auto py-6 px-4">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading your staff profile...</p>
        </div>
      </div>
    );
  }

  // Error state if no staff record found
  if (staffError || !staffRecord) {
    return (
      <div className="container max-w-md mx-auto py-6 px-4">
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>
            No staff record found for your account. Please contact your administrator to set up your staff profile.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto py-6 px-4 space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Mobile Time Clock</h1>
        <p className="text-sm text-muted-foreground">GPS-enabled clock in/out</p>
      </div>

      {/* Staff Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Logged in as</p>
            <p className="text-lg font-semibold">{staffRecord.name}</p>
            {staffRecord.role && (
              <Badge variant="secondary" className="mt-2">
                {staffRecord.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Location Status */}
      <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                GPS Location
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {locationError ? (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>{locationError}</AlertDescription>
                </Alert>
              ) : location ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Location Acquired
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Accuracy:</span>
                    <span className="font-medium">{location.coords.accuracy.toFixed(0)}m</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}
                  </div>
                </div>
              ) : (
                <Alert>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <AlertDescription>Acquiring GPS location...</AlertDescription>
                </Alert>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={getCurrentLocation}
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Getting Location...
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4 mr-2" />
                    Refresh Location
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Clock Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Clock Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isClockedIn ? (
                <div className="space-y-3">
                  <Alert className="bg-blue-50 border-blue-200">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-blue-900">
                      You are currently clocked in
                      {clockStatus?.activeEvents[0]?.clockInTime && (
                        <div className="text-sm mt-1">
                          Since: {new Date(clockStatus.activeEvents[0].clockInTime).toLocaleTimeString()}
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                </div>
              ) : (
                <Alert>
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>You are not currently clocked in</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Clock In/Out Buttons */}
          <div className="space-y-3">
            {!isClockedIn ? (
              <Button
                className="w-full h-16 text-lg"
                size="lg"
                onClick={handleClockIn}
                disabled={!location || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Clock In
                  </>
                )}
              </Button>
            ) : (
              <Button
                className="w-full h-16 text-lg"
                size="lg"
                variant="destructive"
                onClick={handleClockOut}
                disabled={!location || isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 mr-2" />
                    Clock Out
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Info */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground space-y-2">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>GPS location is required for all clock events</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Your location must be within 100m of the expected location</span>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>Timesheets are generated automatically from your clock records</span>
                </div>
              </div>
            </CardContent>
          </Card>
    </div>
  );
}
