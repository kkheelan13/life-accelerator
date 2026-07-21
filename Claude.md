# life-accelerator

Voice capture → task extraction. Android (MacroDroid) POSTs to this service.

## The actual problem
Capture is too slow, so I don't use it. Earlier Gemini version died
of the same thing. Speed of capture > quality of processing.

## Design constraints
- Confirm capture instantly; structure tasks later, async
- Never silently assign deadlines — propose, I confirm in a daily batch review
- Reminders push to me; don't build something I have to remember to open

## Current suspicion
MacroDroid may be blocking on the server round trip before confirming.
Check whether transcription can happen on-device and the POST fire-and-forget.