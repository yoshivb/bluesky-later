import { useMemo, useState, useRef, useEffect } from "react";
import { Input } from "./input";
import { Label } from "./label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Button } from "./button";
import { format, parse } from "date-fns";
import { timeZonesNames, getTimeZones } from "@vvo/tzdb";
import { Calendar } from "./calendar";
import { Popover, PopoverTrigger, PopoverContent } from "./popover";
import { Calendar as CalendarIcon } from "lucide-react";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./tooltip";
import { toZonedTime } from "date-fns-tz";
import { formatInTimeZone } from "date-fns-tz";

// Type for preset
export type DateTimePreset = {
  label: string;
  getValue: () => Date;
  getTimezone?: () => string;
};

// Mode for allowed date/time selection
export type DateTimePickerMode = "future" | "past" | "any";

// Timezone type
export type TimezoneOption = {
  label: string;
  value: string;
};

// Props
export interface DateTimePickerProps {
  value: { date: string; time: string; timezone: string };
  onChange: (val: { date: string; time: string; timezone: string }) => void;
  presets?: DateTimePreset[];
  mode?: DateTimePickerMode;
  timezoneOptions?: TimezoneOption[];
  label?: string;
  disabled?: boolean;
}

// Build a map of timezone name to current offset in minutes
const tzdbTimeZones = getTimeZones();
const tzOffsetMap: Record<string, number> = Object.fromEntries(
  tzdbTimeZones.map((tz) => [tz.name, tz.currentTimeOffsetInMinutes])
);

// Helper to get UTC offset string for a timezone
function getUtcOffsetString(timezone: string): string {
  const offsetMinutes = tzOffsetMap[timezone];
  if (typeof offsetMinutes !== "number") return "";
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  return `UTC${sign}${hours.toString().padStart(2, "0")}${
    minutes ? ":" + minutes.toString().padStart(2, "0") : ""
  }`;
}

// Generate all timezone options from tzdb
const allTimezoneOptions: TimezoneOption[] = timeZonesNames.map((tz) => ({
  label: tz,
  value: tz,
}));

export const DateTimePicker = ({
  value,
  onChange,
  presets = [],
  mode = "future",
  timezoneOptions,
  label,
  disabled = false,
}: DateTimePickerProps) => {
  // Compute 'today' in the selected timezone
  const zonedNow = useMemo(() => {
    try {
      return toZonedTime(new Date(), value.timezone);
    } catch {
      return new Date();
    }
  }, [value.timezone]);
  const today = format(zonedNow, "yyyy-MM-dd");
  const min = mode === "future" ? today : undefined;
  const max = mode === "past" ? today : undefined;

  // Use provided timezoneOptions or all IANA timezones
  const tzOptions = timezoneOptions || allTimezoneOptions;

  // Search state for timezone
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Date popover state
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  // Convert value.date (yyyy-MM-dd) to Date object
  const selectedDate = useMemo(() => {
    if (!value.date) return undefined;
    const parsed = parse(value.date, "yyyy-MM-dd", new Date());
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }, [value.date]);

  // Filtered timezone options
  const filteredTzOptions = useMemo(() => {
    if (!search) return tzOptions;
    return tzOptions.filter((tz) =>
      tz.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [tzOptions, search]);

  // Memoize timezone label with offset
  const timezoneLabel = useMemo(() => {
    const tz = tzOptions.find((tz) => tz.value === value.timezone);
    if (!tz) return value.timezone;
    const offset = getUtcOffsetString(tz.value);
    return `${tz.label} (${offset})`;
  }, [tzOptions, value.timezone]);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (dropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
    if (!dropdownOpen) {
      setSearch("");
    }
  }, [dropdownOpen]);

  // Date min/max logic for calendar
  const minDate = min ? parse(min, "yyyy-MM-dd", new Date()) : undefined;
  const maxDate = max ? parse(max, "yyyy-MM-dd", new Date()) : undefined;

  return (
    <TooltipProvider>
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <div className="flex gap-2 items-center">
          {/* Date Picker */}
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-[11rem] justify-start text-left font-normal"
                disabled={disabled}
                data-empty={!selectedDate}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    onChange({ ...value, date: format(date, "yyyy-MM-dd") });
                    setDatePopoverOpen(false);
                  }
                }}
                disabled={(date) =>
                  (!!minDate && date < minDate) || (!!maxDate && date > maxDate)
                }
                captionLayout="dropdown"
              />
            </PopoverContent>
          </Popover>
          {/* Time */}
          <Input
            type="time"
            id="time-picker"
            step="1"
            value={value.time}
            onChange={(e) => onChange({ ...value, time: e.target.value })}
            className="bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
          />
          {/* Timezone */}
          <Tooltip>
            <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
              <DropdownMenuTrigger asChild>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="max-w-[14rem] w-[14rem] text-left overflow-hidden truncate text-ellipsis"
                    disabled={disabled}
                  >
                    <span className="truncate text-ellipsis block">
                      {timezoneLabel}
                    </span>
                  </Button>
                </TooltipTrigger>
              </DropdownMenuTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                {timezoneLabel}
              </TooltipContent>
              <DropdownMenuContent
                align="start"
                className="max-h-72 overflow-y-auto w-[20rem] p-0"
              >
                <div className="p-2 border-b border-muted bg-background sticky top-0 z-10">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search timezone..."
                    className="w-full px-2 py-1 rounded border border-input focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    disabled={disabled}
                    aria-label="Search timezone"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {filteredTzOptions.length === 0 ? (
                    <div className="px-4 py-2 text-muted-foreground text-sm">
                      No results
                    </div>
                  ) : (
                    filteredTzOptions.map((tz) => {
                      const offset = getUtcOffsetString(tz.value);
                      return (
                        <DropdownMenuItem
                          key={tz.value}
                          onSelect={() => {
                            onChange({ ...value, timezone: tz.value });
                            setDropdownOpen(false);
                          }}
                          className="max-w-[14rem] truncate text-ellipsis"
                        >
                          <span className="flex justify-between w-full truncate text-ellipsis">
                            <span className="truncate text-ellipsis block">
                              {tz.label}
                            </span>
                            <span className="text-muted-foreground text-xs ml-2 whitespace-nowrap">
                              {offset}
                            </span>
                          </span>
                        </DropdownMenuItem>
                      );
                    })
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </Tooltip>
          {/* Presets */}
          {presets.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" disabled={disabled}>
                  Presets
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {presets.map((preset) => {
                  const d = preset.getValue();
                  const tz = preset.getTimezone
                    ? preset.getTimezone()
                    : value.timezone;
                  return (
                    <DropdownMenuItem
                      key={preset.label}
                      onSelect={() =>
                        onChange({
                          ...value,
                          date: formatInTimeZone(d, tz, "yyyy-MM-dd"),
                          time: formatInTimeZone(d, tz, "HH:mm"),
                          timezone: tz,
                        })
                      }
                    >
                      {preset.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
