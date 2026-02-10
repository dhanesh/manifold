# API Endpoint Constraint Template

Use: `/m0-init <feature> --template=api`
Covers: REST, GraphQL, or RPC API design and implementation

## Outcome

[CUSTOMIZE: e.g., 'RESTful API with <200ms p95 latency and 99.9% uptime']

---

## Constraints

### Business

#### B1: Backward Compatibility
API must maintain backward compatibility for [CUSTOMIZE: 6] months after deprecation notice.
> **Rationale:** Client applications need time to migrate; breaking changes cause outages.

#### B2: Explicit Versioning
API versioning must be explicit in URL path or header.
> **Rationale:** Enables gradual migration and multiple concurrent versions.

#### B3: API Specification
API should follow [CUSTOMIZE: OpenAPI 3.0] specification.
> **Rationale:** Enables auto-generated documentation and client SDKs.

### Technical

#### T1: Read Latency
Response time must be <[CUSTOMIZE: 200]ms at p95 for read operations.
> **Rationale:** User-facing applications require responsive APIs.

#### T2: Write Latency
Response time must be <[CUSTOMIZE: 1000]ms at p95 for write operations.
> **Rationale:** Write operations may involve transactions and validation.

#### T3: Standard Error Format
All responses must include standard error format with code, message, and request_id.
> **Rationale:** Consistent error handling enables debugging and client error handling.

#### T4: Partial Responses
Endpoints should support partial responses via field selection.
> **Rationale:** Reduces bandwidth and improves mobile performance.

#### T5: Payload Size Limit
Request payload must not exceed [CUSTOMIZE: 10]MB.
> **Rationale:** Prevents memory exhaustion and timeout issues.

### User Experience

#### U1: Auto-Generated Documentation
API documentation must be auto-generated and always current.
> **Rationale:** Stale documentation causes integration errors.

#### U2: Actionable Error Messages
Error messages should suggest corrective action when possible.
> **Rationale:** Reduces support burden and improves developer experience.

#### U3: Retry-After Header
Rate limit responses must include retry-after header.
> **Rationale:** Enables clients to implement proper backoff.

### Security

#### S1: Authentication Required
All endpoints must require authentication except explicitly public ones.
> **Rationale:** Prevents unauthorized access to data and functionality.

#### S2: Rate Limiting
API must implement rate limiting at [CUSTOMIZE: 100] requests/minute per client.
> **Rationale:** Prevents abuse and ensures fair resource allocation.

#### S3: Sensitive Data Protection
Sensitive data must never appear in URLs or logs.
> **Rationale:** URLs are logged by proxies, browsers, and servers.

#### S4: CORS Configuration
API should support CORS with configurable allowed origins.
> **Rationale:** Enables browser-based clients while maintaining security.

### Operational

#### O1: Health Check
API must support health check endpoint returning status in <[CUSTOMIZE: 50]ms.
> **Rationale:** Enables load balancer health monitoring and alerting.

#### O2: Request Logging
Request/response logging should capture timing, status, and request_id.
> **Rationale:** Enables debugging and performance monitoring.

#### O3: Traffic Surge Handling
API must gracefully handle [CUSTOMIZE: 10x] expected traffic.
> **Rationale:** Traffic spikes should not cause complete failure.

---

## Tensions

### TN1: Fast Responses vs Comprehensive Logging
Fast responses (T1) vs comprehensive logging (O2).
> **Resolution:** Async logging with sampling for high-volume endpoints; sync for errors.

### TN2: Backward Compatibility vs Error Format
Backward compatibility (B1) vs error format improvements (T3).
> **Resolution:** Error format is versioned; new clients get improved format.

### TN3: Rate Limiting vs Client Experience
Strict rate limiting (S2) vs client experience (U3).
> **Resolution:** Tiered rate limits with burst allowance; generous retry-after windows.

### TN4: Auth Required vs Health Check
Auth required (S1) vs health check unauthenticated (O1).
> **Resolution:** Health endpoint explicitly marked public; returns minimal info.

---

## Required Truths

### RT-1: Request Authentication
API can authenticate and authorize incoming requests.
**Maps to:** S1, S2

### RT-2: Serialization
API can serialize/deserialize requests and responses.
**Maps to:** T3, T5

### RT-3: Request Routing
API can route requests to appropriate handlers.
**Maps to:** B2, T1, T2

### RT-4: Operational Visibility
API can report its health and operational status.
**Maps to:** O1, O2

---

## Customization Notes

### Required Changes
- Replace latency thresholds (T1, T2) based on SLA
- Set rate limits (S2) based on expected client behavior
- Configure deprecation window (B1) based on client contracts
- Choose API specification (B3): OpenAPI, GraphQL SDL, gRPC proto

### Optional Additions
- Webhooks for async notifications
- GraphQL subscriptions
- API key management
- Request signing
- Caching headers (ETag, Cache-Control)

### Common Removals
- Remove partial responses (T4) for simple APIs
- Remove CORS (S4) for server-to-server APIs
- Remove versioning (B2) for internal APIs
