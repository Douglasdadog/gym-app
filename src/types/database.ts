export type MembershipTier = "None" | "Basic" | "Elite" | "VIP";
export type LocationType = "Gym" | "Home";
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export type UserRole = "user" | "admin";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  username?: string | null;
  phone_number?: string | null;
  membership_tier: MembershipTier;
  role?: UserRole;
  current_weight: number | null;
  goal_weight: number | null;
  created_at: string;
  updated_at: string;
}

export interface GymStatus {
  id: string;
  current_occupancy: number;
  max_capacity: number;
  last_updated: string;
}

export interface Membership {
  id: string;
  user_id: string;
  type: MembershipTier;
  price: number;
  perks: string[];
  status: string;
}

export interface Trainer {
  id: string;
  name: string;
  specialty: string;
  bio: string | null;
  rating: number;
  hourly_rate_gym: number;
  hourly_rate_home: number;
  image_url?: string | null;
}

export interface Booking {
  id: string;
  user_id: string;
  trainer_id: string;
  date: string;
  time_slot: string;
  location_type: LocationType;
  address: string | null;
  travel_fee: number;
  status: BookingStatus;
}

export interface NutritionLog {
  id: string;
  user_id: string;
  meal_description: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  created_at: string;
}
