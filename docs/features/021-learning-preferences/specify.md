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
