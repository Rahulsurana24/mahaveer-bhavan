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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      donations: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          id: string
          member_id: string | null
          notes: string | null
          payment_method: string
          payment_status: string | null
          receipt_number: string | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          id?: string
          member_id?: string | null
          notes?: string | null
          payment_method: string
          payment_status?: string | null
          receipt_number?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          member_id?: string | null
          notes?: string | null
          payment_method?: string
          payment_status?: string | null
          receipt_number?: string | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          attended: boolean | null
          event_id: string | null
          id: string
          member_id: string | null
          registered_at: string | null
          status: string | null
        }
        Insert: {
          attended?: boolean | null
          event_id?: string | null
          id?: string
          member_id?: string | null
          registered_at?: string | null
          status?: string | null
        }
        Update: {
          attended?: boolean | null
          event_id?: string | null
          id?: string
          member_id?: string | null
          registered_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          capacity: number | null
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          fees: number | null
          id: string
          image_url: string | null
          is_published: boolean | null
          location: string
          time: string
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          capacity?: number | null
          created_at?: string | null
          created_by?: string | null
          date: string
          description?: string | null
          fees?: number | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          location: string
          time: string
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          capacity?: number | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          fees?: number | null
          id?: string
          image_url?: string | null
          is_published?: boolean | null
          location?: string
          time?: string
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      gallery_items: {
        Row: {
          created_at: string | null
          description: string | null
          event_id: string | null
          id: string
          is_public: boolean | null
          media_type: string
          media_url: string
          title: string
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          is_public?: boolean | null
          media_type: string
          media_url: string
          title: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_id?: string | null
          id?: string
          is_public?: boolean | null
          media_type?: string
          media_url?: string
          title?: string
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gallery_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          address: string
          auth_id: string | null
          city: string | null
          country: string | null
          created_at: string | null
          date_of_birth: string
          email: string
          emergency_contact: Json
          first_name: string | null
          full_name: string
          gender: string | null
          id: string
          last_name: string | null
          membership_type: string
          middle_name: string | null
          phone: string
          photo_url: string
          postal_code: string | null
          qr_code: string | null
          state: string | null
          status: string | null
          street_address: string | null
          updated_at: string | null
        }
        Insert: {
          address: string
          auth_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth: string
          email: string
          emergency_contact: Json
          first_name?: string | null
          full_name: string
          gender?: string | null
          id: string
          last_name?: string | null
          membership_type: string
          middle_name?: string | null
          phone: string
          photo_url: string
          postal_code?: string | null
          qr_code?: string | null
          state?: string | null
          status?: string | null
          street_address?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string
          auth_id?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          date_of_birth?: string
          email?: string
          emergency_contact?: Json
          first_name?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          last_name?: string | null
          membership_type?: string
          middle_name?: string | null
          phone?: string
          photo_url?: string
          postal_code?: string | null
          qr_code?: string | null
          state?: string | null
          status?: string | null
          street_address?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          receiver_id: string | null
          sender_id: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id?: string | null
          sender_id?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          receiver_id?: string | null
          sender_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          member_id: string | null
          metadata: Json | null
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          member_id?: string | null
          metadata?: Json | null
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          member_id?: string | null
          metadata?: Json | null
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_assignments: {
        Row: {
          additional_notes: string | null
          bus_seat_number: string | null
          created_at: string | null
          flight_ticket_number: string | null
          id: string
          member_id: string | null
          pnr_number: string | null
          room_number: string | null
          train_seat_number: string | null
          trip_id: string | null
          updated_at: string | null
        }
        Insert: {
          additional_notes?: string | null
          bus_seat_number?: string | null
          created_at?: string | null
          flight_ticket_number?: string | null
          id?: string
          member_id?: string | null
          pnr_number?: string | null
          room_number?: string | null
          train_seat_number?: string | null
          trip_id?: string | null
          updated_at?: string | null
        }
        Update: {
          additional_notes?: string | null
          bus_seat_number?: string | null
          created_at?: string | null
          flight_ticket_number?: string | null
          id?: string
          member_id?: string | null
          pnr_number?: string | null
          room_number?: string | null
          train_seat_number?: string | null
          trip_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_assignments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_assignments_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_attendance: {
        Row: {
          attended: boolean | null
          created_at: string | null
          id: string
          marked_at: string | null
          marked_by: string | null
          member_id: string | null
          notes: string | null
          trip_id: string | null
        }
        Insert: {
          attended?: boolean | null
          created_at?: string | null
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          member_id?: string | null
          notes?: string | null
          trip_id?: string | null
        }
        Update: {
          attended?: boolean | null
          created_at?: string | null
          id?: string
          marked_at?: string | null
          marked_by?: string | null
          member_id?: string | null
          notes?: string | null
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_attendance_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_documents: {
        Row: {
          created_at: string | null
          description: string | null
          file_type: string | null
          file_url: string
          id: string
          title: string
          trip_id: string | null
          updated_at: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          title: string
          trip_id?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          title?: string
          trip_id?: string | null
          updated_at?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_documents_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trip_registrations: {
        Row: {
          id: string
          member_id: string | null
          payment_status: string | null
          registered_at: string | null
          status: string | null
          trip_id: string | null
        }
        Insert: {
          id?: string
          member_id?: string | null
          payment_status?: string | null
          registered_at?: string | null
          status?: string | null
          trip_id?: string | null
        }
        Update: {
          id?: string
          member_id?: string | null
          payment_status?: string | null
          registered_at?: string | null
          status?: string | null
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trip_registrations_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trip_registrations_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          capacity: number
          created_at: string | null
          departure_time: string
          description: string | null
          destination: string
          end_date: string
          exclusions: string[] | null
          id: string
          image_url: string | null
          inclusions: string[] | null
          itinerary: Json | null
          price: number
          registration_deadline: string | null
          registration_fee: number | null
          return_time: string
          start_date: string
          status: string | null
          target_audience: string[] | null
          title: string
          transport_type: string
          updated_at: string | null
        }
        Insert: {
          capacity: number
          created_at?: string | null
          departure_time: string
          description?: string | null
          destination: string
          end_date: string
          exclusions?: string[] | null
          id?: string
          image_url?: string | null
          inclusions?: string[] | null
          itinerary?: Json | null
          price: number
          registration_deadline?: string | null
          registration_fee?: number | null
          return_time: string
          start_date: string
          status?: string | null
          target_audience?: string[] | null
          title: string
          transport_type: string
          updated_at?: string | null
        }
        Update: {
          capacity?: number
          created_at?: string | null
          departure_time?: string
          description?: string | null
          destination?: string
          end_date?: string
          exclusions?: string[] | null
          id?: string
          image_url?: string | null
          inclusions?: string[] | null
          itinerary?: Json | null
          price?: number
          registration_deadline?: string | null
          registration_fee?: number | null
          return_time?: string
          start_date?: string
          status?: string | null
          target_audience?: string[] | null
          title?: string
          transport_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          auth_id: string | null
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          last_login: string | null
          login_count: number | null
          needs_password_change: boolean | null
          role_id: string | null
          updated_at: string | null
        }
        Insert: {
          auth_id?: string | null
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          login_count?: number | null
          needs_password_change?: boolean | null
          role_id?: string | null
          updated_at?: string | null
        }
        Update: {
          auth_id?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          login_count?: number | null
          needs_password_change?: boolean | null
          role_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "user_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          permissions: Json
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          permissions?: Json
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          permissions?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_user_permission: {
        Args: { permission_name: string; user_auth_id: string }
        Returns: boolean
      }
      create_admin_user: {
        Args: { user_email: string; user_role?: string }
        Returns: undefined
      }
      generate_member_id: {
        Args: { membership_type: string }
        Returns: string
      }
      get_user_role: {
        Args: { user_auth_id: string }
        Returns: string
      }
      is_admin_role: {
        Args: { user_auth_id: string }
        Returns: boolean
      }
      is_superadmin_role: {
        Args: { user_auth_id: string }
        Returns: boolean
      }
      setup_super_admin: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      setup_super_admins: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      setup_test_users: {
        Args: Record<PropertyKey, never>
        Returns: undefined
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
