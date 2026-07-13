"use client";

import { Plus, Trash2 } from "lucide-react";
import { DAY_LABELS, type AvailabilitySlot } from "./availability-display";

interface AvailabilityEditorProps {
  slots: AvailabilitySlot[];
  onChange: (slots: AvailabilitySlot[]) => void;
}

const emptySlot = (): AvailabilitySlot => ({
  dayOfWeek: 1,
  startTime: "10:00",
  endTime: "11:00",
  timezone: "Asia/Kolkata",
});

export function AvailabilityEditor({ slots, onChange }: AvailabilityEditorProps) {
  function updateSlot(index: number, patch: Partial<AvailabilitySlot>) {
    onChange(slots.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function removeSlot(index: number) {
    onChange(slots.filter((_, i) => i !== index));
  }

  function addSlot() {
    onChange([...slots, emptySlot()]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Weekly Availability</h3>
        <button
          type="button"
          onClick={addSlot}
          className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
        >
          <Plus className="h-3.5 w-3.5" />
          Add slot
        </button>
      </div>

      {slots.length === 0 ? (
        <p className="text-xs text-slate-500">
          Add time slots when you&apos;re available for mentoring sessions.
        </p>
      ) : (
        slots.map((slot, index) => (
          <div
            key={index}
            className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/40 p-3"
          >
            <select
              value={slot.dayOfWeek}
              onChange={(e) =>
                updateSlot(index, { dayOfWeek: Number(e.target.value) })
              }
              className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm text-white"
            >
              {DAY_LABELS.map((label, day) => (
                <option key={day} value={day}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={slot.startTime}
              onChange={(e) => updateSlot(index, { startTime: e.target.value })}
              className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm text-white"
            />
            <span className="text-slate-500 text-sm">to</span>
            <input
              type="time"
              value={slot.endTime}
              onChange={(e) => updateSlot(index, { endTime: e.target.value })}
              className="rounded-md bg-slate-800 border border-slate-700 px-2 py-1.5 text-sm text-white"
            />
            <button
              type="button"
              onClick={() => removeSlot(index)}
              className="ml-auto p-1.5 text-slate-500 hover:text-red-400 transition-colors"
              aria-label="Remove slot"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))
      )}
    </div>
  );
}
