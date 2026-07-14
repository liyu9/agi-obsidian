# Upstream issue draft — for 777genius/claude-notifications

Two reproducible bugs found on Windows (Git Bash, CC v2.1.131, plugin v1.0.3) while validating the install end-to-end. Both are non-fatal (Toast still fires) but spam stderr on every Stop hook.

---

## Title
`[Windows][v1.0.3] Two stderr spam bugs on every Stop hook: unbound var \`hook_cwd_val\` and base-conversion crash in session-name.sh`

## Environment
- OS: Windows 11 Home China 26200
- Shell: Git Bash (msys2 / mingw64)
- Claude Code: v2.1.131
- Plugin: claude-notifications v1.0.3
- JSON backend: jq 1.8.1 (also reproduced with PowerShell fallback)

## Bug 1 — `hook_cwd_val: unbound variable`

### Symptom
Every Stop hook prints to stderr:
```
hooks/notification-handler.sh: line 180: hook_cwd_val: unbound variable
```

### Root cause
`hooks/notification-handler.sh:180`:
```bash
local state_json=$(json_build session_id "$session_id" last_interactive_tool "$prev_tool" last_ts "$prev_ts" last_task_complete_ts "$now_ts" cwd "$hook_cwd_val")
```
`$hook_cwd_val` is never declared. The parsed value at line 47 is stored in `$cwd`. With `set -u` (installed by `error-handler.sh`), this aborts that codepath every time.

### Suggested fix (one-line)
```diff
- local state_json=$(json_build session_id "$session_id" ... cwd "$hook_cwd_val")
+ local state_json=$(json_build session_id "$session_id" ... cwd "${cwd:-}")
```

---

## Bug 2 — `value too great for base` in `session-name.sh`

### Symptom
On Stop hook (any session whose ID isn't a hex-only UUID, e.g., a custom test ID, or any UUID whose first 6 chars contain a non-hex letter g-z):
```
lib/session-name.sh: line 48: 16#zhveri: value too great for base (error token is "16#zhveri")
```

### Root cause
`lib/session-name.sh:48-49`:
```bash
local adj_index=$((16#${adj_seed:0:6} % ${#ADJECTIVES[@]}))
local noun_index=$((16#${noun_seed:0:6} % ${#NOUNS[@]}))
```
Bash's `16#...` arithmetic requires every char to be a valid hex digit (0-9a-f). Real Claude Code session IDs are UUIDs and are usually safe, but:
1. Any character `g`-`z` in those 6 chars crashes the hook.
2. The function assumes "lowercased UUID" without filtering non-hex.

### Suggested fix
Strip non-hex chars before `16#`:
```bash
local adj_seed_hex=$(echo "${adj_seed:0:6}" | tr -cd '0-9a-f')
local noun_seed_hex=$(echo "${noun_seed:0:6}" | tr -cd '0-9a-f')
adj_seed_hex="${adj_seed_hex:-0}"  # fallback if filter empties it
noun_seed_hex="${noun_seed_hex:-0}"
local adj_index=$((16#$adj_seed_hex % ${#ADJECTIVES[@]}))
local noun_index=$((16#$noun_seed_hex % ${#NOUNS[@]}))
```

---

## Bonus observation (not a bug, design feedback)

`config/config.json` exposes a `statuses.*.keywords` array, but **`lib/analyzer.sh:476,483` hardcodes the same keyword set in two `grep -qiE` patterns** and ignores the config entirely (only `title` and `sound` are read). This breaks the documented customization story (e.g., adding Chinese keywords requires editing `analyzer.sh` directly, which gets clobbered on plugin upgrade).

Suggest reading `keywords` from config and joining with `|` to build the grep pattern at runtime.

---

## Repro steps (minimal)

```bash
export CLAUDE_PLUGIN_ROOT=~/.claude/plugins/cache/claude-notifications/claude-notifications/1.0.3
TR=$(mktemp -t cn-XXXXXX.jsonl)
printf '%s\n' \
  '{"type":"user","message":{"role":"user","content":"x"}}' \
  '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"All tasks completed."}]}}' \
  > "$TR"
TR_WIN=$(cygpath -w "$TR")
HOOK_JSON=$(jq -nc --arg sid "zhverify001" --arg tp "$TR_WIN" --arg cwd "$PWD" \
  '{session_id:$sid, transcript_path:$tp, cwd:$cwd, stop_hook_active:false, hook_event_name:"Stop"}')
printf '%s' "$HOOK_JSON" | bash "$CLAUDE_PLUGIN_ROOT/hooks/notification-handler.sh" Stop
```
→ stderr shows both errors, exit 0, Toast still appears.
