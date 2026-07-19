import copy
from typing import List, Dict, Optional, Any
from .instruction import Instruction

class InOrderEngine:
    def __init__(self, instructions: List[Instruction], latencies: Dict[str, int]):
        self.clock = 0
        # Create fresh copies of instructions to track pipeline stages independently
        self.instructions = [
            Instruction(
                id=inst.id,
                opcode=inst.opcode,
                dest=inst.dest,
                src1=inst.src1,
                src2=inst.src2
            ) for inst in instructions
        ]
        self.iq_pointer = 0
        
        # Latencies matching the Tomasulo engine configuration
        self.latencies = {
            "ADD.D": latencies.get("ADD", 2),
            "SUB.D": latencies.get("ADD", 2),
            "MUL.D": latencies.get("MUL", 4),
            "DIV.D": latencies.get("DIV", 12),
            "L.D": latencies.get("LOAD", 2),
            "S.D": latencies.get("STORE", 2)
        }

        # Pipeline stages: stores instruction_id or None
        self.pipeline = {
            "IF": None,
            "ID": None,
            "EX": None,
            "MEM": None,
            "WB": None
        }

        # Detailed history per instruction ID to render the Gantt chart/timeline
        # format: { inst_id: { cycle: "IF"|"ID"|"EX"|"MEM"|"WB"|"stall" } }
        self.history: Dict[int, Dict[int, str]] = {inst.id: {} for inst in self.instructions}
        
        self.cycles_left_in_ex = 0
        self.stall_count = 0
        
        # Track registers currently being written to by active instructions in EX/MEM/WB
        # to detect RAW (read after write) hazards in the ID stage.
        self.active_writers: Dict[str, int] = {} # reg_name -> instruction_id

    def step_cycle(self):
        """Steps the in-order pipeline by exactly one cycle in reverse order"""
        self.clock += 1

        # Track what moved in this cycle
        moved = {stage: False for stage in self.pipeline}

        # --- 1. WB Stage ---
        wb_inst_id = self.pipeline["WB"]
        if wb_inst_id is not None:
            # Instruction finished WB
            self.history[wb_inst_id][self.clock] = "WB"
            # Remove from active writers
            inst = self._get_inst_by_id(wb_inst_id)
            if inst and inst.dest in self.active_writers and self.active_writers[inst.dest] == wb_inst_id:
                del self.active_writers[inst.dest]
            # Set timing metrics
            inst.write_back_cycle = self.clock
            self.pipeline["WB"] = None

        # --- 2. MEM Stage ---
        mem_inst_id = self.pipeline["MEM"]
        if mem_inst_id is not None:
            if self.pipeline["WB"] is None:
                self.pipeline["WB"] = mem_inst_id
                self.pipeline["MEM"] = None
                moved["MEM"] = True
                self.history[mem_inst_id][self.clock] = "MEM"
            else:
                # Blocked by WB
                self.history[mem_inst_id][self.clock] = "MEM"

        # --- 3. EX Stage ---
        ex_inst_id = self.pipeline["EX"]
        if ex_inst_id is not None:
            self.history[ex_inst_id][self.clock] = "EX"
            self.cycles_left_in_ex -= 1
            if self.cycles_left_in_ex == 0:
                inst = self._get_inst_by_id(ex_inst_id)
                if inst:
                    inst.end_exec = self.clock
                if self.pipeline["MEM"] is None:
                    self.pipeline["MEM"] = ex_inst_id
                    self.pipeline["EX"] = None
                    moved["EX"] = True

        # --- 4. ID Stage ---
        id_inst_id = self.pipeline["ID"]
        if id_inst_id is not None:
            # Check for RAW hazards
            inst = self._get_inst_by_id(id_inst_id)
            has_hazard = False
            if inst:
                sources = []
                if inst.opcode == "S.D":
                    # Store reads base register (src1) and store value (dest)
                    sources = [inst.src1, inst.dest]
                elif inst.opcode == "L.D":
                    # Load reads base register (src1)
                    sources = [inst.src1]
                else:
                    # ALU reads src1 and src2
                    sources = [inst.src1, inst.src2]
                
                # Check if any source register is actively being written by a preceding instruction
                for src in sources:
                    if src in self.active_writers and self.active_writers[src] < id_inst_id:
                        has_hazard = True
                        break

            if has_hazard:
                # Data Stall (RAW)
                self.stall_count += 1
                self.history[id_inst_id][self.clock] = "STALL"
            elif self.pipeline["EX"] is None:
                # No hazard and EX is free -> Advance to EX
                self.pipeline["EX"] = id_inst_id
                self.pipeline["ID"] = None
                moved["ID"] = True
                self.history[id_inst_id][self.clock] = "ID"
                
                # Initialize EX latency
                latency = self.latencies.get(inst.opcode, 2)
                self.cycles_left_in_ex = latency
                inst.start_exec = self.clock + 1 # starts executing next cycle
                
                # Register active writer
                if inst.opcode != "S.D" and inst.dest:
                    self.active_writers[inst.dest] = inst.id
            else:
                # Structural Stall (EX busy)
                self.stall_count += 1
                self.history[id_inst_id][self.clock] = "STALL"

        # --- 5. IF Stage ---
        if_inst_id = self.pipeline["IF"]
        if if_inst_id is not None:
            if self.pipeline["ID"] is None:
                self.pipeline["ID"] = if_inst_id
                self.pipeline["IF"] = None
                moved["IF"] = True
                self.history[if_inst_id][self.clock] = "IF"
            else:
                # Stall IF (ID is busy)
                self.history[if_inst_id][self.clock] = "STALL"

        # --- 6. Fetch Stage ---
        if self.pipeline["IF"] is None and self.iq_pointer < len(self.instructions):
            next_inst = self.instructions[self.iq_pointer]
            self.pipeline["IF"] = next_inst.id
            next_inst.issue_cycle = self.clock
            self.iq_pointer += 1
            self.history[next_inst.id][self.clock] = "IF"

        return self.get_state_snapshot()

    def _get_inst_by_id(self, inst_id: int) -> Optional[Instruction]:
        return next((inst for inst in self.instructions if inst.id == inst_id), None)

    def is_done(self) -> bool:
        # All instructions reached completed / written back
        if self.iq_pointer < len(self.instructions):
            return False
        for inst in self.instructions:
            if inst.write_back_cycle is None:
                return False
        return True

    def get_state_snapshot(self) -> Dict[str, Any]:
        return {
            "clock": self.clock,
            "pipeline": {stage: self.pipeline[stage] for stage in self.pipeline},
            "instructions": [inst.to_dict() for inst in self.instructions],
            "history": self.history,
            "stall_count": self.stall_count,
            "is_done": self.is_done()
        }
