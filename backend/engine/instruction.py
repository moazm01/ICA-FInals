from dataclasses import dataclass
from typing import Optional

@dataclass
class Instruction:
    id: int               # Unique instruction identifier
    opcode: str           # e.g., "ADD.D", "SUB.D", "MUL.D", "DIV.D", "L.D", "S.D"
    dest: str             # Destination register, e.g., "F6"
    src1: str             # Source register 1, e.g., "F2"
    src2: str             # Source register 2, e.g., "F4" (or immediate offset for Load/Store)
    
    # Timing and tracking cycles (1-based, None if not yet reached)
    issue_cycle: Optional[int] = None
    start_exec: Optional[int] = None
    end_exec: Optional[int] = None
    write_back_cycle: Optional[int] = None

    def to_dict(self):
        return {
            "id": self.id,
            "opcode": self.opcode,
            "dest": self.dest,
            "src1": self.src1,
            "src2": self.src2,
            "issue_cycle": self.issue_cycle,
            "start_exec": self.start_exec,
            "end_exec": self.end_exec,
            "write_back_cycle": self.write_back_cycle
        }
