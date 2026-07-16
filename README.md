# Darla Business App

Personal business dashboard for sales, inventory, expenses, and reporting.

## Run Locally

Install dependencies:

```bash
npm install
```

Start the web app:

```bash
npm run web
```

Then open the local URL Expo prints, usually `http://localhost:8081`.

## Notes

- Corrected sales data is embedded in the app seed/import state.
- Existing browser storage migrates on app load.
- Do not commit local `.env` files, Expo caches, build output, or audit backup databases.
