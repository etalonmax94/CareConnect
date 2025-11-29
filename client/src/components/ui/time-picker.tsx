import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimePickerProps {
  value?: string; // HH:mm format (24h)
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  minuteStep?: number; // 5, 10, 15, 30 etc.
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

export function TimePicker({
  value = "",
  onChange,
  placeholder = "Select time",
  disabled = false,
  className,
  id,
  minuteStep = 15,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(value);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const timeSlots = React.useMemo(() => generateTimeSlots(minuteStep), [minuteStep]);

  // Update input when value prop changes
  React.useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Scroll to selected time when opening
  React.useEffect(() => {
    if (open && value && scrollRef.current) {
      const index = timeSlots.findIndex((t) => t === value);
      if (index >= 0) {
        setTimeout(() => {
          const element = scrollRef.current?.querySelector(`[data-time="${value}"]`);
          element?.scrollIntoView({ block: "center" });
        }, 100);
      }
    }
  }, [open, value, timeSlots]);

  // Validate and format time input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    setInputValue(val);

    // Auto-format as user types
    // Remove non-numeric except colon
    val = val.replace(/[^\d:]/g, "");

    // Try to parse various formats
    const patterns = [
      /^(\d{1,2}):(\d{2})$/, // HH:mm or H:mm
      /^(\d{2})(\d{2})$/, // HHmm
      /^(\d{1,2})$/, // H or HH (assume :00)
    ];

    for (const pattern of patterns) {
      const match = val.match(pattern);
      if (match) {
        let hours = parseInt(match[1], 10);
        let minutes = match[2] ? parseInt(match[2], 10) : 0;

        if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
          const formatted = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
          onChange?.(formatted);
          return;
        }
      }
    }
  };

  // Handle blur to format the value
  const handleBlur = () => {
    if (value) {
      setInputValue(value);
    }
  };

  // Handle time slot selection
  const handleSelect = (time: string) => {
    onChange?.(time);
    setInputValue(time);
    setOpen(false);
  };

  // Quick time buttons for common times
  const quickTimes = ["06:00", "08:00", "09:00", "12:00", "14:00", "17:00", "18:00", "21:00"];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative cursor-pointer", className)}>
          <Input
            id={id}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleBlur}
            onFocus={() => !disabled && setOpen(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="pr-10 cursor-pointer"
            maxLength={5}
          />
          <div className="absolute right-0 top-0 h-full px-3 flex items-center pointer-events-none">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-2">
          {/* Quick select buttons */}
          <div className="grid grid-cols-4 gap-1">
            {quickTimes.map((time) => (
              <Button
                key={time}
                variant={value === time ? "default" : "outline"}
                size="sm"
                className="text-xs h-7"
                onClick={() => handleSelect(time)}
              >
                {time}
              </Button>
            ))}
          </div>

          <div className="border-t pt-2">
            <p className="text-xs text-muted-foreground mb-1">All times (24h)</p>
            <ScrollArea className="h-48" ref={scrollRef}>
              <div className="grid grid-cols-4 gap-1">
                {timeSlots.map((time) => (
                  <Button
                    key={time}
                    data-time={time}
                    variant={value === time ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "text-xs h-7 font-mono",
                      value === time && "bg-primary text-primary-foreground"
                    )}
                    onClick={() => handleSelect(time)}
                  >
                    {time}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Simple inline time input (for compact spaces)
interface TimeInputProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function TimeInput({
  value = "",
  onChange,
  disabled = false,
  className,
  id,
}: TimeInputProps) {
  const [hours, setHours] = React.useState(() => value?.split(":")[0] || "");
  const [minutes, setMinutes] = React.useState(() => value?.split(":")[1] || "");
  const minuteRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (value) {
      const [h, m] = value.split(":");
      setHours(h || "");
      setMinutes(m || "");
    }
  }, [value]);

  const handleHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "").slice(0, 2);
    const num = parseInt(val, 10);

    if (val === "" || (num >= 0 && num <= 23)) {
      setHours(val);
      if (val.length === 2) {
        minuteRef.current?.focus();
        minuteRef.current?.select();
      }
      if (val.length === 2 && minutes.length === 2) {
        onChange?.(`${val.padStart(2, "0")}:${minutes.padStart(2, "0")}`);
      }
    }
  };

  const handleMinutesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "").slice(0, 2);
    const num = parseInt(val, 10);

    if (val === "" || (num >= 0 && num <= 59)) {
      setMinutes(val);
      if (hours.length >= 1 && val.length === 2) {
        onChange?.(`${hours.padStart(2, "0")}:${val.padStart(2, "0")}`);
      }
    }
  };

  const handleBlur = () => {
    if (hours && minutes) {
      const h = hours.padStart(2, "0");
      const m = minutes.padStart(2, "0");
      setHours(h);
      setMinutes(m);
      onChange?.(`${h}:${m}`);
    }
  };

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Input
        id={id}
        type="text"
        value={hours}
        onChange={handleHoursChange}
        onBlur={handleBlur}
        disabled={disabled}
        className="w-12 text-center font-mono px-1"
        placeholder="HH"
        maxLength={2}
      />
      <span className="text-muted-foreground font-bold">:</span>
      <Input
        ref={minuteRef}
        type="text"
        value={minutes}
        onChange={handleMinutesChange}
        onBlur={handleBlur}
        disabled={disabled}
        className="w-12 text-center font-mono px-1"
        placeholder="MM"
        maxLength={2}
      />
    </div>
  );
}
