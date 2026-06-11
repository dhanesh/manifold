# Fixture: upload-dedup

> Held-out test feature for the prompt-optimization loop. Throwaway sandbox feature.

## Outcome (verbatim — trusted, re-injected unchanged every round)
A file-upload service that stores each distinct file exactly once (content-addressed),
returns instantly on re-upload of identical content, and never serves a corrupted blob,
for files up to 5 GB.

## Seed brief (domain context for m1)
- Large multipart uploads can fail midway and be resumed.
- Two users may upload the same bytes concurrently.
- Storage is an object store with eventual-consistency on listings.
- Integrity matters: a truncated upload must never be readable as a complete blob.

## Seeded gaps (for m5/m6 recall scoring)
- m5 should flag: a "content hash matches" check with no test for the partial-upload / truncation case is PARTIAL.
- m6 should flag: a `dedup-index` table created but the write path still inserts blobs unconditionally (index never consulted).
