# Demo guide — recommended improvements

This build adds spectator boards, ops/fees dashboard, certificates + CSV export, match reminders, Group+Knockout draws, TID search, Twilio OTP support, Expo push hooks, and offline-tolerant live scoring.

## Prerequisites

1. Backend on `http://localhost:4000`
2. Admin on `http://localhost:3000`
3. Apply DB migration for push tokens:

```bash
cd backend
npx prisma migrate deploy --schema ../database/prisma/schema.prisma
npx prisma generate --schema ../database/prisma/schema.prisma
```

Optional packages (certificates + SMS):

```bash
cd backend
npm install pdfkit twilio
npm install -D @types/pdfkit
```

## Demo flows

### 1) Public spectator (no login)

1. Open any tournament in admin and note its ID from the URL (`/tournaments/<ID>`).
2. Open **Ops & Export** → **Open spectator board**, or go directly to:
   - `http://localhost:3000/spectate/<TOURNAMENT_ID>`
3. Start a live match from **Live Scoring** — the spectator page refreshes every 8 seconds.

API (public):

- `GET /api/public/tournaments/:id`
- `GET /api/public/tournaments/:id/live`
- `GET /api/public/tournaments/:id/matches`
- `GET /api/public/tournaments/:id/courts`

### 2) Ops dashboard + fees / delays

1. Admin home shows global fees collected, pending payments, live matches.
2. Tournament → **Ops & Export**: expected vs collected fees, delayed matches, court utilization.
3. **Export entries/fees CSV**.
4. **Send “starting soon” reminders** (marks matches `STARTING_SOON` and writes inbox + push notifications).

### 3) Certificates

1. Finish a category (or leave rankings incomplete for participation certs).
2. Ops → **Issue · &lt;category&gt;**.
3. Download PDF links from the certificates list (`/uploads/certificates/...`).

### 4) Group + Knockout

1. Category → Draw format **Group + Knockout** (needs ≥4 entries).
2. Generate draw (group RR matches; round = group number).
3. Complete all group matches.
4. Click **Advance to knockout** (top 2 per group).
5. Schedule / play knockout (rounds ≥ 100).

### 5) Faster payment matching

1. Registrations → search box filters by **TID / player / method / category**.
2. Mark Paid as before.

### 6) Offline live scoring

1. Open a live match in admin.
2. DevTools → Network → Offline, then press +1.
3. Action queues; go Online — queue flushes automatically.

### 7) Twilio OTP (optional)

In `.env`:

```
OTP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_NUMBER=...
```

Default remains `OTP_PROVIDER=console` (code printed in backend logs).

### 8) Expo push (optional)

Mobile registers token:

`POST /api/notifications/push-token` `{ "token": "ExponentPushToken[...]" }`

In-app notifications still work without push; when a token is stored, Expo Push is attempted on each notification.

## Suggested pitch to organizers

- Share spectator link with parents/audience during the event.
- Collect & reconcile entry fees from Ops + CSV.
- Issue certificates after finals.
- Use reminders so players arrive at the right court on time.
