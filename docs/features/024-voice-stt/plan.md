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
