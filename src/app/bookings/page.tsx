"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { MapPin, Home, Dumbbell, ChevronLeft, ChevronRight, Check, CalendarPlus } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { createClient } from "@/lib/supabase/client";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isBefore, startOfDay } from "date-fns";
import type { Trainer } from "@/types/database";
import "react-day-picker/style.css";

const TIME_SLOTS = ["06:00", "07:00", "08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
const TRAVEL_FEE_PER_KM = 2.5;

const SPECIALTY_BADGES: Record<string, string> = {
  "Strength & Conditioning": "Strength King",
  "HIIT & Cardio": "HIIT Expert",
  "Bodybuilding & Hypertrophy": "Hypertrophy Pro",
  "Yoga & Mobility": "Mobility Master",
  "Functional Fitness": "Functional Pro",
  "Boxing & Combat": "Combat Specialist",
  "Weightlifting": "Weightlifting Pro",
  "Pilates & Core": "Core Expert",
  "Athletic Performance": "Performance Coach",
  "Running & Endurance": "Endurance Pro",
};
function getSpecialtyBadge(specialty: string): string {
  return SPECIALTY_BADGES[specialty] ?? specialty.split(" ")[0] ?? "Pro";
}

const FALLBACK_TRAINERS: Trainer[] = [
  { id: "1", name: "Alex Rivera", specialty: "Strength & Conditioning", bio: null, rating: 4.9, hourly_rate_gym: 75, hourly_rate_home: 120, image_url: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=400&fit=crop" },
  { id: "2", name: "Sarah Chen", specialty: "HIIT & Cardio", bio: null, rating: 4.8, hourly_rate_gym: 65, hourly_rate_home: 95, image_url: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&h=400&fit=crop" },
  { id: "3", name: "Marcus Johnson", specialty: "Bodybuilding & Hypertrophy", bio: null, rating: 5.0, hourly_rate_gym: 100, hourly_rate_home: 150, image_url: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&h=400&fit=crop" },
  { id: "4", name: "Elena Vasquez", specialty: "Yoga & Mobility", bio: null, rating: 4.7, hourly_rate_gym: 55, hourly_rate_home: 85, image_url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop" },
  { id: "5", name: "David Park", specialty: "Functional Fitness", bio: null, rating: 4.6, hourly_rate_gym: 70, hourly_rate_home: 110, image_url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop" },
  { id: "6", name: "Maya Thompson", specialty: "Boxing & Combat", bio: null, rating: 4.8, hourly_rate_gym: 80, hourly_rate_home: 125, image_url: "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=400&h=400&fit=crop" },
  { id: "7", name: "James Wilson", specialty: "Weightlifting", bio: null, rating: 4.9, hourly_rate_gym: 85, hourly_rate_home: 130, image_url: "https://images.unsplash.com/photo-1581009146145-b5ef050c149e?w=400&h=400&fit=crop" },
  { id: "8", name: "Nina Rodriguez", specialty: "Pilates & Core", bio: null, rating: 4.7, hourly_rate_gym: 60, hourly_rate_home: 90, image_url: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400&h=400&fit=crop" },
  { id: "9", name: "Chris Okonkwo", specialty: "Athletic Performance", bio: null, rating: 4.9, hourly_rate_gym: 90, hourly_rate_home: 140, image_url: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?w=400&h=400&fit=crop" },
  { id: "10", name: "Lily Zhang", specialty: "Running & Endurance", bio: null, rating: 4.6, hourly_rate_gym: 55, hourly_rate_home: 80, image_url: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=400&fit=crop" },
];

export default function BookingsPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [selectedTrainer, setSelectedTrainer] = useState<Trainer | null>(null);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [locationType, setLocationType] = useState<"Gym" | "Home">("Gym");
  const [address, setAddress] = useState("");
  const [travelFee, setTravelFee] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<Record<string, Set<string>>>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastBooking, setLastBooking] = useState<{ trainer: string; date: string; dateStr: string; time: string; location: string } | null>(null);
  const [bookingError, setBookingError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth?redirect=/bookings");
        return;
      }
      setAuthChecked(true);
    };
    check();
  }, [supabase, router]);

  useEffect(() => {
    const payment = searchParams.get("payment");
    const dateStr = searchParams.get("date");
    const time = searchParams.get("time");
    const trainer = searchParams.get("trainer");
    if (payment === "success" && dateStr && time) {
      const dateDisplay = dateStr.length === 10 ? format(new Date(dateStr + "T12:00:00"), "EEE, MMM d, yyyy") : dateStr;
      setLastBooking({
        trainer: trainer || "Your trainer",
        date: dateDisplay,
        dateStr,
        time,
        location: "Gym",
      });
      setShowSuccessModal(true);
      window.history.replaceState({}, "", "/bookings");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authChecked) return;
    const fetch = async () => {
      const { data } = await supabase.from("trainers").select("*").order("rating", { ascending: false });
      const fromDb = (data as Trainer[]) ?? [];
      setTrainers(fromDb.length > 0 ? fromDb : FALLBACK_TRAINERS);
    };
    fetch();
  }, [supabase, authChecked]);

  // Fetch availability for selected trainer in current month
  useEffect(() => {
    if (!selectedTrainer) {
      setBookedSlots({});
      return;
    }
    const fetchBooked = async () => {
      const start = startOfMonth(currentMonth);
      const end = endOfMonth(currentMonth);
      const { data } = await supabase
        .from("bookings")
        .select("date, time_slot")
        .eq("trainer_id", selectedTrainer.id)
        .in("status", ["pending", "confirmed"])
        .gte("date", format(start, "yyyy-MM-dd"))
        .lte("date", format(end, "yyyy-MM-dd"));

      const map: Record<string, Set<string>> = {};
      (data ?? []).forEach((b: { date: string; time_slot: string }) => {
        if (!map[b.date]) map[b.date] = new Set();
        map[b.date].add(b.time_slot);
      });
      setBookedSlots(map);
    };
    fetchBooked();
  }, [supabase, selectedTrainer, currentMonth]);

  const today = startOfDay(new Date());
  const fullyBookedDays = useMemo(() => {
    const set = new Set<string>();
    Object.entries(bookedSlots).forEach(([date, slots]) => {
      if (slots.size >= TIME_SLOTS.length) set.add(date);
    });
    return set;
  }, [bookedSlots]);

  const disabledDays = useMemo(() => {
    return (date: Date) =>
      isBefore(date, today) || fullyBookedDays.has(format(date, "yyyy-MM-dd"));
  }, [fullyBookedDays]);

  const availableSlots = useMemo(() => {
    if (!selectedDate) return TIME_SLOTS;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const booked = bookedSlots[dateStr] ?? new Set();
    return TIME_SLOTS.filter((s) => !booked.has(s));
  }, [selectedDate, bookedSlots]);

  const handleAddressChange = (val: string) => {
    setAddress(val);
    if (locationType === "Home" && val) {
      const km = Math.min(30, Math.ceil(val.length / 10));
      setTravelFee(km * TRAVEL_FEE_PER_KM);
    } else {
      setTravelFee(0);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTrainer || !selectedDate || !selectedSlot) return;
    if (locationType === "Home" && !address.trim()) return;

    setSubmitting(true);
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    try {
      const res = await fetch("/api/payment/create-booking-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          trainer_id: selectedTrainer.id,
          date: dateStr,
          time_slot: selectedSlot,
          location_type: locationType,
          address: locationType === "Home" ? address : null,
          travel_fee: travelFee,
        }),
      });
      const data = await res.json();

      if (res.status === 503 && data.error?.includes("not configured")) {
        setBookingError("Payment is required to confirm bookings. Please set up PayMongo in the dashboard.");
        setSubmitting(false);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Could not start payment");
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
      throw new Error("No checkout URL");
    } catch (err) {
      console.error(err);
      setBookingError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  };

  const getGoogleCalendarUrl = () => {
    if (!lastBooking) return "#";
    const dateStr = lastBooking.dateStr.replace(/-/g, "");
    const [h, m] = lastBooking.time.split(":").map(Number);
    const start = `${dateStr}T${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
    const endH = h + 1;
    const end = `${dateStr}T${String(endH).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
    const title = `PT Session with ${lastBooking.trainer}`;
    const details = `Personal training at ${lastBooking.location}`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${start}/${end}&details=${encodeURIComponent(details)}&ctz=Asia%2FManila`;
  };

  const rate = selectedTrainer
    ? locationType === "Gym"
      ? selectedTrainer.hourly_rate_gym
      : selectedTrainer.hourly_rate_home + travelFee
    : 0;

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="animate-pulse text-accent-cyan">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#000000]">
      <header className="border-b border-white/10 sticky top-0 z-50 backdrop-blur-xl bg-black/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Dumbbell className="w-8 h-8 text-accent-lime" />
            <span className="font-bold text-xl tracking-tight">CYBER-GYM</span>
          </Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/dashboard" className="text-white/60 hover:text-white">Dashboard</Link>
            <Link href="/bookings" className="text-accent-lime font-medium">Bookings</Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/");
                router.refresh();
              }}
              className="text-white/60 hover:text-white"
            >
              Sign Out
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl sm:text-2xl font-bold mb-4"
        >
          Book Personal Trainer
        </motion.h1>

        <div className="grid lg:grid-cols-[2fr_3fr] gap-4 items-start">
          {/* Left Pane (40%) - Trainer Selection */}
          <div className="backdrop-blur-xl bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col">
            <h2 className="text-xs uppercase tracking-wider text-accent-cyan/90 font-semibold mb-3">
              Trainer Selection
            </h2>
            <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1 trainer-scroll">
              {trainers.map((t) => (
                <motion.button
                  key={t.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedTrainer(t)}
                  className={`relative w-full rounded-lg p-2.5 text-left transition-all flex gap-2.5 items-center overflow-hidden ${
                    selectedTrainer?.id === t.id
                      ? "border-2 border-[#CCFF00] bg-accent-lime/5 shadow-[0_0_15px_rgba(204,255,0,0.3)]"
                      : "border border-white/10 bg-white/5 hover:bg-white/[0.07]"
                  }`}
                >
                  {selectedTrainer?.id === t.id && (
                    <div className="absolute inset-0 trainer-mesh-gradient opacity-40 pointer-events-none" />
                  )}
                  <div className="relative shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-white/5 ring-1 ring-white/10">
                    {t.image_url ? (
                      <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/30 text-lg font-bold">
                        {t.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="relative flex-1 min-w-0">
                    <span className="inline-block px-1 py-0.5 rounded text-[9px] font-medium bg-accent-cyan/20 text-accent-cyan">
                      {getSpecialtyBadge(t.specialty)}
                    </span>
                    <p className="font-semibold text-xs">{t.name}</p>
                    <p className="text-[11px] text-white/60 truncate">{t.specialty}</p>
                    <p className="text-xs text-accent-lime mt-0.5">★ {t.rating}</p>
                  </div>
                  <div className="relative text-right text-xs shrink-0">
                    <p>₱{t.hourly_rate_gym}</p>
                    <p className="text-white/50">₱{t.hourly_rate_home}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Right Pane (60%) - Scheduling Engine */}
          <div className="backdrop-blur-xl bg-white/5 rounded-xl p-4 border border-white/10 flex flex-col">
            <h2 className="text-xs uppercase tracking-wider text-accent-cyan/90 font-semibold mb-3">
              Scheduling Engine
            </h2>

            <div className="flex flex-col gap-4">
              {/* Month header - compact inline */}
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="text-base font-semibold min-w-[120px] text-center">
                  {format(currentMonth, "MMMM yyyy")}
                </h3>
                <button
                  onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Full Month Calendar - centered 7-column grid, compact */}
              <div className="flex justify-center -my-1">
                <div className="[&_.rdp]:m-0 [&_.rdp-months]:flex [&_.rdp-month]:w-full [&_.rdp-month_grid]:grid [&_.rdp-month_grid]:grid-cols-7 [&_.rdp-weekday]:text-[10px] [&_.rdp-weekday]:text-white/50 [&_.rdp-weekday]:py-0.5 [&_.rdp-day]:text-xs [&_.rdp-day_button]:w-7 [&_.rdp-day_button]:h-7 [&_.rdp-day_button]:text-xs [&_.rdp-day_button]:rounded-full [&_.rdp-day_button]:transition-colors [&_.rdp-day_button:hover]:bg-white/10 [&_.rdp-selected_.rdp-day_button]:!bg-[#CCFF00] [&_.rdp-selected_.rdp-day_button]:!text-black [&_.rdp-selected_.rdp-day_button]:font-semibold [&_.rdp-disabled]:opacity-30 [&_.rdp-disabled]:grayscale [&_.rdp-disabled]:cursor-not-allowed [&_.rdp-outside]:text-white/30">
                  <DayPicker
                    mode="single"
                    month={currentMonth}
                    onMonthChange={setCurrentMonth}
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={disabledDays}
                    showOutsideDays
                    hideNavigation
                  />
                </div>
              </div>

              {/* Empty state or Time Grid - bordered area */}
              {!selectedDate ? (
                <p className="text-center text-xs text-white/40 py-4 font-light italic">
                  {selectedTrainer
                    ? `Select a date to see ${selectedTrainer.name}'s availability.`
                    : "Select a trainer, then a date to view availability."}
                </p>
              ) : (
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
                  >
                    <h3 className="text-xs font-medium text-white/80 mb-2">Available Time Slots</h3>
                    <div className="grid grid-cols-4 gap-1.5">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                            selectedSlot === slot
                              ? "bg-[#CCFF00] text-black"
                              : "bg-white/5 hover:bg-white/10 text-white"
                          }`}
                        >
                          {selectedSlot === slot && <Check className="w-3.5 h-3.5" />}
                          {slot}
                        </button>
                      ))}
                    </div>
                    {availableSlots.length === 0 && (
                      <p className="text-xs text-white/50 py-1">No slots available.</p>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* Location & CTA */}
            <div className="pt-4 mt-4 border-t border-white/10 space-y-3">
              <h3 className="text-xs font-medium text-white/80">Location</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setLocationType("Gym")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    locationType === "Gym"
                      ? "bg-[#CCFF00] text-black font-semibold"
                      : "bg-white/5 hover:bg-white/10 text-white/70"
                  }`}
                >
                  <Dumbbell className="w-3.5 h-3.5" /> Gym
                </button>
                <button
                  onClick={() => setLocationType("Home")}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                    locationType === "Home"
                      ? "bg-[#CCFF00] text-black font-semibold"
                      : "bg-white/5 hover:bg-white/10 text-white/70"
                  }`}
                >
                  <Home className="w-3.5 h-3.5" /> Home
                </button>
              </div>

              <AnimatePresence>
                {locationType === "Home" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <label className="flex items-center gap-1.5 text-xs text-white/70 mb-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Service Address
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      placeholder="Enter your address"
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs focus:outline-none focus:border-accent-lime/50"
                    />
                    {travelFee > 0 && (
                      <p className="text-xs text-accent-cyan mt-1">Travel fee: ₱{travelFee.toFixed(2)}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {bookingError && (
                <p className="text-red-400 text-xs mt-2">{bookingError}</p>
              )}
              {/* Dynamic Summary & CTA */}
              <div className="pt-4 space-y-3">
                {selectedTrainer && selectedDate && selectedSlot && (
                  <p className="text-xs text-white/70">
                    You are booking <span className="text-[#CCFF00] font-medium">{selectedTrainer.name}</span> at{" "}
                    <span className="text-white">{locationType}</span> for{" "}
                    <span className="text-white">{format(selectedDate, "EEE, MMM d")}</span> at{" "}
                    <span className="text-white">{selectedSlot}</span>.
                  </p>
                )}
                {selectedTrainer && selectedDate && selectedSlot && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/60">Total</span>
                    <span className="text-xl font-bold text-[#CCFF00]">₱{rate.toFixed(2)}</span>
                  </div>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={
                    !selectedTrainer ||
                    !selectedDate ||
                    !selectedSlot ||
                    submitting ||
                    (locationType === "Home" && !address.trim())
                  }
                  className="w-full py-2.5 rounded-lg bg-[#CCFF00] text-black text-sm font-semibold hover:bg-accent-lime/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {submitting ? "Redirecting to payment..." : "Pay & Confirm Booking"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccessModal && lastBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSuccessModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="backdrop-blur-xl bg-white/5 rounded-2xl p-8 max-w-md w-full border border-white/10"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-[#CCFF00]/20 flex items-center justify-center">
                  <Check className="w-6 h-6 text-[#CCFF00]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Booking Confirmed!</h3>
                  <p className="text-sm text-white/60">Your session has been scheduled.</p>
                </div>
              </div>
              <p className="text-white/80 mb-6">
                {lastBooking.trainer} · {lastBooking.date} at {lastBooking.time} ({lastBooking.location})
              </p>
              <a
                href={getGoogleCalendarUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-accent-cyan font-medium transition-colors mb-3"
              >
                <CalendarPlus className="w-5 h-5" />
                Add to Google Calendar
              </a>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-3 rounded-xl bg-[#CCFF00] text-black font-semibold hover:bg-accent-lime/90 transition-colors"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
