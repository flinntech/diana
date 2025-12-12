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
