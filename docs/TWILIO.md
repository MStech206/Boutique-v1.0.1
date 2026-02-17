# Twilio WhatsApp Integration (SAPTHALA)

This document explains how to enable automatic WhatsApp sending using Twilio.

## Environment Variables
Set these environment variables in your environment (or Docker / process manager):

- `TWILIO_ACCOUNT_SID` — Your Twilio Account SID
- `TWILIO_AUTH_TOKEN` — Your Twilio Auth Token
- `TWILIO_WHATSAPP_FROM` — Your WhatsApp-enabled Twilio number, e.g. `whatsapp:+1415XXXXXXX`

Optional:
- `TEST_PHONE` — Phone number to use for local test script (prefixed with `+countrycode`).

## How it works
- When `TWILIO_*` env vars are set, the server uses the Twilio SDK to send WhatsApp messages via `/api/send-whatsapp` or the combined `/api/share-order-pdf` flow.
- If Twilio is not configured or a Twilio send fails, the server returns a `wa.me` link so the admin can manually open WhatsApp and send the message.

## Testing locally
1. Install dependencies: `npm install`
2. Set env vars (PowerShell example):

```powershell
$env:TWILIO_ACCOUNT_SID = 'ACxxxxx'
$env:TWILIO_AUTH_TOKEN = 'your_auth_token'
$env:TWILIO_WHATSAPP_FROM = 'whatsapp:+1415XXXXXXX'
$env:TEST_PHONE = '+91xxxxxxxxxx'
node server.js
```

3. Run the test script (server must be running):

```bash
node scripts/test-send-whatsapp.js
```

The script will print whether Twilio send succeeded or a wa.me link was returned.

---

If you want, I can add a small integration test that asserts Twilio sends in CI only when credentials are set (recommended).