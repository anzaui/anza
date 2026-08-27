# Rendering Pipeline

Anza supports two distinct rendering pipelines tailored to initial navigation vs. real-time lifecycle updates.

## 1. Full-Page SSR vs. Fragment Updates

```
                        Incoming Request
                               │
                ┌──────────────┴──────────────┐
                │                             │
         Initial HTTP GET             Dynamic SSE / Fetch
                │                             │
                ▼                             ▼
        engine.renderPage()         engine.renderFragment()
                │                             │
        ┌───────┴────────┐            ┌───────┴────────┐
        │ Compile Shell  │            │ Interpolate    │
        │ & Open DSD     │            │ Fragment Slots │
        └───────┬────────┘            └───────┬────────┘
                │                             │
                │                             ▼
                │                     ┌────────────────┐
                │                     │ Compute Crypto │
                │                     │ Signature      │
                │                     └───────┬────────┘
                ▼                             ▼
        Document (Full HTML)          Envelope (JSON Fragment)
```

## 2. Pipeline Comparison

| Attribute | Full-Page SSR (`renderPage`) | Dynamic Fragment (`renderFragment`) |
|---|---|---|
| **Return Type** | `Document` (`{ html: string }`) | `Envelope` (`{ slot, ts, html, sig, css }`) |
| **Output Format** | Complete HTML document with Open DSD | Signed JSON / SSE stream payload |
| **Client Handling** | Native browser HTML parser mounts shadow root | Anza runtime verifies signature and swaps target slot |
| **Primary Use** | First paint (FCP/LCP), SEO indexation | Live feeds, form responses, SSE updates |
