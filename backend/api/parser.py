import re
from typing import List
from engine.instruction import Instruction

def parse_assembly(assembly_text: str) -> List[Instruction]:
    """
    Parses a multi-line MIPS/RISC-V floating point assembly string into Instruction objects.
    Supports formats:
    - ADD.D F2, F4, F6   -> dest=F2, src1=F4, src2=F6
    - SUB.D F8, F6, F2   -> dest=F8, src1=F6, src2=F2
    - MUL.D F0, F2, F4   -> dest=F0, src1=F2, src2=F4
    - DIV.D F10, F0, F6  -> dest=F10, src1=F0, src2=F6
    - L.D F6, 32(R2)     -> dest=F6, src1=R2, src2=32  (base=R2, offset=32)
    - S.D F10, 48(R2)    -> dest=F10, src1=R2, src2=48 (base=R2, offset=48)
    """
    instructions = []
    lines = assembly_text.split('\n')
    instruction_id = 0

    for line_num, line in enumerate(lines, 1):
        # Remove comments and strip whitespace
        line = line.split('#')[0].split(';')[0].strip()
        if not line:
            continue

        # Split instruction into opcode and operand part
        parts = re.split(r'\s+', line, maxsplit=1)
        opcode = parts[0].upper()
        
        if len(parts) < 2:
            raise ValueError(f"Line {line_num}: Missing operands in '{line}'")

        operand_str = parts[1].replace(" ", "")
        operands = operand_str.split(',')

        if opcode in ["L.D", "S.D", "LD", "SD", "FLD", "FSD"]:
            # Load/Store syntax: L.D F6, 32(R2)
            if len(operands) != 2:
                raise ValueError(f"Line {line_num}: Load/Store requires 2 operands, got {len(operands)}")
            
            dest_reg = operands[0].upper()
            mem_ref = operands[1]
            
            # Match pattern offset(base) e.g., 32(R2) or 32(F2)
            match = re.match(r'^(-?\d*)\((F\d+|R\d+)\)$', mem_ref, re.IGNORECASE)
            if not match:
                raise ValueError(f"Line {line_num}: Invalid address format '{mem_ref}'. Expected offset(register) e.g. 32(R2)")
            
            offset = match.group(1) or "0"
            base_reg = match.group(2).upper()
            
            # Map LD -> L.D, SD -> S.D for uniformity
            normalized_opcode = "L.D" if opcode in ["L.D", "LD", "FLD"] else "S.D"
            
            instructions.append(Instruction(
                id=instruction_id,
                opcode=normalized_opcode,
                dest=dest_reg,
                src1=base_reg,
                src2=offset
            ))
            instruction_id += 1

        elif opcode in ["ADD.D", "SUB.D", "MUL.D", "DIV.D", "FADD.D", "FSUB.D", "FMUL.D", "FDIV.D"]:
            # Arithmetic: ADD.D F2, F4, F6
            if len(operands) != 3:
                raise ValueError(f"Line {line_num}: Arithmetic instructions require 3 operands, got {len(operands)}")
            
            dest_reg = operands[0].upper()
            src1_reg = operands[1].upper()
            src2_reg = operands[2].upper()
            
            # Map RISC-V prefix if any
            normalized_opcode = opcode
            if opcode.startswith("F"):
                # e.g., FADD.D -> ADD.D
                normalized_opcode = opcode[1:]
            
            instructions.append(Instruction(
                id=instruction_id,
                opcode=normalized_opcode,
                dest=dest_reg,
                src1=src1_reg,
                src2=src2_reg
            ))
            instruction_id += 1
        else:
            raise ValueError(f"Line {line_num}: Unsupported opcode '{opcode}'")

    return instructions
