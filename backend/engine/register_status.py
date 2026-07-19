from typing import Dict, Optional, Any

class RegisterFile:
    def __init__(self):
        # Initialize F0 to F31 to 0.0 with no producer tag
        self.registers: Dict[str, Dict[str, Any]] = {}
        for i in range(32):
            self.registers[f"F{i}"] = {"value": 0.0, "tag": None}
        # Initialize R0 to R31 for addressing base registers
        for i in range(32):
            self.registers[f"R{i}"] = {"value": float(i * 10), "tag": None} # e.g. R2 = 20, R3 = 30 for offset tests

    def read(self, reg: str) -> Dict[str, Any]:
        """Returns a dict containing {'value': float, 'tag': Optional[str]}"""
        if reg not in self.registers:
            # Dynamically register on access if not found (e.g. immediate value or unexpected register name)
            try:
                val = float(reg)
                return {"value": val, "tag": None}
            except ValueError:
                self.registers[reg] = {"value": 0.0, "tag": None}
        return self.registers[reg]

    def write(self, reg: str, value: float):
        if reg in self.registers:
            self.registers[reg]["value"] = value

    def set_tag(self, reg: str, tag: Optional[str]):
        if reg in self.registers:
            self.registers[reg]["tag"] = tag

    def clear_tag(self, reg: str, tag: str):
        """Clears the tag only if it matches the current active tag (prevents overwriting newer producers)"""
        if reg in self.registers and self.registers[reg]["tag"] == tag:
            self.registers[reg]["tag"] = None

    def get_state(self) -> Dict[str, Dict[str, Any]]:
        return {reg: {"value": val["value"], "tag": val["tag"]} for reg, val in self.registers.items()}

    def reset(self):
        for i in range(32):
            self.registers[f"F{i}"] = {"value": 0.0, "tag": None}
        for i in range(32):
            self.registers[f"R{i}"] = {"value": float(i * 10), "tag": None}
