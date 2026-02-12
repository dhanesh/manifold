# user-auth

Basic Manifold Example - Matches /manifold:m0-init output schema.
This example shows the standard structure created by Manifold commands.

## Outcome

Secure user authentication with < 500ms login time

---

## Constraints

### Business

#### B1: No Plaintext Passwords
User passwords must never be stored in plaintext.
> **Rationale:** Security compliance and user trust.

#### B2: SSO Support
Support SSO for enterprise customers.
> **Rationale:** Enterprise sales requirement.

### Technical

#### T1: Login Latency
Login API response < 500ms p99.
> **Rationale:** User experience and conversion rates.

#### T2: Session Expiry
Session tokens expire after 24 hours.
> **Rationale:** Security best practice.

### User Experience

#### U1: Clear Error Messages
Clear error messages for failed login attempts.
> **Rationale:** Reduce support tickets.

#### U2: Login Attempt Limit
Maximum 3 login attempts before temporary lockout.
> **Rationale:** Brute force protection.

### Security

#### S1: HTTPS Required
All authentication endpoints require HTTPS.
> **Rationale:** Prevent credential interception.

#### S2: Failed Login Logging
Failed login attempts must be logged with IP.
> **Rationale:** Security audit and threat detection.

### Operational

#### O1: Service Uptime
Authentication service 99.9% uptime.
> **Rationale:** Core service availability.

#### O2: Attack Detection
Alert on > 10 failed logins per minute from same IP.
> **Rationale:** Attack detection.

---

## Tensions

### TN1: Fast Response vs Comprehensive Logging
Fast response vs comprehensive logging.
> **Resolution:** Async logging to not block response.
