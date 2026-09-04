// Sandboxed code execution through Judge0 CE's public preview endpoint.
// The previous Piston endpoint now returns HTTP 401 without private approval.
// Keep all execution access in this one file so it can later be moved behind
// a backend or switched to a self-hosted runner without changing the UI.

const JUDGE0_API_BASE = 'https://ce.judge0.com';

// These IDs are the current stable Judge0 CE runtimes. The endpoint exposes
// them at GET /languages; use those values rather than display names.
const LANGUAGE_IDS = {
  javascript: 102, // Node.js 22
  python: 113, // Python 3.14
  java: 91, // JDK 17
  c: 103, // GCC 14
  cpp: 105, // GCC 14
};

export const SUPPORTED_LANGUAGES = Object.keys(LANGUAGE_IDS);
const COMPILED_LANGUAGES = new Set(['java', 'c', 'cpp']);

async function executeOnJudge0(code, language, stdin = '') {
  const languageId = LANGUAGE_IDS[language];
  if (!languageId) throw new Error(`Unsupported language: ${language}`);

  const res = await fetch(
    `${JUDGE0_API_BASE}/submissions?base64_encoded=false&wait=true&fields=stdout,stderr,compile_output,message,status,time`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
        stdin: stdin ?? '',
        cpu_time_limit: 5,
        wall_time_limit: 7,
      }),
    }
  );

  if (!res.ok) {
    if (res.status === 429) throw new Error('Code runner is busy — please try again in a moment.');
    throw new Error(`Code execution failed (${res.status})`);
  }

  return res.json();
}

function normalizeResult(raw) {
  const statusId = raw.status?.id;
  const compileError = statusId === 6
    ? raw.compile_output || raw.message || 'Compile error'
    : null;

  return {
    stdout: raw.stdout ?? '',
    stderr: raw.stderr || raw.message || '',
    compileError,
    timedOut: statusId === 5,
    exitCode: statusId === 3 ? 0 : null,
  };
}

/** Runs a student's code once against optional custom stdin. */
export async function runCodeOnce(code, language, stdin = '') {
  try {
    return normalizeResult(await executeOnJudge0(code, language, stdin));
  } catch (err) {
    return {
      stdout: '',
      stderr: err.message || 'Failed to run code.',
      compileError: null,
      timedOut: false,
    };
  }
}

/** Runs an answer against all visible and hidden test cases for grading. */
export async function runAgainstTestCases(code, language, testCases) {
  const totalCount = testCases.length;
  const results = [];
  let passedCount = 0;
  let compileError = null;

  for (const tc of testCases) {
    try {
      const normalized = normalizeResult(await executeOnJudge0(code, language, tc.input || ''));

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
    } catch (err) {
      results.push({
        passed: false,
        hidden: !!tc.hidden,
        stdout: '',
        stderr: err.message || 'Execution failed',
        expectedOutput: tc.expectedOutput,
      });
    }
  }

  return { passedCount, totalCount, compileError, results };
}
