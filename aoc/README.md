# Advent of Code in Orrery

One folder per year, one per day:

```
aoc/2025/day01/
  solution.orr   your Orrery program (committed)
  puzzle.md      puzzle text as Markdown (not committed)
  input.txt      your puzzle input (not committed)
```

Advent of Code asks that puzzle text and inputs stay out of public repos, so `.gitignore`
excludes `puzzle.md`, `input.txt` and `example.txt`.

## Setup

The fetcher needs two settings. Each can be an environment variable or a file in `~/.config/aoc/`:

| Setting | Environment variable | File |
| --- | --- | --- |
| Your session cookie | `AOC_SESSION` | `~/.config/aoc/session` |
| User-Agent with your contact info | `AOC_USER_AGENT` | `~/.config/aoc/user-agent` |

The scheduled task can't see your shell's environment variables, so use the files for it.

1. Sign in at https://adventofcode.com. In your browser's developer tools, copy the value of the
   `session` cookie.
2. Save the settings. Advent of Code asks automated tools to say who is running them, for example
   `github.com/you/orrery by you@example.com`:

   ```bash
   mkdir -p ~/.config/aoc && chmod 700 ~/.config/aoc
   pbpaste > ~/.config/aoc/session && chmod 600 ~/.config/aoc/session
   echo 'orrery-aoc (contact: you@example.com)' > ~/.config/aoc/user-agent
   ```

Session cookies last about a month. When fetches start failing with a log-in error, copy a fresh one.

## Fetching

```bash
node bin/aoc.js fetch              # today's puzzle; does nothing outside the event
node bin/aoc.js fetch 2025         # every unlocked day of 2025
node bin/aoc.js fetch 2026 3       # one day
```

- Puzzles unlock at midnight US Eastern. 2015–2024 had 25 days; 2025 onward has 12.
- `input.txt` is downloaded once and never again.
- `puzzle.md` is fetched again on each run until it has both parts and both answers, because
  part two only appears after you solve part one. Run `fetch` after submitting part one.
- Requests are spaced at least 1.5 seconds apart. Nothing is fetched before it unlocks.
- A missing `solution.orr` is created from a small template.

## Daily schedule

```bash
node bin/aoc.js schedule install   # fetch at 00:05 local time every day
node bin/aoc.js schedule status
node bin/aoc.js schedule remove
```

This installs a launchd agent (`~/Library/LaunchAgents/dev.orrery.aoc-fetch.plist`). It runs every
day but does nothing outside the event. If the Mac is asleep at 00:05, launchd runs it on wake.
Output goes to `aoc/.fetch.log`.

## Running & submitting a solution

```bash
node bin/orrery.js aoc/2025/day01/solution.orr               # uses input.txt beside it
node bin/orrery.js aoc/2025/day01/solution.orr example.txt   # any other input
node bin/aoc.js submit 2025 1 1 1043                         # submit part 1 or 2 from CLI
node bin/serve.js                                            # playground at http://localhost:8765 with Submit button
```

In the web playground (`node bin/serve.js`), selecting an Advent of Code day shows a **Part 1 / Part 2** answer submission bar in the Output pane that auto-fills from your program's output and automatically refreshes `puzzle.md` when Part 1 is solved.
