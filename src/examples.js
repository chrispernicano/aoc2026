// Sample Orrery programs shown in the playground.
(function (root) {
  const O = (root.Orrery = root.Orrery || {});
  O.examples = [
    {
      id: 'aoc-2025-1',
      title: 'Secret Entrance',
      note: 'Advent of Code 2025, day 1, part 1. Paste your own input below.',
      input: 'L68\nL30\nR48\nL5\nR60\nL55\nL1\nL99\nR14\nL82\n',
      src: `-- AoC 2025 day 1: how many rotations
-- leave the dial on 0?
-- One input line ("L68") passes per tick.

sky from 1 to comets + 1

planet dial orbits 1 mass 50 {
  (dial - digits of comet) % 100 if comet begins "L"
    else (dial + digits of comet) % 100
}

-- reads last tick's dial: one turn behind
planet zeros orbits 1 mass 0 {
  zeros + 1 if dial == 0 else zeros
}

-- one extra tick lets the last turn land
planet door orbits comets + 1 {
  say "password: {zeros + 1 if dial == 0 else zeros}"
}
`,
    },
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
})(typeof window !== 'undefined' ? window : globalThis);
