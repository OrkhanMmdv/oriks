# Pəhləvan

A private Telegram Mini App that runs Orkhan's 12-week cut + strength plan day to day: full-body training queue, food, water, supplements, progress, reminders and a gamified daily score. It's designed in a Ganja fire theme and written in the Ganja dialect.

The plan itself is in [PLAN.md](PLAN.md). The training program the app uses is in [js/program.js](js/program.js), so you can edit it there without touching the app's logic.

## How it's built (all free)

| Part | Where |
|---|---|
| Mini app (HTML/CSS/JS modules, no build step) | GitHub Pages: `https://orkhanmmdv.github.io/oriks/` |
| API + bot webhook + reminders | One Supabase Edge Function: `supabase/functions/pehlevan` (logic in `supabase/functions/_shared/core.js`) |
| Database | The Supabase project's Postgres, in a private `app` schema (tables are created and migrated automatically) |
| Reminders | `pg_cron` calls the function every 5 minutes (Europe/Riga time) |
| Photos | Sent to your own bot chat; only Telegram's `file_id` is stored |
| Exercise pictures | [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain), copied to `img/ex/` |

**Security:** every API call carries Telegram's signed `initData`. The function checks the signature with the bot token and rejects anything older than 24 h. The first person to send `/start` becomes the owner, and everyone else gets "Bu bot şəxsidi" and a 403. The webhook is checked with Telegram's secret-token header, and the reminder cron uses its own secret key. The bot token is never in the repo or the app.

## Setup (step by step)

1. **Bot.** In Telegram, open **@BotFather**. If you already made a bot earlier, send `/mybots` → your bot → **API Token**. Otherwise send `/newbot`. Copy the token. Never paste it into the app or into a chat.
2. **Supabase access token.** Open <https://supabase.com/dashboard/account/tokens> → **Generate new token** (name it `github-deploy`). Copy it.
3. **GitHub secrets.** In the repo, go to **Settings → Secrets and variables → Actions → New repository secret** and add:
   - `BOT_TOKEN`: the token from step 1
   - `SUPABASE_ACCESS_TOKEN`: the token from step 2
4. **Deploy.** Go to **Actions → Deploy → Run workflow**. Pushing to `main` also deploys. The workflow tests the API, deploys the function and connects the bot (webhook, menu button, `/start` and `/today` commands, reminders).
5. **Claim the bot.** Right after the deploy finishes, open your bot and send **`/start`**. That makes you the owner. Then tap **Aç** (the menu button) and enter the PIN.

If the setup step reports `cron: error …`, open the Supabase dashboard → **Database → Extensions**, enable **pg_cron** and **pg_net**, then run the Deploy workflow again.

## Using it

- **Bu gün:** next workout and when it's ready, day-off switch, score ring, calories, protein, water, supplements, streaks, level.
- **Məşq:** phase, session queue (A → B → C), start any session or skip one, cardio log.
- **Workout screen:** warm-up for that session with ramp-up sets, a moving form demo (tap it for form tips and videos), last time's sets, a suggested weight with the reason, a rest timer, supersets and a new-best pop-up. Your workout is saved as you go, so closing the app loses nothing.
- **Yemək:** one-tap meals (editable), "Başqa bir şey" with comment and photo, day arrows for logging yesterday.
- **Nəticə:** rank, 12-week fire tracker, weight and strength charts, best sets, recent workouts, progress photos, badges.
- **Qalanı:** "Claude ilə baxış" weekly summary (copy it into your Claude project), motivations, reminders (time, on/off, Test), settings, work days, study.
- **Bot:** send a number like `104.6` to log weight. `/today` gives today's summary. The evening check-in buttons log several things in a row, then "günü bağla" closes the day.

## Changing things

- Training plan → `js/program.js`
- Meal presets, supplements, targets → in the app (Yemək → Düzəlt, Qalanı → Ayarlar), or defaults at the top of `core.js`
- Texts and motivation lines → in the screens under `js/screens/`, and `STARTER_MOTIVATIONS` in `core.js`

## Local testing

```bash
cd dev
npm install
npm test        # end-to-end API test: fake bot token, fake Telegram, Postgres in memory
npm run dev     # http://localhost:8787 — the full app with a fake bot (/dev/messages shows what it sent)
```
