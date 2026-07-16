export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
      };
      user_profiles: {
        Row: {
          user_id: string;
          sex: string | null;
          birth_year: number | null;
          height_cm: number | null;
          activity_level: string | null;
          goal_type: string;
          goal_rate_per_week: number | null;
          start_weight_kg: number | null;
          goal_weight_kg: number | null;
          created_at: string;
          updated_at: string;
        };
      };
      macro_targets: {
        Row: {
          id: string;
          user_id: string;
          effective_from: string;
          effective_to: string | null;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          fiber_g: number | null;
          created_at: string;
        };
      };
      foods: {
        Row: {
          id: string;
          name: string;
          brand: string | null;
          serving_label: string;
          serving_size_g: number | null;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          fiber_g: number | null;
          is_verified: boolean;
          created_at: string;
        };
      };
      daily_logs: {
        Row: {
          id: string;
          user_id: string;
          logged_on: string;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      meal_entries: {
        Row: {
          id: string;
          daily_log_id: string;
          meal_slot: string;
          logged_at: string;
          title: string | null;
          source: string;
          created_at: string;
        };
      };
      meal_entry_items: {
        Row: {
          id: string;
          meal_entry_id: string;
          food_source: string;
          food_id: string;
          quantity: number;
          unit: string;
          sort_order: number;
        };
      };
      daily_summaries: {
        Row: {
          id: string;
          user_id: string;
          logged_on: string;
          calories: number;
          protein_g: number;
          carbs_g: number;
          fat_g: number;
          fiber_g: number;
          calorie_target: number | null;
          protein_target_g: number | null;
          carb_target_g: number | null;
          fat_target_g: number | null;
          adherence_score: number | null;
          computed_at: string;
        };
      };
      weights: {
        Row: {
          id: string;
          user_id: string;
          logged_on: string;
          weight_kg: number;
          source: string;
          note: string | null;
          created_at: string;
        };
      };
    };
  };
};
