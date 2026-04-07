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
      appointments: {
        Row: {
          client_id: string
          created_at: string
          duration_minutes: number
          id: string
          notes: string | null
          payment_status: string
          price: number
          recurring_rule_id: string | null
          scheduled_at: string
          service_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          payment_status?: string
          price?: number
          recurring_rule_id?: string | null
          scheduled_at: string
          service_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          duration_minutes?: number
          id?: string
          notes?: string | null
          payment_status?: string
          price?: number
          recurring_rule_id?: string | null
          scheduled_at?: string
          service_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      breakeven_goals: {
        Row: {
          buffer: number
          created_at: string
          description: string | null
          desired_income: number
          fixed_expenses: number
          goal_number: number
          id: string
          label: string
          updated_at: string
          user_id: string
        }
        Insert: {
          buffer?: number
          created_at?: string
          description?: string | null
          desired_income?: number
          fixed_expenses?: number
          goal_number?: number
          id?: string
          label?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          buffer?: number
          created_at?: string
          description?: string | null
          desired_income?: number
          fixed_expenses?: number
          goal_number?: number
          id?: string
          label?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      client_attachments: {
        Row: {
          appointment_id: string | null
          client_id: string
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          file_type: string
          id: string
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number
          file_type?: string
          id?: string
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          file_type?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_attachments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_attachments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_notes: {
        Row: {
          appointment_id: string | null
          client_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_notes_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          telegram: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          telegram?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          telegram?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      days_off: {
        Row: {
          created_at: string
          custom_end_time: string | null
          custom_start_time: string | null
          date: string
          id: string
          is_non_working: boolean
          label: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_end_time?: string | null
          custom_start_time?: string | null
          date: string
          id?: string
          is_non_working?: boolean
          label?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_end_time?: string | null
          custom_start_time?: string | null
          date?: string
          id?: string
          is_non_working?: boolean
          label?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      expected_payments: {
        Row: {
          amount: number
          appointment_id: string
          client_id: string
          created_at: string
          id: string
          paid_at: string | null
          payment_method: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          appointment_id: string
          client_id: string
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          appointment_id?: string
          client_id?: string
          created_at?: string
          id?: string
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expected_payments_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expected_payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          description: string | null
          id: string
          is_recurring: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          is_recurring?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          is_recurring?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      income: {
        Row: {
          amount: number
          appointment_id: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          payment_method: string
          source: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          appointment_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          payment_method?: string
          source?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          appointment_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          payment_method?: string
          source?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          business_name: string | null
          created_at: string
          default_duration: number
          full_name: string | null
          id: string
          language: string
          onboarding_completed: boolean
          phone: string | null
          reminder_minutes: number
          sessions_per_day: number
          time_format: string
          updated_at: string
          user_id: string
          work_hours_end: string
          work_hours_start: string
          working_days_per_week: number
        }
        Insert: {
          business_name?: string | null
          created_at?: string
          default_duration?: number
          full_name?: string | null
          id?: string
          language?: string
          onboarding_completed?: boolean
          phone?: string | null
          reminder_minutes?: number
          sessions_per_day?: number
          time_format?: string
          updated_at?: string
          user_id: string
          work_hours_end?: string
          work_hours_start?: string
          working_days_per_week?: number
        }
        Update: {
          business_name?: string | null
          created_at?: string
          default_duration?: number
          full_name?: string | null
          id?: string
          language?: string
          onboarding_completed?: boolean
          phone?: string | null
          reminder_minutes?: number
          sessions_per_day?: number
          time_format?: string
          updated_at?: string
          user_id?: string
          work_hours_end?: string
          work_hours_start?: string
          working_days_per_week?: number
        }
        Relationships: []
      }
      recurring_rules: {
        Row: {
          client_id: string
          created_at: string
          days_of_week: number[]
          duration_minutes: number
          end_date: string | null
          id: string
          interval_weeks: number
          notes: string | null
          price: number
          recurrence_type: string
          service_id: string
          start_date: string
          time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          days_of_week?: number[]
          duration_minutes?: number
          end_date?: string | null
          id?: string
          interval_weeks?: number
          notes?: string | null
          price?: number
          recurrence_type?: string
          service_id: string
          start_date: string
          time?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          days_of_week?: number[]
          duration_minutes?: number
          end_date?: string | null
          id?: string
          interval_weeks?: number
          notes?: string | null
          price?: number
          recurrence_type?: string
          service_id?: string
          start_date?: string
          time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          duration_minutes: number
          id: string
          name: string
          price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number
          id?: string
          name: string
          price?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number
          id?: string
          name?: string
          price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tax_settings: {
        Row: {
          calculate_on: string
          created_at: string
          fixed_amount: number
          frequency: string
          id: string
          is_active: boolean
          tax_name: string
          tax_rate: number
          tax_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          calculate_on?: string
          created_at?: string
          fixed_amount?: number
          frequency?: string
          id?: string
          is_active?: boolean
          tax_name?: string
          tax_rate?: number
          tax_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          calculate_on?: string
          created_at?: string
          fixed_amount?: number
          frequency?: string
          id?: string
          is_active?: boolean
          tax_name?: string
          tax_rate?: number
          tax_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      working_schedule: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_working: boolean
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time?: string
          id?: string
          is_working?: boolean
          start_time?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_working?: boolean
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
