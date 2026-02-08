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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      attendance_import_jobs: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          error_message: string | null
          finished_at: string | null
          id: string
          provider: string
          source_uri: string | null
          started_at: string | null
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          provider: string
          source_uri?: string | null
          started_at?: string | null
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          finished_at?: string | null
          id?: string
          provider?: string
          source_uri?: string | null
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_import_jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor_user_id: string | null
          company_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: number
          metadata: Json
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          company_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: number
          metadata?: Json
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          company_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: number
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          country_code: string
          created_at: string
          currency_code: string
          id: string
          is_active: boolean
          legal_name: string
          timezone: string
          trade_name: string | null
          updated_at: string
        }
        Insert: {
          country_code?: string
          created_at?: string
          currency_code?: string
          id?: string
          is_active?: boolean
          legal_name: string
          timezone?: string
          trade_name?: string | null
          updated_at?: string
        }
        Update: {
          country_code?: string
          created_at?: string
          currency_code?: string
          id?: string
          is_active?: boolean
          legal_name?: string
          timezone?: string
          trade_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      company_memberships: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_reminders: {
        Row: {
          company_id: string
          created_at: string
          due_date: string
          id: string
          related_entity_id: string | null
          related_entity_type: string | null
          reminder_type: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          due_date: string
          id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          reminder_type: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          due_date?: string
          id?: string
          related_entity_id?: string | null
          related_entity_type?: string | null
          reminder_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_reminders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      deduction_types: {
        Row: {
          code: string
          company_id: string
          created_at: string
          id: string
          is_pre_tax: boolean
          is_statutory: boolean
          name: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_pre_tax?: boolean
          is_statutory?: boolean
          name: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_pre_tax?: boolean
          is_statutory?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "deduction_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          company_id: string
          content_hash: string | null
          created_at: string
          document_type: string
          entity_id: string | null
          entity_type: string | null
          file_uri: string
          id: string
          metadata: Json
          retention_until: string | null
          storage_bucket: string
          uploaded_by: string | null
        }
        Insert: {
          company_id: string
          content_hash?: string | null
          created_at?: string
          document_type: string
          entity_id?: string | null
          entity_type?: string | null
          file_uri: string
          id?: string
          metadata?: Json
          retention_until?: string | null
          storage_bucket?: string
          uploaded_by?: string | null
        }
        Update: {
          company_id?: string
          content_hash?: string | null
          created_at?: string
          document_type?: string
          entity_id?: string | null
          entity_type?: string | null
          file_uri?: string
          id?: string
          metadata?: Json
          retention_until?: string | null
          storage_bucket?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      earning_types: {
        Row: {
          code: string
          company_id: string
          created_at: string
          id: string
          is_statutory: boolean
          is_taxable: boolean
          name: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_statutory?: boolean
          is_taxable?: boolean
          name: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_statutory?: boolean
          is_taxable?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "earning_types_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_benefits_in_kind: {
        Row: {
          amount: number | null
          benefit_type: string
          company_id: string
          created_at: string
          effective_from: string
          effective_to: string | null
          employee_id: string
          id: string
          metadata: Json
        }
        Insert: {
          amount?: number | null
          benefit_type: string
          company_id: string
          created_at?: string
          effective_from: string
          effective_to?: string | null
          employee_id: string
          id?: string
          metadata?: Json
        }
        Update: {
          amount?: number | null
          benefit_type?: string
          company_id?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          id?: string
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "employee_benefits_in_kind_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_benefits_in_kind_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_contracts: {
        Row: {
          basic_salary: number
          company_id: string
          contract_type: string
          created_at: string
          currency_code: string
          effective_from: string
          effective_to: string | null
          employee_id: string
          id: string
          metadata: Json
          probation_end_date: string | null
          salary_frequency: string
          updated_at: string
        }
        Insert: {
          basic_salary?: number
          company_id: string
          contract_type: string
          created_at?: string
          currency_code?: string
          effective_from: string
          effective_to?: string | null
          employee_id: string
          id?: string
          metadata?: Json
          probation_end_date?: string | null
          salary_frequency?: string
          updated_at?: string
        }
        Update: {
          basic_salary?: number
          company_id?: string
          contract_type?: string
          created_at?: string
          currency_code?: string
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          id?: string
          metadata?: Json
          probation_end_date?: string | null
          salary_frequency?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_contracts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_contracts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_recurring_deductions: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          deduction_type_id: string
          effective_from: string
          effective_to: string | null
          employee_id: string
          id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          deduction_type_id: string
          effective_from: string
          effective_to?: string | null
          employee_id: string
          id?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          deduction_type_id?: string
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_recurring_deductions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_recurring_deductions_deduction_type_id_fkey"
            columns: ["deduction_type_id"]
            isOneToOne: false
            referencedRelation: "deduction_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_recurring_deductions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_recurring_earnings: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          earning_type_id: string
          effective_from: string
          effective_to: string | null
          employee_id: string
          id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          earning_type_id: string
          effective_from: string
          effective_to?: string | null
          employee_id: string
          id?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          earning_type_id?: string
          effective_from?: string
          effective_to?: string | null
          employee_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_recurring_earnings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_recurring_earnings_earning_type_id_fkey"
            columns: ["earning_type_id"]
            isOneToOne: false
            referencedRelation: "earning_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_recurring_earnings_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          bank_account_no: string | null
          bank_name: string | null
          company_id: string
          created_at: string
          date_of_birth: string | null
          employee_no: string | null
          employment_type: string
          first_name: string
          hire_date: string
          id: string
          is_active: boolean
          is_non_full_time_director: boolean
          is_primary_employment: boolean
          last_name: string
          metadata: Json
          mobile_money_no: string | null
          mobile_money_provider: string | null
          nssf_no: string | null
          payment_method: string
          personal_email: string | null
          phone: string | null
          tax_residency: string
          termination_date: string | null
          tin: string | null
          updated_at: string
          wcf_no: string | null
          work_email: string | null
        }
        Insert: {
          bank_account_no?: string | null
          bank_name?: string | null
          company_id: string
          created_at?: string
          date_of_birth?: string | null
          employee_no?: string | null
          employment_type?: string
          first_name: string
          hire_date: string
          id?: string
          is_active?: boolean
          is_non_full_time_director?: boolean
          is_primary_employment?: boolean
          last_name: string
          metadata?: Json
          mobile_money_no?: string | null
          mobile_money_provider?: string | null
          nssf_no?: string | null
          payment_method?: string
          personal_email?: string | null
          phone?: string | null
          tax_residency?: string
          termination_date?: string | null
          tin?: string | null
          updated_at?: string
          wcf_no?: string | null
          work_email?: string | null
        }
        Update: {
          bank_account_no?: string | null
          bank_name?: string | null
          company_id?: string
          created_at?: string
          date_of_birth?: string | null
          employee_no?: string | null
          employment_type?: string
          first_name?: string
          hire_date?: string
          id?: string
          is_active?: boolean
          is_non_full_time_director?: boolean
          is_primary_employment?: boolean
          last_name?: string
          metadata?: Json
          mobile_money_no?: string | null
          mobile_money_provider?: string | null
          nssf_no?: string | null
          payment_method?: string
          personal_email?: string | null
          phone?: string | null
          tax_residency?: string
          termination_date?: string | null
          tin?: string | null
          updated_at?: string
          wcf_no?: string | null
          work_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      filing_events: {
        Row: {
          company_id: string
          event_at: string
          event_by: string | null
          event_type: string
          filing_return_id: string
          id: string
          metadata: Json
          notes: string | null
        }
        Insert: {
          company_id: string
          event_at?: string
          event_by?: string | null
          event_type: string
          filing_return_id: string
          id?: string
          metadata?: Json
          notes?: string | null
        }
        Update: {
          company_id?: string
          event_at?: string
          event_by?: string | null
          event_type?: string
          filing_return_id?: string
          id?: string
          metadata?: Json
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "filing_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filing_events_filing_return_id_fkey"
            columns: ["filing_return_id"]
            isOneToOne: false
            referencedRelation: "filing_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      filing_returns: {
        Row: {
          amended_reason: string | null
          amount_due: number
          company_id: string
          created_at: string
          due_date: string
          filed_at: string | null
          filing_type: string
          id: string
          interest_amount: number
          metadata: Json
          original_filing_id: string | null
          paid_at: string | null
          payment_reference: string | null
          payroll_period_id: string
          penalty_amount: number
          status: Database["public"]["Enums"]["filing_status"]
          submission_reference: string | null
          submitted_at: string | null
          submitted_by: string | null
        }
        Insert: {
          amended_reason?: string | null
          amount_due?: number
          company_id: string
          created_at?: string
          due_date: string
          filed_at?: string | null
          filing_type: string
          id?: string
          interest_amount?: number
          metadata?: Json
          original_filing_id?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          payroll_period_id: string
          penalty_amount?: number
          status?: Database["public"]["Enums"]["filing_status"]
          submission_reference?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
        }
        Update: {
          amended_reason?: string | null
          amount_due?: number
          company_id?: string
          created_at?: string
          due_date?: string
          filed_at?: string | null
          filing_type?: string
          id?: string
          interest_amount?: number
          metadata?: Json
          original_filing_id?: string | null
          paid_at?: string | null
          payment_reference?: string | null
          payroll_period_id?: string
          penalty_amount?: number
          status?: Database["public"]["Enums"]["filing_status"]
          submission_reference?: string | null
          submitted_at?: string | null
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "filing_returns_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filing_returns_original_filing_id_fkey"
            columns: ["original_filing_id"]
            isOneToOne: false
            referencedRelation: "filing_returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filing_returns_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      filing_status_events: {
        Row: {
          changed_by: string | null
          company_id: string
          created_at: string
          filing_return_id: string
          from_status: Database["public"]["Enums"]["filing_status"] | null
          id: string
          notes: string | null
          to_status: Database["public"]["Enums"]["filing_status"]
        }
        Insert: {
          changed_by?: string | null
          company_id: string
          created_at?: string
          filing_return_id: string
          from_status?: Database["public"]["Enums"]["filing_status"] | null
          id?: string
          notes?: string | null
          to_status: Database["public"]["Enums"]["filing_status"]
        }
        Update: {
          changed_by?: string | null
          company_id?: string
          created_at?: string
          filing_return_id?: string
          from_status?: Database["public"]["Enums"]["filing_status"] | null
          id?: string
          notes?: string | null
          to_status?: Database["public"]["Enums"]["filing_status"]
        }
        Relationships: [
          {
            foreignKeyName: "filing_status_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "filing_status_events_filing_return_id_fkey"
            columns: ["filing_return_id"]
            isOneToOne: false
            referencedRelation: "filing_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_exports: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          export_format: string
          export_uri: string | null
          id: string
          payroll_run_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          export_format: string
          export_uri?: string | null
          id?: string
          payroll_run_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          export_format?: string
          export_uri?: string | null
          id?: string
          payroll_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gl_exports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_exports_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      gl_journal_lines: {
        Row: {
          account_code: string
          account_name: string | null
          company_id: string
          created_at: string
          credit: number
          debit: number
          department_code: string | null
          id: string
          memo: string | null
          payroll_run_id: string
        }
        Insert: {
          account_code: string
          account_name?: string | null
          company_id: string
          created_at?: string
          credit?: number
          debit?: number
          department_code?: string | null
          id?: string
          memo?: string | null
          payroll_run_id: string
        }
        Update: {
          account_code?: string
          account_name?: string | null
          company_id?: string
          created_at?: string
          credit?: number
          debit?: number
          department_code?: string | null
          id?: string
          memo?: string | null
          payroll_run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gl_journal_lines_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gl_journal_lines_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_balances: {
        Row: {
          as_of: string
          balance_days: number
          company_id: string
          created_at: string
          employee_id: string
          id: string
          leave_policy_id: string
        }
        Insert: {
          as_of: string
          balance_days?: number
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          leave_policy_id: string
        }
        Update: {
          as_of?: string
          balance_days?: number
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          leave_policy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_balances_leave_policy_id_fkey"
            columns: ["leave_policy_id"]
            isOneToOne: false
            referencedRelation: "leave_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_policies: {
        Row: {
          accrual_days_per_year: number
          carry_over_limit: number | null
          code: string
          company_id: string
          created_at: string
          id: string
          is_paid: boolean
          name: string
        }
        Insert: {
          accrual_days_per_year?: number
          carry_over_limit?: number | null
          code: string
          company_id: string
          created_at?: string
          id?: string
          is_paid?: boolean
          name: string
        }
        Update: {
          accrual_days_per_year?: number
          carry_over_limit?: number | null
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_paid?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_policies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_by: string | null
          company_id: string
          created_at: string
          days_requested: number
          decided_at: string | null
          decision_note: string | null
          employee_id: string
          ends_on: string
          id: string
          leave_policy_id: string
          rejected_by: string | null
          requested_by: string | null
          source: string
          starts_on: string
          status: Database["public"]["Enums"]["leave_request_status"]
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          company_id: string
          created_at?: string
          days_requested: number
          decided_at?: string | null
          decision_note?: string | null
          employee_id: string
          ends_on: string
          id?: string
          leave_policy_id: string
          rejected_by?: string | null
          requested_by?: string | null
          source?: string
          starts_on: string
          status?: Database["public"]["Enums"]["leave_request_status"]
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          company_id?: string
          created_at?: string
          days_requested?: number
          decided_at?: string | null
          decision_note?: string | null
          employee_id?: string
          ends_on?: string
          id?: string
          leave_policy_id?: string
          rejected_by?: string | null
          requested_by?: string | null
          source?: string
          starts_on?: string
          status?: Database["public"]["Enums"]["leave_request_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
            foreignKeyName: "leave_requests_leave_policy_id_fkey"
            columns: ["leave_policy_id"]
            isOneToOne: false
            referencedRelation: "leave_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_outbox: {
        Row: {
          channel: string
          company_id: string
          created_at: string
          error_message: string | null
          id: string
          payload: Json
          provider_message_id: string | null
          recipient: string
          scheduled_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_status"]
          template_code: string
        }
        Insert: {
          channel: string
          company_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json
          provider_message_id?: string | null
          recipient: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          template_code: string
        }
        Update: {
          channel?: string
          company_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          payload?: Json
          provider_message_id?: string | null
          recipient?: string
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_status"]
          template_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_outbox_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_batch_items: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          destination_account: string | null
          id: string
          payment_batch_id: string
          payroll_run_item_id: string
          provider_reference: string | null
          status: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          destination_account?: string | null
          id?: string
          payment_batch_id: string
          payroll_run_item_id: string
          provider_reference?: string | null
          status?: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          destination_account?: string | null
          id?: string
          payment_batch_id?: string
          payroll_run_item_id?: string
          provider_reference?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_batch_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_batch_items_payment_batch_id_fkey"
            columns: ["payment_batch_id"]
            isOneToOne: false
            referencedRelation: "payment_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_batch_items_payroll_run_item_id_fkey"
            columns: ["payroll_run_item_id"]
            isOneToOne: false
            referencedRelation: "payroll_run_items"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_batches: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          file_uri: string | null
          id: string
          payroll_run_id: string
          provider: string
          status: Database["public"]["Enums"]["payment_batch_status"]
          total_amount: number
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          file_uri?: string | null
          id?: string
          payroll_run_id: string
          provider: string
          status?: Database["public"]["Enums"]["payment_batch_status"]
          total_amount?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          file_uri?: string | null
          id?: string
          payroll_run_id?: string
          provider?: string
          status?: Database["public"]["Enums"]["payment_batch_status"]
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_batches_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_periods: {
        Row: {
          company_id: string
          created_at: string
          ends_on: string
          id: string
          payment_date: string | null
          period_month: number
          period_year: number
          starts_on: string
          status: Database["public"]["Enums"]["payroll_period_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          ends_on: string
          id?: string
          payment_date?: string | null
          period_month: number
          period_year: number
          starts_on: string
          status?: Database["public"]["Enums"]["payroll_period_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          ends_on?: string
          id?: string
          payment_date?: string | null
          period_month?: number
          period_year?: number
          starts_on?: string
          status?: Database["public"]["Enums"]["payroll_period_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_periods_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_run_items: {
        Row: {
          calc_snapshot: Json
          company_id: string
          created_at: string
          employee_id: string
          gross_pay: number
          id: string
          net_pay: number
          payroll_run_id: string
          taxable_pay: number
          total_deductions: number
        }
        Insert: {
          calc_snapshot?: Json
          company_id: string
          created_at?: string
          employee_id: string
          gross_pay?: number
          id?: string
          net_pay?: number
          payroll_run_id: string
          taxable_pay?: number
          total_deductions?: number
        }
        Update: {
          calc_snapshot?: Json
          company_id?: string
          created_at?: string
          employee_id?: string
          gross_pay?: number
          id?: string
          net_pay?: number
          payroll_run_id?: string
          taxable_pay?: number
          total_deductions?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_run_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_run_items_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_run_items_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          deduction_total: number
          gross_total: number
          id: string
          locked_at: string | null
          locked_by: string | null
          net_total: number
          payroll_period_id: string
          run_label: string
          status: Database["public"]["Enums"]["payroll_run_status"]
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          deduction_total?: number
          gross_total?: number
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          net_total?: number
          payroll_period_id: string
          run_label?: string
          status?: Database["public"]["Enums"]["payroll_run_status"]
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          deduction_total?: number
          gross_total?: number
          id?: string
          locked_at?: string | null
          locked_by?: string | null
          net_total?: number
          payroll_period_id?: string
          run_label?: string
          status?: Database["public"]["Enums"]["payroll_run_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_runs_payroll_period_id_fkey"
            columns: ["payroll_period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      statutory_rule_entries: {
        Row: {
          created_at: string
          id: string
          key: string
          rule_set_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          rule_set_id: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          rule_set_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "statutory_rule_entries_rule_set_id_fkey"
            columns: ["rule_set_id"]
            isOneToOne: false
            referencedRelation: "statutory_rule_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      statutory_rule_sets: {
        Row: {
          company_id: string | null
          country_code: string
          created_at: string
          effective_from: string
          effective_to: string | null
          id: string
          is_default: boolean
          jurisdiction: string
          notes: string | null
          rule_code: string
          version: string
        }
        Insert: {
          company_id?: string | null
          country_code?: string
          created_at?: string
          effective_from: string
          effective_to?: string | null
          id?: string
          is_default?: boolean
          jurisdiction?: string
          notes?: string | null
          rule_code: string
          version: string
        }
        Update: {
          company_id?: string | null
          country_code?: string
          created_at?: string
          effective_from?: string
          effective_to?: string | null
          id?: string
          is_default?: boolean
          jurisdiction?: string
          notes?: string | null
          rule_code?: string
          version?: string
        }
        Relationships: []
      }
      timesheet_import_batches: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          imported_count: number
          notes: string | null
          payload_count: number
          rejected_count: number
          source: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          imported_count?: number
          notes?: string | null
          payload_count?: number
          rejected_count?: number
          source?: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          imported_count?: number
          notes?: string | null
          payload_count?: number
          rejected_count?: number
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheet_import_batches_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      timesheets: {
        Row: {
          company_id: string
          created_at: string
          employee_id: string
          hours_worked: number
          id: string
          late_minutes: number
          metadata: Json
          overtime_hours: number
          source: string
          source_ref: string | null
          work_date: string
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_id: string
          hours_worked?: number
          id?: string
          late_minutes?: number
          metadata?: Json
          overtime_hours?: number
          source?: string
          source_ref?: string | null
          work_date: string
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_id?: string
          hours_worked?: number
          id?: string
          late_minutes?: number
          metadata?: Json
          overtime_hours?: number
          source?: string
          source_ref?: string | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "timesheets_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timesheets_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          full_name: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          phone?: string | null
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
      create_company_with_owner: {
        Args: { p_legal_name: string; p_trade_name?: string }
        Returns: string
      }
      has_company_role: {
        Args: {
          p_company_id: string
          p_roles: Database["public"]["Enums"]["app_role"][]
        }
        Returns: boolean
      }
      is_company_member: { Args: { p_company_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "owner" | "admin" | "accountant" | "employee"
      filing_status: "draft" | "ready" | "submitted" | "paid" | "amended"
      leave_request_status: "pending" | "approved" | "rejected" | "cancelled"
      notification_status:
        | "queued"
        | "processing"
        | "sent"
        | "failed"
        | "cancelled"
      payment_batch_status:
        | "draft"
        | "exported"
        | "processing"
        | "completed"
        | "failed"
      payroll_period_status: "open" | "locked" | "closed"
      payroll_run_status: "draft" | "validated" | "approved" | "locked" | "paid"
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
      app_role: ["owner", "admin", "accountant", "employee"],
      filing_status: ["draft", "ready", "submitted", "paid", "amended"],
      leave_request_status: ["pending", "approved", "rejected", "cancelled"],
      notification_status: [
        "queued",
        "processing",
        "sent",
        "failed",
        "cancelled",
      ],
      payment_batch_status: [
        "draft",
        "exported",
        "processing",
        "completed",
        "failed",
      ],
      payroll_period_status: ["open", "locked", "closed"],
      payroll_run_status: ["draft", "validated", "approved", "locked", "paid"],
    },
  },
} as const
