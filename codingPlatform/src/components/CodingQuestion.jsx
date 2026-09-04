import { useState } from 'react';
import { runCodeOnce, SUPPORTED_LANGUAGES } from '../utils/runCode'; // adjust path if needed

const LANGUAGE_LABELS = {
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
};

/**
 * Coding question panel: question + examples on the left, editor + run/output on the right.
 * Same contract as your existing mcq/theory inputs:
 *   value    -> answers[q.id]           (the code the student has written, as a string)
 *   onChange -> handleAnswerChange(q.id, code)
 *
 * q shape expected (from AdminQuestionForm):
 *   {
 *     id, questionText, marks,
 *     type: 'coding',
 *     language: 'javascript' | 'python' | 'java' | 'c' | 'cpp',
 *     starterCode: string,
 *     testCases: [{ input, expectedOutput, hidden }]
 *   }
 */
const CodingQuestion = ({ question, value, onChange }) => {
  const [language, setLanguage] = useState(question.language || 'javascript');
  const [stdin, setStdin] = useState('');
  const [output, setOutput] = useState(null); // { stdout, stderr, compileError, timedOut } | null
  const [running, setRunning] = useState(false);

  const code = value !== undefined && value !== '' ? value : question.starterCode || '';
  const visibleTestCases = (question.testCases || []).filter((tc) => !tc.hidden);

  const handleCodeChange = (e) => {
    onChange(e.target.value);
  };

  const handleRun = async () => {
    setRunning(true);
    setOutput(null);
    const result = await runCodeOnce(code, language, stdin);
    setOutput(result);
    setRunning(false);
  };

  // Basic tab-key support in the textarea so students can indent code normally
  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.target;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const newCode = code.slice(0, start) + '  ' + code.slice(end);
      onChange(newCode);
      // restore cursor position after React re-renders
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Left: question + examples */}
      <div className="bg-gray-900 rounded-lg p-4 overflow-y-auto max-h-[70vh]">
        <p className="whitespace-pre-wrap mb-4">{question.questionText}</p>

        {visibleTestCases.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-400">Examples</p>
            {visibleTestCases.map((tc, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-3 text-sm font-mono">
                <p className="text-gray-400 mb-1">Input:</p>
                <pre className="whitespace-pre-wrap mb-2">{tc.input || '(none)'}</pre>
                <p className="text-gray-400 mb-1">Expected Output:</p>
                <pre className="whitespace-pre-wrap">{tc.expectedOutput}</pre>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: editor + run + output */}
      <div className="flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {LANGUAGE_LABELS[lang]}
              </option>
            ))}
          </select>

          <button
            onClick={handleRun}
            disabled={running}
            className="bg-green-600 hover:bg-green-700 px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {running ? 'Running...' : '▶ Run'}
          </button>
        </div>

        <textarea
          value={code}
          onChange={handleCodeChange}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="w-full flex-1 min-h-[300px] bg-gray-950 text-gray-100 font-mono text-sm rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
          placeholder="Write your code here..."
        />

        <div>
          <label className="block text-xs text-gray-500 mb-1">Custom input (stdin) — optional</label>
          <textarea
            value={stdin}
            onChange={(e) => setStdin(e.target.value)}
            rows={2}
            className="w-full bg-gray-800 text-gray-200 font-mono text-sm rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
            placeholder="Input passed to your program via stdin"
          />
        </div>

        {/* Output console */}
        <div className="bg-black rounded-lg p-3 font-mono text-sm min-h-[100px] max-h-[200px] overflow-y-auto">
          {output === null && !running && (
            <p className="text-gray-600">Output will appear here after you run your code.</p>
          )}
          {running && <p className="text-gray-500">Running...</p>}
          {output && output.compileError && (
            <div>
              <p className="text-red-400 font-semibold mb-1">Compile Error</p>
              <pre className="text-red-300 whitespace-pre-wrap">{output.compileError}</pre>
            </div>
          )}
          {output && !output.compileError && (
            <>
              {output.stdout && (
                <pre className="text-gray-200 whitespace-pre-wrap">{output.stdout}</pre>
              )}
              {output.stderr && (
                <pre className="text-red-300 whitespace-pre-wrap mt-2">{output.stderr}</pre>
              )}
              {!output.stdout && !output.stderr && (
                <p className="text-gray-500">(no output)</p>
              )}
              {output.timedOut && (
                <p className="text-yellow-400 mt-2">⚠ Execution timed out</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodingQuestion;