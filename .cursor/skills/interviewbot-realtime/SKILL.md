---
name: interviewbot-realtime
description: Handle real-time communication for text chat (WebSocket), voice interviews (LiveKit audio), and video interviews (LiveKit video). Use when working with WebSocket handlers, LiveKit integration, audio/video pipelines, or real-time interview features.
---

# Interview Bot Real-Time Layer

## Architecture

```
Text Interview:   Browser ←WebSocket→ FastAPI WS Handler ←→ AIEngine
Voice Interview:  Browser ←LiveKit→ LiveKit Server ←→ Backend Agent (STT→LLM→TTS)
Video Interview:  Browser ←LiveKit→ LiveKit Server ←→ Backend Agent + Video Recording
```

## WebSocket (Text Chat)

### Message Protocol

All WebSocket messages use JSON with a `type` field:

```python
# Client → Server
{"type": "message", "content": "My answer is..."}
{"type": "start", "candidate_name": "Jane", "candidate_email": "jane@example.com"}
{"type": "typing"}
{"type": "end"}

# Server → Client
{"type": "question", "content": "Tell me about...", "progress": 3, "total": 10}
{"type": "thinking"}
{"type": "end", "content": "Thank you! Interview complete."}
{"type": "error", "content": "Something went wrong."}
```

### WebSocket Handler

```python
# src/interviewbot/websocket/chat_handler.py
from fastapi import WebSocket, WebSocketDisconnect
from interviewbot.services.ai_engine import AIEngine, InterviewConversation
from interviewbot.services.interview_service import InterviewService
import json

async def handle_text_interview(
    websocket: WebSocket,
    token: str,
    db,
):
    await websocket.accept()
    service = InterviewService(db)
    session = await service.get_session_by_token(token)
    if not session:
        await websocket.send_json({"type": "error", "content": "Invalid interview token"})
        await websocket.close()
        return

    engine = AIEngine()
    job = await service.get_job_posting_for_session(session["id"])
    system_prompt = build_system_prompt(job)
    conversation = InterviewConversation(system_prompt)

    # Send first question
    first_question = await engine.chat(conversation.get_messages())
    conversation.add_message("assistant", first_question)
    await websocket.send_json({"type": "question", "content": first_question, "progress": 1, "total": job["interview_config"]["num_questions"]})

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)

            if msg["type"] == "message":
                conversation.add_message("user", msg["content"])
                await service.save_message(session["id"], "candidate", msg["content"])

                await websocket.send_json({"type": "thinking"})

                response = await engine.chat(conversation.get_messages())
                conversation.add_message("assistant", response)
                await service.save_message(session["id"], "interviewer", response)

                progress = conversation.get_question_count()
                total = job["interview_config"]["num_questions"]

                if progress >= total:
                    await websocket.send_json({"type": "end", "content": response})
                    await service.complete_session(session["id"], conversation.messages)
                    break
                else:
                    await websocket.send_json({"type": "question", "content": response, "progress": progress, "total": total})

            elif msg["type"] == "end":
                await service.complete_session(session["id"], conversation.messages)
                break

    except WebSocketDisconnect:
        await service.mark_session_disconnected(session["id"])
```

### Registering WebSocket Route

```python
# In main.py or a dedicated websocket router
from fastapi import WebSocket, Depends
from interviewbot.websocket.chat_handler import handle_text_interview
from interviewbot.dependencies import get_db

@app.websocket("/ws/interview/{token}")
async def websocket_interview(websocket: WebSocket, token: str, db=Depends(get_db)):
    await handle_text_interview(websocket, token, db)
```

### Frontend WebSocket Client

```typescript
// lib/socket.ts
export class InterviewSocket {
  private ws: WebSocket | null = null;
  private onMessage: (msg: any) => void;
  private reconnectAttempts = 0;
  private maxReconnects = 3;

  constructor(token: string, onMessage: (msg: any) => void) {
    this.onMessage = onMessage;
    this.connect(token);
  }

  private connect(token: string) {
    const wsUrl = process.env.NEXT_PUBLIC_API_URL!.replace("http", "ws");
    this.ws = new WebSocket(`${wsUrl}/ws/interview/${token}`);

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      this.onMessage(msg);
    };

    this.ws.onclose = () => {
      if (this.reconnectAttempts < this.maxReconnects) {
        this.reconnectAttempts++;
        setTimeout(() => this.connect(token), 2000 * this.reconnectAttempts);
      }
    };
  }

  send(type: string, data: Record<string, any> = {}) {
    this.ws?.send(JSON.stringify({ type, ...data }));
  }

  sendMessage(content: string) {
    this.send("message", { content });
  }

  close() {
    this.ws?.close();
  }
}
```

## LiveKit (Voice + Video)

### Server-Side: Room + Token Management

```python
# src/interviewbot/services/livekit_service.py
from livekit.api import LiveKitAPI, AccessToken, VideoGrants
from interviewbot.config import get_settings

class LiveKitService:
    def __init__(self):
        settings = get_settings()
        self.api = LiveKitAPI(
            url=settings.livekit_url,
            api_key=settings.livekit_api_key,
            api_secret=settings.livekit_api_secret,
        )

    def create_token(self, room_name: str, participant_name: str, is_agent: bool = False) -> str:
        settings = get_settings()
        token = AccessToken(settings.livekit_api_key, settings.livekit_api_secret)
        token.identity = participant_name
        token.name = participant_name
        grants = VideoGrants(
            room_join=True,
            room=room_name,
            can_publish=True,
            can_subscribe=True,
        )
        token.video_grants = grants
        return token.to_jwt()

    async def create_room(self, room_name: str) -> dict:
        room = await self.api.room.create_room(name=room_name, empty_timeout=300)
        return {"name": room.name, "sid": room.sid}
```

### Voice Interview Pipeline

```
Candidate speaks → LiveKit captures audio
  → Backend receives audio track
  → Whisper API transcribes to text
  → Text sent to LLM for response
  → LLM response sent to ElevenLabs TTS
  → Audio response published back to LiveKit room
  → Candidate hears AI response
```

### Speech Service

```python
# src/interviewbot/services/speech_service.py
import httpx
from openai import AsyncOpenAI
from interviewbot.config import get_settings

class SpeechService:
    def __init__(self):
        settings = get_settings()
        self.openai = AsyncOpenAI(api_key=settings.openai_api_key)
        self.elevenlabs_key = settings.elevenlabs_api_key

    async def transcribe(self, audio_bytes: bytes, format: str = "webm") -> str:
        """Speech-to-text using Whisper."""
        transcript = await self.openai.audio.transcriptions.create(
            model="whisper-1",
            file=("audio." + format, audio_bytes),
            language="en",
        )
        return transcript.text

    async def synthesize(self, text: str, voice_id: str = "21m00Tcm4TlvDq8ikWAM") -> bytes:
        """Text-to-speech using ElevenLabs."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream",
                headers={"xi-api-key": self.elevenlabs_key},
                json={
                    "text": text,
                    "model_id": "eleven_turbo_v2_5",
                    "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
                },
                timeout=30,
            )
            return response.content
```

### Frontend LiveKit Integration

```typescript
// lib/livekit.ts
import { Room, RoomEvent, Track } from "livekit-client";

export async function joinInterviewRoom(token: string): Promise<Room> {
  const room = new Room();

  room.on(RoomEvent.TrackSubscribed, (track) => {
    if (track.kind === Track.Kind.Audio) {
      const audioElement = track.attach();
      document.body.appendChild(audioElement);
    }
  });

  await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, token);
  await room.localParticipant.setMicrophoneEnabled(true);

  return room;
}
```

### LiveKit React Component

```tsx
// components/interview/interview-voice.tsx
"use client";
import { LiveKitRoom, AudioTrack, useParticipants } from "@livekit/components-react";

interface VoiceInterviewProps {
  token: string;
  serverUrl: string;
}

export function InterviewVoice({ token, serverUrl }: VoiceInterviewProps) {
  return (
    <LiveKitRoom token={token} serverUrl={serverUrl} connect={true}>
      <VoiceUI />
    </LiveKitRoom>
  );
}
```

## Silence Detection

```python
SILENCE_THRESHOLD_SECONDS = 15
GENTLE_PROMPT = "Take your time. Would you like me to repeat the question, or would you like to move on?"

async def check_silence(last_activity: float, websocket):
    import time
    elapsed = time.time() - last_activity
    if elapsed > SILENCE_THRESHOLD_SECONDS:
        await websocket.send_json({"type": "question", "content": GENTLE_PROMPT})
```

## Key Rules

1. **WebSocket for text** -- simpler, lower overhead, native FastAPI support
2. **LiveKit for voice/video** -- handles WebRTC complexity, scaling, codecs
3. **Always validate interview token** before accepting WebSocket connection
4. **Auto-reconnect on disconnect** -- up to 3 attempts with exponential backoff
5. **Save every message to DB** -- for transcript generation and scoring
6. **Send "thinking" indicator** -- so the candidate knows AI is processing
7. **Silence detection** -- gently prompt after 15s of silence
8. **Record video interviews** -- store in S3 for later review
9. **Graceful shutdown** -- always complete scoring even if candidate disconnects
