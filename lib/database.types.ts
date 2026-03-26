// Hand-written types matching supabase/schema.sql + migrations/001_features.sql

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          avatar_url: string | null;
          settings: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      results: {
        Row: {
          id: string;
          user_id: string | null;
          mode: string;
          time_limit: number | null;
          word_count: number | null;
          language: string;
          net_wpm: number;
          gross_wpm: number;
          accuracy: number;
          elapsed_ms: number;
          consistency: number | null;
          correct_chars: number;
          incorrect_chars: number;
          is_daily: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["results"]["Row"], "id" | "created_at" | "is_daily"> & { is_daily?: boolean };
        Update: Partial<Database["public"]["Tables"]["results"]["Insert"]>;
      };
      race_sessions: {
        Row: {
          id: string;
          room_code: string;
          started_at: string;
          ended_at: string | null;
          config: Record<string, unknown>;
        };
        Insert: Omit<Database["public"]["Tables"]["race_sessions"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["race_sessions"]["Insert"]>;
      };
      race_results: {
        Row: {
          id: string;
          session_id: string;
          user_id: string | null;
          player_name: string;
          rank: number;
          net_wpm: number;
          accuracy: number;
          finished_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["race_results"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["race_results"]["Insert"]>;
      };
      daily_challenges: {
        Row: {
          id: string;
          challenge_date: string;
          seed: string;
          config: Record<string, unknown>;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["daily_challenges"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["daily_challenges"]["Insert"]>;
      };
      daily_results: {
        Row: {
          id: string;
          challenge_date: string;
          user_id: string;
          result_id: string;
          net_wpm: number;
          accuracy: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["daily_results"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["daily_results"]["Insert"]>;
      };
      streaks: {
        Row: {
          user_id: string;
          current_streak: number;
          longest_streak: number;
          last_test_date: string | null;
          updated_at: string;
        };
        Insert: Database["public"]["Tables"]["streaks"]["Row"];
        Update: Partial<Database["public"]["Tables"]["streaks"]["Insert"]>;
      };
      achievements: {
        Row: {
          id: string;
          user_id: string;
          badge_id: string;
          earned_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["achievements"]["Row"], "id" | "earned_at">;
        Update: Partial<Database["public"]["Tables"]["achievements"]["Insert"]>;
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: "pending" | "accepted";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["friendships"]["Row"], "id" | "created_at" | "status"> & { status?: "pending" | "accepted" };
        Update: Partial<Database["public"]["Tables"]["friendships"]["Insert"]>;
      };
    };
    Views: {
      leaderboard: {
        Row: {
          id: string;
          user_id: string;
          username: string;
          avatar_url: string | null;
          mode: string;
          time_limit: number | null;
          word_count: number | null;
          language: string;
          net_wpm: number;
          accuracy: number;
          consistency: number | null;
          created_at: string;
          rank: number;
        };
      };
    };
    Functions: {
      get_leaderboard: {
        Args: { p_mode?: string | null; p_time_limit?: number | null; p_period?: string };
        Returns: {
          user_id: string;
          username: string;
          avatar_url: string | null;
          net_wpm: number;
          accuracy: number;
          mode: string;
          time_limit: number | null;
          created_at: string;
          rank: number;
        }[];
      };
      get_daily_leaderboard: {
        Args: { p_date?: string };
        Returns: {
          user_id: string;
          username: string;
          net_wpm: number;
          accuracy: number;
          rank: number;
        }[];
      };
    };
  };
};
