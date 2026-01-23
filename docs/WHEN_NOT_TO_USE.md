# When NOT to Use Manifold

Manifold is powerful, but it's not always the right tool. This guide helps you recognize when simpler approaches are better.

## Quick Decision Tree

```
Is this a...

┌─ Bug fix (single file)?
│  └─ DON'T use Manifold → Just fix it, write a test
│
├─ Typo or documentation update?
│  └─ DON'T use Manifold → Just commit it
│
├─ Small feature (< 3 files, < 1 day)?
│  └─ MAYBE use /m-quick → Or just build it
│
├─ New feature with unclear requirements?
│  └─ USE Manifold → Constraint discovery prevents waste
│
├─ System redesign or architecture change?
│  └─ USE Manifold → Backward reasoning shines here
│
├─ Security-critical or compliance work?
│  └─ USE Manifold → Full traceability required
│
└─ Multi-team coordination?
   └─ USE Manifold → Shared constraint document prevents conflicts
```

---

## When NOT to Use Manifold

### 1. Trivial Changes

**Examples:**
- Fix a typo in error message
- Update a dependency version
- Add a comment
- Rename a variable

**Why not:** The overhead of constraint discovery exceeds the value. Just make the change and commit.

**What to do instead:**
```bash
# Just fix it
git commit -m "fix: typo in login error message"
```

---

### 2. Single-File Bug Fixes

**Examples:**
- Off-by-one error in a loop
- Missing null check
- Incorrect conditional logic
- Broken import path

**Why not:** The bug is localized, the fix is obvious, and constraints are already implicitly known (don't break other tests).

**What to do instead:**
```bash
# Fix, test, commit
bun test src/path/to/test.ts
git commit -m "fix: handle null case in user validation"
```

---

### 3. Urgent Production Issues

**Examples:**
- Site is down
- Data is corrupted
- Security vulnerability is being exploited

**Why not:** Incident response requires speed. Constraint analysis can wait for the post-mortem.

**What to do instead:**
1. Fix the immediate issue
2. Restore service
3. Write incident report
4. **Then** use Manifold for the proper fix if it's complex

---

### 4. Exploratory Prototyping

**Examples:**
- "Let's see if this API is usable"
- "Can we integrate with this service?"
- "What would this feature feel like?"

**Why not:** Prototypes are meant to be thrown away. Constraint discovery for throwaway code is waste.

**What to do instead:**
```bash
# Create an exploratory branch
git checkout -b spike/test-new-api

# Hack freely, then delete
git checkout main
git branch -D spike/test-new-api
```

---

### 5. Simple CRUD Without Business Logic

**Examples:**
- Basic admin panel for internal tool
- Simple form with standard validation
- Standard REST endpoint with no special requirements

**Why not:** The constraints are "normal" - standard validation, standard security, standard performance. No special discovery needed.

**What to do instead:**
- Follow your team's standard patterns
- Use existing templates/generators
- If uncertainty emerges, upgrade to Manifold

---

### 6. Solo Projects Without Stakeholders

**Examples:**
- Personal side project
- Learning exercise
- Hackathon prototype

**Why not:** Constraint discovery involves asking "What matters to stakeholders?" - if you're the only stakeholder and you're comfortable holding it all in your head, the formalization adds overhead.

**What to do instead:**
- Build freely
- Document decisions in comments if helpful
- Consider Manifold if the project grows

---

### 7. Time-Critical Demos

**Examples:**
- Investor demo next week
- Conference presentation tomorrow
- Customer proof-of-concept

**Why not:** The real constraint is "impress by deadline" - everything else is negotiable. Manifold's thoroughness works against you here.

**What to do instead:**
- Focus on the demo path
- Cut every corner (knowingly)
- Document what was cut for later cleanup

---

## When to Use /m-quick Instead

Light mode (`/m-quick`) is for situations between "don't use Manifold" and "use full Manifold":

| Scenario | Full Manifold | /m-quick | None |
|----------|---------------|----------|------|
| Complex new feature | ✓ | | |
| Medium feature (known requirements) | | ✓ | |
| Small feature (< 1 day) | | ✓ | |
| Bug fix (multiple files) | | ✓ | |
| Bug fix (single file) | | | ✓ |
| Refactoring (structural) | ✓ | | |
| Refactoring (simple rename) | | | ✓ |
| Security feature | ✓ | | |
| Security patch | | ✓ | |

---

## Red Flags: Manifold Might Be Overkill

Watch for these thoughts - they suggest Manifold isn't needed:

| Thought | Reality |
|---------|---------|
| "I already know exactly what to build" | If requirements are clear and simple, just build it |
| "This should only take an hour" | /m-quick at most, probably nothing |
| "There are no stakeholders to consult" | Constraint discovery works best with multiple perspectives |
| "We need this yesterday" | Speed trumps thoroughness for urgent work |
| "It's just a small tweak" | Small tweaks don't need constraint analysis |

---

## Red Flags: You Should Use Manifold

Conversely, these thoughts suggest Manifold IS needed:

| Thought | Why Manifold Helps |
|---------|-------------------|
| "I'm not sure what 'done' looks like" | Outcome anchoring clarifies success |
| "Multiple teams care about this" | Shared constraint doc prevents conflicts |
| "This touches money/security/compliance" | Full traceability is required |
| "Last time we did this it was a disaster" | Constraint discovery prevents repeat mistakes |
| "The requirements keep changing" | Explicit constraints make changes visible |
| "This will be hard to change later" | Backward reasoning surfaces hidden requirements |

---

## The Upgrade Path

Start simple, add rigor as needed:

```
Level 0: Just code it
    ↓ (complexity emerges)
Level 1: /m-quick (light mode)
    ↓ (requirements multiply)
Level 2: Full Manifold workflow
```

**Upgrading is easy:**
```bash
# From nothing to light mode
/m-quick my-feature

# From light mode to full
/m0-init my-feature --from-quick
```

**Downgrading is harder** - if you've done full Manifold discovery and decide it was overkill, you've spent the time. That's okay - the clarity is valuable even if you didn't strictly need it.

---

## Framework Comparison

When should you use Manifold vs other approaches?

| Approach | Best For | Overhead | Traceability |
|----------|----------|----------|--------------|
| Just code it | Trivial changes, known patterns | None | None |
| Comments/TODOs | Simple decisions, future reminders | Low | Low |
| /m-quick | Medium features, clear requirements | Medium | Medium |
| Full Manifold | Complex features, multiple stakeholders | High | High |
| RFC/Design Doc | Architecture decisions, team alignment | High | Medium |

---

## Summary

**Use Manifold when:**
- Requirements are unclear or complex
- Multiple stakeholders have competing interests
- The work is security/compliance-critical
- You've been burned before by missed requirements
- The change will be hard to reverse

**Don't use Manifold when:**
- The change is trivial
- You're the only stakeholder
- Speed is more important than thoroughness
- You're exploring/prototyping
- The constraints are already well-known

**Use /m-quick when:**
- It's between trivial and complex
- Requirements are known but worth documenting
- You want a lightweight paper trail

---

## Final Thought

The goal is **shipping working software that meets stakeholder needs**. Manifold is a tool for achieving that goal in complex situations. It's not a ritual to perform on every change.

If you're asking "Should I use Manifold for this?" and the answer isn't obviously "yes", the answer is probably "no" or "/m-quick".
