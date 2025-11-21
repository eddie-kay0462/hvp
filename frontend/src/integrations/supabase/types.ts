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
      bookings: {
        Row: {
          id: string
          buyer_id: string
          service_id: string
          date: string | null
          time: string | null
          status: "pending" | "accepted" | "in_progress" | "delivered" | "completed" | "cancelled"
          created_at: string | null
          payment_status: string | null
          payment_captured_at: string | null
          payment_released_at: string | null
          payment_amount: number | null
          payment_transaction_id: string | null
        }
        Insert: {
          id?: string
          buyer_id: string
          service_id: string
          date?: string | null
          time?: string | null
          status?: "pending" | "accepted" | "in_progress" | "delivered" | "completed" | "cancelled"
          created_at?: string | null
          payment_status?: string | null
          payment_captured_at?: string | null
          payment_released_at?: string | null
          payment_amount?: number | null
          payment_transaction_id?: string | null
        }
        Update: {
          id?: string
          buyer_id?: string
          service_id?: string
          date?: string | null
          time?: string | null
          status?: "pending" | "accepted" | "in_progress" | "delivered" | "completed" | "cancelled"
          created_at?: string | null
          payment_status?: string | null
          payment_captured_at?: string | null
          payment_released_at?: string | null
          payment_amount?: number | null
          payment_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          first_name: string | null
          last_name: string | null
          phone: string | null
          role: string | null
          profile_pic: string | null
          created_at: string | null
        }
        Insert: {
          id: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          role?: string | null
          profile_pic?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          role?: string | null
          profile_pic?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          needed_by: string
          status: "active" | "inactive" | "fulfilled" | "accepted"
          created_at: string | null
          updated_at: string | null
          accepted_by: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description: string
          needed_by: string
          status?: "active" | "inactive" | "fulfilled" | "accepted"
          created_at?: string | null
          updated_at?: string | null
          accepted_by?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          needed_by?: string
          status?: "active" | "inactive" | "fulfilled" | "accepted"
          created_at?: string | null
          updated_at?: string | null
          accepted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          id: string
          user_id: string | null
          title: string
          description: string
          category: string
          default_price: number | null
          default_delivery_time: string | null
          express_price: number | null
          express_delivery_time: string | null
          created_at: string | null
          updated_at: string | null
          portfolio: string | null
          is_verified: boolean | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          title: string
          description: string
          category: string
          default_price?: number | null
          default_delivery_time?: string | null
          express_price?: number | null
          express_delivery_time?: string | null
          created_at?: string | null
          updated_at?: string | null
          portfolio?: string | null
          is_verified?: boolean | null
        }
        Update: {
          id?: string
          user_id?: string | null
          title?: string
          description?: string
          category?: string
          default_price?: number | null
          default_delivery_time?: string | null
          express_price?: number | null
          express_delivery_time?: string | null
          created_at?: string | null
          updated_at?: string | null
          portfolio?: string | null
          is_verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "sellers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          id: string
          user_id: string
          title: string
          description: string
          category: string
          default_price: number | null
          default_delivery_time: string | null
          express_price: number | null
          express_delivery_time: string | null
          portfolio: string | null
          is_verified: boolean | null
          created_at: string | null
          updated_at: string | null
          is_active: boolean | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          description: string
          category: string
          default_price?: number | null
          default_delivery_time?: string | null
          express_price?: number | null
          express_delivery_time?: string | null
          portfolio?: string | null
          is_verified?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          is_active?: boolean | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          description?: string
          category?: string
          default_price?: number | null
          default_delivery_time?: string | null
          express_price?: number | null
          express_delivery_time?: string | null
          portfolio?: string | null
          is_verified?: boolean | null
          created_at?: string | null
          updated_at?: string | null
          is_active?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "services_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
