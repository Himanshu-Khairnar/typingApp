// Auto-generate this file with: npx supabase gen types typescript --project-id <ref> > lib/database.types.ts
// For now this is a hand-written version that mirrors the schema in supabase/schema.sql

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;           // uuid — matches auth.users.id
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
          user_id: string | null;   // null = anonymous (guest) result
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
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["results"]["Row"], "id" | "created_at">;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
