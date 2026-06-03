export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string;
          created_at: string | null;
          details: Json | null;
          id: string;
          ip_address: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          ip_address?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          created_at?: string | null;
          details?: Json | null;
          id?: string;
          ip_address?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      agreement_notifications: {
        Row: {
          action_reason: string | null;
          action_taken: string | null;
          actioned_at: string | null;
          application_id: string | null;
          created_at: string | null;
          id: string;
          is_actioned: boolean | null;
          is_read: boolean | null;
          message: string | null;
          notification_type: string | null;
          recipient_citizen_id: string | null;
          recipient_id: string | null;
          sender_id: string | null;
        };
        Insert: {
          action_reason?: string | null;
          action_taken?: string | null;
          actioned_at?: string | null;
          application_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_actioned?: boolean | null;
          is_read?: boolean | null;
          message?: string | null;
          notification_type?: string | null;
          recipient_citizen_id?: string | null;
          recipient_id?: string | null;
          sender_id?: string | null;
        };
        Update: {
          action_reason?: string | null;
          action_taken?: string | null;
          actioned_at?: string | null;
          application_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_actioned?: boolean | null;
          is_read?: boolean | null;
          message?: string | null;
          notification_type?: string | null;
          recipient_citizen_id?: string | null;
          recipient_id?: string | null;
          sender_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "agreement_notifications_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agreement_notifications_recipient_id_fkey";
            columns: ["recipient_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "agreement_notifications_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      applications: {
        Row: {
          agreement_status: string | null;
          application_number: string | null;
          approved_at: string | null;
          approved_by: string | null;
          approved_by_target: string | null;
          approved_by_target_at: string | null;
          assigned_office_id: string | null;
          assigned_staff_id: string | null;
          confirmation_data: Json | null;
          created_at: string | null;
          district: string | null;
          feedback: string | null;
          form_data: Json;
          id: string;
          is_confirmed: boolean | null;
          issued_at: string | null;
          issued_by: string | null;
          location_id: string | null;
          payment_data: Json | null;
          region: string | null;
          rejected_at: string | null;
          rejected_by: string | null;
          returned_at: string | null;
          returned_by: string | null;
          second_party_accepted: boolean | null;
          second_party_accepted_at: string | null;
          second_party_citizen_id: string | null;
          second_party_user_id: string | null;
          service_id: string | null;
          service_name: string | null;
          status: Database["public"]["Enums"]["application_status"] | null;
          street: string | null;
          target_rejection_reason: string | null;
          target_user_id: string | null;
          target_user_nida: string | null;
          target_user_role: string | null;
          updated_at: string | null;
          user_id: string | null;
          verified_at: string | null;
          verified_by: string | null;
          ward: string | null;
        };
        Insert: {
          agreement_status?: string | null;
          application_number?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          approved_by_target?: string | null;
          approved_by_target_at?: string | null;
          assigned_office_id?: string | null;
          assigned_staff_id?: string | null;
          confirmation_data?: Json | null;
          created_at?: string | null;
          district?: string | null;
          feedback?: string | null;
          form_data: Json;
          id?: string;
          is_confirmed?: boolean | null;
          issued_at?: string | null;
          issued_by?: string | null;
          location_id?: string | null;
          payment_data?: Json | null;
          region?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          returned_at?: string | null;
          returned_by?: string | null;
          second_party_accepted?: boolean | null;
          second_party_accepted_at?: string | null;
          second_party_citizen_id?: string | null;
          second_party_user_id?: string | null;
          service_id?: string | null;
          service_name?: string | null;
          status?: Database["public"]["Enums"]["application_status"] | null;
          street?: string | null;
          target_rejection_reason?: string | null;
          target_user_id?: string | null;
          target_user_nida?: string | null;
          target_user_role?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
          ward?: string | null;
        };
        Update: {
          agreement_status?: string | null;
          application_number?: string | null;
          approved_at?: string | null;
          approved_by?: string | null;
          approved_by_target?: string | null;
          approved_by_target_at?: string | null;
          assigned_office_id?: string | null;
          assigned_staff_id?: string | null;
          confirmation_data?: Json | null;
          created_at?: string | null;
          district?: string | null;
          feedback?: string | null;
          form_data?: Json;
          id?: string;
          is_confirmed?: boolean | null;
          issued_at?: string | null;
          issued_by?: string | null;
          location_id?: string | null;
          payment_data?: Json | null;
          region?: string | null;
          rejected_at?: string | null;
          rejected_by?: string | null;
          returned_at?: string | null;
          returned_by?: string | null;
          second_party_accepted?: boolean | null;
          second_party_accepted_at?: string | null;
          second_party_citizen_id?: string | null;
          second_party_user_id?: string | null;
          service_id?: string | null;
          service_name?: string | null;
          status?: Database["public"]["Enums"]["application_status"] | null;
          street?: string | null;
          target_rejection_reason?: string | null;
          target_user_id?: string | null;
          target_user_nida?: string | null;
          target_user_role?: string | null;
          updated_at?: string | null;
          user_id?: string | null;
          verified_at?: string | null;
          verified_by?: string | null;
          ward?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "applications_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_approved_by_target_fkey";
            columns: ["approved_by_target"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_assigned_staff_id_fkey";
            columns: ["assigned_staff_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_issued_by_fkey";
            columns: ["issued_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_rejected_by_fkey";
            columns: ["rejected_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_returned_by_fkey";
            columns: ["returned_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_second_party_user_id_fkey";
            columns: ["second_party_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_service_id_fkey";
            columns: ["service_id"];
            isOneToOne: false;
            referencedRelation: "services";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_target_user_id_fkey";
            columns: ["target_user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "applications_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      business_registrations: {
        Row: {
          alt_phone: string | null;
          approved_at: string | null;
          business_id: string | null;
          business_name: string | null;
          business_type: Database["public"]["Enums"]["business_type"];
          created_at: string | null;
          description: string | null;
          district: string | null;
          email: string | null;
          experience_years: number | null;
          id: string;
          id_document_url: string | null;
          phone: string | null;
          photo_url: string | null;
          proof_document_url: string | null;
          region: string | null;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          specialization: string | null;
          status: Database["public"]["Enums"]["business_registration_status"] | null;
          street: string | null;
          updated_at: string | null;
          user_id: string;
          ward: string | null;
        };
        Insert: {
          alt_phone?: string | null;
          approved_at?: string | null;
          business_id?: string | null;
          business_name?: string | null;
          business_type: Database["public"]["Enums"]["business_type"];
          created_at?: string | null;
          description?: string | null;
          district?: string | null;
          email?: string | null;
          experience_years?: number | null;
          id?: string;
          id_document_url?: string | null;
          phone?: string | null;
          photo_url?: string | null;
          proof_document_url?: string | null;
          region?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          specialization?: string | null;
          status?: Database["public"]["Enums"]["business_registration_status"] | null;
          street?: string | null;
          updated_at?: string | null;
          user_id: string;
          ward?: string | null;
        };
        Update: {
          alt_phone?: string | null;
          approved_at?: string | null;
          business_id?: string | null;
          business_name?: string | null;
          business_type?: Database["public"]["Enums"]["business_type"];
          created_at?: string | null;
          description?: string | null;
          district?: string | null;
          email?: string | null;
          experience_years?: number | null;
          id?: string;
          id_document_url?: string | null;
          phone?: string | null;
          photo_url?: string | null;
          proof_document_url?: string | null;
          region?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          specialization?: string | null;
          status?: Database["public"]["Enums"]["business_registration_status"] | null;
          street?: string | null;
          updated_at?: string | null;
          user_id?: string;
          ward?: string | null;
        };
        Relationships: [];
      };
      client_relationships: {
        Row: {
          agreement_id: string | null;
          agreement_number: string | null;
          client_citizen_id: string | null;
          client_email: string | null;
          client_id: string;
          client_name: string | null;
          client_phone: string | null;
          created_at: string | null;
          currency: string | null;
          deposit_amount: number | null;
          end_date: string | null;
          id: string;
          last_payment_date: string | null;
          monthly_rent: number | null;
          next_payment_due: string | null;
          notes: string | null;
          owner_business_id: string | null;
          owner_business_type: string | null;
          owner_id: string;
          property_address: string | null;
          property_description: string | null;
          property_district: string | null;
          property_region: string | null;
          property_type: string | null;
          property_ward: string | null;
          relationship_type: Database["public"]["Enums"]["client_relationship_type"];
          start_date: string;
          status: Database["public"]["Enums"]["client_relationship_status"] | null;
          status_reason: string | null;
          total_price: number | null;
          updated_at: string | null;
        };
        Insert: {
          agreement_id?: string | null;
          agreement_number?: string | null;
          client_citizen_id?: string | null;
          client_email?: string | null;
          client_id: string;
          client_name?: string | null;
          client_phone?: string | null;
          created_at?: string | null;
          currency?: string | null;
          deposit_amount?: number | null;
          end_date?: string | null;
          id?: string;
          last_payment_date?: string | null;
          monthly_rent?: number | null;
          next_payment_due?: string | null;
          notes?: string | null;
          owner_business_id?: string | null;
          owner_business_type?: string | null;
          owner_id: string;
          property_address?: string | null;
          property_description?: string | null;
          property_district?: string | null;
          property_region?: string | null;
          property_type?: string | null;
          property_ward?: string | null;
          relationship_type: Database["public"]["Enums"]["client_relationship_type"];
          start_date: string;
          status?: Database["public"]["Enums"]["client_relationship_status"] | null;
          status_reason?: string | null;
          total_price?: number | null;
          updated_at?: string | null;
        };
        Update: {
          agreement_id?: string | null;
          agreement_number?: string | null;
          client_citizen_id?: string | null;
          client_email?: string | null;
          client_id?: string;
          client_name?: string | null;
          client_phone?: string | null;
          created_at?: string | null;
          currency?: string | null;
          deposit_amount?: number | null;
          end_date?: string | null;
          id?: string;
          last_payment_date?: string | null;
          monthly_rent?: number | null;
          next_payment_due?: string | null;
          notes?: string | null;
          owner_business_id?: string | null;
          owner_business_type?: string | null;
          owner_id?: string;
          property_address?: string | null;
          property_description?: string | null;
          property_district?: string | null;
          property_region?: string | null;
          property_type?: string | null;
          property_ward?: string | null;
          relationship_type?: Database["public"]["Enums"]["client_relationship_type"];
          start_date?: string;
          status?: Database["public"]["Enums"]["client_relationship_status"] | null;
          status_reason?: string | null;
          total_price?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "client_relationships_client_id_fkey";
            columns: ["client_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "client_relationships_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      generated_documents: {
        Row: {
          application_id: string;
          certificate_id: string | null;
          created_at: string | null;
          document_url: string;
          expiry_date: string | null;
          id: string;
          issue_date: string | null;
          qr_code_url: string | null;
        };
        Insert: {
          application_id: string;
          certificate_id?: string | null;
          created_at?: string | null;
          document_url: string;
          expiry_date?: string | null;
          id?: string;
          issue_date?: string | null;
          qr_code_url?: string | null;
        };
        Update: {
          application_id?: string;
          certificate_id?: string | null;
          created_at?: string | null;
          document_url?: string;
          expiry_date?: string | null;
          id?: string;
          issue_date?: string | null;
          qr_code_url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "generated_documents_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
        ];
      };
      locations: {
        Row: {
          code: string | null;
          created_at: string | null;
          id: string;
          level: string;
          name: string;
          parent_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          code?: string | null;
          created_at?: string | null;
          id?: string;
          level: string;
          name: string;
          parent_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          code?: string | null;
          created_at?: string | null;
          id?: string;
          level?: string;
          name?: string;
          parent_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "locations_parent_id_fkey";
            columns: ["parent_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      notifications: {
        Row: {
          created_at: string | null;
          id: string;
          message: string | null;
          read: boolean | null;
          title: string;
          type: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          message?: string | null;
          read?: boolean | null;
          title: string;
          type?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          message?: string | null;
          read?: boolean | null;
          title?: string;
          type?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      offices: {
        Row: {
          active: boolean | null;
          address: string | null;
          code: string | null;
          created_at: string | null;
          district: string | null;
          email: string | null;
          id: string;
          name: string;
          phone: string | null;
          region: string | null;
          street: string | null;
          ward: string | null;
        };
        Insert: {
          active?: boolean | null;
          address?: string | null;
          code?: string | null;
          created_at?: string | null;
          district?: string | null;
          email?: string | null;
          id?: string;
          name: string;
          phone?: string | null;
          region?: string | null;
          street?: string | null;
          ward?: string | null;
        };
        Update: {
          active?: boolean | null;
          address?: string | null;
          code?: string | null;
          created_at?: string | null;
          district?: string | null;
          email?: string | null;
          id?: string;
          name?: string;
          phone?: string | null;
          region?: string | null;
          street?: string | null;
          ward?: string | null;
        };
        Relationships: [];
      };
      payments: {
        Row: {
          amount: number;
          application_id: string | null;
          breakdown: Json | null;
          created_at: string | null;
          currency: string | null;
          id: string;
          payment_method: string | null;
          receipt_number: string | null;
          status: string | null;
          transaction_id: string | null;
        };
        Insert: {
          amount: number;
          application_id?: string | null;
          breakdown?: Json | null;
          created_at?: string | null;
          currency?: string | null;
          id?: string;
          payment_method?: string | null;
          receipt_number?: string | null;
          status?: string | null;
          transaction_id?: string | null;
        };
        Update: {
          amount?: number;
          application_id?: string | null;
          breakdown?: Json | null;
          created_at?: string | null;
          currency?: string | null;
          id?: string;
          payment_method?: string | null;
          receipt_number?: string | null;
          status?: string | null;
          transaction_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "payments_application_id_fkey";
            columns: ["application_id"];
            isOneToOne: false;
            referencedRelation: "applications";
            referencedColumns: ["id"];
          },
        ];
      };
      profile_change_requests: {
        Row: {
          created_at: string | null;
          field_name: string;
          id: string;
          new_value: string;
          old_value: string | null;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          field_name: string;
          id?: string;
          new_value: string;
          old_value?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          field_name?: string;
          id?: string;
          new_value?: string;
          old_value?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profile_change_requests_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profile_change_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      service_categories: {
        Row: {
          active: boolean | null;
          created_at: string | null;
          description: string | null;
          icon: string | null;
          id: string;
          name: string;
          name_sw: string | null;
          order: number | null;
          updated_at: string | null;
        };
        Insert: {
          active?: boolean | null;
          created_at?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          name: string;
          name_sw?: string | null;
          order?: number | null;
          updated_at?: string | null;
        };
        Update: {
          active?: boolean | null;
          created_at?: string | null;
          description?: string | null;
          icon?: string | null;
          id?: string;
          name?: string;
          name_sw?: string | null;
          order?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      services: {
        Row: {
          active: boolean | null;
          created_at: string | null;
          description: string | null;
          diaspora_form_schema: Json | null;
          document_template: Json | null;
          fee: number | null;
          form_schema: Json;
          id: string;
          name: string;
          name_en: string | null;
          updated_at: string | null;
        };
        Insert: {
          active?: boolean | null;
          created_at?: string | null;
          description?: string | null;
          diaspora_form_schema?: Json | null;
          document_template?: Json | null;
          fee?: number | null;
          form_schema: Json;
          id?: string;
          name: string;
          name_en?: string | null;
          updated_at?: string | null;
        };
        Update: {
          active?: boolean | null;
          created_at?: string | null;
          description?: string | null;
          diaspora_form_schema?: Json | null;
          document_template?: Json | null;
          fee?: number | null;
          form_schema?: Json;
          id?: string;
          name?: string;
          name_en?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          active: boolean | null;
          capacity: number | null;
          created_at: string | null;
          description: string | null;
          end_date: string | null;
          end_time: string | null;
          id: string;
          ip_address: string | null;
          last_active_at: string | null;
          location_id: string | null;
          registered_count: number | null;
          start_date: string | null;
          start_time: string | null;
          title: string | null;
          updated_at: string | null;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          active?: boolean | null;
          capacity?: number | null;
          created_at?: string | null;
          description?: string | null;
          end_date?: string | null;
          end_time?: string | null;
          id?: string;
          ip_address?: string | null;
          last_active_at?: string | null;
          location_id?: string | null;
          registered_count?: number | null;
          start_date?: string | null;
          start_time?: string | null;
          title?: string | null;
          updated_at?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          active?: boolean | null;
          capacity?: number | null;
          created_at?: string | null;
          description?: string | null;
          end_date?: string | null;
          end_time?: string | null;
          id?: string;
          ip_address?: string | null;
          last_active_at?: string | null;
          location_id?: string | null;
          registered_count?: number | null;
          start_date?: string | null;
          start_time?: string | null;
          title?: string | null;
          updated_at?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sessions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      user_documents: {
        Row: {
          document_category: string;
          document_name: string;
          document_type: string;
          document_url: string;
          file_size: number | null;
          file_type: string | null;
          id: string;
          notes: string | null;
          updated_at: string | null;
          uploaded_at: string | null;
          user_id: string;
          verified: boolean | null;
          verified_at: string | null;
          verified_by: string | null;
        };
        Insert: {
          document_category?: string;
          document_name: string;
          document_type: string;
          document_url: string;
          file_size?: number | null;
          file_type?: string | null;
          id?: string;
          notes?: string | null;
          updated_at?: string | null;
          uploaded_at?: string | null;
          user_id: string;
          verified?: boolean | null;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Update: {
          document_category?: string;
          document_name?: string;
          document_type?: string;
          document_url?: string;
          file_size?: number | null;
          file_type?: string | null;
          id?: string;
          notes?: string | null;
          updated_at?: string | null;
          uploaded_at?: string | null;
          user_id?: string;
          verified?: boolean | null;
          verified_at?: string | null;
          verified_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_documents_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_documents_verified_by_fkey";
            columns: ["verified_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          account_status: string | null;
          alternative_email: string | null;
          alternative_phone: string | null;
          assigned_district: string | null;
          assigned_region: string | null;
          birth_district: string | null;
          birth_region: string | null;
          blood_group: string | null;
          broker_id: string | null;
          citizen_id: string | null;
          city_of_residence: string | null;
          country_of_citizenship: string | null;
          country_of_residence: string | null;
          created_at: string | null;
          date_of_birth: string | null;
          department: string | null;
          diaspora_district: string | null;
          diaspora_region: string | null;
          diaspora_ward: string | null;
          disability_status: string | null;
          district: string | null;
          driving_license_number: string | null;
          education_level: string | null;
          email: string;
          email_address: string | null;
          email_verified: boolean | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          emergency_contact_relation: string | null;
          employee_id: string | null;
          employment_date: string | null;
          first_name: string;
          gender: string | null;
          house_number: string | null;
          id: string;
          id_number: string | null;
          id_type: string | null;
          is_diaspora: boolean | null;
          is_verified: boolean | null;
          landlord_id: string | null;
          landmark: string | null;
          last_login: string | null;
          last_name: string;
          marital_status: string | null;
          middle_name: string | null;
          mtaa_executive_officer: string | null;
          nationality: string | null;
          nida_number: string | null;
          occupation: string | null;
          office_id: string | null;
          passport_number: string | null;
          phone: string | null;
          phone_verified: boolean | null;
          photo_url: string | null;
          place_of_birth: string | null;
          position: string | null;
          postal_code: string | null;
          region: string | null;
          religious_affiliation: string | null;
          role: Database["public"]["Enums"]["user_role"] | null;
          seller_id: string | null;
          sex: string | null;
          street: string | null;
          tribe: string | null;
          updated_at: string | null;
          voter_id_number: string | null;
          ward: string | null;
          ward_chairperson: string | null;
          ward_councillor: string | null;
        };
        Insert: {
          account_status?: string | null;
          alternative_email?: string | null;
          alternative_phone?: string | null;
          assigned_district?: string | null;
          assigned_region?: string | null;
          birth_district?: string | null;
          birth_region?: string | null;
          blood_group?: string | null;
          broker_id?: string | null;
          citizen_id?: string | null;
          city_of_residence?: string | null;
          country_of_citizenship?: string | null;
          country_of_residence?: string | null;
          created_at?: string | null;
          date_of_birth?: string | null;
          department?: string | null;
          diaspora_district?: string | null;
          diaspora_region?: string | null;
          diaspora_ward?: string | null;
          disability_status?: string | null;
          district?: string | null;
          driving_license_number?: string | null;
          education_level?: string | null;
          email: string;
          email_address?: string | null;
          email_verified?: boolean | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          emergency_contact_relation?: string | null;
          employee_id?: string | null;
          employment_date?: string | null;
          first_name: string;
          gender?: string | null;
          house_number?: string | null;
          id: string;
          id_number?: string | null;
          id_type?: string | null;
          is_diaspora?: boolean | null;
          is_verified?: boolean | null;
          landlord_id?: string | null;
          landmark?: string | null;
          last_login?: string | null;
          last_name: string;
          marital_status?: string | null;
          middle_name?: string | null;
          mtaa_executive_officer?: string | null;
          nationality?: string | null;
          nida_number?: string | null;
          occupation?: string | null;
          office_id?: string | null;
          passport_number?: string | null;
          phone?: string | null;
          phone_verified?: boolean | null;
          photo_url?: string | null;
          place_of_birth?: string | null;
          position?: string | null;
          postal_code?: string | null;
          region?: string | null;
          religious_affiliation?: string | null;
          role?: Database["public"]["Enums"]["user_role"] | null;
          seller_id?: string | null;
          sex?: string | null;
          street?: string | null;
          tribe?: string | null;
          updated_at?: string | null;
          voter_id_number?: string | null;
          ward?: string | null;
          ward_chairperson?: string | null;
          ward_councillor?: string | null;
        };
        Update: {
          account_status?: string | null;
          alternative_email?: string | null;
          alternative_phone?: string | null;
          assigned_district?: string | null;
          assigned_region?: string | null;
          birth_district?: string | null;
          birth_region?: string | null;
          blood_group?: string | null;
          broker_id?: string | null;
          citizen_id?: string | null;
          city_of_residence?: string | null;
          country_of_citizenship?: string | null;
          country_of_residence?: string | null;
          created_at?: string | null;
          date_of_birth?: string | null;
          department?: string | null;
          diaspora_district?: string | null;
          diaspora_region?: string | null;
          diaspora_ward?: string | null;
          disability_status?: string | null;
          district?: string | null;
          driving_license_number?: string | null;
          education_level?: string | null;
          email?: string;
          email_address?: string | null;
          email_verified?: boolean | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          emergency_contact_relation?: string | null;
          employee_id?: string | null;
          employment_date?: string | null;
          first_name?: string;
          gender?: string | null;
          house_number?: string | null;
          id?: string;
          id_number?: string | null;
          id_type?: string | null;
          is_diaspora?: boolean | null;
          is_verified?: boolean | null;
          landlord_id?: string | null;
          landmark?: string | null;
          last_login?: string | null;
          last_name?: string;
          marital_status?: string | null;
          middle_name?: string | null;
          mtaa_executive_officer?: string | null;
          nationality?: string | null;
          nida_number?: string | null;
          occupation?: string | null;
          office_id?: string | null;
          passport_number?: string | null;
          phone?: string | null;
          phone_verified?: boolean | null;
          photo_url?: string | null;
          place_of_birth?: string | null;
          position?: string | null;
          postal_code?: string | null;
          region?: string | null;
          religious_affiliation?: string | null;
          role?: Database["public"]["Enums"]["user_role"] | null;
          seller_id?: string | null;
          sex?: string | null;
          street?: string | null;
          tribe?: string | null;
          updated_at?: string | null;
          voter_id_number?: string | null;
          ward?: string | null;
          ward_chairperson?: string | null;
          ward_councillor?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      create_citizen_profile: {
        Args: {
          p_country_of_citizenship?: string;
          p_country_of_residence?: string;
          p_date_of_birth?: string;
          p_district?: string;
          p_education_level?: string;
          p_email?: string;
          p_first_name: string;
          p_gender?: string;
          p_id: string;
          p_id_number?: string;
          p_id_type?: string;
          p_is_diaspora?: boolean;
          p_is_verified?: boolean;
          p_last_name?: string;
          p_marital_status?: string;
          p_middle_name?: string;
          p_nationality?: string;
          p_nida_number?: string;
          p_occupation?: string;
          p_passport_number?: string;
          p_phone?: string;
          p_place_of_birth?: string;
          p_region?: string;
          p_sex?: string;
          p_street?: string;
          p_ward?: string;
        };
        Returns: undefined;
      };
      generate_citizen_id: { Args: never; Returns: string };
      get_user_profile: {
        Args: { user_id: string };
        Returns: {
          account_status: string;
          district: string;
          email: string;
          first_name: string;
          id: string;
          is_verified: boolean;
          last_name: string;
          region: string;
          role: string;
          street: string;
          ward: string;
        }[];
      };
      get_user_role_safe: { Args: never; Returns: string };
      is_admin: { Args: never; Returns: boolean };
      is_admin_or_staff: { Args: never; Returns: boolean };
      is_staff_or_admin: { Args: never; Returns: boolean };
    };
    Enums: {
      application_status:
        | "submitted"
        | "pending_review"
        | "pending_payment"
        | "paid"
        | "verified"
        | "approved"
        | "issued"
        | "returned"
        | "rejected"
        | "refunded";
      business_registration_status: "pending" | "approved" | "rejected" | "suspended";
      business_type: "seller" | "landlord" | "broker";
      client_relationship_status: "active" | "inactive" | "pending" | "completed" | "cancelled";
      client_relationship_type: "tenant" | "buyer" | "renter";
      user_role: "citizen" | "staff" | "admin";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      application_status: [
        "submitted",
        "pending_review",
        "pending_payment",
        "paid",
        "verified",
        "approved",
        "issued",
        "returned",
        "rejected",
        "refunded",
      ],
      business_registration_status: ["pending", "approved", "rejected", "suspended"],
      business_type: ["seller", "landlord", "broker"],
      client_relationship_status: ["active", "inactive", "pending", "completed", "cancelled"],
      client_relationship_type: ["tenant", "buyer", "renter"],
      user_role: ["citizen", "staff", "admin"],
    },
  },
} as const;
