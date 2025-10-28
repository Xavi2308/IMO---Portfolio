
import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

export function CalendarDemo({ value, onChange, ...props }) {
  // value puede ser null o Date
  const [date, setDate] = React.useState(value || undefined);

  React.useEffect(() => {
    if (value !== date) setDate(value);
  }, [value]);

  const handleSelect = (selected) => {
    setDate(selected);
    if (onChange) onChange(selected);
  };

  return (
    <DayPicker
      mode="single"
      selected={date}
      onSelect={handleSelect}
      className="rounded-md border shadow-sm"
      {...props}
    />
  );
}

export default CalendarDemo;
