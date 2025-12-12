# 023: Voice Input (STT)

**Phase**: 5 (Advanced Capabilities)
**Score**: 1.33
**Value**: 4 | **Effort**: 3

## Overview

Speech-to-text for hands-free voice queries. Enables natural voice interaction with DIANA.

## Dependencies

- 004-agent-mcp-foundation (optional)
- 013-voice-tts (for complete voice interaction)

## Enables

- Hands-free queries
- Voice-first workflows
- Accessibility
- True assistant experience

---

## speckit.specify Prompt

```
Voice Input (Speech-to-Text) for DIANA

Add voice input capability:

1. STT Options (local-first)
   - Whisper (OpenAI's model, runs locally via whisper.cpp)
   - Vosk (lighter weight alternative)
   - Fallback: Browser-based Web Speech API (if GUI added)

2. Features
   - Push-to-talk activation
   - Voice activity detection (optional)
   - Wake word detection (optional, "Hey Diana")
   - Real-time transcription display

3. Audio Input
   - Use system default microphone
   - WSL: Capture from Windows audio
   - Handle noise and silence appropriately

4. Integration
   - Transcribed text feeds into chat input
   - Works with existing conversation flow
   - Combine with TTS for full voice mode

Constraints:
- Local-first: Whisper running locally preferred
- Low latency: Should feel responsive
- Handle WSL audio input (may need Windows bridge)
- Privacy: Audio processed locally, not sent anywhere
```

---

## speckit.plan Prompt

```
Create implementation plan for Voice Input (STT)

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- Primary: whisper.cpp via Node bindings
- Alternative: Vosk for lighter weight
- Environment: WSL with audio input from Windows

Research needed:
- whisper.cpp Node.js bindings
- WSL audio input capture
- Voice activity detection approaches
- Wake word detection options

Key deliverables:
1. src/agents/voice/stt.ts - STT engine abstraction
2. src/agents/voice/whisper.ts - Whisper implementation
3. Audio capture integration (portaudio or similar)
4. Voice activity detection
5. Integration with chat input
6. Tests for transcription accuracy
```
