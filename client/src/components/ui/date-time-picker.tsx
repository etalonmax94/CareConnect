import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DateTimePickerProps {
  value?: string; // ISO format: YYYY-MM-DDTHH:mm
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  minuteStep?: number;
}

// Generate time slots
const generateTimeSlots = (step: number = 15) => {
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += step) {
      slots.push(`${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`);
    }
  }
  return slots;
};

export function DateTimePicker({
  value = "",
  onChange,
  placeholder = "Select date and time",
  disabled = false,
  className,
  id,
  minuteStep = 15,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"date" | "time">("date");

  // Parse the value
  const { dateValue, timeValue } = React.useMemo(() => {
    if (!value) return { dateValue: undefined, timeValue: "" };

    // Handle ISO datetime format
    if (value.includes("T")) {
      const [datePart, timePart] = value.split("T");
      const parsed = parse(datePart, "yyyy-MM-dd", new Date());
      return {
        dateValue: isValid(parsed) ? parsed : undefined,
        timeValue: timePart?.slice(0, 5) || "",
      };
    }

    // Handle just date
    const parsed = parse(value, "yyyy-MM-dd", new Date());
    return {
      dateValue: isValid(parsed) ? parsed : undefined,
      timeValue: "",
    };
  }, [value]);

  const timeSlots = React.useMemo(() => generateTimeSlots(minuteStep), [minuteStep]);

  // Format display value
  const displayValue = React.useMemo(() => {
    if (!dateValue) return "";
    const dateStr = format(dateValue, "dd/MM/yyyy");
    return timeValue ? `${dateStr} ${timeValue}` : dateStr;
  }, [dateValue, timeValue]);

  // Handle date selection
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const dateStr = format(date, "yyyy-MM-dd");
      const newValue = timeValue ? `${dateStr}T${timeValue}` : dateStr;
      onChange?.(newValue);
      setActiveTab("time");
    }
  };

  // Handle time selection
  const handleTimeSelect = (time: string) => {
    if (dateValue) {
      const dateStr = format(dateValue, "yyyy-MM-dd");
      onChange?.(`${dateStr}T${time}`);
      setOpen(false);
    } else {
      // If no date selected, use today
      const today = format(new Date(), "yyyy-MM-dd");
      onChange?.(`${today}T${time}`);
      setOpen(false);
    }
  };

  // Quick time buttons
  const quickTimes = ["06:00", "08:00", "09:00", "12:00", "14:00", "17:00", "18:00", "21:00"];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("relative", className)}>
        <Input
          id={id}
          type="text"
          value={displayValue}
          readOnly
          placeholder={placeholder}
          disabled={disabled}
          className="pr-10 cursor-pointer"
          onClick={() => !disabled && setOpen(true)}
        />
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            disabled={disabled}
            type="button"
          >
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
      </div>
      <PopoverContent className="w-auto p-0" align="start">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "date" | "time")}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="date" className="flex items-center gap-1">
              <CalendarIcon className="h-3 w-3" />
              Date
            </TabsTrigger>
            <TabsTrigger value="time" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Time
            </TabsTrigger>
          </TabsList>
          <TabsContent value="date" className="mt-0">
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={handleDateSelect}
              initialFocus
            />
          </TabsContent>
          <TabsContent value="time" className="mt-0 p-2">
            <div className="space-y-2">
              {/* Quick select buttons */}
              <div className="grid grid-cols-4 gap-1">
                {quickTimes.map((time) => (
                  <Button
                    key={time}
                    variant={timeValue === time ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => handleTimeSelect(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>

              <div className="border-t pt-2">
                <p className="text-xs text-muted-foreground mb-1">All times (24h)</p>
                <ScrollArea className="h-48">
                  <div className="grid grid-cols-4 gap-1">
                    {timeSlots.map((time) => (
                      <Button
                        key={time}
                        variant={timeValue === time ? "default" : "ghost"}
                        size="sm"
                        className={cn(
                          "text-xs h-7 font-mono",
                          timeValue === time && "bg-primary text-primary-foreground"
                        )}
                        onClick={() => handleTimeSelect(time)}
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

// Compact inline date-time input for forms
interface DateTimeInputProps {
  value?: string; // ISO format: YYYY-MM-DDTHH:mm
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  showLabels?: boolean;
}

export function DateTimeInput({
  value = "",
  onChange,
  disabled = false,
  className,
  showLabels = false,
}: DateTimeInputProps) {
  const [dateStr, setDateStr] = React.useState("");
  const [timeStr, setTimeStr] = React.useState("");

  React.useEffect(() => {
    if (value && value.includes("T")) {
      const [d, t] = value.split("T");
      setDateStr(d || "");
      setTimeStr(t?.slice(0, 5) || "");
    } else if (value) {
      setDateStr(value);
      setTimeStr("");
    }
  }, [value]);

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = e.target.value;
    setDateStr(d);
    if (d && timeStr) {
      onChange?.(`${d}T${timeStr}`);
    } else if (d) {
      onChange?.(d);
    }
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = e.target.value;
    setTimeStr(t);
    if (dateStr && t) {
      onChange?.(`${dateStr}T${t}`);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex-1">
        {showLabels && <label className="text-xs text-muted-foreground">Date</label>}
        <Input
          type="date"
          value={dateStr}
          onChange={handleDateChange}
          disabled={disabled}
          className="font-mono"
        />
      </div>
      <div className="w-24">
        {showLabels && <label className="text-xs text-muted-foreground">Time</label>}
        <Input
          type="time"
          value={timeStr}
          onChange={handleTimeChange}
          disabled={disabled}
          className="font-mono"
        />
      </div>
    </div>
  );
}
