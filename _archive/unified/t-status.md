# /t-status

Show current TDK state and next recommended action.

## Usage
```
/t-status [<feature-name>]
```

## What It Does

Displays:
1. Current feature in progress (if any)
2. Phase/step completed
3. Constraint manifold summary
4. Next recommended command

## Output

```
/t-status

📋 TEMPORAL DEV KIT STATUS

Feature: payment-retry-v2
Phase: ANCHORED (3/5)

Manifold Summary:
├── Constraints: 12 discovered
│   ├── ⛔ Invariants: 3
│   ├── 🎯 Goals: 5
│   └── 🚧 Boundaries: 4
├── Tensions: 2 identified, 1 resolved
├── Required Truths: 4 derived
└── Solution Space: 3 options

Workflow Progress:
[✓] /t0-init          Manifold created
[✓] /t1-constrain     12 constraints discovered
[✓] /t2-tension       2 tensions surfaced
[✓] /t3-anchor        Outcome anchored, 3 options
[ ] /t4-generate      Pending
[ ] /t5-verify        Pending

Next: /t4-generate payment-retry-v2 --option=B
```

## Integration with FPF

If `.fpf/` exists, also shows:

```
FPF Integration:
├── Manifold can feed: /q1-hypothesize
├── Tensions inform: hypothesis assumptions
└── Required truths → evidence requirements
```
