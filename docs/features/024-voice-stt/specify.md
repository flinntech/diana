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
