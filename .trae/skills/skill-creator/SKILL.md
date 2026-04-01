---
name: skill-creator
description: Create new skills, modify and improve existing skills. Use when users want to create a skill from scratch, edit or optimize an existing skill, or improve skill descriptions for better triggering accuracy.
---

# Skill Creator

A skill for creating new skills and iteratively improving them.

## When to Use

- Creating a new skill from scratch
- Editing or improving existing skills
- Optimizing skill descriptions for better triggering
- Running evaluations to test skill performance

## Skill Structure

A valid skill requires:
1. **Directory**: `.trae/skills/<skill-name>/`
2. **File**: `SKILL.md` inside the directory

## SKILL.md Format

```markdown
---
name: "<skill-name>"
description: "<concise description covering: (1) what the skill does, (2) when to invoke it. Keep it under 200 characters>"
---

# <Skill Title>

<Detailed instructions, usage guidelines, and examples>
```

## Required Fields

| Field | Location | Description |
|-------|----------|-------------|
| `name` | frontmatter | Unique identifier for the skill |
| `description` | frontmatter | What the skill does AND when to invoke it |
| `detail` | body | Full markdown content after frontmatter |

## Creation Steps

1. Ask user for skill name and purpose
2. Write the `description` field with what it does AND when to invoke
3. Create directory: `.trae/skills/<skill-name>/`
4. Create `SKILL.md` with proper frontmatter and content
5. Validate the structure is correct

## Description Guidelines

The description must include:
- What the skill does (functionality)
- **When to invoke it** (trigger conditions)
- Language: English by default

Example: `"Reviews code for bugs and improvements. Invoke when user asks for code review or before merging changes."`

## Testing Your Skill

Create test prompts and run the skill against them:
- 2-3 realistic test prompts
- Run with skill vs without skill
- Compare results qualitatively

## Best Practices

- Keep SKILL.md under 500 lines
- Reference files clearly when needed
- Use progressive disclosure (summary → detail)
- Prefer imperative form in instructions
- Include examples in your instructions
- Define output formats clearly