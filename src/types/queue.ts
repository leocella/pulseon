export type TipoAtendimento = 'Normal' | 'Preferencial' | 'Retirada de Resultado' | 'Agendado';

export type StatusAtendimento =
  | 'aguardando'
  | 'chamado'
  | 'em_atendimento'
  | 'finalizado'
  | 'nao_compareceu';

export interface Ticket {
  id: string;
  id_senha: string;
  tipo: TipoAtendimento;
  status: StatusAtendimento;
  hora_emissao: string;
  hora_chamada: string | null;
  hora_finalizacao: string | null;
  atendente: string | null;
  unidade: string;
  observacao: string | null;
}

export interface PrintPayload {
  senha: string;
  id_senha: string;
  tipo: TipoAtendimento;
  unidade: string;
  hora: string;
}
