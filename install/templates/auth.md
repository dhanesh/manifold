# Authentication Constraint Template

Use: `/manifold:m0-init <feature> --template=auth`
Covers: Login, registration, session management, password handling

## Outcome

[CUSTOMIZE: e.g., 'Secure user authentication with <1s login time']

---

## Constraints

### Business

#### B1: Credential Protection
User credentials must never be exposed in logs, errors, or responses.
> **Rationale:** Credential leakage causes account compromise and regulatory violations.
> **CUSTOMIZE:** Add compliance requirements (GDPR, SOC2, HIPAA).

#### B2: Session Timeout
Session timeout must not exceed [CUSTOMIZE: 30] minutes of inactivity.
> **Rationale:** Balances security with user convenience; adjust based on data sensitivity.

#### B3: Multiple Auth Methods
Support [CUSTOMIZE: 2+] authentication methods (password, OAuth, SSO).
> **Rationale:** Multiple auth methods improve adoption and enterprise compatibility.

### Technical

#### T1: Password Hashing
Passwords must be hashed with bcrypt/argon2 (cost factor >= [CUSTOMIZE: 10]).
> **Rationale:** Industry-standard password hashing prevents rainbow table attacks.

#### T2: Auth Latency
Authentication must complete in <[CUSTOMIZE: 500]ms at p95.
> **Rationale:** Slow auth causes user abandonment; adjust based on UX requirements.

#### T3: Token Security
Tokens must be cryptographically signed and include expiration.
> **Rationale:** Unsigned tokens can be forged; missing expiration creates persistent sessions.

#### T4: Seamless Token Refresh
Token refresh should not require re-authentication.
> **Rationale:** Seamless token refresh improves user experience.

### User Experience

#### U1: Login Accessibility
Login form must be accessible (WCAG 2.1 AA).
> **Rationale:** Accessibility is required for inclusive design and compliance.

#### U2: Password Strength Feedback
Password strength meter should provide real-time feedback.
> **Rationale:** Helps users create stronger passwords, reducing support burden.

#### U3: Secure Error Messages
Error messages must not reveal whether email/username exists.
> **Rationale:** Prevents user enumeration attacks.

### Security

#### S1: Rate Limiting
Rate limit login attempts to [CUSTOMIZE: 5] per minute per IP/account.
> **Rationale:** Prevents brute force and credential stuffing attacks.

#### S2: Transport Security
All auth endpoints must use HTTPS with TLS 1.2+.
> **Rationale:** Protects credentials in transit from interception.

#### S3: Timing Attack Prevention
Failed login must not take measurably different time than success.
> **Rationale:** Prevents timing attacks that reveal valid usernames.

#### S4: Account Lockout
Implement account lockout after [CUSTOMIZE: 10] failed attempts.
> **Rationale:** Additional protection against brute force; balance with DoS risk.

### Operational

#### O1: Concurrent Login Capacity
Auth service must handle [CUSTOMIZE: 1000] concurrent logins.
> **Rationale:** Based on expected peak load with safety margin.

#### O2: Auth Failure Logging
Auth failures should be logged with context (IP, user agent, timestamp).
> **Rationale:** Enables security incident investigation and pattern detection.

---

## Tensions

### TN1: Rate Limiting vs Accessibility
Rate limiting (S1) vs accessibility for legitimate users.
> **Resolution:** Implement progressive delays instead of hard blocks; CAPTCHA as fallback.

### TN2: Fast Auth vs Secure Hashing
Fast auth (T2) vs secure hashing (T1).
> **Resolution:** Async password verification with immediate session creation; verify hash in background.

### TN3: Concurrency vs Lockout State
High concurrency (O1) vs account lockout state tracking (S4).
> **Resolution:** [CUSTOMIZE: Consider distributed cache for lockout state].

---

## Required Truths

### RT-1: Identity Verification
User identity can be verified through at least one authentication method.
**Maps to:** B1, T1, T3

### RT-2: Session Persistence
Session state can be maintained across requests.
**Maps to:** B2, T3, T4

### RT-3: Failure Response
Auth failures can be detected and responded to appropriately.
**Maps to:** S1, S4, O2

---

## Customization Notes

### Required Changes
- Replace [CUSTOMIZE: ...] values with your specific requirements
- Review session timeout (B2) based on data sensitivity
- Adjust rate limits (S1, S4) based on expected traffic
- Add compliance-specific constraints for GDPR/HIPAA/SOC2

### Optional Additions
- MFA/2FA requirements
- OAuth provider constraints
- SSO/SAML integration
- Biometric authentication
- Passwordless authentication

### Common Removals
- Remove OAuth (B3) if single auth method
- Remove account lockout (S4) if using progressive delays
