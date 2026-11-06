# Pomodoro Web

A responsive focus timer built with React, TypeScript, Vite and Tailwind CSS. Set work and break durations, pause or reset sessions, switch themes, and enable an optional completion chime. Preferences are saved in your browser.

## Run locally

Use Node.js 24 LTS (`nvm use`), then:

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. For a production build, run `npm run build`, then `npm run preview`.

## Timer behavior

The countdown uses a deadline instead of counting interval callbacks, so background-tab throttling does not slow the timer. Pause preserves the exact remaining milliseconds. Returning from sleep completes an overdue session once and starts a fresh work or break session; it does not play alarms for every session missed while asleep. Changing settings while running applies the new durations to subsequent sessions.

## Checks

```sh
npm test
npm run lint
npm run build
```

Regression tests cover pause/resume, throttled callbacks, sleep/wake, completion and reset. GitHub Actions runs these checks on pushes and pull requests. TypeScript stays on the compatible 6.0 line; dependency major migrations should be reviewed separately.
