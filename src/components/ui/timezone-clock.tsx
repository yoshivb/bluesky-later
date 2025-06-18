import { useEffect, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";

interface TimezoneClockProps {
  timezone: string;
  formatString?: string;
  className?: string;
}

// Default format: e.g. Monday, 2024-06-10 14:23:45
const DEFAULT_FORMAT = "EEEE, yyyy-MM-dd HH:mm:ss";

const TimezoneClock = ({
  timezone,
  formatString = DEFAULT_FORMAT,
  className,
}: TimezoneClockProps) => {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  let display = "-";
  try {
    display = formatInTimeZone(now, timezone, formatString);
  } catch {
    display = "Invalid timezone";
  }

  return (
    <div
      className={`rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground font-mono ${
        className || ""
      }`.trim()}
    >
      <span>
        Current time in <span className="font-semibold">{timezone}</span>:
      </span>
      <span className="ml-2">{display}</span>
    </div>
  );
};

export { TimezoneClock };
