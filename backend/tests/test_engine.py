import pytest
from engine.instruction import Instruction
from engine.tomasulo_engine import TomasuloEngine
from engine.inorder_engine import InOrderEngine
from api.parser import parse_assembly

def test_raw_dependency_stall():
    # MUL.D F0, F2, F4 (latency 4)
    # ADD.D F6, F0, F8 (latency 2)
    # F0 is raw dependency. ADD.D must wait until MUL.D broadcasts at cycle 5.
    instructions = [
        Instruction(id=0, opcode="MUL.D", dest="F0", src1="F2", src2="F4"),
        Instruction(id=1, opcode="ADD.D", dest="F6", src1="F0", src2="F8")
    ]
    latencies = {"ADD": 2, "MUL": 4, "DIV": 12, "LOAD": 2, "STORE": 2}
    
    engine = TomasuloEngine(instructions, latencies)
    
    # Run simulation step by step
    # Cycle 1: Issue MUL.D into Mult1
    engine.step_cycle()
    snapshot = engine.get_state_snapshot()
    assert snapshot["iq_pointer"] == 1
    assert snapshot["reservation_stations"][3]["name"] == "Mult1" # Mult1 is index 3
    assert snapshot["reservation_stations"][3]["busy"] is True

    # Cycle 2: Issue ADD.D into Add1 (RAW hazard, Qj=Mult1)
    engine.step_cycle()
    snapshot = engine.get_state_snapshot()
    assert snapshot["iq_pointer"] == 2
    assert snapshot["reservation_stations"][0]["name"] == "Add1"  # Add1 is index 0
    assert snapshot["reservation_stations"][0]["busy"] is True
    assert snapshot["reservation_stations"][0]["qj"] == "Mult1"

    # Cycle 3: Mult1 executing (left 2)
    engine.step_cycle()
    
    # Cycle 4: Mult1 executing (left 1)
    engine.step_cycle()
    
    # Cycle 5: Mult1 finished executing (left 0)
    engine.step_cycle()
    snapshot = engine.get_state_snapshot()
    assert snapshot["reservation_stations"][0]["qj"] == "Mult1" # Still waiting for writeback

    # Cycle 6: Mult1 writes result to F0 and CDB. Add1 starts executing (left 1).
    engine.step_cycle()
    snapshot = engine.get_state_snapshot()
    assert snapshot["reservation_stations"][0]["qj"] is None
    
    # Cycle 7: Add1 executing (finishes)
    engine.step_cycle()
    
    # Cycle 8: Add1 writes result
    engine.step_cycle()
    
    assert engine.is_done() is True

def test_structural_hazard():
    # 4 ADD.D instructions, but only 3 Add Reservation Stations.
    # We set ADD latency to 10 so they don't finish before the 4th is issued.
    # The 4th ADD.D must stall in IQ.
    instructions = [
        Instruction(id=0, opcode="ADD.D", dest="F0", src1="F2", src2="F4"),
        Instruction(id=1, opcode="ADD.D", dest="F6", src1="F2", src2="F4"),
        Instruction(id=2, opcode="ADD.D", dest="F8", src1="F2", src2="F4"),
        Instruction(id=3, opcode="ADD.D", dest="F10", src1="F2", src2="F4")
    ]
    latencies = {"ADD": 10, "MUL": 4, "DIV": 12, "LOAD": 2, "STORE": 2}
    
    engine = TomasuloEngine(instructions, latencies)
    
    # Cycle 1: Issues Inst 0 into Add1
    engine.step_cycle()
    # Cycle 2: Issues Inst 1 into Add2
    engine.step_cycle()
    # Cycle 3: Issues Inst 2 into Add3
    engine.step_cycle()
    
    # Cycle 4: Add reservation stations are full! Inst 3 cannot issue. iq_pointer remains 3
    engine.step_cycle()
    snapshot = engine.get_state_snapshot()
    assert snapshot["iq_pointer"] == 3
    assert snapshot["instructions"][3]["issue_cycle"] is None

def test_waw_tag_override():
    # MUL.D F2, F4, F6
    # ADD.D F2, F8, F10
    # Both write to F2. The Register status for F2 must initially point to Mult1, then be overridden by Add1.
    instructions = [
        Instruction(id=0, opcode="MUL.D", dest="F2", src1="F4", src2="F6"),
        Instruction(id=1, opcode="ADD.D", dest="F2", src1="F8", src2="F10")
    ]
    latencies = {"ADD": 2, "MUL": 4, "DIV": 12, "LOAD": 2, "STORE": 2}
    
    engine = TomasuloEngine(instructions, latencies)
    
    # Cycle 1: Issue Inst 0 (MUL.D) -> Tag F2 as Mult1
    engine.step_cycle()
    assert engine.register_file.read("F2")["tag"] == "Mult1"
    
    # Cycle 2: Issue Inst 1 (ADD.D) -> Tag F2 as Add1 (override)
    engine.step_cycle()
    assert engine.register_file.read("F2")["tag"] == "Add1"

def test_inorder_stall_count():
    # Classic in-order pipeline stall detection
    # MUL.D F0, F2, F4
    # ADD.D F6, F0, F8  <- RAW stall on F0
    instructions = [
        Instruction(id=0, opcode="MUL.D", dest="F0", src1="F2", src2="F4"),
        Instruction(id=1, opcode="ADD.D", dest="F6", src1="F0", src2="F8")
    ]
    latencies = {"ADD": 2, "MUL": 4, "DIV": 12, "LOAD": 2, "STORE": 2}
    
    engine = InOrderEngine(instructions, latencies)
    
    # Run to completion
    while not engine.is_done():
        engine.step_cycle()
        
    assert engine.stall_count > 0
