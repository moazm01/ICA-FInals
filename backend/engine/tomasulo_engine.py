import copy
from typing import List, Dict, Optional, Any
from .instruction import Instruction
from .reservation_station import ReservationStation
from .register_status import RegisterFile

class TomasuloEngine:
    def __init__(self, instructions: List[Instruction], latencies: Dict[str, int]):
        self.clock = 0
        self.instructions = instructions
        self.iq_pointer = 0
        self.latencies = {
            "ADD.D": latencies.get("ADD", 2),
            "SUB.D": latencies.get("ADD", 2),
            "MUL.D": latencies.get("MUL", 4),
            "DIV.D": latencies.get("DIV", 12),
            "L.D": latencies.get("LOAD", 2),
            "S.D": latencies.get("STORE", 2)
        }
        
        # Initialize Reservation Stations
        self.reservation_stations = self._init_stations()
        self.register_file = RegisterFile()
        self.cdb_broadcast: Optional[Dict[str, Any]] = None  # Tracks what was broadcast on CDB this cycle
        
        # Simple simulated memory for Load/Store operations
        self.memory: Dict[int, float] = {addr: float(addr * 2) for addr in range(0, 1000, 8)}

    def _init_stations(self) -> List[ReservationStation]:
        stations = []
        # Add units
        for i in range(1, 4):
            stations.append(ReservationStation(name=f"Add{i}"))
        # Mult units
        for i in range(1, 3):
            stations.append(ReservationStation(name=f"Mult{i}"))
        # Div units
        for i in range(1, 3):
            stations.append(ReservationStation(name=f"Div{i}"))
        # Load units
        for i in range(1, 4):
            stations.append(ReservationStation(name=f"Load{i}"))
        # Store units
        for i in range(1, 4):
            stations.append(ReservationStation(name=f"Store{i}"))
        return stations

    def step_cycle(self):
        """Executes exactly one hardware clock cycle (Reverse pipeline order)"""
        self.clock += 1
        self.cdb_broadcast = None
        
        # 1. Write Result Stage
        self._write_result_stage()
        
        # 2. Execute Stage
        self._execute_stage()
        
        # 3. Issue Stage
        self._issue_stage()
        
        return self.get_state_snapshot()

    def _write_result_stage(self):
        # Find all reservation stations that have completed execution (busy_cycles_left == 0)
        completed_stations = [
            rs for rs in self.reservation_stations 
            if rs.busy and rs.busy_cycles_left == 0 and rs.instruction_id is not None
        ]
        
        if not completed_stations:
            return

        # Prioritize by oldest instruction ID (earliest issued) to simulate realistic CDB arbitration
        completed_stations.sort(key=lambda x: x.instruction_id)
        selected_rs = completed_stations[0]
        
        # Compute value to broadcast
        val = 0.0
        addr = 0
        if selected_rs.op == "ADD.D":
            val = (selected_rs.vj or 0.0) + (selected_rs.vk or 0.0)
        elif selected_rs.op == "SUB.D":
            val = (selected_rs.vj or 0.0) - (selected_rs.vk or 0.0)
        elif selected_rs.op == "MUL.D":
            val = (selected_rs.vj or 0.0) * (selected_rs.vk or 0.0)
        elif selected_rs.op == "DIV.D":
            denominator = selected_rs.vk or 0.0
            val = (selected_rs.vj or 0.0) / denominator if denominator != 0.0 else 0.0
        elif selected_rs.op == "L.D":
            # Vj is base register value, Vk is offset
            addr = int((selected_rs.vj or 0.0) + (selected_rs.vk or 0.0))
            val = self.memory.get(addr, float(addr))
        elif selected_rs.op == "S.D":
            # Vj is base register value, Dest is offset, Vk is store value
            offset = 0.0
            try:
                offset = float(selected_rs.dest or "0")
            except ValueError:
                pass
            addr = int((selected_rs.vj or 0.0) + offset)
            val = selected_rs.vk or 0.0
            self.memory[addr] = val  # Store to memory!

        # Broadcast if it's not S.D (stores write to memory and don't broadcast result to registers)
        # Note: In Tomasulo, stores can broadcast a completion, but they do not write to registers.
        # Let's broadcast the write to update register file and dependent reservation stations.
        if selected_rs.op != "S.D":
            # Update Registers
            for reg_name in list(self.register_file.registers.keys()):
                reg_data = self.register_file.registers[reg_name]
                if reg_data["tag"] == selected_rs.name:
                    reg_data["value"] = val
                    reg_data["tag"] = None

            # Update Reservation Stations
            for rs in self.reservation_stations:
                if rs.busy:
                    if rs.qj == selected_rs.name:
                        rs.vj = val
                        rs.qj = None
                    if rs.qk == selected_rs.name:
                        rs.vk = val
                        rs.qk = None

        # Record broadcast event for frontend visualization
        self.cdb_broadcast = {
            "tag": selected_rs.name,
            "value": val,
            "dest": selected_rs.dest if selected_rs.op != "S.D" else f"Mem[{addr}]",
            "instruction_id": selected_rs.instruction_id
        }

        # Update instruction tracking
        inst = self._get_instruction_by_id(selected_rs.instruction_id)
        if inst:
            inst.write_back_cycle = self.clock

        # Free the Reservation Station
        selected_rs.reset()

    def _execute_stage(self):
        for rs in self.reservation_stations:
            if not rs.busy or rs.instruction_id is None:
                continue

            inst = self._get_instruction_by_id(rs.instruction_id)
            if not inst:
                continue

            # Ready to start execution: no dependencies (qj and qk are None) and hasn't started yet
            if rs.qj is None and rs.qk is None and inst.start_exec is None:
                inst.start_exec = self.clock
                # Latency lookup
                latency = self.latencies.get(rs.op, 2)
                rs.busy_cycles_left = latency

            # Progress execution if currently executing
            if inst.start_exec is not None and rs.busy_cycles_left is not None and rs.busy_cycles_left > 0:
                rs.busy_cycles_left -= 1
                if rs.busy_cycles_left == 0:
                    inst.end_exec = self.clock

    def _issue_stage(self):
        if self.iq_pointer >= len(self.instructions):
            return

        inst = self.instructions[self.iq_pointer]
        rs_group = self._get_rs_group_for_opcode(inst.opcode)
        
        # Find free station in the group
        free_rs = next((rs for rs in self.reservation_stations if rs.name.startswith(rs_group) and not rs.busy), None)
        
        if free_rs:
            free_rs.busy = True
            free_rs.op = inst.opcode
            free_rs.instruction_id = inst.id
            free_rs.dest = inst.dest
            
            # Setup dependencies based on instruction type
            if inst.opcode == "L.D":
                # L.D F6, 32(R2) -> dest=F6, src1=R2 (base), src2=32 (offset)
                base_reg = inst.src1
                offset_val = inst.src2
                
                # Base register read
                reg_data = self.register_file.read(base_reg)
                if reg_data["tag"] is not None:
                    free_rs.qj = reg_data["tag"]
                else:
                    free_rs.vj = reg_data["value"]
                
                # Offset is immediate, ready immediately
                try:
                    free_rs.vk = float(offset_val)
                except ValueError:
                    free_rs.vk = 0.0
                free_rs.qk = None
                
                # Tag the destination register
                self.register_file.set_tag(inst.dest, free_rs.name)

            elif inst.opcode == "S.D":
                # S.D F6, 32(R2) -> dest=32 (offset), src1=R2 (base), src2=F6 (source value)
                free_rs.dest = inst.src2
                base_reg = inst.src1
                val_reg = inst.dest  # For S.D, F6 is in the dest position of standard syntax
                
                # Base register read
                reg_data_base = self.register_file.read(base_reg)
                if reg_data_base["tag"] is not None:
                    free_rs.qj = reg_data_base["tag"]
                else:
                    free_rs.vj = reg_data_base["value"]
                
                # Value to store read
                reg_data_val = self.register_file.read(val_reg)
                if reg_data_val["tag"] is not None:
                    free_rs.qk = reg_data_val["tag"]
                else:
                    free_rs.vk = reg_data_val["value"]
                
                # S.D doesn't update any register, no tag setting

            else:
                # ALU arithmetic: ADD.D, SUB.D, MUL.D, DIV.D
                # src1 read
                reg_data1 = self.register_file.read(inst.src1)
                if reg_data1["tag"] is not None:
                    free_rs.qj = reg_data1["tag"]
                else:
                    free_rs.vj = reg_data1["value"]
                
                # src2 read
                reg_data2 = self.register_file.read(inst.src2)
                if reg_data2["tag"] is not None:
                    free_rs.qk = reg_data2["tag"]
                else:
                    free_rs.vk = reg_data2["value"]
                
                # Tag the destination register
                self.register_file.set_tag(inst.dest, free_rs.name)

            inst.issue_cycle = self.clock
            self.iq_pointer += 1

    def _get_rs_group_for_opcode(self, opcode: str) -> str:
        if opcode == "L.D":
            return "Load"
        elif opcode == "S.D":
            return "Store"
        elif opcode in ["ADD.D", "SUB.D"]:
            return "Add"
        elif opcode == "MUL.D":
            return "Mult"
        elif opcode == "DIV.D":
            return "Div"
        return "Add"

    def _get_instruction_by_id(self, inst_id: int) -> Optional[Instruction]:
        return next((inst for inst in self.instructions if inst.id == inst_id), None)

    def is_done(self) -> bool:
        # All instructions issued and written back
        if self.iq_pointer < len(self.instructions):
            return False
        for inst in self.instructions:
            if inst.write_back_cycle is None:
                return False
        return True

    def get_state_snapshot(self) -> Dict[str, Any]:
        return {
            "clock": self.clock,
            "iq_pointer": self.iq_pointer,
            "instructions": [inst.to_dict() for inst in self.instructions],
            "reservation_stations": [rs.to_dict() for rs in self.reservation_stations],
            "register_file": self.register_file.get_state(),
            "cdb_broadcast": self.cdb_broadcast,
            "is_done": self.is_done()
        }
