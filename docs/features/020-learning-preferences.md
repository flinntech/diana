# 020: Learning Preferences

**Phase**: 5 (Advanced Capabilities)
**Score**: 2.33
**Value**: 7 | **Effort**: 3

## Overview

Expand the key facts system into a learning preferences system. Let DIANA adapt to user patterns and preferences over time.

## Dependencies

- 004-agent-mcp-foundation
- Existing key facts system

## Enables

- Personalized responses
- Learned shortcuts ("when I say X, I mean Y")
- Behavioral adaptation
- Preference inference

---

## speckit.specify Prompt

```
Learning Preferences for DIANA

Expand cross-session memory into preference learning:

1. Preference Types
   - Explicit: User-stated preferences ("I prefer morning meetings")
   - Implicit: Inferred from behavior (often works late)
   - Corrections: "No, I meant X" patterns
   - Shortcuts: Personal terminology mappings

2. Storage
   - Extend key facts with structured preferences
   - Categories: communication, scheduling, workflow, etc.
   - Confidence levels for inferred preferences
   - Timestamps for recency weighting

3. Application
   - Inject relevant preferences into responses
   - Adjust suggestions based on preferences
   - Learn from corrections
   - Periodic preference review/confirmation

4. Tool Interface
   - preference_set: Explicitly set preference
   - preference_list: View stored preferences
   - preference_forget: Remove a preference
   - (Implicit learning happens automatically)

Constraints:
- Transparent: User can see all learned preferences
- Controllable: Easy to correct or remove
- Privacy: All preferences stored locally
- Non-creepy: Don't over-infer, ask when uncertain
```

---

## speckit.plan Prompt

```
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
```
