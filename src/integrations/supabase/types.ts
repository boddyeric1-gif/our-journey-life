export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_events: {
        Row: {
          couple_id: string | null
          created_at: string
          event: string
          id: string
          props: Json
          user_id: string | null
        }
        Insert: {
          couple_id?: string | null
          created_at?: string
          event: string
          id?: string
          props?: Json
          user_id?: string | null
        }
        Update: {
          couple_id?: string | null
          created_at?: string
          event?: string
          id?: string
          props?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_events_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      atlas_notes: {
        Row: {
          body: string
          couple_id: string
          created_at: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body?: string
          couple_id: string
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string
          couple_id?: string
          created_at?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "atlas_notes_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: true
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_entitlements: {
        Row: {
          amount_cents: number | null
          couple_id: string
          created_at: string
          currency: string | null
          granted_at: string
          id: string
          price_id: string | null
          product: string
          purchased_by: string | null
          revoke_reason: string | null
          revoked_at: string | null
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents?: number | null
          couple_id: string
          created_at?: string
          currency?: string | null
          granted_at?: string
          id?: string
          price_id?: string | null
          product: string
          purchased_by?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number | null
          couple_id?: string
          created_at?: string
          currency?: string | null
          granted_at?: string
          id?: string
          price_id?: string | null
          product?: string
          purchased_by?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_entitlements_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_goals: {
        Row: {
          couple_id: string
          goal: string
        }
        Insert: {
          couple_id: string
          goal: string
        }
        Update: {
          couple_id?: string
          goal?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_goals_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_members: {
        Row: {
          couple_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          couple_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          couple_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_members_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_streaks: {
        Row: {
          couple_id: string
          current_streak: number
          last_both_active_date: string | null
          longest_streak: number
        }
        Insert: {
          couple_id: string
          current_streak?: number
          last_both_active_date?: string | null
          longest_streak?: number
        }
        Update: {
          couple_id?: string
          current_streak?: number
          last_both_active_date?: string | null
          longest_streak?: number
        }
        Relationships: [
          {
            foreignKeyName: "couple_streaks_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: true
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couples: {
        Row: {
          anniversary_date: string | null
          bond_name: string | null
          created_at: string
          id: string
          paired_at: string | null
          status: Database["public"]["Enums"]["couple_status"]
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
        }
        Insert: {
          anniversary_date?: string | null
          bond_name?: string | null
          created_at?: string
          id?: string
          paired_at?: string | null
          status?: Database["public"]["Enums"]["couple_status"]
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
        }
        Update: {
          anniversary_date?: string | null
          bond_name?: string | null
          created_at?: string
          id?: string
          paired_at?: string | null
          status?: Database["public"]["Enums"]["couple_status"]
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
        }
        Relationships: []
      }
      daily_prompts: {
        Row: {
          body: string
          id: string
          position: number
          theme: string | null
        }
        Insert: {
          body: string
          id?: string
          position: number
          theme?: string | null
        }
        Update: {
          body?: string
          id?: string
          position?: number
          theme?: string | null
        }
        Relationships: []
      }
      daily_responses: {
        Row: {
          body: string
          couple_id: string
          created_at: string
          id: string
          prompt_date: string
          prompt_id: string
          user_id: string
        }
        Insert: {
          body: string
          couple_id: string
          created_at?: string
          id?: string
          prompt_date: string
          prompt_id: string
          user_id: string
        }
        Update: {
          body?: string
          couple_id?: string
          created_at?: string
          id?: string
          prompt_date?: string
          prompt_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_responses_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_responses_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "daily_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      insights: {
        Row: {
          body: string
          id: string
          position: number
          read_minutes: number
          slug: string
          subtitle: string | null
          tags: string[]
          title: string
        }
        Insert: {
          body: string
          id?: string
          position: number
          read_minutes?: number
          slug: string
          subtitle?: string | null
          tags?: string[]
          title: string
        }
        Update: {
          body?: string
          id?: string
          position?: number
          read_minutes?: number
          slug?: string
          subtitle?: string | null
          tags?: string[]
          title?: string
        }
        Relationships: []
      }
      invites: {
        Row: {
          code: string
          couple_id: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          code: string
          couple_id: string
          created_at?: string
          created_by: string
          expires_at?: string
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          code?: string
          couple_id?: string
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invites_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      letters: {
        Row: {
          author_id: string
          body: string
          couple_id: string
          created_at: string
          id: string
          is_first_letter: boolean
          seen_at: string | null
        }
        Insert: {
          author_id: string
          body: string
          couple_id: string
          created_at?: string
          id?: string
          is_first_letter?: boolean
          seen_at?: string | null
        }
        Update: {
          author_id?: string
          body?: string
          couple_id?: string
          created_at?: string
          id?: string
          is_first_letter?: boolean
          seen_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "letters_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          anniversary: string | null
          avatar_url: string | null
          created_at: string
          current_couple_id: string | null
          display_name: string | null
          id: string
          journey_intention: string | null
          love_language: Database["public"]["Enums"]["love_language"] | null
          onboarded_at: string | null
          relationship_stage:
            | Database["public"]["Enums"]["relationship_stage"]
            | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          timezone: string
          updated_at: string
        }
        Insert: {
          anniversary?: string | null
          avatar_url?: string | null
          created_at?: string
          current_couple_id?: string | null
          display_name?: string | null
          id: string
          journey_intention?: string | null
          love_language?: Database["public"]["Enums"]["love_language"] | null
          onboarded_at?: string | null
          relationship_stage?:
            | Database["public"]["Enums"]["relationship_stage"]
            | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          timezone?: string
          updated_at?: string
        }
        Update: {
          anniversary?: string | null
          avatar_url?: string | null
          created_at?: string
          current_couple_id?: string | null
          display_name?: string | null
          id?: string
          journey_intention?: string | null
          love_language?: Database["public"]["Enums"]["love_language"] | null
          onboarded_at?: string | null
          relationship_stage?:
            | Database["public"]["Enums"]["relationship_stage"]
            | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_couple_fk"
            columns: ["current_couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_categories: {
        Row: {
          accent: string | null
          id: string
          position: number
          slug: string
          subtitle: string | null
          title: string
        }
        Insert: {
          accent?: string | null
          id?: string
          position: number
          slug: string
          subtitle?: string | null
          title: string
        }
        Update: {
          accent?: string | null
          id?: string
          position?: number
          slug?: string
          subtitle?: string | null
          title?: string
        }
        Relationships: []
      }
      quest_chapters: {
        Row: {
          category_id: string
          id: string
          position: number
          slug: string
          summary: string | null
          title: string
        }
        Insert: {
          category_id: string
          id?: string
          position: number
          slug: string
          summary?: string | null
          title: string
        }
        Update: {
          category_id?: string
          id?: string
          position?: number
          slug?: string
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_chapters_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "quest_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_step_completions: {
        Row: {
          body: string | null
          couple_id: string | null
          created_at: string
          id: string
          step_id: string
          user_id: string
        }
        Insert: {
          body?: string | null
          couple_id?: string | null
          created_at?: string
          id?: string
          step_id: string
          user_id: string
        }
        Update: {
          body?: string | null
          couple_id?: string | null
          created_at?: string
          id?: string
          step_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quest_step_completions_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quest_step_completions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "quest_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      quest_steps: {
        Row: {
          chapter_id: string
          id: string
          kind: Database["public"]["Enums"]["quest_step_kind"]
          position: number
          prompt: string
          ritual: string | null
          teaching: string
          xp_reward: number
        }
        Insert: {
          chapter_id: string
          id?: string
          kind: Database["public"]["Enums"]["quest_step_kind"]
          position: number
          prompt: string
          ritual?: string | null
          teaching: string
          xp_reward?: number
        }
        Update: {
          chapter_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["quest_step_kind"]
          position?: number
          prompt?: string
          ritual?: string | null
          teaching?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "quest_steps_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "quest_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      solo_reflections: {
        Row: {
          body: string
          created_at: string
          id: string
          parent_prompt_id: string | null
          prompt_date: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          parent_prompt_id?: string | null
          prompt_date: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          parent_prompt_id?: string | null
          prompt_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "solo_reflections_parent_prompt_id_fkey"
            columns: ["parent_prompt_id"]
            isOneToOne: false
            referencedRelation: "daily_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      time_capsules: {
        Row: {
          audio_duration_sec: number | null
          audio_path: string | null
          author_id: string
          body: string | null
          couple_id: string
          created_at: string
          id: string
          kind: string
          recipient: string
          title: string
          unlock_at: string
          unlocked_at: string | null
          updated_at: string
        }
        Insert: {
          audio_duration_sec?: number | null
          audio_path?: string | null
          author_id: string
          body?: string | null
          couple_id: string
          created_at?: string
          id?: string
          kind: string
          recipient?: string
          title: string
          unlock_at: string
          unlocked_at?: string | null
          updated_at?: string
        }
        Update: {
          audio_duration_sec?: number | null
          audio_path?: string | null
          author_id?: string
          body?: string | null
          couple_id?: string
          created_at?: string
          id?: string
          kind?: string
          recipient?: string
          title?: string
          unlock_at?: string
          unlocked_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_capsules_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          current_streak: number
          freezes_available: number
          last_active_date: string | null
          longest_streak: number
          user_id: string
        }
        Insert: {
          current_streak?: number
          freezes_available?: number
          last_active_date?: string | null
          longest_streak?: number
          user_id: string
        }
        Update: {
          current_streak?: number
          freezes_available?: number
          last_active_date?: string | null
          longest_streak?: number
          user_id?: string
        }
        Relationships: []
      }
      xp_events: {
        Row: {
          amount: number
          couple_id: string | null
          created_at: string
          dedupe_key: string | null
          id: string
          kind: Database["public"]["Enums"]["xp_kind"]
          ref_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          couple_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind: Database["public"]["Enums"]["xp_kind"]
          ref_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          couple_id?: string | null
          created_at?: string
          dedupe_key?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["xp_kind"]
          ref_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_events_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      couple_has_entitlement: {
        Args: { _couple_id: string; _product: string }
        Returns: boolean
      }
      daily_both_submitted: {
        Args: { _couple_id: string; _prompt_date: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_couple_member: { Args: { _couple_id: string }; Returns: boolean }
      shares_couple_with: { Args: { _other: string }; Returns: boolean }
      user_total_xp: { Args: { _user_id: string }; Returns: number }
    }
    Enums: {
      app_role: "admin" | "user"
      couple_status: "pending" | "active" | "archived"
      love_language: "words" | "acts" | "gifts" | "time" | "touch"
      quest_step_kind: "solo" | "couple"
      relationship_stage: "dating" | "engaged" | "married" | "long_term"
      subscription_tier: "free" | "premium"
      xp_kind:
        | "daily"
        | "solo_reflection"
        | "quest_step"
        | "first_pair"
        | "letter"
        | "insight"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      couple_status: ["pending", "active", "archived"],
      love_language: ["words", "acts", "gifts", "time", "touch"],
      quest_step_kind: ["solo", "couple"],
      relationship_stage: ["dating", "engaged", "married", "long_term"],
      subscription_tier: ["free", "premium"],
      xp_kind: [
        "daily",
        "solo_reflection",
        "quest_step",
        "first_pair",
        "letter",
        "insight",
      ],
    },
  },
} as const
