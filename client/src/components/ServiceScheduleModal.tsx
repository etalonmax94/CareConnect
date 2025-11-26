import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X, Clock, Calendar, Save, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type TimeSlot = {
  startTime: string;
  endTime: string;
};

type WeekSchedule = {
  [day: string]: TimeSlot[];
};

type ServiceSchedule = {
  week1: WeekSchedule;
  week2: WeekSchedule;
  notes?: string;
};

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface ServiceScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  currentSchedule?: ServiceSchedule | null;
  currentFrequencyText?: string | null;
}

export function ServiceScheduleModal({
  open,
  onOpenChange,
  clientId,
  clientName,
  currentSchedule,
  currentFrequencyText,
}: ServiceScheduleModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeWeek, setActiveWeek] = useState<"week1" | "week2">("week1");
  const [notes, setNotes] = useState(currentSchedule?.notes || "");
  
  const [schedule, setSchedule] = useState<ServiceSchedule>(() => {
    if (currentSchedule) {
      return currentSchedule;
    }
    return {
      week1: DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day]: [] }), {}),
      week2: DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day]: [] }), {}),
    };
  });

  useEffect(() => {
    if (currentSchedule) {
      setSchedule(currentSchedule);
      setNotes(currentSchedule.notes || "");
    } else {
      setSchedule({
        week1: DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day]: [] }), {}),
        week2: DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day]: [] }), {}),
      });
      setNotes("");
    }
  }, [currentSchedule, open]);

  const saveMutation = useMutation({
    mutationFn: async (data: { serviceSchedule: ServiceSchedule }) => {
      return apiRequest(`/api/clients/${clientId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId] });
      toast({
        title: "Schedule saved",
        description: "Service schedule has been updated successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save schedule",
        variant: "destructive",
      });
    },
  });

  const addTimeSlot = (week: "week1" | "week2", day: string) => {
    setSchedule((prev) => ({
      ...prev,
      [week]: {
        ...prev[week],
        [day]: [...(prev[week][day] || []), { startTime: "09:00", endTime: "12:00" }],
      },
    }));
  };

  const removeTimeSlot = (week: "week1" | "week2", day: string, index: number) => {
    setSchedule((prev) => ({
      ...prev,
      [week]: {
        ...prev[week],
        [day]: prev[week][day].filter((_, i) => i !== index),
      },
    }));
  };

  const updateTimeSlot = (
    week: "week1" | "week2",
    day: string,
    index: number,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setSchedule((prev) => ({
      ...prev,
      [week]: {
        ...prev[week],
        [day]: prev[week][day].map((slot, i) =>
          i === index ? { ...slot, [field]: value } : slot
        ),
      },
    }));
  };

  const copyWeek1ToWeek2 = () => {
    setSchedule((prev) => ({
      ...prev,
      week2: JSON.parse(JSON.stringify(prev.week1)),
    }));
    toast({
      title: "Week copied",
      description: "Week 1 schedule has been copied to Week 2.",
    });
  };

  const clearWeek = (week: "week1" | "week2") => {
    setSchedule((prev) => ({
      ...prev,
      [week]: DAYS_OF_WEEK.reduce((acc, day) => ({ ...acc, [day]: [] }), {}),
    }));
  };

  const handleSave = () => {
    const scheduleWithNotes = { ...schedule, notes };
    saveMutation.mutate({ serviceSchedule: scheduleWithNotes });
  };

  const getTotalSlots = (week: WeekSchedule) => {
    return Object.values(week).reduce((total, slots) => total + slots.length, 0);
  };

  const formatTimeDisplay = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Service Schedule - {clientName}
          </DialogTitle>
          {currentFrequencyText && (
            <p className="text-sm text-muted-foreground mt-1">
              Current setting: {currentFrequencyText}
            </p>
          )}
        </DialogHeader>

        <Tabs value={activeWeek} onValueChange={(v) => setActiveWeek(v as "week1" | "week2")}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="week1" className="gap-2" data-testid="tab-week1">
                Week 1
                <Badge variant="secondary" className="text-xs">
                  {getTotalSlots(schedule.week1)} slots
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="week2" className="gap-2" data-testid="tab-week2">
                Week 2
                <Badge variant="secondary" className="text-xs">
                  {getTotalSlots(schedule.week2)} slots
                </Badge>
              </TabsTrigger>
            </TabsList>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyWeek1ToWeek2}
                disabled={activeWeek === "week1"}
                data-testid="button-copy-week"
              >
                Copy Week 1 to Week 2
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clearWeek(activeWeek)}
                data-testid="button-clear-week"
              >
                Clear Week
              </Button>
            </div>
          </div>

          <TabsContent value="week1" className="mt-0">
            <WeekView
              week="week1"
              schedule={schedule.week1}
              onAddSlot={addTimeSlot}
              onRemoveSlot={removeTimeSlot}
              onUpdateSlot={updateTimeSlot}
              formatTimeDisplay={formatTimeDisplay}
            />
          </TabsContent>
          <TabsContent value="week2" className="mt-0">
            <WeekView
              week="week2"
              schedule={schedule.week2}
              onAddSlot={addTimeSlot}
              onRemoveSlot={removeTimeSlot}
              onUpdateSlot={updateTimeSlot}
              formatTimeDisplay={formatTimeDisplay}
            />
          </TabsContent>
        </Tabs>

        <div className="mt-4">
          <Label htmlFor="schedule-notes">Additional Notes</Label>
          <Textarea
            id="schedule-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional scheduling notes or instructions..."
            className="mt-1.5"
            rows={3}
            data-testid="input-schedule-notes"
          />
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-schedule">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-schedule">
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface WeekViewProps {
  week: "week1" | "week2";
  schedule: WeekSchedule;
  onAddSlot: (week: "week1" | "week2", day: string) => void;
  onRemoveSlot: (week: "week1" | "week2", day: string, index: number) => void;
  onUpdateSlot: (
    week: "week1" | "week2",
    day: string,
    index: number,
    field: "startTime" | "endTime",
    value: string
  ) => void;
  formatTimeDisplay: (time: string) => string;
}

function WeekView({
  week,
  schedule,
  onAddSlot,
  onRemoveSlot,
  onUpdateSlot,
  formatTimeDisplay,
}: WeekViewProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-2">
      {DAYS_OF_WEEK.map((day) => (
        <Card key={day} className="bg-card">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">{day.slice(0, 3)}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onAddSlot(week, day)}
                data-testid={`button-add-slot-${week}-${day}`}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <div className="space-y-2">
              {(schedule[day] || []).length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No services</p>
              ) : (
                (schedule[day] || []).map((slot, index) => (
                  <div
                    key={index}
                    className="bg-muted/50 rounded-md p-2 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => onRemoveSlot(week, day, index)}
                        data-testid={`button-remove-slot-${week}-${day}-${index}`}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <Input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => onUpdateSlot(week, day, index, "startTime", e.target.value)}
                        className="h-7 text-xs"
                        data-testid={`input-start-time-${week}-${day}-${index}`}
                      />
                      <Input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => onUpdateSlot(week, day, index, "endTime", e.target.value)}
                        className="h-7 text-xs"
                        data-testid={`input-end-time-${week}-${day}-${index}`}
                      />
                    </div>
                    <p className="text-[10px] text-center text-muted-foreground">
                      {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
