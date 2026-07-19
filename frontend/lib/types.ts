export interface Instruction {
  id: number;
  opcode: string;
  dest: string;
  src1: string;
  src2: string;
  issue_cycle: number | null;
  start_exec: number | null;
  end_exec: number | null;
  write_back_cycle: number | null;
}

export interface ReservationStation {
  name: string;
  busy: boolean;
  op: string | null;
  vj: number | null;
  vk: number | null;
  qj: string | null;
  qk: string | null;
  dest: string | null;
  instruction_id: number | null;
  busy_cycles_left: number | null;
}

export interface RegisterValue {
  value: number;
  tag: string | null;
}

export interface RegisterFileState {
  [register: string]: RegisterValue;
}

export interface CdbBroadcast {
  tag: string;
  value: number;
  dest: string;
  instruction_id: number;
}

export interface TomasuloState {
  clock: number;
  iq_pointer: number;
  instructions: Instruction[];
  reservation_stations: ReservationStation[];
  register_file: RegisterFileState;
  cdb_broadcast: CdbBroadcast | null;
  is_done: boolean;
}

export interface InOrderState {
  clock: number;
  pipeline: {
    IF: number | null;
    ID: number | null;
    EX: number | null;
    MEM: number | null;
    WB: number | null;
  };
  instructions: Instruction[];
  history: {
    [instructionId: number]: {
      [cycle: number]: string; // "IF" | "ID" | "EX" | "MEM" | "WB" | "STALL"
    };
  };
  stall_count: number;
  is_done: boolean;
}

export interface SimulatorStats {
  tomasulo_ipc: number;
  inorder_ipc: number;
  tomasulo_stalls: number;
  inorder_stalls: number;
}

export interface SimulatorState {
  clock: number;
  tomasulo: TomasuloState | null;
  inorder: InOrderState | null;
  raw_assembly: string;
  stats: SimulatorStats;
}
