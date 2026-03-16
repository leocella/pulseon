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
      fila_atendimento: {
        Row: {
          atendente: string | null
          data_emissao: string | null
          hora_chamada: string | null
          hora_emissao: string
          hora_finalizacao: string | null
          id: string
          id_senha: string
          observacao: string | null
          status: Database["public"]["Enums"]["status_atendimento"]
          tipo: Database["public"]["Enums"]["tipo_atendimento"]
          unidade: string
        }
        Insert: {
          atendente?: string | null
          data_emissao?: string | null
          hora_chamada?: string | null
          hora_emissao?: string
          hora_finalizacao?: string | null
          id?: string
          id_senha: string
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_atendimento"]
          tipo: Database["public"]["Enums"]["tipo_atendimento"]
          unidade: string
        }
        Update: {
          atendente?: string | null
          data_emissao?: string | null
          hora_chamada?: string | null
          hora_emissao?: string
          hora_finalizacao?: string | null
          id?: string
          id_senha?: string
          observacao?: string | null
          status?: Database["public"]["Enums"]["status_atendimento"]
          tipo?: Database["public"]["Enums"]["tipo_atendimento"]
          unidade?: string
        }
        Relationships: []
      }
      panel_media: {
        Row: {
          active: boolean
          alt: string | null
          created_at: string
          duration: number
          id: string
          order_index: number
          src: string
          type: string
          unidade: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          alt?: string | null
          created_at?: string
          duration?: number
          id?: string
          order_index?: number
          src: string
          type: string
          unidade: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          alt?: string | null
          created_at?: string
          duration?: number
          id?: string
          order_index?: number
          src?: string
          type?: string
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      panel_settings: {
        Row: {
          created_at: string | null
          id: string
          setting_key: string
          setting_value: Json
          unidade: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          unidade: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          unidade?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      queue_events: {
        Row: {
          created_at: string | null
          event_type: string
          guiche: string | null
          id: string
          metadata: Json | null
          motivo: string | null
          performed_by: string
          ticket_id: string
          unidade: string
        }
        Insert: {
          created_at?: string | null
          event_type: string
          guiche?: string | null
          id?: string
          metadata?: Json | null
          motivo?: string | null
          performed_by: string
          ticket_id: string
          unidade: string
        }
        Update: {
          created_at?: string | null
          event_type?: string
          guiche?: string | null
          id?: string
          metadata?: Json | null
          motivo?: string | null
          performed_by?: string
          ticket_id?: string
          unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_events_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "fila_atendimento"
            referencedColumns: ["id"]
          },
        ]
      }
      sequencia_senhas: {
        Row: {
          data_referencia: string
          id: string
          tipo: Database["public"]["Enums"]["tipo_atendimento"]
          ultimo_numero: number
          unidade: string
        }
        Insert: {
          data_referencia?: string
          id?: string
          tipo: Database["public"]["Enums"]["tipo_atendimento"]
          ultimo_numero?: number
          unidade: string
        }
        Update: {
          data_referencia?: string
          id?: string
          tipo?: Database["public"]["Enums"]["tipo_atendimento"]
          ultimo_numero?: number
          unidade?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          unidade: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          unidade?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          unidade?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      call_next_ticket:
        | {
            Args: { p_unidade: string }
            Returns: {
              hora_emissao: string
              id: string
              id_senha: string
              tipo: Database["public"]["Enums"]["tipo_atendimento"]
            }[]
          }
        | {
            Args: { p_atendente?: string; p_unidade: string }
            Returns: {
              hora_emissao: string
              id: string
              id_senha: string
              tipo: Database["public"]["Enums"]["tipo_atendimento"]
            }[]
          }
      call_ticket_safe: {
        Args: { p_atendente: string; p_guiche?: string; p_ticket_id: string }
        Returns: {
          message: string
          success: boolean
          ticket_data: Json
        }[]
      }
      cancel_ticket: {
        Args: { p_atendente: string; p_motivo?: string; p_ticket_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      finish_ticket: {
        Args: { p_atendente: string; p_ticket_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      get_next_to_call: {
        Args: { p_unidade: string }
        Returns: {
          hora_emissao: string
          id: string
          id_senha: string
          tipo: Database["public"]["Enums"]["tipo_atendimento"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_unit_access: {
        Args: { _unidade: string; _user_id: string }
        Returns: boolean
      }
      next_ticket: {
        Args: {
          p_tipo: Database["public"]["Enums"]["tipo_atendimento"]
          p_unidade: string
        }
        Returns: {
          id_senha: string
          ticket_id: string
        }[]
      }
      recall_ticket: {
        Args: { p_atendente: string; p_guiche?: string; p_ticket_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      reset_daily_queue: { Args: never; Returns: undefined }
      skip_ticket: {
        Args: { p_atendente: string; p_motivo: string; p_ticket_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      start_service_ticket: {
        Args: { p_atendente: string; p_guiche?: string; p_ticket_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "secretary"
      status_atendimento:
        | "aguardando"
        | "chamado"
        | "em_atendimento"
        | "finalizado"
        | "nao_compareceu"
      tipo_atendimento: "Normal" | "Preferencial" | "Retirada de Resultado" | "Agendado"
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
      app_role: ["admin", "secretary"],
      status_atendimento: [
        "aguardando",
        "chamado",
        "em_atendimento",
        "finalizado",
        "nao_compareceu",
      ],
      tipo_atendimento: ["Normal", "Preferencial", "Retirada de Resultado", "Agendado"],
    },
  },
} as const
