import * as React from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

export function CalendarPopover({ value, onChange, placeholder = "Selecciona una fecha", className = "", ...props }) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState(value || undefined);
  const ref = React.useRef();

  React.useEffect(() => {
    if (value !== date) setDate(value);
  }, [value]);

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSelect = (selected) => {
    setDate(selected);
    setOpen(false);
    if (onChange) onChange(selected);
  };

  return (
    <div className={"relative " + className} ref={ref}>
      <button
        type="button"
        className="p-2 border border-default rounded w-full bg-card text-text flex items-center justify-between"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {date ? new Date(date).toLocaleDateString() : <span className="text-text-muted">{placeholder}</span>}
        <svg className="w-4 h-4 ml-2 text-text-muted" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute z-40 mt-2 left-0 bg-card border border-default rounded shadow-lg p-2" style={{ minWidth: 260 }}>
          <DayPicker
            mode="single"
            selected={date}
            onSelect={handleSelect}
            showOutsideDays
            {...props}
          />
        </div>
      )}
    </div>
  );
}

export default CalendarPopover;
