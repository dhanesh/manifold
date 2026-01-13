# /t1-constrain

Interview-driven constraint discovery. Extracts ALL constraints through systematic questioning.

## Usage
```
/t1-constrain <feature-name> [--category=<category>]
```

## What It Does

Conducts an interactive interview across constraint categories:

1. **Business** - Revenue impact, compliance, stakeholder requirements
2. **Technical** - Performance, integration, data consistency
3. **User Experience** - Response times, error handling, accessibility
4. **Security** - Data protection, authentication, audit trails
5. **Operational** - Monitoring, SLAs, incident handling
6. **Future Failure Modes** - What will break? What has failed before?

For each identified constraint, classifies as:
- ⛔ **INVARIANT** - Must NEVER be violated
- 🎯 **GOAL** - Should be optimized
- 🚧 **BOUNDARY** - Hard limits

## Output

Updates `.temporal/manifolds/<feature-name>.cms.yaml` with discovered constraints.

```
✅ Discovered 12 constraints across 6 categories
   - 3 invariants (never violate)
   - 5 goals (optimize toward)
   - 4 boundaries (hard limits)

Next: Run /t2-tension <feature-name> to surface conflicts
```

## Example Interview Flow

```
/t1-constrain payment-retry-v2

Agent: Let's discover ALL constraints for payment-retry-v2.

**BUSINESS CONSTRAINTS**
1. What business outcomes must this achieve beyond the 95% success rate?
2. What are financial implications if a retry causes duplicate payment?
3. Are there regulatory requirements (RBI, PCI-DSS)?

[User answers...]

Agent: Identified constraints:
- ⛔ B1: No duplicate payments (INVARIANT)
- 🎯 B2: 95% success rate (GOAL)
- 🚧 B3: Retry window ≤ 72 hours (BOUNDARY)

Continue with TECHNICAL constraints? [Y/n]
```
