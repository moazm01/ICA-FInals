from dataclasses import dataclass
from typing import Optional

@dataclass
class ReservationStation:
    name: str              # Unique identifier, e.g., "Add1", "Mult1", "Load1"
    busy: bool = False
    op: Optional[str] = None
    vj: Optional[float] = None
    vk: Optional[float] = None
    qj: Optional[str] = None
    qk: Optional[str] = None
    dest: Optional[str] = None  # Destination register name (e.g. "F6") or target address
    instruction_id: Optional[int] = None
    busy_cycles_left: Optional[int] = None

    def reset(self):
        self.busy = False
        self.op = None
        self.vj = None
        self.vk = None
        self.qj = None
        self.qk = None
        self.dest = None
        self.instruction_id = None
        self.busy_cycles_left = None

    def to_dict(self):
        return {
            "name": self.name,
            "busy": self.busy,
            "op": self.op,
            "vj": self.vj,
            "vk": self.vk,
            "qj": self.qj,
            "qk": self.qk,
            "dest": self.dest,
            "instruction_id": self.instruction_id,
            "busy_cycles_left": self.busy_cycles_left
        }
