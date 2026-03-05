"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Loader2,
  Clock,
  User,
  Dumbbell,
  Filter,
} from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  isSameMonth,
  isToday,
  isSameDay,
} from "date-fns";

type ScheduleEvent = {
  id: string;
  date: string;
  time_slot: string;
  location_type: string;
  status: string;
  member_name: string;
  trainer_name: string;
  trainer_id: string;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AdminSchedulePage() {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [trainers, setTrainers] = useState<{ id: string; name: string }[]>([]);
  const [trainerFilter, setTrainerFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startPad = getDay(monthStart);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const calendarDays = useMemo(() => {
    const pad: (Date | null)[] = Array(startPad).fill(null);
    const rest = 42 - (pad.length + daysInMonth.length);
    return [...pad, ...daysInMonth, ...Array(rest).fill(null)];
  }, [startPad, daysInMonth]);

  useEffect(() => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, "0");
    const params = new URLSearchParams({ year: String(year), month });
    if (trainerFilter) params.set("trainer_id", trainerFilter);

    setLoading(true);
    fetch(`/api/admin/schedule?${params}`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setEvents(data.events ?? []);
        setTrainers(data.trainers ?? []);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [currentMonth, trainerFilter]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, ScheduleEvent[]> = {};
    events.forEach((e) => {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    });
    Object.keys(map).forEach((d) => map[d].sort((a, b) => a.time_slot.localeCompare(b.time_slot)));
    return map;
  }, [events]);

  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const selectedEvents = selectedDateStr ? eventsByDate[selectedDateStr] ?? [] : [];

  return (
    <div className="space-y-6">
      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl sm:text-3xl font-bold flex items-center gap-2"
      >
        <CalendarIcon className="w-8 h-8 text-accent-lime" />
        Schedule
      </motion.h1>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 backdrop-blur-xl border border-white/10"
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              className="p-2 rounded-lg hover:bg-white/10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold min-w-[180px] text-center">
              {format(currentMonth, "MMMM yyyy")}
            </h2>
            <button
              type="button"
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              className="p-2 rounded-lg hover:bg-white/10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-white/50" />
            <select
              value={trainerFilter}
              onChange={(e) => setTrainerFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-accent-lime/50"
            >
              <option value="">All trainers</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-accent-lime" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-px bg-white/10 rounded-xl overflow-hidden">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="bg-white/5 py-2 text-center text-xs font-medium text-white/60"
                >
                  {d}
                </div>
              ))}
              {calendarDays.map((day, i) => {
                const date = day as Date | null;
                const dateStr = date ? format(date, "yyyy-MM-dd") : "";
                const dayEvents = dateStr ? eventsByDate[dateStr] ?? [] : [];
                const isCurrentMonth = date ? isSameMonth(date, currentMonth) : false;
                const isSelected = date && selectedDate && isSameDay(date, selectedDate);

                return (
                  <div
                    key={i}
                    onClick={() => date && isCurrentMonth && setSelectedDate(date)}
                    className={`min-h-[100px] p-2 bg-white/5 flex flex-col ${
                      !isCurrentMonth ? "opacity-40" : "cursor-pointer hover:bg-white/10"
                    } ${isSelected ? "ring-2 ring-accent-lime rounded-lg" : ""}`}
                  >
                    {date && (
                      <span
                        className={`text-sm font-medium ${
                          isToday(date) ? "bg-accent-lime text-black w-7 h-7 rounded-full flex items-center justify-center" : ""
                        }`}
                      >
                        {format(date, "d")}
                      </span>
                    )}
                    <div className="mt-1 space-y-1 flex-1 overflow-hidden">
                      {dayEvents.slice(0, 3).map((e) => (
                        <div
                          key={e.id}
                          className="text-[10px] truncate rounded px-1 py-0.5 bg-accent-lime/20 text-accent-lime border border-accent-lime/30"
                          title={`${e.time_slot} ${e.trainer_name} – ${e.member_name}`}
                        >
                          {e.time_slot} {e.trainer_name.split(" ")[0]}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <span className="text-[10px] text-white/50">+{dayEvents.length - 3}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedDate && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {format(selectedDate, "EEEE, MMM d, yyyy")}
                </h3>
                {selectedEvents.length === 0 ? (
                  <p className="text-sm text-white/50">No bookings this day.</p>
                ) : (
                  <ul className="space-y-2">
                    {selectedEvents.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/5 border border-white/10 text-sm"
                      >
                        <span className="font-mono text-accent-cyan w-12">{e.time_slot}</span>
                        <Dumbbell className="w-4 h-4 text-white/40" />
                        <span className="text-white/90">{e.trainer_name}</span>
                        <User className="w-4 h-4 text-white/40" />
                        <span className="text-white/70">{e.member_name}</span>
                        <span className="ml-auto text-xs px-2 py-0.5 rounded bg-white/10">
                          {e.location_type}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            e.status === "confirmed"
                              ? "bg-green-500/20 text-green-400"
                              : e.status === "completed"
                                ? "bg-white/20 text-white/80"
                                : "bg-amber-500/20 text-amber-400"
                          }`}
                        >
                          {e.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
}
