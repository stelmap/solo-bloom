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
          cancellation_reason: string | null
          client_id: string
          confirmation_status: string
          confirmation_timestamp: string | null
          created_at: string
          duration_minutes: number
          group_session_id: string | null
          id: string
          notes: string | null
          payment_status: string
          price: number
          price_override_reason: string | null
          recurring_rule_id: string | null
          scheduled_at: string
          service_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancellation_reason?: string | null
          client_id: string
          confirmation_status?: string
          confirmation_timestamp?: string | null
          created_at?: string
          duration_minutes?: number
          group_session_id?: string | null
          id?: string
          notes?: string | null
          payment_status?: string
          price?: number
          price_override_reason?: string | null
          recurring_rule_id?: string | null
          scheduled_at: string
          service_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancellation_reason?: string | null
          client_id?: string
          confirmation_status?: string
          confirmation_timestamp?: string | null
          created_at?: string
          duration_minutes?: number
          group_session_id?: string | null
          id?: string
          notes?: string | null
          payment_status?: string
          price?: number
          price_override_reason?: string | null
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
            foreignKeyName: "appointments_group_session_id_fkey"
            columns: ["group_session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
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
          goal_type: string
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
          goal_type?: string
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
          goal_type?: string
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
          included_in_supervision: boolean
          supervision_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          client_id: string
          content: string
          created_at?: string
          id?: string
          included_in_supervision?: boolean
          supervision_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          client_id?: string
          content?: string
          created_at?: string
          id?: string
          included_in_supervision?: boolean
          supervision_id?: string | null
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
          {
            foreignKeyName: "client_notes_supervision_id_fkey"
            columns: ["supervision_id"]
            isOneToOne: false
            referencedRelation: "supervisions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_price_changes: {
        Row: {
          appointment_id: string | null
          change_type: string
          client_id: string
          created_at: string
          id: string
          new_price: number
          old_price: number | null
          reason: string | null
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          change_type?: string
          client_id: string
          created_at?: string
          id?: string
          new_price: number
          old_price?: number | null
          reason?: string | null
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          change_type?: string
          client_id?: string
          created_at?: string
          id?: string
          new_price?: number
          old_price?: number | null
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          base_price: number | null
          billing_address: string | null
          billing_company_name: string | null
          billing_country: string | null
          billing_tax_id: string | null
          confirmation_required: boolean
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          notification_preference: string
          phone: string | null
          pricing_mode: string
          telegram: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          base_price?: number | null
          billing_address?: string | null
          billing_company_name?: string | null
          billing_country?: string | null
          billing_tax_id?: string | null
          confirmation_required?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          notification_preference?: string
          phone?: string | null
          pricing_mode?: string
          telegram?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          base_price?: number | null
          billing_address?: string | null
          billing_company_name?: string | null
          billing_country?: string | null
          billing_tax_id?: string | null
          confirmation_required?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          notification_preference?: string
          phone?: string | null
          pricing_mode?: string
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      entitlements: {
        Row: {
          active_from: string
          active_until: string | null
          created_at: string
          feature_code: string
          id: string
          is_active: boolean
          source_ref: string | null
          source_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_from?: string
          active_until?: string | null
          created_at?: string
          feature_code: string
          id?: string
          is_active?: boolean
          source_ref?: string | null
          source_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_from?: string
          active_until?: string | null
          created_at?: string
          feature_code?: string
          id?: string
          is_active?: boolean
          source_ref?: string | null
          source_type?: string
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
          payment_status: string
          recurring_group_id: string | null
          recurring_start_date: string | null
          tax_setting_id: string | null
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
          payment_status?: string
          recurring_group_id?: string | null
          recurring_start_date?: string | null
          tax_setting_id?: string | null
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
          payment_status?: string
          recurring_group_id?: string | null
          recurring_start_date?: string | null
          tax_setting_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_tax_setting_id_fkey"
            columns: ["tax_setting_id"]
            isOneToOne: false
            referencedRelation: "tax_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      group_attendance: {
        Row: {
          client_id: string
          created_at: string
          group_session_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          group_session_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          group_session_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_attendance_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_attendance_group_session_id_fkey"
            columns: ["group_session_id"]
            isOneToOne: false
            referencedRelation: "group_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          client_id: string
          created_at: string
          group_id: string
          id: string
          joined_at: string
          price_per_session: number | null
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          group_id: string
          id?: string
          joined_at?: string
          price_per_session?: number | null
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          group_id?: string
          id?: string
          joined_at?: string
          price_per_session?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_session_payments: {
        Row: {
          amount: number
          attendance_status: string
          billing_rule_applied: boolean
          client_id: string
          created_at: string
          expected_payment_id: string | null
          group_id: string
          group_session_id: string
          id: string
          income_id: string | null
          payment_method: string | null
          payment_state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          attendance_status: string
          billing_rule_applied?: boolean
          client_id: string
          created_at?: string
          expected_payment_id?: string | null
          group_id: string
          group_session_id: string
          id?: string
          income_id?: string | null
          payment_method?: string | null
          payment_state?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          attendance_status?: string
          billing_rule_applied?: boolean
          client_id?: string
          created_at?: string
          expected_payment_id?: string | null
          group_id?: string
          group_session_id?: string
          id?: string
          income_id?: string | null
          payment_method?: string | null
          payment_state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      group_sessions: {
        Row: {
          appointment_id: string
          created_at: string
          group_id: string
          id: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          group_id: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          group_id?: string
          id?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_sessions_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          bill_absent: boolean
          bill_present: boolean
          bill_skipped: boolean
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bill_absent?: boolean
          bill_present?: boolean
          bill_skipped?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bill_absent?: boolean
          bill_present?: boolean
          bill_skipped?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      income: {
        Row: {
          amount: number
          appointment_id: string | null
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
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
          {
            foreignKeyName: "income_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          appointment_id: string | null
          client_billing_address: string | null
          client_billing_company: string | null
          client_billing_country: string | null
          client_billing_tax_id: string | null
          client_email: string | null
          client_id: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          currency: string
          id: string
          invoice_date: string
          invoice_number: string
          language: string
          net_amount: number
          payment_note: string | null
          provider_address: string | null
          provider_business_id: string | null
          provider_email: string | null
          provider_name: string | null
          provider_phone: string | null
          service_name: string
          session_date: string
          total_amount: number
          updated_at: string
          user_id: string
          vat_amount: number
          vat_mode: string
          vat_rate: number
        }
        Insert: {
          appointment_id?: string | null
          client_billing_address?: string | null
          client_billing_company?: string | null
          client_billing_country?: string | null
          client_billing_tax_id?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_date?: string
          invoice_number: string
          language?: string
          net_amount?: number
          payment_note?: string | null
          provider_address?: string | null
          provider_business_id?: string | null
          provider_email?: string | null
          provider_name?: string | null
          provider_phone?: string | null
          service_name: string
          session_date: string
          total_amount?: number
          updated_at?: string
          user_id: string
          vat_amount?: number
          vat_mode?: string
          vat_rate?: number
        }
        Update: {
          appointment_id?: string | null
          client_billing_address?: string | null
          client_billing_company?: string | null
          client_billing_country?: string | null
          client_billing_tax_id?: string | null
          client_email?: string | null
          client_id?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          currency?: string
          id?: string
          invoice_date?: string
          invoice_number?: string
          language?: string
          net_amount?: number
          payment_note?: string | null
          provider_address?: string | null
          provider_business_id?: string | null
          provider_email?: string | null
          provider_name?: string | null
          provider_phone?: string | null
          service_name?: string
          session_date?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
          vat_amount?: number
          vat_mode?: string
          vat_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_prices: {
        Row: {
          billing_period: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          plan_id: string
          price: number
          stripe_price_id: string | null
          updated_at: string
        }
        Insert: {
          billing_period: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          plan_id: string
          price?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Update: {
          billing_period?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          plan_id?: string
          price?: number
          stripe_price_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_prices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          business_address: string | null
          business_id: string | null
          business_name: string | null
          created_at: string
          currency: string
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
          vat_mode: string
          vat_rate: number
          work_hours_end: string
          work_hours_start: string
          working_days_per_week: number
        }
        Insert: {
          business_address?: string | null
          business_id?: string | null
          business_name?: string | null
          created_at?: string
          currency?: string
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
          vat_mode?: string
          vat_rate?: number
          work_hours_end?: string
          work_hours_start?: string
          working_days_per_week?: number
        }
        Update: {
          business_address?: string | null
          business_id?: string | null
          business_name?: string | null
          created_at?: string
          currency?: string
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
          vat_mode?: string
          vat_rate?: number
          work_hours_end?: string
          work_hours_start?: string
          working_days_per_week?: number
        }
        Relationships: []
      }
      promotions: {
        Row: {
          code: string
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          starts_at: string | null
          type: string
          updated_at: string
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string | null
          type: string
          updated_at?: string
          value?: number
        }
        Update: {
          code?: string
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string | null
          type?: string
          updated_at?: string
          value?: number
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
      session_confirmations: {
        Row: {
          appointment_id: string
          confirmed_at: string | null
          created_at: string
          id: string
          token: string
        }
        Insert: {
          appointment_id: string
          confirmed_at?: string | null
          created_at?: string
          id?: string
          token?: string
        }
        Update: {
          appointment_id?: string
          confirmed_at?: string | null
          created_at?: string
          id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_confirmations_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_cache: {
        Row: {
          cancel_at_period_end: boolean
          checked_at: string
          created_at: string
          id: string
          on_trial: boolean
          price_id: string | null
          subscribed: boolean
          subscription_end: string | null
          trial_end: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          checked_at?: string
          created_at?: string
          id?: string
          on_trial?: boolean
          price_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          checked_at?: string
          created_at?: string
          id?: string
          on_trial?: boolean
          price_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          current_plan_id: string | null
          current_price_id: string | null
          id: string
          legacy_access_until: string | null
          legacy_full_access: boolean
          migrated_at: string | null
          migration_version: number | null
          status: string
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          current_plan_id?: string | null
          current_price_id?: string | null
          id?: string
          legacy_access_until?: string | null
          legacy_full_access?: boolean
          migrated_at?: string | null
          migration_version?: number | null
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          current_plan_id?: string | null
          current_price_id?: string | null
          id?: string
          legacy_access_until?: string | null
          legacy_full_access?: boolean
          migrated_at?: string | null
          migration_version?: number | null
          status?: string
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_current_plan_id_fkey"
            columns: ["current_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_current_price_id_fkey"
            columns: ["current_price_id"]
            isOneToOne: false
            referencedRelation: "plan_prices"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisions: {
        Row: {
          client_id: string
          created_at: string
          expense_id: string | null
          id: string
          imported_notes_snapshot: Json
          next_steps: string | null
          paid_amount: number
          supervision_date: string
          supervision_outcome: string | null
          supervisor_feedback: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          expense_id?: string | null
          id?: string
          imported_notes_snapshot?: Json
          next_steps?: string | null
          paid_amount?: number
          supervision_date?: string
          supervision_outcome?: string | null
          supervisor_feedback?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          expense_id?: string | null
          id?: string
          imported_notes_snapshot?: Json
          next_steps?: string | null
          paid_amount?: number
          supervision_date?: string
          supervision_outcome?: string | null
          supervisor_feedback?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervisions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supervisions_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
          start_calculation_date: string
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
          start_calculation_date?: string
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
          start_calculation_date?: string
          tax_name?: string
          tax_rate?: number
          tax_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_plan_history: {
        Row: {
          change_reason: string
          created_at: string
          effective_from: string
          id: string
          new_plan_id: string | null
          previous_entitlement_snapshot: Json | null
          previous_plan_snapshot: Json | null
          user_id: string
        }
        Insert: {
          change_reason: string
          created_at?: string
          effective_from?: string
          id?: string
          new_plan_id?: string | null
          previous_entitlement_snapshot?: Json | null
          previous_plan_snapshot?: Json | null
          user_id: string
        }
        Update: {
          change_reason?: string
          created_at?: string
          effective_from?: string
          id?: string
          new_plan_id?: string | null
          previous_entitlement_snapshot?: Json | null
          previous_plan_snapshot?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_plan_history_new_plan_id_fkey"
            columns: ["new_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
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
      check_client_revenue_consistency: {
        Args: never
        Returns: {
          client_id: string
          difference: number
          direct_total: number
          issue: string
          via_appointment_total: number
        }[]
      }
      confirm_session_by_token: {
        Args: { p_token: string }
        Returns: {
          already_confirmed: boolean
          success: boolean
        }[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_invoice_number: { Args: { p_user_id: string }; Returns: string }
      get_session_confirmation: {
        Args: { p_token: string }
        Returns: {
          appointment_id: string
          client_name: string
          confirmed_at: string
          id: string
          scheduled_at: string
          service_name: string
        }[]
      }
      migrate_all_legacy_users: { Args: never; Returns: Json }
      migrate_legacy_user: { Args: { p_user_id: string }; Returns: Json }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
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
