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
      accounting_activity_logs: {
        Row: {
          action_type: string
          amount: number | null
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string
          id: string
          new_values: Json | null
          old_values: Json | null
          performed_at: string
          performed_by: string | null
          store_id: string | null
        }
        Insert: {
          action_type: string
          amount?: number | null
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          performed_at?: string
          performed_by?: string | null
          store_id?: string | null
        }
        Update: {
          action_type?: string
          amount?: number | null
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          performed_at?: string
          performed_by?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_activity_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_banks: {
        Row: {
          account_holder: string | null
          account_number: string | null
          bank_name: string
          branch_name: string | null
          created_at: string | null
          current_balance: number | null
          id: string
          ifsc_code: string | null
          is_active: boolean | null
          opening_balance: number | null
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          bank_name: string
          branch_name?: string | null
          created_at?: string | null
          current_balance?: number | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          opening_balance?: number | null
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          bank_name?: string
          branch_name?: string | null
          created_at?: string | null
          current_balance?: number | null
          id?: string
          ifsc_code?: string | null
          is_active?: boolean | null
          opening_balance?: number | null
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_banks_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_bills: {
        Row: {
          bill_date: string
          bill_number: string
          category_id: string | null
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          notes: string | null
          outstanding_amount: number | null
          paid_amount: number | null
          status: Database["public"]["Enums"]["bill_status"] | null
          store_id: string | null
          supplier_id: string | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          bill_date: string
          bill_number: string
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          outstanding_amount?: number | null
          paid_amount?: number | null
          status?: Database["public"]["Enums"]["bill_status"] | null
          store_id?: string | null
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          bill_date?: string
          bill_number?: string
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          notes?: string | null
          outstanding_amount?: number | null
          paid_amount?: number | null
          status?: Database["public"]["Enums"]["bill_status"] | null
          store_id?: string | null
          supplier_id?: string | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_bills_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "accounting_expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_bills_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_bills_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "accounting_suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_cash_ledger: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          reference_id: string | null
          reference_type: string | null
          store_id: string | null
          transaction_date: string
          transaction_type: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          store_id?: string | null
          transaction_date: string
          transaction_type: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          store_id?: string | null
          transaction_date?: string
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_cash_ledger_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_expense_categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          store_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          store_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_expense_categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_invoice_items: {
        Row: {
          amount: number
          created_at: string | null
          description: string
          id: string
          invoice_id: string | null
          product_id: string | null
          quantity: number
          rate: number
        }
        Insert: {
          amount: number
          created_at?: string | null
          description: string
          id?: string
          invoice_id?: string | null
          product_id?: string | null
          quantity: number
          rate: number
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string | null
          product_id?: string | null
          quantity?: number
          rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounting_invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "accounting_invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_invoices: {
        Row: {
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          invoice_date: string
          invoice_number: string
          notes: string | null
          order_id: string | null
          outstanding_amount: number | null
          paid_amount: number | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          store_id: string | null
          total_amount: number
          updated_at: string | null
          wholesaler_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date: string
          invoice_number: string
          notes?: string | null
          order_id?: string | null
          outstanding_amount?: number | null
          paid_amount?: number | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          store_id?: string | null
          total_amount?: number
          updated_at?: string | null
          wholesaler_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string
          invoice_number?: string
          notes?: string | null
          order_id?: string | null
          outstanding_amount?: number | null
          paid_amount?: number | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          store_id?: string | null
          total_amount?: number
          updated_at?: string | null
          wholesaler_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_invoices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_invoices_wholesaler_id_fkey"
            columns: ["wholesaler_id"]
            isOneToOne: false
            referencedRelation: "accounting_wholesalers"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_payments: {
        Row: {
          amount: number
          bank_id: string | null
          bill_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          invoice_id: string | null
          notes: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method_type"]
          reference_number: string | null
        }
        Insert: {
          amount: number
          bank_id?: string | null
          bill_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method_type"]
          reference_number?: string | null
        }
        Update: {
          amount?: number
          bank_id?: string | null
          bill_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method_type"]
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_payments_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "accounting_banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_payments_bill_id_fkey"
            columns: ["bill_id"]
            isOneToOne: false
            referencedRelation: "accounting_bills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "accounting_invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_suppliers: {
        Row: {
          address: string | null
          created_at: string | null
          current_balance: number | null
          email: string | null
          gst_number: string | null
          id: string
          name: string
          opening_balance: number | null
          pan_number: string | null
          phone: string | null
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          current_balance?: number | null
          email?: string | null
          gst_number?: string | null
          id?: string
          name: string
          opening_balance?: number | null
          pan_number?: string | null
          phone?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          current_balance?: number | null
          email?: string | null
          gst_number?: string | null
          id?: string
          name?: string
          opening_balance?: number | null
          pan_number?: string | null
          phone?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_suppliers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_transaction_lines: {
        Row: {
          account_id: string | null
          created_at: string | null
          credit: number | null
          debit: number | null
          description: string | null
          id: string
          party_id: string | null
          transaction_id: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          party_id?: string | null
          transaction_id?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          credit?: number | null
          debit?: number | null
          description?: string | null
          id?: string
          party_id?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_transaction_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_transaction_lines_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_transaction_lines_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_transactions: {
        Row: {
          amount: number
          bank_id: string | null
          category_id: string | null
          created_at: string | null
          created_by: string | null
          description: string
          id: string
          payment_method: Database["public"]["Enums"]["payment_method_type"]
          reference_id: string | null
          reference_type: string | null
          store_id: string | null
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          bank_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          id?: string
          payment_method: Database["public"]["Enums"]["payment_method_type"]
          reference_id?: string | null
          reference_type?: string | null
          store_id?: string | null
          transaction_date: string
          transaction_type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          bank_id?: string | null
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          id?: string
          payment_method?: Database["public"]["Enums"]["payment_method_type"]
          reference_id?: string | null
          reference_type?: string | null
          store_id?: string | null
          transaction_date?: string
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "accounting_transactions_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "accounting_banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "accounting_expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounting_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      accounting_wholesalers: {
        Row: {
          address: string | null
          created_at: string | null
          current_balance: number | null
          email: string | null
          gst_number: string | null
          id: string
          name: string
          opening_balance: number | null
          pan_number: string | null
          phone: string | null
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          current_balance?: number | null
          email?: string | null
          gst_number?: string | null
          id?: string
          name: string
          opening_balance?: number | null
          pan_number?: string | null
          phone?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          current_balance?: number | null
          email?: string | null
          gst_number?: string | null
          id?: string
          name?: string
          opening_balance?: number | null
          pan_number?: string | null
          phone?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounting_wholesalers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          account_number: string | null
          created_at: string | null
          currency: string | null
          current_balance: number | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          opening_balance: number | null
          store_id: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          account_number?: string | null
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          opening_balance?: number | null
          store_id?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          account_number?: string | null
          created_at?: string | null
          currency?: string | null
          current_balance?: number | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          opening_balance?: number | null
          store_id?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          amount_spent: number
          amount_usd: number | null
          created_at: string | null
          date: string
          dollar_rate: number | null
          id: string
          platform: string
          product_id: string | null
          store_id: string | null
          target_orders: number | null
        }
        Insert: {
          amount_spent?: number
          amount_usd?: number | null
          created_at?: string | null
          date: string
          dollar_rate?: number | null
          id?: string
          platform: string
          product_id?: string | null
          store_id?: string | null
          target_orders?: number | null
        }
        Update: {
          amount_spent?: number
          amount_usd?: number | null
          created_at?: string | null
          date?: string
          dollar_rate?: number | null
          id?: string
          platform?: string
          product_id?: string | null
          store_id?: string | null
          target_orders?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      ads_spend: {
        Row: {
          confirmed_orders: number | null
          created_at: string | null
          date: string
          delivered_orders: number | null
          delivery_cost_per_order: number | null
          id: string
          npr_amount: number | null
          platform: string
          product_id: string | null
          product_name_cached: string | null
          rto_orders: number | null
          rto_percentage_target: number | null
          selling_price: number | null
          store_id: string | null
          target_orders: number | null
          updated_at: string | null
          usd_amount: number | null
          usd_to_npr_rate: number | null
        }
        Insert: {
          confirmed_orders?: number | null
          created_at?: string | null
          date: string
          delivered_orders?: number | null
          delivery_cost_per_order?: number | null
          id?: string
          npr_amount?: number | null
          platform: string
          product_id?: string | null
          product_name_cached?: string | null
          rto_orders?: number | null
          rto_percentage_target?: number | null
          selling_price?: number | null
          store_id?: string | null
          target_orders?: number | null
          updated_at?: string | null
          usd_amount?: number | null
          usd_to_npr_rate?: number | null
        }
        Update: {
          confirmed_orders?: number | null
          created_at?: string | null
          date?: string
          delivered_orders?: number | null
          delivery_cost_per_order?: number | null
          id?: string
          npr_amount?: number | null
          platform?: string
          product_id?: string | null
          product_name_cached?: string | null
          rto_orders?: number | null
          rto_percentage_target?: number | null
          selling_price?: number | null
          store_id?: string | null
          target_orders?: number | null
          updated_at?: string | null
          usd_amount?: number | null
          usd_to_npr_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ads_spend_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ads_spend_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_assignments: {
        Row: {
          asset_id: string
          assigned_on: string
          condition_on_assign: string | null
          condition_on_return: string | null
          created_at: string
          employee_id: string
          id: string
          notes: string | null
          returned_on: string | null
          store_id: string | null
        }
        Insert: {
          asset_id: string
          assigned_on?: string
          condition_on_assign?: string | null
          condition_on_return?: string | null
          created_at?: string
          employee_id: string
          id?: string
          notes?: string | null
          returned_on?: string | null
          store_id?: string | null
        }
        Update: {
          asset_id?: string
          assigned_on?: string
          condition_on_assign?: string | null
          condition_on_return?: string | null
          created_at?: string
          employee_id?: string
          id?: string
          notes?: string | null
          returned_on?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_assignments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_assignments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_assignments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          asset_code: string
          category: string
          created_at: string
          description: string | null
          id: string
          name: string
          purchase_cost: number | null
          purchase_date: string | null
          status: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          asset_code: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          purchase_cost?: number | null
          purchase_date?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          asset_code?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          purchase_cost?: number | null
          purchase_date?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          check_in_time: string | null
          check_out_time: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          notes: string | null
          status: string
          store_id: string | null
        }
        Insert: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          date?: string
          employee_id: string
          id?: string
          notes?: string | null
          status?: string
          store_id?: string | null
        }
        Update: {
          check_in_time?: string | null
          check_out_time?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          status?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_entry_toggles: {
        Row: {
          id: string
          include_in_audit: boolean | null
          source_id: string
          source_table: string
          toggled_at: string | null
          toggled_by: string | null
        }
        Insert: {
          id?: string
          include_in_audit?: boolean | null
          source_id: string
          source_table: string
          toggled_at?: string | null
          toggled_by?: string | null
        }
        Update: {
          id?: string
          include_in_audit?: boolean | null
          source_id?: string
          source_table?: string
          toggled_at?: string | null
          toggled_by?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      audit_manual_entries: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          created_by: string | null
          date: string
          description: string
          fiscal_month: string | null
          fiscal_quarter: string | null
          fiscal_year: string | null
          id: string
          include_in_audit: boolean | null
          notes: string | null
          quantity: number | null
          sub_category: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string | null
          created_by?: string | null
          date: string
          description: string
          fiscal_month?: string | null
          fiscal_quarter?: string | null
          fiscal_year?: string | null
          id?: string
          include_in_audit?: boolean | null
          notes?: string | null
          quantity?: number | null
          sub_category?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string
          fiscal_month?: string | null
          fiscal_quarter?: string | null
          fiscal_year?: string | null
          id?: string
          include_in_audit?: boolean | null
          notes?: string | null
          quantity?: number | null
          sub_category?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_snapshots: {
        Row: {
          created_at: string | null
          created_by: string | null
          data: Json
          fiscal_quarter: string | null
          fiscal_year: string | null
          id: string
          notes: string | null
          snapshot_date: string
          snapshot_name: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data: Json
          fiscal_quarter?: string | null
          fiscal_year?: string | null
          id?: string
          notes?: string | null
          snapshot_date: string
          snapshot_name: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data?: Json
          fiscal_quarter?: string | null
          fiscal_year?: string | null
          id?: string
          notes?: string | null
          snapshot_date?: string
          snapshot_name?: string
        }
        Relationships: []
      }
      branches: {
        Row: {
          area_covered: string | null
          arrival_time: string | null
          base_charge: number | null
          branch_name: string
          code: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          district: string | null
          id: string
          is_active: boolean | null
          province: string | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          area_covered?: string | null
          arrival_time?: string | null
          base_charge?: number | null
          branch_name: string
          code?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          district?: string | null
          id?: string
          is_active?: boolean | null
          province?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          area_covered?: string | null
          arrival_time?: string | null
          base_charge?: number | null
          branch_name?: string
          code?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          district?: string | null
          id?: string
          is_active?: boolean | null
          province?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      branding: {
        Row: {
          announcement_text: string | null
          banner_url: string | null
          created_at: string | null
          facebook_pixel: string | null
          favicon_url: string | null
          font_family: string | null
          google_analytics: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          site_under_construction: boolean | null
          store_id: string
          updated_at: string | null
          whatsapp_number: string | null
        }
        Insert: {
          announcement_text?: string | null
          banner_url?: string | null
          created_at?: string | null
          facebook_pixel?: string | null
          favicon_url?: string | null
          font_family?: string | null
          google_analytics?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          site_under_construction?: boolean | null
          store_id: string
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          announcement_text?: string | null
          banner_url?: string | null
          created_at?: string | null
          facebook_pixel?: string | null
          favicon_url?: string | null
          font_family?: string | null
          google_analytics?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          site_under_construction?: boolean | null
          store_id?: string
          updated_at?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branding_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          called_at: string | null
          id: string
          lead_id: string | null
          next_followup_date: string | null
          notes: string | null
          outcome: string
          staff_id: string | null
        }
        Insert: {
          called_at?: string | null
          id?: string
          lead_id?: string | null
          next_followup_date?: string | null
          notes?: string | null
          outcome: string
          staff_id?: string | null
        }
        Update: {
          called_at?: string | null
          id?: string
          lead_id?: string | null
          next_followup_date?: string | null
          notes?: string | null
          outcome?: string
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          ads_budget_npr: number | null
          created_at: string
          end_date: string | null
          id: string
          influencer_budget_npr: number | null
          name: string
          notes: string | null
          objective: string | null
          owner: string | null
          primary_product: string | null
          production_budget_npr: number | null
          start_date: string | null
          status: string | null
          store_id: string | null
          target_orders: number | null
          target_revenue_npr: number | null
          total_budget_npr: number | null
          updated_at: string
        }
        Insert: {
          ads_budget_npr?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          influencer_budget_npr?: number | null
          name: string
          notes?: string | null
          objective?: string | null
          owner?: string | null
          primary_product?: string | null
          production_budget_npr?: number | null
          start_date?: string | null
          status?: string | null
          store_id?: string | null
          target_orders?: number | null
          target_revenue_npr?: number | null
          total_budget_npr?: number | null
          updated_at?: string
        }
        Update: {
          ads_budget_npr?: number | null
          created_at?: string
          end_date?: string | null
          id?: string
          influencer_budget_npr?: number | null
          name?: string
          notes?: string | null
          objective?: string | null
          owner?: string | null
          primary_product?: string | null
          production_budget_npr?: number | null
          start_date?: string | null
          status?: string | null
          store_id?: string | null
          target_orders?: number | null
          target_revenue_npr?: number | null
          total_budget_npr?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
          store_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
          store_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          created_at: string
          file_name: string | null
          file_type: string | null
          file_url: string | null
          id: string
          is_pinned: boolean | null
          is_read: boolean | null
          mentions: string[] | null
          message_text: string
          pinned_at: string | null
          pinned_by: string | null
          read_at: string | null
          read_by: string[] | null
          room_id: string
          sender_id: string
          store_id: string | null
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_pinned?: boolean | null
          is_read?: boolean | null
          mentions?: string[] | null
          message_text: string
          pinned_at?: string | null
          pinned_by?: string | null
          read_at?: string | null
          read_by?: string[] | null
          room_id: string
          sender_id: string
          store_id?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          is_pinned?: boolean | null
          is_read?: boolean | null
          mentions?: string[] | null
          message_text?: string
          pinned_at?: string | null
          pinned_by?: string | null
          read_at?: string | null
          read_by?: string[] | null
          room_id?: string
          sender_id?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_room_members: {
        Row: {
          id: string
          joined_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_muted_by: string[] | null
          last_message_at: string | null
          name: string
          participants: string[] | null
          role_based_group: string | null
          store_id: string | null
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_muted_by?: string[] | null
          last_message_at?: string | null
          name: string
          participants?: string[] | null
          role_based_group?: string | null
          store_id?: string | null
          type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_muted_by?: string[] | null
          last_message_at?: string | null
          name?: string
          participants?: string[] | null
          role_based_group?: string | null
          store_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_rooms_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      cod_settlements: {
        Row: {
          bank_reference: string | null
          cod_amount: number
          courier: Database["public"]["Enums"]["courier_provider"]
          courier_settlement_id: string | null
          created_at: string
          id: string
          logistics_order_id: string | null
          order_id: string | null
          pending_amount: number | null
          settled_amount: number | null
          settlement_date: string | null
          status: Database["public"]["Enums"]["cod_settlement_status"]
          updated_at: string
        }
        Insert: {
          bank_reference?: string | null
          cod_amount: number
          courier: Database["public"]["Enums"]["courier_provider"]
          courier_settlement_id?: string | null
          created_at?: string
          id?: string
          logistics_order_id?: string | null
          order_id?: string | null
          pending_amount?: number | null
          settled_amount?: number | null
          settlement_date?: string | null
          status?: Database["public"]["Enums"]["cod_settlement_status"]
          updated_at?: string
        }
        Update: {
          bank_reference?: string | null
          cod_amount?: number
          courier?: Database["public"]["Enums"]["courier_provider"]
          courier_settlement_id?: string | null
          created_at?: string
          id?: string
          logistics_order_id?: string | null
          order_id?: string | null
          pending_amount?: number | null
          settled_amount?: number | null
          settlement_date?: string | null
          status?: Database["public"]["Enums"]["cod_settlement_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cod_settlements_logistics_order_id_fkey"
            columns: ["logistics_order_id"]
            isOneToOne: false
            referencedRelation: "logistics_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cod_settlements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      company_info: {
        Row: {
          address: string | null
          company_name: string
          email: string | null
          id: string
          logo_url: string | null
          other_details: string | null
          phone: string | null
          registration_no: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          company_name: string
          email?: string | null
          id?: string
          logo_url?: string | null
          other_details?: string | null
          phone?: string | null
          registration_no?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string
          email?: string | null
          id?: string
          logo_url?: string | null
          other_details?: string | null
          phone?: string | null
          registration_no?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      courier_stats: {
        Row: {
          avg_delivery_hours: number | null
          cancelled: number | null
          cod_collected: number | null
          cod_pending: number | null
          courier: string
          created_at: string
          date: string
          delivered: number | null
          id: string
          in_transit: number | null
          pending_pickup: number | null
          rto: number | null
          total: number | null
          updated_at: string
        }
        Insert: {
          avg_delivery_hours?: number | null
          cancelled?: number | null
          cod_collected?: number | null
          cod_pending?: number | null
          courier: string
          created_at?: string
          date?: string
          delivered?: number | null
          id?: string
          in_transit?: number | null
          pending_pickup?: number | null
          rto?: number | null
          total?: number | null
          updated_at?: string
        }
        Update: {
          avg_delivery_hours?: number | null
          cancelled?: number | null
          cod_collected?: number | null
          cod_pending?: number | null
          courier?: string
          created_at?: string
          date?: string
          delivered?: number | null
          id?: string
          in_transit?: number | null
          pending_pickup?: number | null
          rto?: number | null
          total?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      courier_updates: {
        Row: {
          courier: string
          created_at: string
          id: string
          logistics_order_id: string | null
          note: string | null
          order_id: string
          status: string
          timestamp: string
          webhook_data: Json | null
        }
        Insert: {
          courier: string
          created_at?: string
          id?: string
          logistics_order_id?: string | null
          note?: string | null
          order_id: string
          status: string
          timestamp?: string
          webhook_data?: Json | null
        }
        Update: {
          courier?: string
          created_at?: string
          id?: string
          logistics_order_id?: string | null
          note?: string | null
          order_id?: string
          status?: string
          timestamp?: string
          webhook_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "courier_updates_logistics_order_id_fkey"
            columns: ["logistics_order_id"]
            isOneToOne: false
            referencedRelation: "logistics_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courier_updates_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      couriers: {
        Row: {
          api_config: Json | null
          created_at: string | null
          display_name: string
          id: string
          is_active: boolean | null
          is_api_connected: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          api_config?: Json | null
          created_at?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          is_api_connected?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          api_config?: Json | null
          created_at?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_api_connected?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      customer_activity_log: {
        Row: {
          activity_type: string
          created_at: string | null
          created_by: string | null
          customer_id: string
          description: string
          id: string
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          activity_type: string
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          description: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          activity_type?: string
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          description?: string
          id?: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_activity_log_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          created_at: string | null
          created_by: string | null
          customer_id: string
          id: string
          note: string
          note_type: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          customer_id: string
          id?: string
          note: string
          note_type?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          customer_id?: string
          id?: string
          note?: string
          note_type?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          alt_phone: string | null
          city: string | null
          created_at: string | null
          customer_name: string | null
          delivered_orders: number | null
          email: string | null
          first_order_date: string | null
          full_address: string | null
          id: string
          landmark: string | null
          last_order_date: string | null
          phone_number: string
          province: string | null
          rto_orders: number | null
          status: string | null
          store_id: string | null
          tags: string[] | null
          total_order_value: number | null
          total_orders: number | null
          updated_at: string | null
        }
        Insert: {
          alt_phone?: string | null
          city?: string | null
          created_at?: string | null
          customer_name?: string | null
          delivered_orders?: number | null
          email?: string | null
          first_order_date?: string | null
          full_address?: string | null
          id?: string
          landmark?: string | null
          last_order_date?: string | null
          phone_number: string
          province?: string | null
          rto_orders?: number | null
          status?: string | null
          store_id?: string | null
          tags?: string[] | null
          total_order_value?: number | null
          total_orders?: number | null
          updated_at?: string | null
        }
        Update: {
          alt_phone?: string | null
          city?: string | null
          created_at?: string | null
          customer_name?: string | null
          delivered_orders?: number | null
          email?: string | null
          first_order_date?: string | null
          full_address?: string | null
          id?: string
          landmark?: string | null
          last_order_date?: string | null
          phone_number?: string
          province?: string | null
          rto_orders?: number | null
          status?: string | null
          store_id?: string | null
          tags?: string[] | null
          total_order_value?: number | null
          total_orders?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_pl: {
        Row: {
          actual_profit: number
          actual_sales: number | null
          ads_spent_npr: number
          ads_spent_usd: number
          created_at: string
          date: string
          delivery_cost: number
          delivery_cost_per_order: number | null
          gross_sales_value: number
          id: string
          other_expenses: number
          product_cost: number
          roi_ads: number | null
          rto_cost: number
          rto_cost_per_order: number | null
          rto_orders: number | null
          rto_rate_percent: number | null
          rto_units: number
          staff_office_cost: number
          store_id: string | null
          target_orders: number
          target_profit: number
          total_expense: number
          total_units_sold: number
          updated_at: string
          usd_rate: number | null
          warehouse_id: string | null
        }
        Insert: {
          actual_profit?: number
          actual_sales?: number | null
          ads_spent_npr?: number
          ads_spent_usd?: number
          created_at?: string
          date: string
          delivery_cost?: number
          delivery_cost_per_order?: number | null
          gross_sales_value?: number
          id?: string
          other_expenses?: number
          product_cost?: number
          roi_ads?: number | null
          rto_cost?: number
          rto_cost_per_order?: number | null
          rto_orders?: number | null
          rto_rate_percent?: number | null
          rto_units?: number
          staff_office_cost?: number
          store_id?: string | null
          target_orders?: number
          target_profit?: number
          total_expense?: number
          total_units_sold?: number
          updated_at?: string
          usd_rate?: number | null
          warehouse_id?: string | null
        }
        Update: {
          actual_profit?: number
          actual_sales?: number | null
          ads_spent_npr?: number
          ads_spent_usd?: number
          created_at?: string
          date?: string
          delivery_cost?: number
          delivery_cost_per_order?: number | null
          gross_sales_value?: number
          id?: string
          other_expenses?: number
          product_cost?: number
          roi_ads?: number | null
          rto_cost?: number
          rto_cost_per_order?: number | null
          rto_orders?: number | null
          rto_rate_percent?: number | null
          rto_units?: number
          staff_office_cost?: number
          store_id?: string | null
          target_orders?: number
          target_profit?: number
          total_expense?: number
          total_units_sold?: number
          updated_at?: string
          usd_rate?: number | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_pl_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_pl_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          store_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          store_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      email_verifications: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          otp_code: string
          user_id: string
          verified: boolean | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          otp_code: string
          user_id: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          otp_code?: string
          user_id?: string
          verified?: boolean | null
          verified_at?: string | null
        }
        Relationships: []
      }
      employee_documents: {
        Row: {
          created_at: string
          doc_type: Database["public"]["Enums"]["employee_doc_type"]
          employee_id: string
          file_url: string
          id: string
          remarks: string | null
          status: Database["public"]["Enums"]["employee_doc_status"]
          title: string | null
          uploaded_at: string
          uploaded_by: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          doc_type: Database["public"]["Enums"]["employee_doc_type"]
          employee_id: string
          file_url: string
          id?: string
          remarks?: string | null
          status?: Database["public"]["Enums"]["employee_doc_status"]
          title?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          doc_type?: Database["public"]["Enums"]["employee_doc_type"]
          employee_id?: string
          file_url?: string
          id?: string
          remarks?: string | null
          status?: Database["public"]["Enums"]["employee_doc_status"]
          title?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          bank_account_id: string | null
          base_salary: number | null
          citizenship_number: string | null
          created_at: string
          daily_target: number | null
          department_id: string | null
          designation: string | null
          email: string | null
          full_name: string
          guardian_name: string | null
          guardian_phone: string | null
          guardian_relation: string | null
          id: string
          joining_date: string | null
          notes: string | null
          pan_number: string | null
          phone: string | null
          photo_url: string | null
          position: string | null
          shift: string | null
          status: string
          store_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bank_account_id?: string | null
          base_salary?: number | null
          citizenship_number?: string | null
          created_at?: string
          daily_target?: number | null
          department_id?: string | null
          designation?: string | null
          email?: string | null
          full_name: string
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relation?: string | null
          id?: string
          joining_date?: string | null
          notes?: string | null
          pan_number?: string | null
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          shift?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bank_account_id?: string | null
          base_salary?: number | null
          citizenship_number?: string | null
          created_at?: string
          daily_target?: number | null
          department_id?: string | null
          designation?: string | null
          email?: string | null
          full_name?: string
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relation?: string | null
          id?: string
          joining_date?: string | null
          notes?: string | null
          pan_number?: string | null
          phone?: string | null
          photo_url?: string | null
          position?: string | null
          shift?: string | null
          status?: string
          store_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "hr_bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      failed_login_attempts: {
        Row: {
          attempted_at: string | null
          email: string
          id: string
          ip_address: string | null
          user_agent: string | null
        }
        Insert: {
          attempted_at?: string | null
          email: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Update: {
          attempted_at?: string | null
          email?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      followup_logs: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          new_status: string | null
          note: string | null
          old_status: string | null
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          new_status?: string | null
          note?: string | null
          old_status?: string | null
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          new_status?: string | null
          note?: string | null
          old_status?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "followup_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_logs_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_name: string
          branch: string | null
          created_at: string
          id: string
          is_default: boolean | null
          store_id: string | null
        }
        Insert: {
          account_name: string
          account_number: string
          bank_name: string
          branch?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          store_id?: string | null
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_name?: string
          branch?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hr_bank_accounts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_policies: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          id: string
          is_active: boolean | null
          store_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          store_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          store_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hr_policies_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      hr_settings: {
        Row: {
          date_display_mode: string
          id: string
          updated_at: string
        }
        Insert: {
          date_display_mode?: string
          id?: string
          updated_at?: string
        }
        Update: {
          date_display_mode?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      influencers: {
        Row: {
          alternate_phone: string | null
          assigned_to: string | null
          best_call_time: string | null
          campaign_name: string | null
          category: string | null
          city: string | null
          collaboration_type: string | null
          contact_person: string | null
          created_at: string
          currency: string | null
          email: string | null
          facebook_url: string | null
          followers_count: number | null
          handle: string | null
          id: string
          instagram_url: string | null
          last_contacted_date: string | null
          main_product: string | null
          name: string
          next_followup_date: string | null
          notes: string | null
          per_story_charge_npr: number | null
          per_video_charge_npr: number | null
          phone: string
          platform: string
          priority: string | null
          region: string | null
          status: string | null
          store_id: string | null
          tiktok_url: string | null
          updated_at: string
          whatsapp_number: string | null
          youtube_url: string | null
        }
        Insert: {
          alternate_phone?: string | null
          assigned_to?: string | null
          best_call_time?: string | null
          campaign_name?: string | null
          category?: string | null
          city?: string | null
          collaboration_type?: string | null
          contact_person?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          facebook_url?: string | null
          followers_count?: number | null
          handle?: string | null
          id?: string
          instagram_url?: string | null
          last_contacted_date?: string | null
          main_product?: string | null
          name: string
          next_followup_date?: string | null
          notes?: string | null
          per_story_charge_npr?: number | null
          per_video_charge_npr?: number | null
          phone: string
          platform?: string
          priority?: string | null
          region?: string | null
          status?: string | null
          store_id?: string | null
          tiktok_url?: string | null
          updated_at?: string
          whatsapp_number?: string | null
          youtube_url?: string | null
        }
        Update: {
          alternate_phone?: string | null
          assigned_to?: string | null
          best_call_time?: string | null
          campaign_name?: string | null
          category?: string | null
          city?: string | null
          collaboration_type?: string | null
          contact_person?: string | null
          created_at?: string
          currency?: string | null
          email?: string | null
          facebook_url?: string | null
          followers_count?: number | null
          handle?: string | null
          id?: string
          instagram_url?: string | null
          last_contacted_date?: string | null
          main_product?: string | null
          name?: string
          next_followup_date?: string | null
          notes?: string | null
          per_story_charge_npr?: number | null
          per_video_charge_npr?: number | null
          phone?: string
          platform?: string
          priority?: string | null
          region?: string | null
          status?: string | null
          store_id?: string | null
          tiktok_url?: string | null
          updated_at?: string
          whatsapp_number?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "influencers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_history: {
        Row: {
          action: string
          created_at: string | null
          from_staff_id: string | null
          id: string
          lead_id: string | null
          notes: string | null
          to_staff_id: string | null
          transferred_by: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          from_staff_id?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          to_staff_id?: string | null
          transferred_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          from_staff_id?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          to_staff_id?: string | null
          transferred_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_sources_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_transfers: {
        Row: {
          from_team: Database["public"]["Enums"]["team_type"] | null
          from_user_id: string | null
          id: string
          lead_id: string | null
          store_id: string | null
          to_team: Database["public"]["Enums"]["team_type"] | null
          to_user_id: string | null
          transferred_at: string | null
          transferred_by_user_id: string | null
        }
        Insert: {
          from_team?: Database["public"]["Enums"]["team_type"] | null
          from_user_id?: string | null
          id?: string
          lead_id?: string | null
          store_id?: string | null
          to_team?: Database["public"]["Enums"]["team_type"] | null
          to_user_id?: string | null
          transferred_at?: string | null
          transferred_by_user_id?: string | null
        }
        Update: {
          from_team?: Database["public"]["Enums"]["team_type"] | null
          from_user_id?: string | null
          id?: string
          lead_id?: string | null
          store_id?: string | null
          to_team?: Database["public"]["Enums"]["team_type"] | null
          to_user_id?: string | null
          transferred_at?: string | null
          transferred_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_transfers_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_transfers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_transfers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_transfers_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_transfers_transferred_by_user_id_fkey"
            columns: ["transferred_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          ai_followup_text: string | null
          ai_last_evaluated_at: string | null
          ai_lead_label: string | null
          ai_lead_score: number | null
          alt_phone: string | null
          assigned_at: string | null
          assigned_to_user_id: string | null
          branch_id: string | null
          client_name: string
          confirmed_at: string | null
          confirmed_by_user_id: string | null
          contact_number: string
          created_at: string | null
          created_by_staff_id: string | null
          created_by_user_id: string | null
          current_team: Database["public"]["Enums"]["team_type"] | null
          date: string
          destination_branch: string | null
          first_assigned_to_user_id: string | null
          followup_completed: boolean | null
          followup_reason: string | null
          full_address: string | null
          id: string
          is_duplicate: boolean | null
          is_followup_reminded: boolean | null
          is_transferred: boolean
          last_called_at: string | null
          last_called_by: string | null
          last_transfer_reason: string | null
          lead_bucket: Database["public"]["Enums"]["lead_bucket"] | null
          next_followup_at: string | null
          od_vd: string | null
          order_description: string | null
          order_id: string | null
          pool_status: string | null
          product_id: string | null
          reference_id: string | null
          remark: string | null
          returned_to_leads_at: string | null
          source: string | null
          source_id: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          store_id: string | null
          tag: string | null
        }
        Insert: {
          ai_followup_text?: string | null
          ai_last_evaluated_at?: string | null
          ai_lead_label?: string | null
          ai_lead_score?: number | null
          alt_phone?: string | null
          assigned_at?: string | null
          assigned_to_user_id?: string | null
          branch_id?: string | null
          client_name: string
          confirmed_at?: string | null
          confirmed_by_user_id?: string | null
          contact_number: string
          created_at?: string | null
          created_by_staff_id?: string | null
          created_by_user_id?: string | null
          current_team?: Database["public"]["Enums"]["team_type"] | null
          date?: string
          destination_branch?: string | null
          first_assigned_to_user_id?: string | null
          followup_completed?: boolean | null
          followup_reason?: string | null
          full_address?: string | null
          id?: string
          is_duplicate?: boolean | null
          is_followup_reminded?: boolean | null
          is_transferred?: boolean
          last_called_at?: string | null
          last_called_by?: string | null
          last_transfer_reason?: string | null
          lead_bucket?: Database["public"]["Enums"]["lead_bucket"] | null
          next_followup_at?: string | null
          od_vd?: string | null
          order_description?: string | null
          order_id?: string | null
          pool_status?: string | null
          product_id?: string | null
          reference_id?: string | null
          remark?: string | null
          returned_to_leads_at?: string | null
          source?: string | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          store_id?: string | null
          tag?: string | null
        }
        Update: {
          ai_followup_text?: string | null
          ai_last_evaluated_at?: string | null
          ai_lead_label?: string | null
          ai_lead_score?: number | null
          alt_phone?: string | null
          assigned_at?: string | null
          assigned_to_user_id?: string | null
          branch_id?: string | null
          client_name?: string
          confirmed_at?: string | null
          confirmed_by_user_id?: string | null
          contact_number?: string
          created_at?: string | null
          created_by_staff_id?: string | null
          created_by_user_id?: string | null
          current_team?: Database["public"]["Enums"]["team_type"] | null
          date?: string
          destination_branch?: string | null
          first_assigned_to_user_id?: string | null
          followup_completed?: boolean | null
          followup_reason?: string | null
          full_address?: string | null
          id?: string
          is_duplicate?: boolean | null
          is_followup_reminded?: boolean | null
          is_transferred?: boolean
          last_called_at?: string | null
          last_called_by?: string | null
          last_transfer_reason?: string | null
          lead_bucket?: Database["public"]["Enums"]["lead_bucket"] | null
          next_followup_at?: string | null
          od_vd?: string | null
          order_description?: string | null
          order_id?: string | null
          pool_status?: string | null
          product_id?: string | null
          reference_id?: string | null
          remark?: string | null
          returned_to_leads_at?: string | null
          source?: string | null
          source_id?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          store_id?: string | null
          tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_user_id_fkey"
            columns: ["assigned_to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_staff_id_fkey"
            columns: ["created_by_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_last_called_by_fkey"
            columns: ["last_called_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_quota: {
        Row: {
          created_at: string | null
          employee_id: string
          id: string
          leave_type_id: string
          store_id: string | null
          total_days: number
          used_days: number
          year: number
        }
        Insert: {
          created_at?: string | null
          employee_id: string
          id?: string
          leave_type_id: string
          store_id?: string | null
          total_days?: number
          used_days?: number
          year: number
        }
        Update: {
          created_at?: string | null
          employee_id?: string
          id?: string
          leave_type_id?: string
          store_id?: string | null
          total_days?: number
          used_days?: number
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_quota_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_quota_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_quota_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_by: string | null
          created_at: string
          employee_id: string
          from_date: string
          id: string
          leave_type_id: string
          reason: string | null
          status: string
          store_id: string | null
          to_date: string
          total_days: number
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          employee_id: string
          from_date: string
          id?: string
          leave_type_id: string
          reason?: string | null
          status?: string
          store_id?: string | null
          to_date: string
          total_days: number
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          employee_id?: string
          from_date?: string
          id?: string
          leave_type_id?: string
          reason?: string | null
          status?: string
          store_id?: string | null
          to_date?: string
          total_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_leave_type_id_fkey"
            columns: ["leave_type_id"]
            isOneToOne: false
            referencedRelation: "leave_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_settings: {
        Row: {
          apply_default_if_no_quota: boolean | null
          default_monthly_limit: number | null
          id: string
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          apply_default_if_no_quota?: boolean | null
          default_monthly_limit?: number | null
          id?: string
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          apply_default_if_no_quota?: boolean | null
          default_monthly_limit?: number | null
          id?: string
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_settings_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_types: {
        Row: {
          created_at: string
          default_days_per_year: number | null
          id: string
          name: string
          store_id: string | null
        }
        Insert: {
          created_at?: string
          default_days_per_year?: number | null
          id?: string
          name: string
          store_id?: string | null
        }
        Update: {
          created_at?: string
          default_days_per_year?: number | null
          id?: string
          name?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leave_types_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_orders: {
        Row: {
          actual_delivery: string | null
          api_response: Json | null
          cod_amount: number | null
          cod_collected: boolean | null
          cod_settled: boolean | null
          courier: Database["public"]["Enums"]["courier_provider"]
          courier_order_id: string | null
          courier_status: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          customer_phone: string
          delivery_status: Database["public"]["Enums"]["logistics_delivery_status"]
          estimated_delivery: string | null
          full_address: string
          id: string
          last_error: string | null
          last_webhook_data: Json | null
          order_id: string | null
          parcel_code: string | null
          pickup_date: string | null
          product_name: string | null
          quantity: number | null
          retry_count: number | null
          status_updated_at: string | null
          tracking_id: string | null
          updated_at: string
          weight_grams: number | null
        }
        Insert: {
          actual_delivery?: string | null
          api_response?: Json | null
          cod_amount?: number | null
          cod_collected?: boolean | null
          cod_settled?: boolean | null
          courier: Database["public"]["Enums"]["courier_provider"]
          courier_order_id?: string | null
          courier_status?: string | null
          created_at?: string
          created_by?: string | null
          customer_name: string
          customer_phone: string
          delivery_status?: Database["public"]["Enums"]["logistics_delivery_status"]
          estimated_delivery?: string | null
          full_address: string
          id?: string
          last_error?: string | null
          last_webhook_data?: Json | null
          order_id?: string | null
          parcel_code?: string | null
          pickup_date?: string | null
          product_name?: string | null
          quantity?: number | null
          retry_count?: number | null
          status_updated_at?: string | null
          tracking_id?: string | null
          updated_at?: string
          weight_grams?: number | null
        }
        Update: {
          actual_delivery?: string | null
          api_response?: Json | null
          cod_amount?: number | null
          cod_collected?: boolean | null
          cod_settled?: boolean | null
          courier?: Database["public"]["Enums"]["courier_provider"]
          courier_order_id?: string | null
          courier_status?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_status?: Database["public"]["Enums"]["logistics_delivery_status"]
          estimated_delivery?: string | null
          full_address?: string
          id?: string
          last_error?: string | null
          last_webhook_data?: Json | null
          order_id?: string | null
          parcel_code?: string | null
          pickup_date?: string | null
          product_name?: string | null
          quantity?: number | null
          retry_count?: number | null
          status_updated_at?: string | null
          tracking_id?: string | null
          updated_at?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "logistics_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "logistics_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      logistics_settings: {
        Row: {
          account_type: string | null
          api_base_url: string | null
          api_token: string | null
          client_id: string | null
          client_password: string | null
          courier: Database["public"]["Enums"]["courier_provider"]
          created_at: string
          default_pickup_address: string | null
          default_sender_name: string | null
          default_sender_phone: string | null
          id: string
          is_active: boolean
          partner_id: string | null
          pickup_branch: string | null
          pickup_city: string | null
          secret_key: string | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          account_type?: string | null
          api_base_url?: string | null
          api_token?: string | null
          client_id?: string | null
          client_password?: string | null
          courier: Database["public"]["Enums"]["courier_provider"]
          created_at?: string
          default_pickup_address?: string | null
          default_sender_name?: string | null
          default_sender_phone?: string | null
          id?: string
          is_active?: boolean
          partner_id?: string | null
          pickup_branch?: string | null
          pickup_city?: string | null
          secret_key?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: string | null
          api_base_url?: string | null
          api_token?: string | null
          client_id?: string | null
          client_password?: string | null
          courier?: Database["public"]["Enums"]["courier_provider"]
          created_at?: string
          default_pickup_address?: string | null
          default_sender_name?: string | null
          default_sender_phone?: string | null
          id?: string
          is_active?: boolean
          partner_id?: string | null
          pickup_branch?: string | null
          pickup_city?: string | null
          secret_key?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      marketing_targets: {
        Row: {
          confirmed_orders_target: number | null
          created_at: string | null
          created_by: string | null
          date: string
          id: string
          max_avg_order: number | null
          min_avg_order: number | null
          total_leads_target: number | null
        }
        Insert: {
          confirmed_orders_target?: number | null
          created_at?: string | null
          created_by?: string | null
          date: string
          id?: string
          max_avg_order?: number | null
          min_avg_order?: number | null
          total_leads_target?: number | null
        }
        Update: {
          confirmed_orders_target?: number | null
          created_at?: string | null
          created_by?: string | null
          date?: string
          id?: string
          max_avg_order?: number | null
          min_avg_order?: number | null
          total_leads_target?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "marketing_targets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_automation_rules: {
        Row: {
          channel_id: string
          created_at: string
          event_name: string
          id: string
          is_active: boolean
          send_to: Database["public"]["Enums"]["message_recipient_type"]
          store_id: string | null
          template_id: string
          trigger_status_from: string | null
          trigger_status_to: string | null
          updated_at: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          event_name: string
          id?: string
          is_active?: boolean
          send_to?: Database["public"]["Enums"]["message_recipient_type"]
          store_id?: string | null
          template_id: string
          trigger_status_from?: string | null
          trigger_status_to?: string | null
          updated_at?: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          event_name?: string
          id?: string
          is_active?: boolean
          send_to?: Database["public"]["Enums"]["message_recipient_type"]
          store_id?: string | null
          template_id?: string
          trigger_status_from?: string | null
          trigger_status_to?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_automation_rules_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "message_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_automation_rules_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_automation_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      message_channels: {
        Row: {
          api_base_url: string | null
          api_key: string | null
          api_secret: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          provider: Database["public"]["Enums"]["message_provider"]
          sender_id: string | null
          store_id: string | null
          type: Database["public"]["Enums"]["message_channel_type"]
          updated_at: string
        }
        Insert: {
          api_base_url?: string | null
          api_key?: string | null
          api_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          provider?: Database["public"]["Enums"]["message_provider"]
          sender_id?: string | null
          store_id?: string | null
          type: Database["public"]["Enums"]["message_channel_type"]
          updated_at?: string
        }
        Update: {
          api_base_url?: string | null
          api_key?: string | null
          api_secret?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          provider?: Database["public"]["Enums"]["message_provider"]
          sender_id?: string | null
          store_id?: string | null
          type?: Database["public"]["Enums"]["message_channel_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_channels_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      message_logs: {
        Row: {
          channel_id: string
          created_at: string
          error_message: string | null
          id: string
          payload_preview: string
          provider_message_id: string | null
          recipient_phone: string
          related_lead_id: string | null
          related_order_id: string | null
          related_reseller_order_id: string | null
          rule_id: string | null
          status: Database["public"]["Enums"]["message_status"]
          store_id: string | null
          template_id: string | null
        }
        Insert: {
          channel_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          payload_preview: string
          provider_message_id?: string | null
          recipient_phone: string
          related_lead_id?: string | null
          related_order_id?: string | null
          related_reseller_order_id?: string | null
          rule_id?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          store_id?: string | null
          template_id?: string | null
        }
        Update: {
          channel_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          payload_preview?: string
          provider_message_id?: string | null
          recipient_phone?: string
          related_lead_id?: string | null
          related_order_id?: string | null
          related_reseller_order_id?: string | null
          rule_id?: string | null
          status?: Database["public"]["Enums"]["message_status"]
          store_id?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_logs_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "message_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_related_lead_id_fkey"
            columns: ["related_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "message_automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "message_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          channel_type: Database["public"]["Enums"]["message_channel_type"]
          code: string
          content: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          language: string
          store_id: string | null
          updated_at: string
        }
        Insert: {
          channel_type: Database["public"]["Enums"]["message_channel_type"]
          code: string
          content: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          language?: string
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          channel_type?: Database["public"]["Enums"]["message_channel_type"]
          code?: string
          content?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          language?: string
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean | null
          message: string | null
          start_date: string
          store_id: string | null
          target_audience: string | null
          title: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          message?: string | null
          start_date?: string
          store_id?: string | null
          target_audience?: string | null
          title: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          message?: string | null
          start_date?: string
          store_id?: string | null
          target_audience?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          created_at: string
          id: string
          link_path: string | null
          message: string
          meta: Json | null
          portal: string | null
          read_at: string | null
          store_id: string | null
          target_role: string | null
          target_user_id: string | null
          title: string
          type: string
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          link_path?: string | null
          message: string
          meta?: Json | null
          portal?: string | null
          read_at?: string | null
          store_id?: string | null
          target_role?: string | null
          target_user_id?: string | null
          title: string
          type: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          id?: string
          link_path?: string | null
          message?: string
          meta?: Json | null
          portal?: string | null
          read_at?: string | null
          store_id?: string | null
          target_role?: string | null
          target_user_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      office_expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          date: string
          id: string
          notes: string | null
        }
        Insert: {
          amount?: number
          category: string
          created_at?: string
          date: string
          id?: string
          notes?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          date?: string
          id?: string
          notes?: string | null
        }
        Relationships: []
      }
      office_holidays: {
        Row: {
          created_at: string
          date: string
          description: string | null
          holiday_type: string
          id: string
          is_office_closed: boolean | null
          store_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          holiday_type?: string
          id?: string
          is_office_closed?: boolean | null
          store_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          holiday_type?: string
          id?: string
          is_office_closed?: boolean | null
          store_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "office_holidays_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          order_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          order_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          order_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_comments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_copy_templates: {
        Row: {
          created_at: string
          id: string
          store_id: string
          template: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          store_id: string
          template?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          store_id?: string
          template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_copy_templates_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_courier: {
        Row: {
          awb_number: string | null
          courier_id: string
          courier_name: string
          created_at: string | null
          id: string
          order_id: string
          sent_at: string | null
          status: string | null
          tracking_code: string | null
          updated_at: string | null
        }
        Insert: {
          awb_number?: string | null
          courier_id: string
          courier_name: string
          created_at?: string | null
          id?: string
          order_id: string
          sent_at?: string | null
          status?: string | null
          tracking_code?: string | null
          updated_at?: string | null
        }
        Update: {
          awb_number?: string | null
          courier_id?: string
          courier_name?: string
          created_at?: string | null
          id?: string
          order_id?: string
          sent_at?: string | null
          status?: string | null
          tracking_code?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_courier_courier_id_fkey"
            columns: ["courier_id"]
            isOneToOne: false
            referencedRelation: "couriers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_courier_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          created_at: string
          event_by: string | null
          event_data: Json | null
          event_type: string
          id: string
          order_id: string
        }
        Insert: {
          created_at?: string
          event_by?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          order_id: string
        }
        Update: {
          created_at?: string
          event_by?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_history: {
        Row: {
          changed_by: string | null
          created_at: string
          description: string | null
          event_type: string
          id: string
          new_value: string | null
          old_value: string | null
          order_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          order_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          discount: number | null
          id: string
          order_id: string
          product_id: string
          product_name: string
          quantity: number
          total_price: number
          unit_price: number
          variant_details: Json | null
        }
        Insert: {
          created_at?: string | null
          discount?: number | null
          id?: string
          order_id: string
          product_id: string
          product_name: string
          quantity?: number
          total_price: number
          unit_price: number
          variant_details?: Json | null
        }
        Update: {
          created_at?: string | null
          discount?: number | null
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          quantity?: number
          total_price?: number
          unit_price?: number
          variant_details?: Json | null
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
      order_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_status: string
          notes: string | null
          order_id: string
          previous_status: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status: string
          notes?: string | null
          order_id: string
          previous_status?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status?: string
          notes?: string | null
          order_id?: string
          previous_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          ai_last_evaluated_at: string | null
          ai_notes: string | null
          ai_rto_risk_label: string | null
          ai_rto_risk_score: number | null
          amount: number | null
          assigned_to_user_id: string | null
          branch_id: string | null
          called_by_role: string | null
          called_by_user_id: string | null
          cancelled_at: string | null
          cod_status: string | null
          confirmed_at: string | null
          confirmed_by_user_id: string | null
          courier_provider: string | null
          courier_submitted_at: string | null
          courier_submitted_by: string | null
          courier_tracking_code: string | null
          created_at: string | null
          created_by_staff_id: string | null
          customer_email: string | null
          customer_id: string | null
          delivery_charge: number | null
          delivery_location: string | null
          delivery_notes: string | null
          destination_branch: string | null
          discount_amount: number | null
          full_address: string | null
          id: string
          inside_delivery_remark: string | null
          inside_delivery_status: string | null
          inside_delivery_updated_at: string | null
          inside_delivery_updated_by: string | null
          is_cod: boolean | null
          is_counted_in_sales: boolean | null
          is_deleted: boolean | null
          is_duplicate: boolean | null
          lead_id: string | null
          logistic_order_id: string | null
          logistic_raw_response: Json | null
          logistic_tracking_last_update: string | null
          logistic_tracking_status: string | null
          logistic_tracking_substatus: string | null
          logistics_courier: string | null
          logistics_parcel_code: string | null
          logistics_sent_at: string | null
          logistics_status: string | null
          logistics_tracking_id: string | null
          order_date: string | null
          order_notes: string | null
          order_number: number | null
          order_status: Database["public"]["Enums"]["order_status"] | null
          partner_order_id: string | null
          partner_status: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          product_id: string | null
          quantity: number | null
          redirected_at: string | null
          redirected_by_user_id: string | null
          sales_person_id: string | null
          sent_to_logistics: boolean | null
          shipping_partner: string | null
          store_id: string | null
        }
        Insert: {
          ai_last_evaluated_at?: string | null
          ai_notes?: string | null
          ai_rto_risk_label?: string | null
          ai_rto_risk_score?: number | null
          amount?: number | null
          assigned_to_user_id?: string | null
          branch_id?: string | null
          called_by_role?: string | null
          called_by_user_id?: string | null
          cancelled_at?: string | null
          cod_status?: string | null
          confirmed_at?: string | null
          confirmed_by_user_id?: string | null
          courier_provider?: string | null
          courier_submitted_at?: string | null
          courier_submitted_by?: string | null
          courier_tracking_code?: string | null
          created_at?: string | null
          created_by_staff_id?: string | null
          customer_email?: string | null
          customer_id?: string | null
          delivery_charge?: number | null
          delivery_location?: string | null
          delivery_notes?: string | null
          destination_branch?: string | null
          discount_amount?: number | null
          full_address?: string | null
          id?: string
          inside_delivery_remark?: string | null
          inside_delivery_status?: string | null
          inside_delivery_updated_at?: string | null
          inside_delivery_updated_by?: string | null
          is_cod?: boolean | null
          is_counted_in_sales?: boolean | null
          is_deleted?: boolean | null
          is_duplicate?: boolean | null
          lead_id?: string | null
          logistic_order_id?: string | null
          logistic_raw_response?: Json | null
          logistic_tracking_last_update?: string | null
          logistic_tracking_status?: string | null
          logistic_tracking_substatus?: string | null
          logistics_courier?: string | null
          logistics_parcel_code?: string | null
          logistics_sent_at?: string | null
          logistics_status?: string | null
          logistics_tracking_id?: string | null
          order_date?: string | null
          order_notes?: string | null
          order_number?: number | null
          order_status?: Database["public"]["Enums"]["order_status"] | null
          partner_order_id?: string | null
          partner_status?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          product_id?: string | null
          quantity?: number | null
          redirected_at?: string | null
          redirected_by_user_id?: string | null
          sales_person_id?: string | null
          sent_to_logistics?: boolean | null
          shipping_partner?: string | null
          store_id?: string | null
        }
        Update: {
          ai_last_evaluated_at?: string | null
          ai_notes?: string | null
          ai_rto_risk_label?: string | null
          ai_rto_risk_score?: number | null
          amount?: number | null
          assigned_to_user_id?: string | null
          branch_id?: string | null
          called_by_role?: string | null
          called_by_user_id?: string | null
          cancelled_at?: string | null
          cod_status?: string | null
          confirmed_at?: string | null
          confirmed_by_user_id?: string | null
          courier_provider?: string | null
          courier_submitted_at?: string | null
          courier_submitted_by?: string | null
          courier_tracking_code?: string | null
          created_at?: string | null
          created_by_staff_id?: string | null
          customer_email?: string | null
          customer_id?: string | null
          delivery_charge?: number | null
          delivery_location?: string | null
          delivery_notes?: string | null
          destination_branch?: string | null
          discount_amount?: number | null
          full_address?: string | null
          id?: string
          inside_delivery_remark?: string | null
          inside_delivery_status?: string | null
          inside_delivery_updated_at?: string | null
          inside_delivery_updated_by?: string | null
          is_cod?: boolean | null
          is_counted_in_sales?: boolean | null
          is_deleted?: boolean | null
          is_duplicate?: boolean | null
          lead_id?: string | null
          logistic_order_id?: string | null
          logistic_raw_response?: Json | null
          logistic_tracking_last_update?: string | null
          logistic_tracking_status?: string | null
          logistic_tracking_substatus?: string | null
          logistics_courier?: string | null
          logistics_parcel_code?: string | null
          logistics_sent_at?: string | null
          logistics_status?: string | null
          logistics_tracking_id?: string | null
          order_date?: string | null
          order_notes?: string | null
          order_number?: number | null
          order_status?: Database["public"]["Enums"]["order_status"] | null
          partner_order_id?: string | null
          partner_status?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          product_id?: string | null
          quantity?: number | null
          redirected_at?: string | null
          redirected_by_user_id?: string | null
          sales_person_id?: string | null
          sent_to_logistics?: boolean | null
          shipping_partner?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_confirmed_by_user_id_fkey"
            columns: ["confirmed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_created_by_staff_id_fkey"
            columns: ["created_by_staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_redirected_by_user_id_fkey"
            columns: ["redirected_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_sales_person_id_fkey"
            columns: ["sales_person_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      parties: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          name: string
          opening_balance: number | null
          opening_balance_type: string | null
          party_type: string
          phone: string | null
          remarks: string | null
          store_id: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name: string
          opening_balance?: number | null
          opening_balance_type?: string | null
          party_type: string
          phone?: string | null
          remarks?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string
          opening_balance?: number | null
          opening_balance_type?: string | null
          party_type?: string
          phone?: string | null
          remarks?: string | null
          store_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parties_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      party_ledger: {
        Row: {
          balance: number | null
          created_at: string | null
          credit: number | null
          date: string
          debit: number | null
          description: string
          id: string
          party_id: string
          transaction_id: string | null
        }
        Insert: {
          balance?: number | null
          created_at?: string | null
          credit?: number | null
          date?: string
          debit?: number | null
          description: string
          id?: string
          party_id: string
          transaction_id?: string | null
        }
        Update: {
          balance?: number | null
          created_at?: string | null
          credit?: number | null
          date?: string
          debit?: number | null
          description?: string
          id?: string
          party_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "party_ledger_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_ledger_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      party_payments: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string | null
          date: string
          id: string
          method: string
          note: string | null
          party_id: string
          payment_type: string
          reference: string | null
          store_id: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          created_at?: string | null
          date: string
          id?: string
          method: string
          note?: string | null
          party_id: string
          payment_type: string
          reference?: string | null
          store_id?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string | null
          date?: string
          id?: string
          method?: string
          note?: string | null
          party_id?: string
          payment_type?: string
          reference?: string | null
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "party_payments_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_payments_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_payments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      party_transactions: {
        Row: {
          amount: number
          created_at: string | null
          date: string
          direction: string
          id: string
          is_settled: boolean | null
          party_id: string
          product_id: string | null
          qty: number | null
          rate: number | null
          reference: string | null
          remarks: string | null
          settled_account_id: string | null
          settled_at: string | null
          source: string
          store_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          date: string
          direction: string
          id?: string
          is_settled?: boolean | null
          party_id: string
          product_id?: string | null
          qty?: number | null
          rate?: number | null
          reference?: string | null
          remarks?: string | null
          settled_account_id?: string | null
          settled_at?: string | null
          source: string
          store_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          date?: string
          direction?: string
          id?: string
          is_settled?: boolean | null
          party_id?: string
          product_id?: string | null
          qty?: number | null
          rate?: number | null
          reference?: string | null
          remarks?: string | null
          settled_account_id?: string | null
          settled_at?: string | null
          source?: string
          store_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "party_transactions_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_settled_account_id_fkey"
            columns: ["settled_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "party_transactions_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          allowances: number | null
          basic_salary: number
          created_at: string
          deductions: number | null
          employee_id: string
          id: string
          month: string
          net_salary: number | null
          notes: string | null
          paid_on: string | null
          payment_status: string
          store_id: string | null
        }
        Insert: {
          allowances?: number | null
          basic_salary?: number
          created_at?: string
          deductions?: number | null
          employee_id: string
          id?: string
          month: string
          net_salary?: number | null
          notes?: string | null
          paid_on?: string | null
          payment_status?: string
          store_id?: string | null
        }
        Update: {
          allowances?: number | null
          basic_salary?: number
          created_at?: string
          deductions?: number | null
          employee_id?: string
          id?: string
          month?: string
          net_salary?: number | null
          notes?: string | null
          paid_on?: string | null
          payment_status?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      plugins: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          plugin_name: string
          plugin_type: string
          store_id: string
          updated_at: string | null
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          plugin_name: string
          plugin_type: string
          store_id: string
          updated_at?: string | null
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          plugin_name?: string
          plugin_type?: string
          store_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plugins_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      product_inventory: {
        Row: {
          created_at: string
          current_stock: number
          drawer_number: string | null
          id: string
          opening_stock: number
          product_id: string
          reorder_level: number
          reorder_required: boolean
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          current_stock?: number
          drawer_number?: string | null
          id?: string
          opening_stock?: number
          product_id: string
          reorder_level?: number
          reorder_required?: boolean
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          current_stock?: number
          drawer_number?: string | null
          id?: string
          opening_stock?: number
          product_id?: string
          reorder_level?: number
          reorder_required?: boolean
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_inventory_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          cost_price: number | null
          created_at: string | null
          delivery_cost: number | null
          description: string | null
          id: string
          images: string[] | null
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          sell_price: number | null
          slug: string | null
          store_id: string | null
          target_per_day: number | null
          wholesale_price: number | null
        }
        Insert: {
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          delivery_cost?: number | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          sell_price?: number | null
          slug?: string | null
          store_id?: string | null
          target_per_day?: number | null
          wholesale_price?: number | null
        }
        Update: {
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          delivery_cost?: number | null
          description?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          sell_price?: number | null
          slug?: string | null
          store_id?: string | null
          target_per_day?: number | null
          wholesale_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          daily_target: number | null
          default_store_id: string | null
          email: string
          email_verified: boolean | null
          email_verified_at: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"]
          total_leads_ever_assigned: number | null
          updated_at: string | null
          username: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          daily_target?: number | null
          default_store_id?: string | null
          email: string
          email_verified?: boolean | null
          email_verified_at?: string | null
          id: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          total_leads_ever_assigned?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          daily_target?: number | null
          default_store_id?: string | null
          email?: string
          email_verified?: boolean | null
          email_verified_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          total_leads_ever_assigned?: number | null
          updated_at?: string | null
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_store_id_fkey"
            columns: ["default_store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_audit_logs: {
        Row: {
          action_type: string
          affected_role_id: string | null
          affected_user_id: string | null
          change_summary: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          ip_address: string | null
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action_type: string
          affected_role_id?: string | null
          affected_user_id?: string | null
          change_summary?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action_type?: string
          affected_role_id?: string | null
          affected_user_id?: string | null
          change_summary?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "rbac_audit_logs_affected_role_id_fkey"
            columns: ["affected_role_id"]
            isOneToOne: false
            referencedRelation: "system_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          customer_id: string | null
          id: string
          is_approved: boolean | null
          is_verified: boolean | null
          order_id: string | null
          product_id: string
          rating: number
          store_id: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_approved?: boolean | null
          is_verified?: boolean | null
          order_id?: string | null
          product_id: string
          rating: number
          store_id: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          customer_id?: string | null
          id?: string
          is_approved?: boolean | null
          is_verified?: boolean | null
          order_id?: string | null
          product_id?: string
          rating?: number
          store_id?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_create: boolean | null
          can_delete: boolean | null
          can_edit: boolean | null
          can_export: boolean | null
          can_manage_settings: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          module_id: string
          role_id: string
          updated_at: string | null
        }
        Insert: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_export?: boolean | null
          can_manage_settings?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module_id: string
          role_id: string
          updated_at?: string | null
        }
        Update: {
          can_create?: boolean | null
          can_delete?: boolean | null
          can_edit?: boolean | null
          can_export?: boolean | null
          can_manage_settings?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          module_id?: string
          role_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "system_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "system_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      routing_rules: {
        Row: {
          created_at: string
          delivery_location: string | null
          description: string | null
          districts: string[] | null
          id: string
          is_active: boolean
          is_cod: boolean | null
          max_weight_grams: number | null
          min_weight_grams: number | null
          name: string
          priority: number
          recommended_courier: Database["public"]["Enums"]["courier_provider"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_location?: string | null
          description?: string | null
          districts?: string[] | null
          id?: string
          is_active?: boolean
          is_cod?: boolean | null
          max_weight_grams?: number | null
          min_weight_grams?: number | null
          name: string
          priority?: number
          recommended_courier: Database["public"]["Enums"]["courier_provider"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_location?: string | null
          description?: string | null
          districts?: string[] | null
          id?: string
          is_active?: boolean
          is_cod?: boolean | null
          max_weight_grams?: number | null
          min_weight_grams?: number | null
          name?: string
          priority?: number
          recommended_courier?: Database["public"]["Enums"]["courier_provider"]
          updated_at?: string
        }
        Relationships: []
      }
      sales_records: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          order_id: string
          product_id: string | null
          qty: number
          recorded_at: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id: string
          product_id?: string | null
          qty?: number
          recorded_at?: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          order_id?: string
          product_id?: string | null
          qty?: number
          recorded_at?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_records_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          is_active: boolean | null
          name: string
          start_time: string
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          name: string
          start_time: string
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          name?: string
          start_time?: string
        }
        Relationships: []
      }
      social_channels: {
        Row: {
          access_token: string | null
          created_at: string | null
          created_by_user_id: string | null
          display_name: string
          expires_at: string | null
          handle: string | null
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          refresh_token: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          display_name: string
          expires_at?: string | null
          handle?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          refresh_token?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          display_name?: string
          expires_at?: string | null
          handle?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          refresh_token?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      social_post_channels: {
        Row: {
          channel_id: string
          clicks: number | null
          comments: number | null
          created_at: string | null
          error_message: string | null
          external_post_id: string | null
          id: string
          likes: number | null
          metrics_fetched_at: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          post_id: string
          saves: number | null
          scheduled_at: string | null
          shares: number | null
          status: Database["public"]["Enums"]["channel_post_status"] | null
          updated_at: string | null
          views: number | null
        }
        Insert: {
          channel_id: string
          clicks?: number | null
          comments?: number | null
          created_at?: string | null
          error_message?: string | null
          external_post_id?: string | null
          id?: string
          likes?: number | null
          metrics_fetched_at?: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          post_id: string
          saves?: number | null
          scheduled_at?: string | null
          shares?: number | null
          status?: Database["public"]["Enums"]["channel_post_status"] | null
          updated_at?: string | null
          views?: number | null
        }
        Update: {
          channel_id?: string
          clicks?: number | null
          comments?: number | null
          created_at?: string | null
          error_message?: string | null
          external_post_id?: string | null
          id?: string
          likes?: number | null
          metrics_fetched_at?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          post_id?: string
          saves?: number | null
          scheduled_at?: string | null
          shares?: number | null
          status?: Database["public"]["Enums"]["channel_post_status"] | null
          updated_at?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_post_channels_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "social_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_channels_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          campaign_id: string | null
          caption: string | null
          created_at: string
          hashtags: string | null
          id: string
          owner: string | null
          platform: string
          post_link: string | null
          post_type: string | null
          product: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: string | null
          thumbnail_link: string | null
          title: string | null
          updated_at: string
          video_project_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          caption?: string | null
          created_at?: string
          hashtags?: string | null
          id?: string
          owner?: string | null
          platform?: string
          post_link?: string | null
          post_type?: string | null
          product?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string | null
          thumbnail_link?: string | null
          title?: string | null
          updated_at?: string
          video_project_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          caption?: string | null
          created_at?: string
          hashtags?: string | null
          id?: string
          owner?: string | null
          platform?: string
          post_link?: string | null
          post_type?: string | null
          product?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string | null
          thumbnail_link?: string | null
          title?: string | null
          updated_at?: string
          video_project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_posts_video_project_id_fkey"
            columns: ["video_project_id"]
            isOneToOne: false
            referencedRelation: "video_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_daily_summary: {
        Row: {
          called_leads: number | null
          confirmed_orders: number | null
          created_at: string | null
          date: string
          followups: number | null
          id: string
          not_interested: number | null
          performance_percent: number | null
          role: string | null
          staff_id: string
          total_leads: number | null
          total_order_amount: number | null
          transferred_leads: number | null
        }
        Insert: {
          called_leads?: number | null
          confirmed_orders?: number | null
          created_at?: string | null
          date: string
          followups?: number | null
          id?: string
          not_interested?: number | null
          performance_percent?: number | null
          role?: string | null
          staff_id: string
          total_leads?: number | null
          total_order_amount?: number | null
          transferred_leads?: number | null
        }
        Update: {
          called_leads?: number | null
          confirmed_orders?: number | null
          created_at?: string | null
          date?: string
          followups?: number | null
          id?: string
          not_interested?: number | null
          performance_percent?: number | null
          role?: string | null
          staff_id?: string
          total_leads?: number | null
          total_order_amount?: number | null
          transferred_leads?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_daily_summary_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_targets: {
        Row: {
          active_from: string
          active_to: string | null
          created_at: string
          daily_target_followups: number | null
          daily_target_leads: number | null
          daily_target_orders: number | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_from?: string
          active_to?: string | null
          created_at?: string
          daily_target_followups?: number | null
          daily_target_leads?: number | null
          daily_target_orders?: number | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_from?: string
          active_to?: string | null
          created_at?: string
          daily_target_followups?: number | null
          daily_target_leads?: number | null
          daily_target_orders?: number | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_targets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string
          id: string
          is_sale: boolean | null
          movement_date: string
          movement_reason: string | null
          movement_source: string | null
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          party_id: string | null
          product_id: string
          qty: number
          reference_id: string | null
          reference_type: string | null
          remark: string | null
          sale_category: string | null
          source: string | null
          total_cost: number | null
          total_value: number | null
          unit_cost: number | null
          unit_price: number | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_sale?: boolean | null
          movement_date?: string
          movement_reason?: string | null
          movement_source?: string | null
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          party_id?: string | null
          product_id: string
          qty: number
          reference_id?: string | null
          reference_type?: string | null
          remark?: string | null
          sale_category?: string | null
          source?: string | null
          total_cost?: number | null
          total_value?: number | null
          unit_cost?: number | null
          unit_price?: number | null
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_sale?: boolean | null
          movement_date?: string
          movement_reason?: string | null
          movement_source?: string | null
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          party_id?: string | null
          product_id?: string
          qty?: number
          reference_id?: string | null
          reference_type?: string | null
          remark?: string | null
          sale_category?: string | null
          source?: string | null
          total_cost?: number | null
          total_value?: number | null
          unit_cost?: number | null
          unit_price?: number | null
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      store_domains: {
        Row: {
          created_at: string | null
          domain: string
          id: string
          is_primary: boolean | null
          store_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string | null
          domain: string
          id?: string
          is_primary?: boolean | null
          store_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string | null
          domain?: string
          id?: string
          is_primary?: boolean | null
          store_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_domains_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_pages: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          is_published: boolean | null
          meta_description: string | null
          meta_title: string | null
          slug: string
          store_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          slug: string
          store_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          meta_description?: string | null
          meta_title?: string | null
          slug?: string
          store_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "store_pages_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_phone: string | null
          created_at: string | null
          currency: string | null
          default_subdomain: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          primary_color: string | null
          slug: string
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          currency?: string | null
          default_subdomain?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          primary_color?: string | null
          slug: string
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string | null
          currency?: string | null
          default_subdomain?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          slug?: string
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      system_branding: {
        Row: {
          brand_name: string
          custom_css: string | null
          default_theme: string
          favicon_url: string | null
          id: string
          logo_url: string | null
          primary_color: string | null
          updated_at: string
        }
        Insert: {
          brand_name?: string
          custom_css?: string | null
          default_theme?: string
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          updated_at?: string
        }
        Update: {
          brand_name?: string
          custom_css?: string | null
          default_theme?: string
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_modules: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      system_roles: {
        Row: {
          created_at: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean | null
          is_system_role: boolean | null
          role_key: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          role_key: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean | null
          is_system_role?: boolean | null
          role_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      training_certificates: {
        Row: {
          certificate_code: string
          course_id: string
          id: string
          issued_at: string
          pdf_url: string | null
          user_id: string
        }
        Insert: {
          certificate_code: string
          course_id: string
          id?: string
          issued_at?: string
          pdf_url?: string | null
          user_id: string
        }
        Update: {
          certificate_code?: string
          course_id?: string
          id?: string
          issued_at?: string
          pdf_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      training_courses: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          estimated_minutes: number | null
          id: string
          is_active: boolean
          is_mandatory: boolean
          level: Database["public"]["Enums"]["course_level"]
          slug: string
          store_id: string | null
          target_roles: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          level?: Database["public"]["Enums"]["course_level"]
          slug: string
          store_id?: string | null
          target_roles?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          estimated_minutes?: number | null
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          level?: Database["public"]["Enums"]["course_level"]
          slug?: string
          store_id?: string | null
          target_roles?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_courses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      training_enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string
          id: string
          progress_percent: number
          started_at: string | null
          status: Database["public"]["Enums"]["enrollment_status"]
          store_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string
          id?: string
          progress_percent?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          store_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string
          id?: string
          progress_percent?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["enrollment_status"]
          store_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_enrollments_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      training_lesson_completions: {
        Row: {
          completed_at: string
          id: string
          lesson_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          lesson_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          lesson_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_lesson_completions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "training_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      training_lessons: {
        Row: {
          attachment_url: string | null
          content_markdown: string | null
          course_id: string
          created_at: string
          id: string
          order_index: number
          title: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          attachment_url?: string | null
          content_markdown?: string | null
          course_id: string
          created_at?: string
          id?: string
          order_index?: number
          title: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          attachment_url?: string | null
          content_markdown?: string | null
          course_id?: string
          created_at?: string
          id?: string
          order_index?: number
          title?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      training_questions: {
        Row: {
          correct_option_index: number
          created_at: string
          id: string
          options: Json
          question_text: string
          quiz_id: string
          type: Database["public"]["Enums"]["question_type"]
        }
        Insert: {
          correct_option_index?: number
          created_at?: string
          id?: string
          options?: Json
          question_text: string
          quiz_id: string
          type?: Database["public"]["Enums"]["question_type"]
        }
        Update: {
          correct_option_index?: number
          created_at?: string
          id?: string
          options?: Json
          question_text?: string
          quiz_id?: string
          type?: Database["public"]["Enums"]["question_type"]
        }
        Relationships: [
          {
            foreignKeyName: "training_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      training_quiz_attempts: {
        Row: {
          answers: Json
          attempted_at: string
          id: string
          passed: boolean
          quiz_id: string
          score: number
          user_id: string
        }
        Insert: {
          answers?: Json
          attempted_at?: string
          id?: string
          passed?: boolean
          quiz_id: string
          score?: number
          user_id: string
        }
        Update: {
          answers?: Json
          attempted_at?: string
          id?: string
          passed?: boolean
          quiz_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "training_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      training_quizzes: {
        Row: {
          course_id: string
          created_at: string
          id: string
          pass_marks: number
          title: string
          total_marks: number
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          pass_marks?: number
          title: string
          total_marks?: number
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          pass_marks?: number
          title?: string
          total_marks?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_categories: {
        Row: {
          created_at: string | null
          id: string
          is_system: boolean | null
          name: string
          nature: string
          store_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          name: string
          nature: string
          store_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_system?: boolean | null
          name?: string
          nature?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transaction_categories_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_id: string | null
          amount: number
          category_id: string | null
          created_at: string | null
          created_by: string | null
          currency: string | null
          date: string
          description: string | null
          from_account_id: string | null
          id: string
          is_cleared: boolean | null
          note: string | null
          order_id: string | null
          party_id: string | null
          reference_no: string | null
          store_id: string | null
          to_account_id: string | null
          transaction_code: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          account_id?: string | null
          amount: number
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          date?: string
          description?: string | null
          from_account_id?: string | null
          id?: string
          is_cleared?: boolean | null
          note?: string | null
          order_id?: string | null
          party_id?: string | null
          reference_no?: string | null
          store_id?: string | null
          to_account_id?: string | null
          transaction_code?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          account_id?: string | null
          amount?: number
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          date?: string
          description?: string | null
          from_account_id?: string | null
          id?: string
          is_cleared?: boolean | null
          note?: string | null
          order_id?: string | null
          party_id?: string | null
          reference_no?: string | null
          store_id?: string | null
          to_account_id?: string | null
          transaction_code?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "transaction_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_from_account_id_fkey"
            columns: ["from_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_party_id_fkey"
            columns: ["party_id"]
            isOneToOne: false
            referencedRelation: "parties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_to_account_id_fkey"
            columns: ["to_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
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
      user_store_access: {
        Row: {
          access_level: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          store_id: string
          store_role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_level?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          store_id: string
          store_role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_level?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          store_id?: string
          store_role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_store_access_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_store_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_view_state: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          section: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          section: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          section?: string
          user_id?: string
        }
        Relationships: []
      }
      video_projects: {
        Row: {
          assigned_team: string | null
          campaign_id: string | null
          created_at: string
          edit_deadline: string | null
          editor_name: string | null
          final_video_link: string | null
          id: string
          main_product: string | null
          notes: string | null
          platforms: string | null
          project_type: string | null
          publish_date: string | null
          raw_footage_link: string | null
          reference_link: string | null
          script_link: string | null
          script_ready: boolean | null
          shoot_date: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_team?: string | null
          campaign_id?: string | null
          created_at?: string
          edit_deadline?: string | null
          editor_name?: string | null
          final_video_link?: string | null
          id?: string
          main_product?: string | null
          notes?: string | null
          platforms?: string | null
          project_type?: string | null
          publish_date?: string | null
          raw_footage_link?: string | null
          reference_link?: string | null
          script_link?: string | null
          script_ready?: boolean | null
          shoot_date?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_team?: string | null
          campaign_id?: string | null
          created_at?: string
          edit_deadline?: string | null
          editor_name?: string | null
          final_video_link?: string | null
          id?: string
          main_product?: string | null
          notes?: string | null
          platforms?: string | null
          project_type?: string | null
          publish_date?: string | null
          raw_footage_link?: string | null
          reference_link?: string | null
          script_link?: string | null
          script_ready?: boolean | null
          shoot_date?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_projects_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          location: string | null
          name: string
          remarks: string | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          remarks?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          remarks?: string | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_verification_otp: { Args: { p_user_id: string }; Returns: string }
      generate_otp: { Args: never; Returns: string }
      get_customer_insight: { Args: { p_phone: string }; Returns: Json }
      get_user_accessible_stores: {
        Args: { p_user_id: string }
        Returns: {
          access_level: string
          store_id: string
          store_name: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_store_ids: { Args: { p_user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      perform_system_reset: {
        Args: never
        Returns: {
          rows_deleted: number
          table_name: string
        }[]
      }
      recalculate_account_balance: {
        Args: { p_account_id: string }
        Returns: undefined
      }
      refresh_courier_stats: { Args: { p_date?: string }; Returns: undefined }
      reset_order_number_sequence: {
        Args: { start_value?: number }
        Returns: undefined
      }
      user_has_store_access: {
        Args: { p_store_id: string; p_user_id: string }
        Returns: boolean
      }
      verify_email_otp: {
        Args: { p_otp: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "ADMIN"
        | "LEADS"
        | "CALLING"
        | "FOLLOWUP"
        | "LOGISTICS"
        | "MARKETING"
        | "MANAGER"
        | "HR"
        | "OWNER"
        | "ACCOUNTANT"
        | "WAREHOUSE"
      bill_status:
        | "DRAFT"
        | "PENDING"
        | "PARTIALLY_PAID"
        | "PAID"
        | "OVERDUE"
        | "CANCELLED"
      channel_post_status: "PENDING" | "SCHEDULED" | "PUBLISHED" | "FAILED"
      cod_settlement_status: "PENDING" | "SETTLED" | "PARTIAL"
      courier_provider: "NCM" | "GBL" | "PATHAO" | "GAAUBESI"
      course_level: "BASIC" | "INTERMEDIATE" | "ADVANCED"
      employee_doc_status: "PENDING" | "VERIFIED" | "REJECTED"
      employee_doc_type:
        | "PROFILE_PHOTO"
        | "CITIZENSHIP_FRONT"
        | "CITIZENSHIP_BACK"
        | "PAN_CARD"
        | "COMPANY_REQUIREMENT_DOC"
        | "OTHER"
      enrollment_status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
      invoice_status:
        | "DRAFT"
        | "SENT"
        | "PARTIALLY_PAID"
        | "PAID"
        | "OVERDUE"
        | "CANCELLED"
      lead_bucket:
        | "NEW"
        | "FOLLOWUP"
        | "CANCELLED"
        | "FOLLOW_UP_POOL"
        | "CNR_POOL"
      lead_status:
        | "NEW"
        | "ASSIGNED"
        | "IN_PROGRESS"
        | "CONFIRMED"
        | "FOLLOW_UP"
        | "CALL_NOT_RECEIVED"
        | "CANCELLED"
        | "REDIRECT"
      logistics_delivery_status:
        | "PENDING_PICKUP"
        | "PICKED_UP"
        | "IN_TRANSIT"
        | "OUT_FOR_DELIVERY"
        | "DELIVERED"
        | "CANCELED"
        | "RTO"
        | "RETURNED_TO_SELLER"
      message_channel_type: "SMS" | "WHATSAPP"
      message_provider: "SPARROW" | "TWILIO" | "META" | "OTHER"
      message_recipient_type: "CUSTOMER" | "RESELLER" | "STAFF" | "ADMIN"
      message_status: "PENDING" | "SENT" | "FAILED"
      order_status:
        | "CONFIRMED"
        | "PACKED"
        | "DISPATCHED"
        | "DELIVERED"
        | "RETURNED"
        | "SENT_FOR_DELIVERY"
        | "LOCATION_CNR"
        | "PENDING"
        | "CANCELLED"
        | "SENT_FOR_NCM"
        | "SENT_FOR_PATHAO"
        | "REDIRECT"
      payment_method_type: "CASH" | "BANK" | "ONLINE"
      payment_status: "PENDING" | "PAID" | "COD"
      question_type: "MCQ" | "TRUE_FALSE"
      social_platform:
        | "FACEBOOK"
        | "INSTAGRAM"
        | "TIKTOK"
        | "YOUTUBE"
        | "LINKEDIN"
        | "TWITTER"
      stock_movement_type:
        | "IN"
        | "OUT"
        | "TRANSFER_IN"
        | "TRANSFER_OUT"
        | "ADJUSTMENT"
        | "RTO_IN"
        | "RTO_OUT"
      team_type: "LEADS" | "CALLING" | "FOLLOWUP"
      transaction_type: "INCOME" | "EXPENSE" | "TRANSFER"
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
        "ADMIN",
        "LEADS",
        "CALLING",
        "FOLLOWUP",
        "LOGISTICS",
        "MARKETING",
        "MANAGER",
        "HR",
        "OWNER",
        "ACCOUNTANT",
        "WAREHOUSE",
      ],
      bill_status: [
        "DRAFT",
        "PENDING",
        "PARTIALLY_PAID",
        "PAID",
        "OVERDUE",
        "CANCELLED",
      ],
      channel_post_status: ["PENDING", "SCHEDULED", "PUBLISHED", "FAILED"],
      cod_settlement_status: ["PENDING", "SETTLED", "PARTIAL"],
      courier_provider: ["NCM", "GBL", "PATHAO", "GAAUBESI"],
      course_level: ["BASIC", "INTERMEDIATE", "ADVANCED"],
      employee_doc_status: ["PENDING", "VERIFIED", "REJECTED"],
      employee_doc_type: [
        "PROFILE_PHOTO",
        "CITIZENSHIP_FRONT",
        "CITIZENSHIP_BACK",
        "PAN_CARD",
        "COMPANY_REQUIREMENT_DOC",
        "OTHER",
      ],
      enrollment_status: ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"],
      invoice_status: [
        "DRAFT",
        "SENT",
        "PARTIALLY_PAID",
        "PAID",
        "OVERDUE",
        "CANCELLED",
      ],
      lead_bucket: [
        "NEW",
        "FOLLOWUP",
        "CANCELLED",
        "FOLLOW_UP_POOL",
        "CNR_POOL",
      ],
      lead_status: [
        "NEW",
        "ASSIGNED",
        "IN_PROGRESS",
        "CONFIRMED",
        "FOLLOW_UP",
        "CALL_NOT_RECEIVED",
        "CANCELLED",
        "REDIRECT",
      ],
      logistics_delivery_status: [
        "PENDING_PICKUP",
        "PICKED_UP",
        "IN_TRANSIT",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELED",
        "RTO",
        "RETURNED_TO_SELLER",
      ],
      message_channel_type: ["SMS", "WHATSAPP"],
      message_provider: ["SPARROW", "TWILIO", "META", "OTHER"],
      message_recipient_type: ["CUSTOMER", "RESELLER", "STAFF", "ADMIN"],
      message_status: ["PENDING", "SENT", "FAILED"],
      order_status: [
        "CONFIRMED",
        "PACKED",
        "DISPATCHED",
        "DELIVERED",
        "RETURNED",
        "SENT_FOR_DELIVERY",
        "LOCATION_CNR",
        "PENDING",
        "CANCELLED",
        "SENT_FOR_NCM",
        "SENT_FOR_PATHAO",
        "REDIRECT",
      ],
      payment_method_type: ["CASH", "BANK", "ONLINE"],
      payment_status: ["PENDING", "PAID", "COD"],
      question_type: ["MCQ", "TRUE_FALSE"],
      social_platform: [
        "FACEBOOK",
        "INSTAGRAM",
        "TIKTOK",
        "YOUTUBE",
        "LINKEDIN",
        "TWITTER",
      ],
      stock_movement_type: [
        "IN",
        "OUT",
        "TRANSFER_IN",
        "TRANSFER_OUT",
        "ADJUSTMENT",
        "RTO_IN",
        "RTO_OUT",
      ],
      team_type: ["LEADS", "CALLING", "FOLLOWUP"],
      transaction_type: ["INCOME", "EXPENSE", "TRANSFER"],
    },
  },
} as const
