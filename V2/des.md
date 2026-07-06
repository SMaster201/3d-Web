Aegis Vision 系統架構與功能規格書 (PRD)
1. 系統概述 (System Overview)
Aegis Vision 是一款企業級的 AI 視覺鑑識與安全監控系統。系統結合了即時多路影像串流、邊緣運算 (Edge AI) 硬體加速、高精度物件/人員偵測，以及具備視覺語言理解能力 (VLM) 的 AI 智能助理 (Oracle)。主要目的是提供安全人員一個集中的戰術指揮中心，以最低延遲掌握場域動態，並透過 AI 輔助進行異常事件的快速分析與決策。

2. 核心模組與功能說明
2.1 指揮中心 (Command Center - homepage.html)
此模組為系統的主控台，提供即時的場域監控與運算資源遙測。

即時影像串流 (Live Feed)：支援高畫質 (4K/1080p) 串流，畫面即時疊加 AI 辨識框 (Bounding Boxes)、FPS、解析度及錄影狀態。

快速控制介面 (Quick Controls)：

影像擷取 (Screenshot)：一鍵擷取高解析度影格。

重新識別 (Re-identify)：強制 AI 重新掃描當前畫面特徵。

動態模型與設備切換：

攝影機來源：即時切換場域內的攝影機 (如 CAM-01, CAM-04)。

推論模型 (Inference Model)：可依任務需求熱切換 YOLO 快速追蹤模型、ResNet-50 深度分類，或自定義的高精度檢測模型 (Custom_Aegis_V1)。

列印設備聯動：支援 Aegis-Print 系列，可用於即時印製異常事件工單或訪客標籤。

系統終端機與狀態遙測 (Telemetry & Logs)：

即時顯示運算資源消耗 (CPU/GPU Load、VRAM Usage)。

以終端機風格滾動顯示底層系統日誌 (System Terminal)，包含模型載入狀態、延遲 (Latency) 與各區掃描狀態。

2.2 歷史偵測紀錄 (Detection History - detection_history.html)
強大的事件過濾與分析後台，用於事後鑑識與稽核。

多維度檢索列 (Filter Bar)：支援依據日期區間、攝影機來源、偵測類型 (Person, Vehicle, Object) 以及印表機型號進行精準過濾。

網格化事件檢視 (Data Grid)：條列所有偵測紀錄，包含縮圖、信心指數 (Confidence)、時間戳記與設備來源。

深度分析面版 (Analysis Detail)：

高解析度檢視：提供原始影格 (RAW Frame) 的縮放檢視與座標疊加。

事件元資料 (Metadata)：紀錄精確到毫秒的時間戳記、持續時間與狀態標籤。

AI 診斷數據 (AI Diagnostics)：視覺化呈現物件類別信心指數與軌跡分析進度。

處置動作：提供「忽略誤判 (Ignore False Positive)」或「升級警報 (Escalate Alert)」的快速決策按鈕。

2.3 AI 鑑識聊天室 (AI Chat - ai_chat.html)
名為 AEGIS_AI_ORACLE 的對話式智能代理，具備多模態資料處理能力。

多模態上下文整合：支援將事件紀錄 (如 EVT-8892) 實體夾帶至對話中，交由 AI 分析。

自動化安全推演：AI 能調閱存取控制日誌 (Access Control Logs)、比對熱影像與臉部生物特徵，綜合判斷入侵機率。

指令化操作：支援自然語言查詢與系統指令 (如 /lockdown zone_2) 混合輸入。

2.4 系統設定與偏好 (Settings - settings_*.html)
提供極度細緻的硬體加速與推論引擎微調。

模型參數 (Model Parameters)：

推論引擎 (Inference Engine)：支援 TensorRT、ONNX、OpenVINO 介接。

硬體加速 (Hardware Acceleration)：可調整 Batch Size (1, 2, 4, 8) 與量化精度 (FP32, FP16, INT8) 以優化 VRAM 佔用，並支援 GPU 記憶體動態增長 (Memory Growth)。

偵測閾值：自訂 Confidence Threshold 與 NMS (Non-Maximum Suppression) Threshold。

警報與觸發器 (Alerts & Triggers)：

配置 Email、SMS、Desktop Push 與系統日誌的通知渠道。

設定警告 (Warning) 與嚴重 (Critical) 威脅級別的門檻 (如 80% 信心指數觸發全區封鎖)。

攝影機配置 (Camera Config)：設定串流解析度、畫面水平翻轉、夜視模式 (IR) 及影像對比/飽和度。

使用者設定檔 (User Profile)：管理管理員權限 (如 Tier 5 權限)、雙重驗證 (2FA) 與介面主題切換。

3. 系統技術架構建議
基於上述規格，建議的底層技術堆疊如下：

前端架構 (Frontend)
核心框架：基於 HTML5/JavaScript，搭配 Tailwind CSS 進行切版與深色模式 (Dark Mode) 管理。

串流顯示：利用 WebRTC 或 MSE (Media Source Extensions) 接收超低延遲的影像串流。

後端架構 (Backend)
API 與通訊：採用 FastAPI 作為核心，處理所有的 HTTP 請求與設定變更；使用 WebSocket 建立雙向通訊通道，負責推送 Terminal Logs、硬體狀態 (VRAM/CPU) 與 AI 即時診斷數據。

資料庫：關聯式資料庫 (如 PostgreSQL) 儲存事件 MetaData 與系統設定；時序資料庫 (Time-series DB) 儲存遙測數據；向量資料庫 (Vector DB) 支援 AI Oracle 的 RAG (檢索增強生成) 功能以查詢歷史安全日誌。

AI 推論引擎與多智能體架構
模型伺服器 (Model Serving)：使用 TensorRT / Triton Inference Server 進行硬體加速，完美支援介面中的 FP16/INT8 量化選項。

視覺模組：整合 YOLO 系列處理即時動態與大範圍監控；高精度或微小缺陷/異常偵測則切換至 RF-DETR 模型。

Oracle Agent 系統：基於 FastAPI 封裝 Qwen-VL 等大模型，並透過 Graph FSM 設計系統狀態機，結合 ReAct 推理框架，讓 AI 不只能「看」懂影像，還能「執行」如比對資料庫或觸發警報的實際動作。