const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface AvailabilitySlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone?: string;
}

export function AvailabilityDisplay({ slots }: { slots: AvailabilitySlot[] }) {
  if (slots.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No availability published yet. Contact the mentor to schedule.
      </p>
    );
  }

  const grouped = slots.reduce<Record<number, AvailabilitySlot[]>>((acc, slot) => {
    if (!acc[slot.dayOfWeek]) acc[slot.dayOfWeek] = [];
    acc[slot.dayOfWeek].push(slot);
    return acc;
  }, {});

  return (
    <div className="space-y-2">
      {Object.entries(grouped)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([day, daySlots]) => (
          <div key={day} className="flex items-start gap-3 text-sm">
            <span className="w-10 shrink-0 font-medium text-indigo-400">
              {DAY_LABELS[Number(day)]}
            </span>
            <div className="flex flex-wrap gap-2">
              {daySlots.map((slot, i) => (
                <span
                  key={`${day}-${i}`}
                  className="rounded-md bg-slate-800/80 border border-slate-700 px-2.5 py-1 text-slate-300"
                >
                  {slot.startTime} – {slot.endTime}
                </span>
              ))}
            </div>
          </div>
        ))}
    </div>
  );
}

export { DAY_LABELS };
