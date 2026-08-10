import asyncio
import json
import base64
import cv2
import numpy as np
import psutil
try:
    import pynvml
    pynvml.nvmlInit()
    HAS_GPU = True
except Exception:
    HAS_GPU = False

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
import torch
import torchvision

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLO model (downloads standard yolov8n if not present)
model = YOLO("yolov8n.pt")

async def get_telemetry():
    # CPU
    cpu_percent = psutil.cpu_percent(interval=None)
    app_cpu = cpu_percent * 0.7  # Approximation of app vs other
    other_cpu = cpu_percent * 0.3
    
    # VRAM / RAM
    if HAS_GPU:
        try:
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            info = pynvml.nvmlDeviceGetMemoryInfo(handle)
            total_vram_gb = info.total / (1024**3)
            used_vram_gb = info.used / (1024**3)
            app_vram = used_vram_gb * 0.8
            other_vram = used_vram_gb * 0.2
        except Exception:
            # Fallback if NVML fails
            mem = psutil.virtual_memory()
            total_vram_gb = mem.total / (1024**3)
            used_vram_gb = mem.used / (1024**3)
            app_vram = used_vram_gb * 0.6
            other_vram = used_vram_gb * 0.4
    else:
        # Fallback to RAM if no GPU
        mem = psutil.virtual_memory()
        total_vram_gb = mem.total / (1024**3)
        used_vram_gb = mem.used / (1024**3)
        app_vram = used_vram_gb * 0.6
        other_vram = used_vram_gb * 0.4

    return {
        "appCpu": round(app_cpu, 1),
        "otherCpu": round(other_cpu, 1),
        "totalCpu": round(cpu_percent, 1),
        "appVram": round(app_vram, 1),
        "otherVram": round(other_vram, 1),
        "totalVramUsed": round(used_vram_gb, 1),
        "totalVramCap": round(total_vram_gb, 1)
    }

from pydantic import BaseModel
import os

class SavePathRequest(BaseModel):
    path: str

@app.post("/api/settings/save-path")
async def update_save_path(req: SavePathRequest):
    try:
        os.makedirs(req.path, exist_ok=True)
        return {"status": "success", "path": req.path}
    except Exception as e:
        return {"status": "error", "message": str(e)}

class ModelSettingsRequest(BaseModel):
    confThresh: float
    nmsThresh: float
    inferenceEngine: str
    inferenceInterval: float = 0
    targetObjects: list[str] = []

inference_config = {
    "conf": 0.6,
    "iou": 0.45,
    "device": "0" if torch.cuda.is_available() else "cpu",
    "target_objects": []
}

@app.post("/api/settings/model")
async def update_model_settings(req: ModelSettingsRequest):
    try:
        inference_config["conf"] = float(req.confThresh) / 100.0
        inference_config["iou"] = float(req.nmsThresh) / 100.0
        inference_config["device"] = "0" if req.inferenceEngine == "cuda" and torch.cuda.is_available() else "cpu"
        inference_config["target_objects"] = req.targetObjects
        print(f"Updated backend model settings: {inference_config}")
        return {"status": "success", "config": inference_config}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()
    # Initialize CPU percent
    psutil.cpu_percent(interval=None)
    try:
        while True:
            data = await get_telemetry()
            await websocket.send_json(data)
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"Telemetry error: {e}")

@app.websocket("/ws/inference")
async def websocket_inference(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Receive base64 encoded image
            data = await websocket.receive_text()
            
            # Decode image
            if data.startswith('data:image'):
                data = data.split(',')[1]
            img_bytes = base64.b64decode(data)
            np_arr = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            
            if img is None:
                continue

            # Run inference
            results = model(
                img, 
                device=inference_config["device"],
                conf=inference_config["conf"],
                iou=inference_config["iou"],
                verbose=False
            )
            
            # Format detections
            detections = []
            targets = inference_config.get("target_objects", [])
            for r in results:
                boxes = r.boxes
                for box in boxes:
                    cls_id = int(box.cls[0].item())
                    name = model.names[cls_id]
                    
                    # Filter by target objects if specified
                    if targets and name.lower() not in targets:
                        continue
                        
                    x1, y1, x2, y2 = box.xyxyn[0].tolist()  # Normalized coordinates
                    conf = box.conf[0].item()
                    
                    detections.append({
                        "label": name,
                        "confidence": round(conf, 2),
                        "x": x1,
                        "y": y1,
                        "w": x2 - x1,
                        "h": y2 - y1
                    })
            
            await websocket.send_json({"detections": detections})
            
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"Inference error: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
