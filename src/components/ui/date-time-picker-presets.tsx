import { addDays, addHours, addMinutes } from "date-fns";
import { DateTimePreset } from "./date-time-picker";

export const defaultPresets: DateTimePreset[] = [
  {
    label: "In 5 minutes",
    getValue: () => addMinutes(new Date(), 5),
  },
  {
    label: "In 10 minutes",
    getValue: () => addMinutes(new Date(), 10),
  },
  {
    label: "In 30 minutes",
    getValue: () => addMinutes(new Date(), 30),
  },
  {
    label: "In 1 hour",
    getValue: () => addHours(new Date(), 1),
  },
  {
    label: "Tomorrow",
    getValue: () => addDays(new Date(), 1),
  },
  {
    label: "In 2 days",
    getValue: () => addDays(new Date(), 2),
  },
];
