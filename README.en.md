# FormaFlow

**A trilingual workspace to prepare, review and manage your Google Forms responses.**

[Қазақша](README.md) · [Русский](README.ru.md) · [English](README.en.md)

[Open the app](https://mikosh001.github.io/formaflow/)

## How to use it

1. Paste a Google Form's respondent link and click **Load questions**.
2. Open each question, select its options and write your own text answers.
3. Choose **1–100 responses** and a pause of 2, 3, 5 or 10 seconds.
4. Click **Prepare responses**. Use the pencil button to edit individual rows; download CSV or JSON.
5. **Send** starts a sequential queue. **Stop** finishes the current request. Resume sends only remaining ready responses without repeating accepted ones.

**Varied answers** draws from your selected options and cycles through text lines. **Same answers** preserves your full text, including line breaks. No words or labels are added.

Switch the interface, guide and errors between **Kazakh, Russian and English**. Form questions stay in their original language.

## Saving your work

**Save on this device** stores your project in this browser and restores it when reopened. **Download project / Open project** transfers the form, answers and settings as JSON. History stores the time, title and accepted count, without answer text. Project files contain your answers; consider their content before sharing them.

## Supported forms and results

Open, single-section forms: short text, paragraphs, single choice, dropdowns, multiple choice and simple scales. Checkbox limits are respected.

Sign-in, CAPTCHA, email collection, uploads, date/time, grids, conditional sections and additional validation rules are unsupported. The parser depends on Google's form structure and may need maintenance when it changes.

**Accepted** requires Google's confirmation page. Network interruptions or unrecognized results produce **Unconfirmed** and stop the queue. Check Google Forms before repeating an uncertain submission. Duplicate protection is in memory, scoped to one process, and resets on restart.

## Run locally

Install **Node.js 22.17+** and npm.

```sh
git clone https://github.com/Mikosh001/formaflow.git
cd formaflow
npm ci
npm run dev:api
```

In a second terminal:

```sh
npm run dev
```

UI: `http://127.0.0.1:5174`; API: `http://127.0.0.1:8787`.

```sh
npm run typecheck
npm test
npm run build
npm run build:api
```

Checks use mocked upstream responses and do not submit anything to Google.

## Deploy

Pages publishes **`main /docs`**. A separate API handles Google Forms because Pages serves static files only.

1. Set `apiUrl` in `lib/deployment.json` to your deployed API origin.
2. Run `npm run pages:prepare`; commit the source and generated `docs/` files.
3. GitHub → Settings → Pages → Deploy from a branch → main → /docs → Save.
4. For another repository name, update `PAGES_BASE` in `scripts/prepare-pages.mjs`.

Render API: Node runtime; Build `npm ci --include=dev && npm run build:api`; Start `npm start`; `NODE_VERSION=22.17.0`; `ALLOWED_ORIGINS=https://mikosh001.github.io`. It binds to `0.0.0.0` and `PORT`; health endpoint: `GET /health`.

CORS restricts browser origins; it is not authentication. The API does not persist answers to a database. A free server may need time to wake after inactivity: [Render's free-service limits](https://render.com/docs/free).

## Structure

`app/`: UI; `lib/`: forms, languages, drafts and API; `server/`: Node.js; `tests/`: checks; `scripts/`: Pages preparation; `docs/`: published build. React, TypeScript and Vite. No API keys required. This is not an official Google product.
