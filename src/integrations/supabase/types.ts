export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      attendance: {
        Row: {
          business_id: string
          check_in: string | null
          check_out: string | null
          created_at: string
          date: string
          id: string
          notes: string | null
          status: string | null
          user_id: string
        }
        Insert: {
          business_id: string
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date: string
          id?: string
          notes?: string | null
          status?: string | null
          user_id: string
        }
        Update: {
          business_id?: string
          check_in?: string | null
          check_out?: string | null
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          business_id: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          business_id: string | null
          created_at: string
          discount_amount: number | null
          id: string
          order_id: string | null
          product_id: string | null
          product_name: string
          quantity: number
          tax_rate: number
          total_price: number
          unit_price: number
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          discount_amount?: number | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          product_name: string
          quantity: number
          tax_rate: number
          total_price: number
          unit_price: number
        }
        Update: {
          business_id?: string | null
          created_at?: string
          discount_amount?: number | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          tax_rate?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          business_id: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          discount_amount: number | null
          id: string
          notes: string | null
          order_no: number
          order_number: string
          order_status: string
          payment_method: string
          payment_status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_no?: number
          order_number: string
          order_status: string
          payment_method: string
          payment_status: string
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          id?: string
          notes?: string | null
          order_no?: number
          order_number?: string
          order_status?: string
          payment_method?: string
          payment_status?: string
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          business_id: string | null
          category: string
          cost_price: number | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          in_stock: boolean | null
          name: string
          price: number
          sku: string | null
          stock_quantity: number | null
          tax_rate: number | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          business_id?: string | null
          category: string
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean | null
          name: string
          price: number
          sku?: string | null
          stock_quantity?: number | null
          tax_rate?: number | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          business_id?: string | null
          category?: string
          cost_price?: number | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          in_stock?: boolean | null
          name?: string
          price?: number
          sku?: string | null
          stock_quantity?: number | null
          tax_rate?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      queries: {
        Row: {
          business_id: string | null
          created_at: string
          description: string | null
          id: number
          status: string | null
          subject: string | null
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          id?: number
          status?: string | null
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          description?: string | null
          id?: number
          status?: string | null
          subject?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          address: string | null
          business_id: string | null
          business_name: string | null
          created_at: string
          id: number
          phone_number: string | null
          primary_color: string | null
          secondary_color: string | null
          tax_rate: number | null
        }
        Insert: {
          address?: string | null
          business_id?: string | null
          business_name?: string | null
          created_at?: string
          id?: number
          phone_number?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          tax_rate?: number | null
        }
        Update: {
          address?: string | null
          business_id?: string | null
          business_name?: string | null
          created_at?: string
          id?: number
          phone_number?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          tax_rate?: number | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          business_id: string | null
          created_at: string
          id: string
          order_id: string | null
          payment_method: string
          reference_number: string | null
          status: string
          transaction_type: string
        }
        Insert: {
          amount: number
          business_id?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          payment_method: string
          reference_number?: string | null
          status: string
          transaction_type: string
        }
        Update: {
          amount?: number
          business_id?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          payment_method?: string
          reference_number?: string | null
          status?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          business_id: string | null
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          profile_url: string | null
          role: string
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          email: string
          first_name: string
          id: string
          last_name: string
          profile_url?: string | null
          role: string
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          profile_url?: string | null
          role?: string
          updated_at?: string
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
