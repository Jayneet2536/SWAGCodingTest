// utils/runCode.js
// Shared code execution utility using the Piston API (https://github.com/engineer-man/piston)
// Used by:
//   - CodingQuestion.jsx (student "Run" button — just shows raw output, no test cases)
//   - AdminGradeTheory.jsx ("Run against test cases" — shows pass/fail per test case)

const PISTON_API_URL = 'https://emkc.org/api/v2/piston/execute';

// Piston needs an exact runtime version per language. This list is fetched once
// and cached so we don't hit /runtimes on every single execution.
let cachedRuntimes = null;

const LANGUAGE_MAP = {
  javascript: 'javascript',
  python: 'python',
  java: 'java',
  c: 'c',
  cpp: 'cpp',
};

// Piston expects a specific filename per language so it compiles correctly
const FILENAME_MAP = {
  javascript: 'main.js',
  python: 'main.py',
  java: 'Main.java',
  c: 'main.c',
  cpp: 'main.cpp',
};

async function getRuntimeVersion(language) {
  if (!cachedRuntimes) {
    const res = await fetch('https://emkc.org/api/v2/piston/runtimes');
    if (!res.ok) throw new Error('Failed to fetch Piston runtimes');
    cachedRuntimes = await res.json();
  }

  const pistonLang = LANGUAGE_MAP[language];
  const runtime = cachedRuntimes.find((r) => r.language === pistonLang);

  if (!runtime) {
    throw new Error(`Unsupported language: ${language}`);
  }

  return runtime.version;
}

/**
 * Executes code once against a single stdin input.
 * Returns { stdout, stderr, compileError, timedOut }
 */
async function executeOnce(code, language, stdin = '') {
  const pistonLang = LANGUAGE_MAP[language];
  if (!pistonLang) {
    throw new Error(`Unsupported language: ${language}`);
  }

  const version = await getRuntimeVersion(language);

  const res = await fetch(PISTON_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: pistonLang,
      version,
      files: [
        {
          name: FILENAME_MAP[language],
          content: code,
        },
      ],
      stdin,
      // safety limits — Piston's public API also enforces its own caps
      compile_timeout: 10000,
      run_timeout: 5000,
    }),
  });

  if (!res.ok) {
    throw new Error(`Piston API error: ${res.status}`);
  }

  const data = await res.json();

  // Compile step (only present for compiled languages like c/cpp/java)
  const compileError =
    data.compile && data.compile.code !== 0 ? data.compile.stderr || data.compile.output : null;

  return {
    stdout: data.run?.stdout ?? '',
    stderr: data.run?.stderr ?? '',
    compileError,
    timedOut: data.run?.signal === 'SIGKILL',
    raw: data,
  };
}

/**
 * Plain run — student's "Run" button. No test cases, just shows whatever
 * the code prints for a given (optional) stdin. Never reveals pass/fail
 * because the student shouldn't see grading signal before submit.
 *
 * @param {string} code
 * @param {string} language - one of 'javascript' | 'python' | 'java' | 'c' | 'cpp'
 * @param {string} stdin - optional input the student wants to test with
 */
export async function runCodeOnce(code, language, stdin = '') {
  try {
    const result = await executeOnce(code, language, stdin);
    return {
      success: !result.compileError,
      stdout: result.stdout,
      stderr: result.stderr,
      compileError: result.compileError,
      timedOut: result.timedOut,
    };
  } catch (err) {
    return {
      success: false,
      stdout: '',
      stderr: '',
      compileError: err.message || 'Execution failed',
      timedOut: false,
    };
  }
}

/**
 * Runs code against a list of test cases and reports pass/fail per case.
 * Used by admin grading (visible + hidden test cases) — never used
 * client-side for students, per the "no scoring before submit" rule.
 *
 * @param {string} code
 * @param {string} language
 * @param {Array<{input: string, expectedOutput: string, hidden?: boolean}>} testCases
 * @returns {Promise<{ compileError: string|null, results: Array, passedCount: number, totalCount: number }>}
 */
export async function runAgainstTestCases(code, language, testCases = []) {
  const results = [];
  let compileError = null;

  for (const tc of testCases) {
    try {
      const result = await executeOnce(code, language, tc.input || '');

      if (result.compileError) {
        // If it doesn't compile, every test case fails the same way — stop early
        compileError = result.compileError;
        results.push({
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          actualOutput: '',
          passed: false,
          hidden: !!tc.hidden,
          error: 'Compile error',
        });
        break;
      }

      const actual = (result.stdout || '').trim();
      const expected = (tc.expectedOutput || '').trim();

      results.push({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: result.stdout,
        stderr: result.stderr,
        passed: actual === expected,
        hidden: !!tc.hidden,
        timedOut: result.timedOut,
      });
    } catch (err) {
      results.push({
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: '',
        passed: false,
        hidden: !!tc.hidden,
        error: err.message || 'Execution failed',
      });
    }
  }

  const passedCount = results.filter((r) => r.passed).length;

  return {
    compileError,
    results,
    passedCount,
    totalCount: testCases.length,
  };
}

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_MAP);