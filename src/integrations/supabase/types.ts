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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      attendance: {
        Row: {
          business_id: string | null
          check_in: string
          check_out: string | null
          created_at: string
          id: string
          note: string | null
          source: string
          status: string
          user_id: string
        }
        Insert: {
          business_id?: string | null
          check_in?: string
          check_out?: string | null
          created_at?: string
          id?: string
          note?: string | null
          source?: string
          status?: string
          user_id: string
        }
        Update: {
          business_id?: string | null
          check_in?: string
          check_out?: string | null
          created_at?: string
          id?: string
          note?: string | null
          source?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_numbers: {
        Row: {
          blocked_by: string
          country_code: string
          created_at: string
          id: string
          mobile_number: string
          reason: string | null
        }
        Insert: {
          blocked_by: string
          country_code?: string
          created_at?: string
          id?: string
          mobile_number: string
          reason?: string | null
        }
        Update: {
          blocked_by?: string
          country_code?: string
          created_at?: string
          id?: string
          mobile_number?: string
          reason?: string | null
        }
        Relationships: []
      }
      broadcast_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          sender_id: string
          target_role: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          sender_id: string
          target_role?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          sender_id?: string
          target_role?: string | null
        }
        Relationships: []
      }
      businesses: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          slug: string
          theme_color: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          slug: string
          theme_color?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          slug?: string
          theme_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          amount: number
          business_id: string | null
          collection_date: string
          created_at: string
          description: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          business_id?: string | null
          collection_date?: string
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          business_id?: string | null
          collection_date?: string
          created_at?: string
          description?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          blocked_by: string | null
          created_at: string
          id: string
          is_blocked: boolean
          user1_id: string
          user2_id: string
        }
        Insert: {
          blocked_by?: string | null
          created_at?: string
          id?: string
          is_blocked?: boolean
          user1_id: string
          user2_id: string
        }
        Update: {
          blocked_by?: string | null
          created_at?: string
          id?: string
          is_blocked?: boolean
          user1_id?: string
          user2_id?: string
        }
        Relationships: []
      }
      government_holidays: {
        Row: {
          created_at: string
          holiday_date: string
          id: string
          name: string
          year: number
        }
        Insert: {
          created_at?: string
          holiday_date: string
          id?: string
          name: string
          year: number
        }
        Update: {
          created_at?: string
          holiday_date?: string
          id?: string
          name?: string
          year?: number
        }
        Relationships: []
      }
      login_notifications: {
        Row: {
          created_at: string
          created_by: string | null
          display_duration_seconds: number
          id: string
          is_read: boolean
          message: string
          target_user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_duration_seconds?: number
          id?: string
          is_read?: boolean
          message: string
          target_user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_duration_seconds?: number
          id?: string
          is_read?: boolean
          message?: string
          target_user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string | null
          created_at: string
          id: string
          is_broadcast: boolean
          is_deleted_by_admin: boolean
          media_url: string | null
          message_type: string
          receiver_id: string | null
          sender_id: string
        }
        Insert: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_broadcast?: boolean
          is_deleted_by_admin?: boolean
          media_url?: string | null
          message_type?: string
          receiver_id?: string | null
          sender_id: string
        }
        Update: {
          content?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          is_broadcast?: boolean
          is_deleted_by_admin?: boolean
          media_url?: string | null
          message_type?: string
          receiver_id?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          reference_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          reference_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          reference_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_used: boolean
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_used?: boolean
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_used?: boolean
          user_id?: string
        }
        Relationships: []
      }
      payroll_settings: {
        Row: {
          created_at: string
          default_overtime_rate: number
          id: string
          late_days_for_penalty: number
          late_threshold_minutes: number
          office_end_time: string
          office_name: string
          office_start_time: string
          penalty_days_deducted: number
          updated_at: string
          weekly_off_day: string
        }
        Insert: {
          created_at?: string
          default_overtime_rate?: number
          id?: string
          late_days_for_penalty?: number
          late_threshold_minutes?: number
          office_end_time?: string
          office_name?: string
          office_start_time?: string
          penalty_days_deducted?: number
          updated_at?: string
          weekly_off_day?: string
        }
        Update: {
          created_at?: string
          default_overtime_rate?: number
          id?: string
          late_days_for_penalty?: number
          late_threshold_minutes?: number
          office_end_time?: string
          office_name?: string
          office_start_time?: string
          penalty_days_deducted?: number
          updated_at?: string
          weekly_off_day?: string
        }
        Relationships: []
      }
      payrolls: {
        Row: {
          advance_deduction: number
          basic_salary: number
          bonus: number
          created_at: string
          created_by: string
          housing_allowance: number
          id: string
          loan_deduction: number
          medical_allowance: number
          month: string
          net_salary: number
          note: string | null
          other_allowances: number
          other_deductions: number
          overtime_hours: number
          overtime_rate: number
          paid_at: string | null
          penalty_deduction: number
          status: string
          tax_deduction: number
          transport_allowance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          advance_deduction?: number
          basic_salary?: number
          bonus?: number
          created_at?: string
          created_by: string
          housing_allowance?: number
          id?: string
          loan_deduction?: number
          medical_allowance?: number
          month: string
          net_salary?: number
          note?: string | null
          other_allowances?: number
          other_deductions?: number
          overtime_hours?: number
          overtime_rate?: number
          paid_at?: string | null
          penalty_deduction?: number
          status?: string
          tax_deduction?: number
          transport_allowance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          advance_deduction?: number
          basic_salary?: number
          bonus?: number
          created_at?: string
          created_by?: string
          housing_allowance?: number
          id?: string
          loan_deduction?: number
          medical_allowance?: number
          month?: string
          net_salary?: number
          note?: string | null
          other_allowances?: number
          other_deductions?: number
          overtime_hours?: number
          overtime_rate?: number
          paid_at?: string | null
          penalty_deduction?: number
          status?: string
          tax_deduction?: number
          transport_allowance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          basic_salary: number
          business_id: string | null
          country_code: string
          created_at: string
          employee_id: string | null
          full_name: string
          id: string
          is_active: boolean
          mobile_number: string
          overtime_rate_per_hour: number
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          basic_salary?: number
          business_id?: string | null
          country_code?: string
          created_at?: string
          employee_id?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          mobile_number: string
          overtime_rate_per_hour?: number
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          basic_salary?: number
          business_id?: string | null
          country_code?: string
          created_at?: string
          employee_id?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          mobile_number?: string
          overtime_rate_per_hour?: number
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      task_reports: {
        Row: {
          admin_feedback: string | null
          created_at: string
          id: string
          image_urls: string[] | null
          pdf_url: string | null
          report_content: string
          report_number: number
          status: string
          submitted_by: string
          task_id: string
          updated_at: string
        }
        Insert: {
          admin_feedback?: string | null
          created_at?: string
          id?: string
          image_urls?: string[] | null
          pdf_url?: string | null
          report_content: string
          report_number?: number
          status?: string
          submitted_by: string
          task_id: string
          updated_at?: string
        }
        Update: {
          admin_feedback?: string | null
          created_at?: string
          id?: string
          image_urls?: string[] | null
          pdf_url?: string | null
          report_content?: string
          report_number?: number
          status?: string
          submitted_by?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_reports_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          admin_note: string | null
          assigned_by: string
          assigned_to: string
          business_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          label: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          assigned_by: string
          assigned_to: string
          business_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          label?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          assigned_by?: string
          assigned_to?: string
          business_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          label?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      team_chat_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          team_chat_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          team_chat_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          team_chat_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_chat_members_team_chat_id_fkey"
            columns: ["team_chat_id"]
            isOneToOne: false
            referencedRelation: "team_chats"
            referencedColumns: ["id"]
          },
        ]
      }
      team_chats: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          team_member_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          team_member_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          team_member_id?: string
          user_id?: string
        }
        Relationships: []
      }
      team_requests: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          status: string
          to_user_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          status?: string
          to_user_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          status?: string
          to_user_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_businesses: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          business_id: string
          id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          business_id: string
          id?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          business_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_businesses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_locations: {
        Row: {
          id: string
          is_online: boolean
          last_seen_at: string
          latitude: number | null
          longitude: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          is_online?: boolean
          last_seen_at?: string
          latitude?: number | null
          longitude?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          is_online?: boolean
          last_seen_at?: string
          latitude?: number | null
          longitude?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_restrictions: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          reason: string | null
          restricted_by: string
          restriction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          restricted_by: string
          restriction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          reason?: string | null
          restricted_by?: string
          restriction_type?: string
          user_id?: string
        }
        Relationships: []
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_otp: { Args: { _user_id: string }; Returns: string }
      get_user_business_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_user_active: { Args: { _user_id: string }; Returns: boolean }
      verify_otp: {
        Args: { _code: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "admin"
        | "manager"
        | "member"
        | "co_worker"
        | "co_worker_data_entry"
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
      app_role: [
        "super_admin",
        "admin",
        "manager",
        "member",
        "co_worker",
        "co_worker_data_entry",
      ],
    },
  },
} as const
