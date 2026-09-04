// utils/runCode.js
//
// Thin wrapper around the Piston public API (https://github.com/engineer-man/piston)
// used for two things:
//   1. runCodeOnce      -> student's "Run" button (no grading, just stdout/stderr)
//   2. runAgainstTestCases -> admin grading, loops through visible + hidden test cases
//
// Piston is free and public but rate-limited / best-effort uptime. If that becomes
// a problem in production, self-host Piston (single Docker container) or swap to
// Judge0 — only this file needs to change, since every caller goes through the
// two functions below.

const PISTON_API_BASE = 'https://emkc.org/api/v2/piston';

// Maps our internal language keys to what Piston expects (language + version).
// Piston requires an exact version string per runtime, so we resolve these
// dynamically from /runtimes on first use instead of hardcoding versions that
// might go stale.
const LANGUAGE_CONFIG = {
  javascript: { piston: 'javascript', alias: ['javascript', 'node', 'nodejs'] },
  python: { piston: 'python', alias: ['python', 'python3'] },
  java: { piston: 'java', alias: ['java'] },
  c: { piston: 'c', alias: ['c'] },
  cpp: { piston: 'cpp', alias: ['cpp', 'c++'] },
};

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_CONFIG);

// File names Piston expects to see per language (matters for Java's public class rule).
const FILENAME = {
  javascript: 'main.js',
  python: 'main.py',
  java: 'Main.java',
  c: 'main.c',
  cpp: 'main.cpp',
};

const COMPILED_LANGUAGES = new Set(['java', 'c', 'cpp']);

// ---- Runtime version cache ------------------------------------------------
// Piston's /runtimes list changes rarely; fetching it on every single code run
// would be wasteful. Cache it in memory for the lifetime of the session (tab).
let runtimesCache = null;
let runtimesPromise = null;

async function getRuntimes() {
  if (runtimesCache) return runtimesCache;
  if (runtimesPromise) return runtimesPromise; // avoid duplicate in-flight fetches

  runtimesPromise = fetch(`${PISTON_API_BASE}/runtimes`)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to fetch Piston runtimes (${res.status})`);
      return res.json();
    })
    .then((runtimes) => {
      runtimesCache = runtimes;
      return runtimes;
    })
    .finally(() => {
      runtimesPromise = null;
    });

  return runtimesPromise;
}

// Resolves our language key -> { language, version } as Piston expects,
// picking the latest available version for that runtime.
async function resolveRuntime(language) {
  const config = LANGUAGE_CONFIG[language];
  if (!config) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const runtimes = await getRuntimes();
  const match = runtimes.find((rt) => config.alias.includes(rt.language));

  if (!match) {
    throw new Error(`Piston has no runtime available for "${language}"`);
  }

  return { language: match.language, version: match.version };
}

// ---- Core execute call ------------------------------------------------
async function executeOnPiston(code, language, stdin = '') {
  const runtime = await resolveRuntime(language);

  const res = await fetch(`${PISTON_API_BASE}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: runtime.language,
      version: runtime.version,
      files: [{ name: FILENAME[language], content: code }],
      stdin: stdin ?? '',
      // Reasonable safety limits so a bad submission can't hang the request forever
      compile_timeout: 10000,
      run_timeout: 5000,
    }),
  });

  if (!res.ok) {
    if (res.status === 429) {
      throw new Error('Piston rate limit hit — try again in a moment.');
    }
    throw new Error(`Piston execution failed (${res.status})`);
  }

  return res.json();
}

// Normalizes a raw Piston response into the shape our UI consumes.
function normalizeResult(raw) {
  const compileStep = raw.compile; // present only for compiled languages
  const runStep = raw.run;

  const compileError =
    compileStep && compileStep.code !== 0 ? compileStep.stderr || compileStep.output || 'Compile error' : null;

  return {
    stdout: runStep?.stdout ?? '',
    stderr: runStep?.stderr ?? '',
    compileError,
    timedOut: runStep?.signal === 'SIGKILL' || compileStep?.signal === 'SIGKILL',
    exitCode: runStep?.code ?? null,
  };
}

/**
 * Student-facing "Run" button. Executes code once against optional custom stdin.
 * Returns raw stdout/stderr/compileError — no pass/fail, nothing graded.
 *
 * @param {string} code
 * @param {string} language - one of SUPPORTED_LANGUAGES
 * @param {string} [stdin]
 * @returns {Promise<{stdout: string, stderr: string, compileError: string|null, timedOut: boolean}>}
 */
export async function runCodeOnce(code, language, stdin = '') {
  try {
    const raw = await executeOnPiston(code, language, stdin);
    return normalizeResult(raw);
  } catch (err) {
    return {
      stdout: '',
      stderr: err.message || 'Failed to run code.',
      compileError: null,
      timedOut: false,
    };
  }
}

/**
 * Admin grading. Runs the submission against every test case (visible + hidden),
 * comparing trimmed stdout to each expected output. Stops early on a compile
 * error since compiled languages fail identically for every test case — no
 * point re-submitting a broken compile N times.
 *
 * @param {string} code
 * @param {string} language
 * @param {Array<{input?: string, expectedOutput: string, hidden?: boolean}>} testCases
 * @returns {Promise<{
 *   passedCount: number,
 *   totalCount: number,
 *   compileError: string|null,
 *   results: Array<{ passed: boolean, hidden: boolean, stdout: string, stderr: string, expectedOutput: string }>
 * }>}
 */
export async function runAgainstTestCases(code, language, testCases) {
  const totalCount = testCases.length;
  const results = [];
  let passedCount = 0;
  let compileError = null;

  for (const tc of testCases) {
    let raw;
    try {
      raw = await executeOnPiston(code, language, tc.input || '');
    } catch (err) {
      // Network/API failure (e.g. rate limit) — treat as a failed case, not a compile error
      results.push({
        passed: false,
        hidden: !!tc.hidden,
        stdout: '',
        stderr: err.message || 'Execution failed',
        expectedOutput: tc.expectedOutput,
      });
      continue;
    }

    const normalized = normalizeResult(raw);

    // Compiled languages (C/C++/Java): a compile error is the same for every
    // test case, so bail out after the first one instead of wasting calls.
    if (COMPILED_LANGUAGES.has(language) && normalized.compileError) {
      compileError = normalized.compileError;
      break;
    }

    const passed = normalized.stdout.trim() === (tc.expectedOutput || '').trim();
    if (passed) passedCount += 1;

    results.push({
      passed,
      hidden: !!tc.hidden,
      stdout: normalized.stdout,
      stderr: normalized.stderr,
      expectedOutput: tc.expectedOutput,
    });
  }

  return { passedCount, totalCount, compileError, results };
}