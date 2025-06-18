# DateTimePicker Component

A composable, accessible, and highly configurable date-time picker for React, built with TypeScript, Shadcn, and Tailwind CSS. It allows users to select a date, time, and timezone, with support for presets and validation modes.

---

## Features

- **Date selection** via a calendar popover
- **Time selection** with a native time input
- **Timezone selection** with searchable dropdown (all IANA timezones by default)
- **Presets** for quick date/time selection (customizable)
- **Validation modes**: restrict to future, past, or any date
- **Accessibility**: keyboard navigation, focus management, tooltips
- **Customizable**: label, disabled state, timezone options, and more
- **Composable**: designed for integration in forms and complex UIs

---

## Props

```
interface DateTimePickerProps {
  value: { date: string; time: string; timezone: string };
  onChange: (val: { date: string; time: string; timezone: string }) => void;
  presets?: DateTimePreset[];
  mode?: "future" | "past" | "any";
  timezoneOptions?: TimezoneOption[];
  label?: string;
  disabled?: boolean;
}
```

### value (required)

- **Type:** `{ date: string; time: string; timezone: string }`
- The current value of the picker. `date` is in `yyyy-MM-dd` format, `time` is in `HH:mm` or `HH:mm:ss`, and `timezone` is an IANA timezone string.

### onChange (required)

- **Type:** `(val: { date: string; time: string; timezone: string }) => void`
- Callback fired when the user changes the date, time, or timezone.

### presets (optional)

- **Type:** `DateTimePreset[]`
- Array of preset options for quick selection. Each preset has a `label`, a `getValue` function returning a `Date`, and an optional `getTimezone` function.
- Example:
  ```ts
  const presets = [
    {
      label: "In 5 minutes",
      getValue: () => addMinutes(new Date(), 5),
      getTimezone: () => "America/New_York",
    },
    // ...
  ];
  ```

### mode (optional)

- **Type:** `"future" | "past" | "any"` (default: `"future"`)
- Restricts selectable dates:
  - `"future"`: only today and future dates
  - `"past"`: only today and past dates
  - `"any"`: no restriction

### timezoneOptions (optional)

- **Type:** `TimezoneOption[]`
- Custom list of timezones to show. By default, all IANA timezones are available.

### label (optional)

- **Type:** `string`
- Label for the picker (renders above the controls).

### disabled (optional)

- **Type:** `boolean`
- Disables all controls if true.

---

## Behavior

### Date Selection

- Opens a calendar popover for date selection.
- Respects `mode` prop for min/max date.
- Displays the selected date in a human-readable format (e.g., "Jun 10, 2024").

### Time Selection

- Uses a native `<input type="time">` for time selection.
- Supports seconds (step="1").
- Updates the value immediately on change.

### Timezone Selection

- Dropdown menu with search for all IANA timezones (or custom list).
- Shows the current UTC offset for each timezone.
- Selecting a timezone updates the value.
- Tooltip displays the full timezone name and offset.

### Presets

- If `presets` are provided, a "Presets" dropdown appears.
- Selecting a preset sets the date, time, and (optionally) timezone according to the preset's logic.
- Presets are useful for quick actions like "In 5 minutes", "Tomorrow", etc.

### Accessibility

- All controls are keyboard accessible.
- Focus is managed for dropdowns and popovers.
- Tooltips provide additional context for timezones.

### Validation

- The component does not perform input validation itself, but restricts selectable dates according to the `mode` prop.
- For further validation, use zod or your preferred schema validation in your form logic.

---

## Presets in the App

The DateTimePicker supports two types of presets: **default presets** and **dynamic presets**. Presets provide quick actions for common scheduling scenarios.

### Default Presets

These are always available unless you override the `presets` prop. They are defined in `date-time-picker-presets.tsx`:

- **In 5 minutes**: Sets the date/time to 5 minutes from now, using your current timezone.
- **In 10 minutes**: Sets the date/time to 10 minutes from now, using your current timezone.
- **In 30 minutes**: Sets the date/time to 30 minutes from now, using your current timezone.
- **In 1 hour**: Sets the date/time to 1 hour from now, using your current timezone.
- **Tomorrow**: Sets the date/time to the same time tomorrow, using your current timezone.
- **In 2 days**: Sets the date/time to the same time two days from now, using your current timezone.

These presets are useful for quickly scheduling something in the near future without manually picking a date and time.

### Dynamic Presets

If you use the `useDynamicPresets` hook (as in the post scheduler), additional presets appear based on your scheduled posts:

- **5 minutes after the last pending post**: Sets the date/time to 5 minutes after the latest scheduled post, using that post's timezone.
- **10 minutes after the last pending post**: Sets the date/time to 10 minutes after the latest scheduled post, using that post's timezone.
- **30 minutes after the last pending post**: Sets the date/time to 30 minutes after the latest scheduled post, using that post's timezone.
- **1 hour after the last pending post**: Sets the date/time to 1 hour after the latest scheduled post, using that post's timezone.

These dynamic presets only appear if you have at least one pending scheduled post. They help you quickly schedule follow-up posts at common intervals after your last scheduled post.

You can combine both default and dynamic presets by passing `[...dynamicPresets, ...defaultPresets]` to the `presets` prop, as shown in the usage example.

---

## Usage Example

```tsx
import { DateTimePicker } from "./ui/date-time-picker";
import { defaultPresets } from "./ui/date-time-picker-presets";

const [value, setValue] = useState({
  date: "2024-06-10",
  time: "12:00",
  timezone: "America/New_York",
});

<DateTimePicker
  value={value}
  onChange={setValue}
  presets={defaultPresets}
  mode="future"
  label="Schedule for"
/>;
```

---

## Customization

- **Presets:** Pass your own array of `DateTimePreset` objects for custom quick actions.
- **Timezones:** Limit the timezone dropdown by passing a custom `timezoneOptions` array.
- **Styling:** Uses Shadcn and Tailwind for styling. Override classes as needed.
- **Integration:** Designed to work in forms, modals, or as a standalone picker.

---

## Types

```
type DateTimePreset = {
  label: string;
  getValue: () => Date;
  getTimezone?: () => string;
};

type DateTimePickerMode = "future" | "past" | "any";

type TimezoneOption = {
  label: string;
  value: string;
};
```

---

## Accessibility & UX

- All interactive elements are focusable and accessible via keyboard.
- Tooltips and ARIA labels are used for clarity.
- Designed for composability and integration in larger UIs.

---

## Related

- `date-time-picker-presets.tsx`: Example presets
- `use-dynamic-presets.ts`: Dynamic presets based on app state
- `calendar.tsx`: Calendar UI component
- `timezone-clock.tsx`: Live clock for selected timezone

---

## License

MIT
