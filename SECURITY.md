# Security Policy — Asuum Universe

## Reporting a Vulnerability

We take security seriously. If you discover a vulnerability, please report it responsibly.

### How to Report

1.  **DO NOT** create a public GitHub issue
2.  Email us at: **security@asuum.dev** (or open a private security advisory on GitHub)
3.  Include:
    - Description of the vulnerability
    - Steps to reproduce
    - Potential impact
    - Suggested fix (if any)

### What to Expect

| Timeline | Action |
|----------|--------|
| Within 48 hours | Acknowledgment of your report |
| Within 7 days | Initial assessment + severity rating |
| Within 30 days | Fix deployed + credit given (if desired) |

## Security Architecture

### Client-Side Only
-   No backend server
-   No database
-   No user accounts
-   All processing happens in YOUR browser

### API Key Protection
-   AES-GCM 256-bit encryption
-   PBKDF2 key derivation (600,000 iterations)
-   Device-bound salt in IndexedDB
-   Memory cleanup after decryption
-   Keys never sent to any server except the AI provider

### Content Security Policy
-   Strict CSP headers prevent XSS attacks
-   Only whitelisted AI provider domains allowed
-   Inline scripts blocked
-   Frame embedding denied

### Dependencies
-   Minimal dependencies (Vite + TypeScript only)
-   Regular security audits
-   No telemetry or analytics libraries

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest beta | ✅ Yes |
| Previous versions | ❌ No |

## Safe Harbor

We consider security research conducted in accordance with this policy to be authorized and will not pursue legal action against researchers who follow these guidelines.

---

*Thank you for helping keep Asuum Universe safe for everyone.* 🛡️