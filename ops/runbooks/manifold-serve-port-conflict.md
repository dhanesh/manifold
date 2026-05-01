# Runbook — `manifold serve` Port Conflict

> **Constraint addressed:** O1 (port-in-use fail-fast), T3 (default port),
> RT-11 (default + `--port` + collision behaviour).

## Symptom

Running `manifold serve` exits non-zero with output similar to:

```
Error: Port 6353 on 127.0.0.1 is already in use
       try `manifold serve --port 6354`
```

## Triage in 30 seconds

1. **Take the suggestion.** The hint is a kernel-reported free port; just
   re-run with that flag.

   ```bash
   manifold serve --port 6354
   ```

2. **Find the conflicting process.** If the suggested port is also
   undesirable (e.g. you want to keep `6353` because you've bookmarked
   it):

   ```bash
   lsof -nP -iTCP:6353 -sTCP:LISTEN
   ```

   Identify the process, decide whether to stop it or move `manifold
   serve` to a different port permanently.

3. **Set a project-local default** (optional). Many teams alias the
   command:

   ```bash
   alias manifold-serve='manifold serve --port 7000'
   ```

## Why this is the chosen failure mode

We considered silent auto-increment ("if 6353 is busy, try 6354, then
6355, …") and rejected it: the printed URL is the contract with the
user, and a CLI that silently slides off its default makes "where's my
visualiser?" a hunt. Fail-fast with a kernel-suggested free port keeps
the user in control.

## When to escalate

- The CLI prints `Failed to start server: <unfamiliar message>` instead
  of `EADDRINUSE`. That's not this runbook — file an issue with the full
  message and `manifold --version`.
- The suggested free port is also bound by the time you re-run. Likely
  cause: a fork-bomb of dev servers; restart the offender.

## Test that exercises this path

`tests/manifold-serve/port.test.ts::findFreePort returns a port the
kernel reports as free` — failure here means the `EADDRINUSE` suggestion
hint cannot be generated, and the user-facing error degrades to the
generic "pass `--port <other>`" message.
