import asyncio
import json
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

from engine.instruction import Instruction
from engine.tomasulo_engine import TomasuloEngine
from engine.inorder_engine import InOrderEngine
from api.parser import parse_assembly

app = FastAPI(title="Tomasulo Simulator Backend")

# Setup CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for local web development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {
        "status": "online",
        "service": "Tomasulo Simulator API",
        "endpoints": {
            "load_program": "/api/load-program",
            "step": "/api/simulate/step",
            "reset": "/api/simulate/reset",
            "ws": "/ws/stream"
        }
    }

# Global simulation state
class GlobalState:
    def __init__(self):
        self.tomasulo_engine: Optional[TomasuloEngine] = None
        self.inorder_engine: Optional[InOrderEngine] = None
        self.raw_assembly: str = ""
        self.instructions: List[Instruction] = []
        self.latencies: Dict[str, int] = {
            "ADD": 2,
            "MUL": 4,
            "DIV": 12,
            "LOAD": 2,
            "STORE": 2
        }

state = GlobalState()

class LoadProgramRequest(BaseModel):
    assembly: str
    latencies: Optional[Dict[str, int]] = None

@app.post("/api/load-program")
def load_program(request: LoadProgramRequest):
    try:
        # Parse assembly text
        instructions = parse_assembly(request.assembly)
        state.raw_assembly = request.assembly
        state.instructions = instructions
        
        if request.latencies:
            state.latencies.update(request.latencies)
            
        # Create fresh copies for Tomasulo and In-Order engines
        tomasulo_insts = [
            Instruction(id=i.id, opcode=i.opcode, dest=i.dest, src1=i.src1, src2=i.src2)
            for i in instructions
        ]
        inorder_insts = [
            Instruction(id=i.id, opcode=i.opcode, dest=i.dest, src1=i.src1, src2=i.src2)
            for i in instructions
        ]

        state.tomasulo_engine = TomasuloEngine(tomasulo_insts, state.latencies)
        state.inorder_engine = InOrderEngine(inorder_insts, state.latencies)

        return get_full_state()
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/simulate/step")
def simulate_step():
    if not state.tomasulo_engine or not state.inorder_engine:
        raise HTTPException(status_code=400, detail="No program loaded. Call /api/load-program first.")
    
    if not state.tomasulo_engine.is_done():
        state.tomasulo_engine.step_cycle()
    
    if not state.inorder_engine.is_done():
        state.inorder_engine.step_cycle()
        
    return get_full_state()

@app.post("/api/simulate/reset")
def simulate_reset():
    if not state.raw_assembly:
        raise HTTPException(status_code=400, detail="No program loaded to reset.")
        
    # Re-initialize
    tomasulo_insts = [
        Instruction(id=i.id, opcode=i.opcode, dest=i.dest, src1=i.src1, src2=i.src2)
        for i in state.instructions
    ]
    inorder_insts = [
        Instruction(id=i.id, opcode=i.opcode, dest=i.dest, src1=i.src1, src2=i.src2)
        for i in state.instructions
    ]

    state.tomasulo_engine = TomasuloEngine(tomasulo_insts, state.latencies)
    state.inorder_engine = InOrderEngine(inorder_insts, state.latencies)

    return get_full_state()

@app.post("/api/simulate/run-all")
def simulate_run_all():
    if not state.tomasulo_engine or not state.inorder_engine:
        raise HTTPException(status_code=400, detail="No program loaded.")

    history = []
    # Add initial state
    history.append(get_full_state())

    while not state.tomasulo_engine.is_done() or not state.inorder_engine.is_done():
        if not state.tomasulo_engine.is_done():
            state.tomasulo_engine.step_cycle()
        if not state.inorder_engine.is_done():
            state.inorder_engine.step_cycle()
        history.append(get_full_state())

    return history

def calculate_ipc(instructions_count: int, cycles: int) -> float:
    if cycles == 0:
        return 0.0
    return round(instructions_count / cycles, 2)

def get_full_state() -> Dict[str, Any]:
    tomasulo_snapshot = state.tomasulo_engine.get_state_snapshot() if state.tomasulo_engine else None
    inorder_snapshot = state.inorder_engine.get_state_snapshot() if state.inorder_engine else None
    
    clock = max(
        tomasulo_snapshot["clock"] if tomasulo_snapshot else 0,
        inorder_snapshot["clock"] if inorder_snapshot else 0
    )

    tomasulo_stalls = 0
    if tomasulo_snapshot:
        # Calculate Tomasulo stalls: structural hazards where iq_pointer was blocked
        # (meaning instruction is ready to issue but all stations of its type are busy).
        # We can calculate this by counting cycles where clock > iq_pointer and some instruction has no issue_cycle.
        # Actually, let's keep it simple: Tomasulo stalls = clock - iq_pointer (if clock > iq_pointer and iq_pointer is stuck)
        # Let's count instructions that haven't been issued but could be, or just count cycles where issue stalled.
        # Let's count how many instructions haven't issued yet compared to current clock minus active ones.
        # Even simpler: we can count cycles where iq_pointer didn't advance despite having instructions left.
        # Let's track structural stalls in TomasuloEngine or calculate it.
        # Let's define it as: sum of cycles that instructions spent waiting in the queue after being eligible.
        # Let's compute a simple statistic:
        issued_insts = [inst for inst in tomasulo_snapshot["instructions"] if inst["issue_cycle"] is not None]
        total_waiting_issue = sum(inst["issue_cycle"] - 1 for inst in issued_insts)
        # Structural issue stalls
        tomasulo_stalls = max(0, total_waiting_issue)

    inorder_stalls = inorder_snapshot["stall_count"] if inorder_snapshot else 0
    inst_count = len(state.instructions)

    tomasulo_ipc = calculate_ipc(inst_count, tomasulo_snapshot["clock"]) if tomasulo_snapshot else 0.0
    inorder_ipc = calculate_ipc(inst_count, inorder_snapshot["clock"]) if inorder_snapshot else 0.0

    return {
        "clock": clock,
        "tomasulo": tomasulo_snapshot,
        "inorder": inorder_snapshot,
        "raw_assembly": state.raw_assembly,
        "stats": {
            "tomasulo_ipc": tomasulo_ipc,
            "inorder_ipc": inorder_ipc,
            "tomasulo_stalls": tomasulo_stalls,
            "inorder_stalls": inorder_stalls
        }
    }

# Speed mapping: speed multiplier -> delay in seconds
SPEED_DELAYS = {
    0.25: 2.0,
    0.5: 1.0,
    1.0: 0.5,
    2.0: 0.25,
    4.0: 0.125
}

@app.websocket("/ws/stream")
async def websocket_stream(websocket: WebSocket):
    await websocket.accept()
    
    is_playing = False
    speed = 1.0  # Default speed multiplier
    
    async def play_loop():
        nonlocal is_playing, speed
        while is_playing:
            if not state.tomasulo_engine or not state.inorder_engine:
                await websocket.send_json({"error": "No program loaded"})
                is_playing = False
                break
                
            if state.tomasulo_engine.is_done() and state.inorder_engine.is_done():
                await websocket.send_json({"status": "completed", "state": get_full_state()})
                is_playing = False
                break
                
            if not state.tomasulo_engine.is_done():
                state.tomasulo_engine.step_cycle()
            if not state.inorder_engine.is_done():
                state.inorder_engine.step_cycle()
                
            await websocket.send_json({"status": "running", "state": get_full_state()})
            
            # Non-drifting delay logic
            delay = SPEED_DELAYS.get(speed, 0.5)
            await asyncio.sleep(delay)

    play_task = None
    
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            action = message.get("action")
            
            if action == "play":
                if not is_playing:
                    is_playing = True
                    speed = message.get("speed", 1.0)
                    play_task = asyncio.create_task(play_loop())
            elif action == "pause":
                is_playing = False
                if play_task:
                    play_task.cancel()
                    play_task = None
                await websocket.send_json({"status": "paused", "state": get_full_state()})
            elif action == "set_speed":
                speed = message.get("speed", 1.0)
            elif action == "step":
                if not state.tomasulo_engine or not state.inorder_engine:
                    await websocket.send_json({"error": "No program loaded"})
                    continue
                if not state.tomasulo_engine.is_done():
                    state.tomasulo_engine.step_cycle()
                if not state.inorder_engine.is_done():
                    state.inorder_engine.step_cycle()
                await websocket.send_json({"status": "step", "state": get_full_state()})
            elif action == "reset":
                # Re-initialize
                tomasulo_insts = [
                    Instruction(id=i.id, opcode=i.opcode, dest=i.dest, src1=i.src1, src2=i.src2)
                    for i in state.instructions
                ]
                inorder_insts = [
                    Instruction(id=i.id, opcode=i.opcode, dest=i.dest, src1=i.src1, src2=i.src2)
                    for i in state.instructions
                ]
                state.tomasulo_engine = TomasuloEngine(tomasulo_insts, state.latencies)
                state.inorder_engine = InOrderEngine(inorder_insts, state.latencies)
                await websocket.send_json({"status": "reset", "state": get_full_state()})
                
    except WebSocketDisconnect:
        # Client disconnected
        is_playing = False
        if play_task:
            play_task.cancel()
    except Exception as e:
        print(f"WS error: {e}")
        is_playing = False
        if play_task:
            play_task.cancel()
