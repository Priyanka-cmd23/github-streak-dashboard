# GitHub Streak Dashboard

A lightweight, dependency-free dashboard that tracks your GitHub contribution streak and helps you hit your daily goal. Built with vanilla JavaScript and Vite — no build-time dependencies, no backend, works entirely in your browser.

## Features

- **Current & longest streak** — computed from your public GitHub contribution graph
- **Contribution graph** — the last year of activity, rendered with your GitHub color levels
- **Daily goal tracker** — set a target, watch your progress bar fill
- **Works for any public GitHub user** — just type a username
- **30-minute local cache** — respects GitHub's servers
- **No API key required** — reads your public profile page

## Live demo

Open locally:

```bash
npm install
npm run dev
```

Or use the live demo on [GitHub Pages](https://priyanka-cmd23.github.io/github-streak-dashboard/).

## How it works

The app fetches `https://github.com/users/<username>/contributions` (the same endpoint GitHub's own profile page uses) and parses the contribution calendar cells. Streaks are computed from the sequence of days with any contribution.

## Roadmap

- [ ] Monthly/yearly filtering
- [ ] Repository activity breakdown
- [ ] Streak reminders (push notification)
- [ ] Dark/light theme toggle

## License

MIT
