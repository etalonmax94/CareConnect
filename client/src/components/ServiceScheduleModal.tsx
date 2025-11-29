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
import { TimePicker } from "@/components/ui/time-picker";

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
      return apiRequest("PATCH", `/api/clients/${clientId}`, data);
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

  const getTotalHours = (week: WeekSchedule) => {
    let totalMinutes = 0;
    Object.values(week).forEach(slots => {
      slots.forEach(slot => {
        const [startHours, startMinutes] = slot.startTime.split(":").map(Number);
        const [endHours, endMinutes] = slot.endTime.split(":").map(Number);
        let mins = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
        if (mins < 0) mins += 24 * 60;
        totalMinutes += mins;
      });
    });
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0 && minutes === 0) return "0h";
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}min`;
  };

  const formatTimeDisplay = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    const [startHours, startMinutes] = startTime.split(":").map(Number);
    const [endHours, endMinutes] = endTime.split(":").map(Number);
    
    let totalMinutes = (endHours * 60 + endMinutes) - (startHours * 60 + startMinutes);
    if (totalMinutes < 0) totalMinutes += 24 * 60; // Handle overnight
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    if (hours === 0) return `${minutes}min`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}min`;
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
                  {getTotalSlots(schedule.week1)} sessions • {getTotalHours(schedule.week1)}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="week2" className="gap-2" data-testid="tab-week2">
                Week 2
                <Badge variant="secondary" className="text-xs">
                  {getTotalSlots(schedule.week2)} sessions • {getTotalHours(schedule.week2)}
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
              calculateDuration={calculateDuration}
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
              calculateDuration={calculateDuration}
            />
          </TabsContent>
        </Tabs>

        {/* Fortnight Summary */}
        <Card className="mt-4 bg-muted/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Fortnight Summary</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Week 1</p>
                  <p className="text-sm font-semibold">{getTotalHours(schedule.week1)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Week 2</p>
                  <p className="text-sm font-semibold">{getTotalHours(schedule.week2)}</p>
                </div>
                <div className="text-right border-l pl-4">
                  <p className="text-xs text-muted-foreground">Total (Fortnight)</p>
                  <p className="text-sm font-bold text-primary">
                    {(() => {
                      const week1Mins = Object.values(schedule.week1).flat().reduce((acc, slot) => {
                        const [sh, sm] = slot.startTime.split(":").map(Number);
                        const [eh, em] = slot.endTime.split(":").map(Number);
                        let m = (eh * 60 + em) - (sh * 60 + sm);
                        if (m < 0) m += 24 * 60;
                        return acc + m;
                      }, 0);
                      const week2Mins = Object.values(schedule.week2).flat().reduce((acc, slot) => {
                        const [sh, sm] = slot.startTime.split(":").map(Number);
                        const [eh, em] = slot.endTime.split(":").map(Number);
                        let m = (eh * 60 + em) - (sh * 60 + sm);
                        if (m < 0) m += 24 * 60;
                        return acc + m;
                      }, 0);
                      const total = week1Mins + week2Mins;
                      const h = Math.floor(total / 60);
                      const m = total % 60;
                      if (h === 0 && m === 0) return "0h";
                      if (m === 0) return `${h}h`;
                      return `${h}h ${m}min`;
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
  calculateDuration: (startTime: string, endTime: string) => string;
}

function WeekView({
  week,
  schedule,
  onAddSlot,
  onRemoveSlot,
  onUpdateSlot,
  formatTimeDisplay,
  calculateDuration,
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
                title="Add another session"
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
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        Session {index + 1}
                      </Badge>
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
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Start</Label>
                        <TimePicker
                          value={slot.startTime}
                          onChange={(value) => onUpdateSlot(week, day, index, "startTime", value)}
                          className="h-7 text-xs"
                          placeholder="Start"
                          minuteStep={15}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">End</Label>
                        <TimePicker
                          value={slot.endTime}
                          onChange={(value) => onUpdateSlot(week, day, index, "endTime", value)}
                          className="h-7 text-xs"
                          placeholder="End"
                          minuteStep={15}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border/50">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">
                          {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {calculateDuration(slot.startTime, slot.endTime)}
                      </Badge>
                    </div>
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
