Create implementation plan for Learning Preferences

Technical context:
- Language: TypeScript 5.9+ with Node.js 18+
- Existing: Key facts store (JSON-based)
- Existing: Cross-session memory pattern

Research needed:
- Preference modeling approaches
- Confidence scoring for inferences
- Preference decay/freshness
- Effective preference injection in prompts

Key deliverables:
1. src/memory/preferences.ts - Preference store
2. src/memory/inference.ts - Preference inference logic
3. src/memory/injection.ts - Preference context injection
4. Extended key facts schema
5. Preference management tools
6. Tests for preference storage and inference
