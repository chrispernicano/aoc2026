// Sample Orrery programs and Advent of Code catalog shown in the playground.
(function (root) {
  const O = (root.Orrery = root.Orrery || {});

  // Core language examples (separate from Advent of Code solutions).
  O.examples = [
    {
      id: 'fizzbuzz',
      title: 'FizzBuzz',
      note: 'Two orbits and an eclipse. No conditionals.',
      src: `sky from 1 to 100

planet fizz orbits 3 { say "Fizz" }
planet buzz orbits 5 { say "Buzz" }
eclipse fizz, buzz  { say "FizzBuzz" }
when quiet          { say tick }
`,
    },
    {
      id: 'primes',
      title: 'Prime sieve',
      note: 'Each prime launches a moon that knocks out its multiples.',
      src: `sky from 2 to 60

-- if no moon rose this tick, nothing divides it
when quiet {
  say tick
  launch moon orbits tick
}
`,
    },
    {
      id: 'fibonacci',
      title: 'Fibonacci',
      note: "Planets read last tick's masses, so no temp variable.",
      src: `sky from 1 to 15

planet a orbits 1 mass 0 { b }
planet b orbits 1 mass 1 { a + b }
planet show orbits 1     { say a }
`,
    },
    {
      id: 'collatz',
      title: 'Collatz',
      note: 'Runs forever until a planet collapses the sky.',
      src: `sky from 1 to forever

planet n orbits 1 mass 27 {
  n / 2 if n % 2 == 0 else 3 * n + 1
}
planet watch orbits 1 {
  say n
  collapse if n == 1
}
`,
    },
    {
      id: 'sloth',
      title: 'Drift',
      note: 'A planet that doubles its own orbit every time it rises.',
      src: `sky from 1 to 64

planet sloth orbits 1 mass 1 {
  say "yawn at {tick}"
  drift by sloth
  sloth * 2
}
`,
    },
    {
      id: 'tug',
      title: 'Gravity',
      note: 'One planet tugs another into a slower orbit.',
      src: `sky from 1 to 24

planet beat orbits 2 { say "beat {tick}" }
planet giant orbits 8 {
  say "giant pulls beat out to 3"
  tug beat to 3
}
`,
    },
  ];

  // Advent of Code 2025 days. In the browser playground, selecting a day fetches
  // its live `aoc/2025/dayXX/solution.orr`, `example.txt`, and `input.txt` from
  // the workspace server, falling back to any bundled `src`/`example` below.
  O.aoc = [
    {
      id: 'aoc-2025-1',
      year: 2025,
      day: 1,
      title: 'Secret Entrance',
      dir: 'aoc/2025/day01',
      example: 'L68\nL30\nR48\nL5\nR60\nL55\nL1\nL99\nR14\nL82\n',
      src: `-- AoC 2025 day 1: Secret Entrance
-- Safe dial has numbers 0..99 and starts at 50.
-- One input rotation ("L68" or "R48") passes as \`comet\` per tick.

sky from 1 to comets + 1

-- New dial position (0..99) after applying this tick's rotation.
planet dial orbits 1 mass 50 {
  (dial - digits of comet) % 100 if comet begins "L"
    else (dial + digits of comet) % 100
}

-- Total clicks past 0 in the direction of motion on this tick.
planet reach orbits 1 mass 0 {
  (-dial % 100 if comet begins "L" else dial) + digits of comet
}

-- Part 1: count how many rotations leave \`dial\` pointing at 0.
planet zeros orbits 1 mass 0 {
  zeros + 1 if dial == 0 else zeros
}

-- Part 2: count every click that lands on 0 during or at the end of a rotation.
planet clicks orbits 1 mass 0 {
  clicks + (reach - reach % 100) / 100
}

-- Run on tick \`comets + 1\` and include the final rotation's contribution.
planet door orbits comets + 1 {
  say "part 1: {zeros + 1 if dial == 0 else zeros}"
  say "part 2: {clicks + (reach - reach % 100) / 100}"
}
`,
    },
    {
      id: 'aoc-2025-2',
      year: 2025,
      day: 2,
      title: 'Gift Shop',
      dir: 'aoc/2025/day02',
      example: '11-22,95-115,998-1012,1188511880-1188511890,222220-222224,\n1698522-1698528,446443-446449,38593856-38593862,565653-565659,\n824824821-824824827,2121212118-2121212124\n',
    },
    { id: 'aoc-2025-3', year: 2025, day: 3, title: 'Lobby', dir: 'aoc/2025/day03' },
    { id: 'aoc-2025-4', year: 2025, day: 4, title: 'Printing Department', dir: 'aoc/2025/day04' },
    { id: 'aoc-2025-5', year: 2025, day: 5, title: 'Cafeteria', dir: 'aoc/2025/day05' },
    { id: 'aoc-2025-6', year: 2025, day: 6, title: 'Trash Compactor', dir: 'aoc/2025/day06' },
    { id: 'aoc-2025-7', year: 2025, day: 7, title: 'Laboratories', dir: 'aoc/2025/day07' },
    { id: 'aoc-2025-8', year: 2025, day: 8, title: 'Playground', dir: 'aoc/2025/day08' },
    { id: 'aoc-2025-9', year: 2025, day: 9, title: 'Movie Theater', dir: 'aoc/2025/day09' },
    { id: 'aoc-2025-10', year: 2025, day: 10, title: 'Factory', dir: 'aoc/2025/day10' },
    { id: 'aoc-2025-11', year: 2025, day: 11, title: 'Reactor', dir: 'aoc/2025/day11' },
    { id: 'aoc-2025-12', year: 2025, day: 12, title: 'Christmas Tree Farm', dir: 'aoc/2025/day12' },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
