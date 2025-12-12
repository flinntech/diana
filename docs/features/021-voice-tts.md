# 021: Voice Output (TTS)

**Phase**: 5 (Advanced Capabilities)
**Score**: 2.0
**Value**: 4 | **Effort**: 2

## Overview

Text-to-speech capability for spoken responses. Enables hands-free interaction (output side).

## Dependencies

- 004-agent-mcp-foundation (optional)

## Enables

- Spoken responses from DIANA
- Hands-free workflows (with STT)
- Accessibility improvements
- More natural assistant interaction

---

## speckit.specify Prompt

```
Voice Output (Text-to-Speech) for DIANA

Add spoken response capability:

1. TTS Options (local-first)
   - Piper TTS (local, fast, good quality)
   - Edge TTS (Microsoft, requires network but free)
   - espeak (fallback, lower quality)

2. Features
   - Speak response text
   - Adjustable speech rate
   - Voice selection (if multiple available)
   - Interrupt/stop speaking

3. Tool Interface
   - voice_speak: Speak given text
   - voice_stop: Stop current speech
   - voice_config: Adjust rate/voice settings

4. Integration
   - Optional auto-speak for responses
   - Manual trigger via command
   - Queue long responses appropriately

5. Audio Output
   - Use system default audio device
   - WSL: Route to Windows audio (PulseAudio or WSLg)

Constraints:
- Local-first preferred (Piper)
- Fallback to Edge TTS if local unavailable
- Non-blocking: Don't freeze DIANA while speaking
- Handle WSL audio routing
```

---

## speckit.plan Prompt

```
Create implementation plan for Voice Output (TTS)

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- Primary: Piper TTS (local, ONNX-based)
- Fallback: Edge TTS (edge-tts npm package)
- Environment: WSL with audio routing to Windows

Research needed:
- Piper TTS Node.js integration
- Edge TTS usage in Node.js
- WSL audio output options (PulseAudio, WSLg)
- Audio playback libraries (play-sound, etc.)

Key deliverables:
1. src/agents/voice/tts.ts - TTS engine abstraction
2. src/agents/voice/piper.ts - Piper TTS implementation
3. src/agents/voice/edge-tts.ts - Edge TTS fallback
4. Audio playback integration
5. Tool definitions for speech control
6. Tests for TTS generation (audio playback harder to test)
```
