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
