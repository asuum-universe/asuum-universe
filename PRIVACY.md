# Privacy Policy — Asuum Universe

**Last Updated:** November 7, 2026

## 🔒 Our Promise

Asuum Universe is a **privacy-first, client-side only** application. We do NOT collect, store, or transmit any of your personal data.

## What We Store

| Data | Where Stored | Encrypted? | Accessible By |
|------|-------------|------------|---------------|
| API Keys | Browser IndexedDB | ✅ AES-GCM 256-bit | Only YOU |
| Chat History | Browser localStorage | ❌ Plain text | Only YOU |
| Settings | Browser localStorage | ❌ Plain text | Only YOU |

## What We NEVER Do

-   ❌ Send your API keys to any server
-   ❌ Store your chat history on any cloud
-   ❌ Track your usage with analytics
-   ❌ Use cookies for tracking
-   ❌ Share data with third parties

## How Your API Keys Are Protected

1.  Keys are encrypted using **AES-GCM 256-bit** encryption
2.  Encryption key is derived from a **device-bound salt** stored in IndexedDB
3.  Keys are **decrypted only in memory** when making API calls
4.  Decrypted keys are **cleared immediately** after use
5.  Keys **never leave your browser**

## BYOK Model (Bring Your Own Key)

Asuum uses a BYOK model. You provide your own API keys from providers like Groq, Google Gemini, OpenRouter, etc. Your keys belong to YOU and are managed entirely within YOUR browser.

## Data Flow
