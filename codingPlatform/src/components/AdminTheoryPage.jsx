import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase'; // adjust path to your firebase config
import { fetchQuestionsByIds } from '../utils/fetchQuestion'; // adjust path
import { runAgainstTestCases } from '../utils/runCode'; // adjust path
import AdminLayout from './AdminLayout';

const AdminGradeTheory = () => {
  const [tests, setTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [attempts, setAttempts] = useState([]); // each: { id, data, theoryQuestions, codingResults, marksInput, saving, saved }
  const [loading, setLoading] = useState(false);
  const [gradingCoding, setGradingCoding] = useState(false);
  const [error, setError] = useState('');

  // Load list of tests for the dropdown
  useEffect(() => {
    const loadTests = async () => {
      try {
        const snap = await getDocs(collection(db, 'tests'));
        setTests(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error loading tests:', err);
      }
    };
    loadTests();
  }, []);

  // Load submitted attempts for the selected test
  useEffect(() => {
    if (!selectedTestId) {
      setAttempts([]);
      return;
    }

    const loadAttempts = async () => {
      setLoading(true);
      setError('');
      try {
        const q = query(
          collection(db, 'testAttempts'),
          where('testId', '==', selectedTestId),
          where('status', '==', 'submitted')
        );
        const snap = await getDocs(q);

        const loaded = await Promise.all(
          snap.docs.map(async (d) => {
            const data = d.data();
            const allQuestions = await fetchQuestionsByIds(data.questionOrder || []);
            const theoryQuestions = allQuestions.filter((q) => q.type === 'theory');
            const codingQuestions = allQuestions.filter((q) => q.type === 'coding');

            // Pre-fill marks input with previously saved marks, if any
            const marksInput = {};
            theoryQuestions.forEach((q) => {
              marksInput[q.id] = data.theoryMarksAwarded?.[q.id] ?? '';
            });

            // Compute MCQ score if not already cached (in case student hasn't viewed Result yet)
            let mcqScore = data.mcqScore;
            let mcqTotal = data.mcqTotal;
            if (mcqScore === undefined) {
              const mcqQuestions = allQuestions.filter((q) => q.type === 'mcq');
              mcqScore = 0;
              mcqTotal = 0;
              mcqQuestions.forEach((q) => {
                mcqTotal += q.marks;
                if (data.answers?.[q.id] === q.correctAnswer) mcqScore += q.marks;
              });
            }

            // Coding questions are auto-graded against test cases (not typed by hand
            // like theory marks). Use cached results if this attempt was already
            // graded before; otherwise leave ungraded until admin clicks "Run Test Cases" —
            // we don't want to hit Piston for every attempt just from opening the page.
            const codingResults = codingQuestions.map((q) => {
              const cached = data.codingResults?.[q.id];
              return {
                question: q,
                code: data.answers?.[q.id] || '',
                graded: !!cached,
                passed: cached?.passed ?? null,
                total: cached?.total ?? (q.testCases || []).length,
                marksAwarded: cached?.marksAwarded ?? null,
                compileError: cached?.compileError ?? null,
              };
            });

            return {
              id: d.id,
              data,
              theoryQuestions,
              codingResults,
              marksInput,
              mcqScore,
              mcqTotal,
              saving: false,
              saved: data.status === 'graded',
            };
          })
        );

        setAttempts(loaded);
      } catch (err) {
        console.error('Error loading attempts:', err);
        setError('Failed to load attempts.');
      }
      setLoading(false);
    };

    loadAttempts();
  }, [selectedTestId]);

  const handleMarkChange = (attemptIdx, questionId, value, maxMarks) => {
    const numValue = value === '' ? '' : Math.max(0, Math.min(Number(value), maxMarks));
    setAttempts((prev) =>
      prev.map((a, i) =>
        i === attemptIdx
          ? { ...a, marksInput: { ...a.marksInput, [questionId]: numValue }, saved: false }
          : a
      )
    );
  };

  // Runs each coding submission in this attempt against its test cases and
  // computes marks proportionally: (passed / total) * question.marks, floored.
  // Compile errors score 0.
  const handleGradeCoding = async (attemptIdx) => {
    const attempt = attempts[attemptIdx];
    if (attempt.codingResults.length === 0) return;

    setGradingCoding(true);
    try {
      const graded = await Promise.all(
        attempt.codingResults.map(async (cr) => {
          if (!cr.code) {
            return { ...cr, graded: true, passed: 0, marksAwarded: 0 };
          }
          const result = await runAgainstTestCases(
            cr.code,
            cr.question.language,
            cr.question.testCases || []
          );
          const total = (cr.question.testCases || []).length;
          const passed = result.passedCount ?? 0;
          const marksAwarded = result.compileError
            ? 0
            : Math.floor((passed / total) * cr.question.marks);

          return {
            ...cr,
            graded: true,
            passed,
            total,
            marksAwarded,
            compileError: result.compileError || null,
          };
        })
      );

      setAttempts((prev) =>
        prev.map((a, i) => (i === attemptIdx ? { ...a, codingResults: graded, saved: false } : a))
      );
    } catch (err) {
      console.error('Error grading coding questions:', err);
      alert('Failed to grade coding questions. Please try again.');
    }
    setGradingCoding(false);
  };

  const handleSaveGrade = async (attemptIdx) => {
    const attempt = attempts[attemptIdx];

    // Require every theory question to have a mark entered before saving
    const incompleteTheory = attempt.theoryQuestions.some(
      (q) => attempt.marksInput[q.id] === '' || attempt.marksInput[q.id] === undefined
    );
    if (incompleteTheory) {
      alert('Please enter marks for all theory questions before saving.');
      return;
    }

    // Require coding questions to be graded (test cases run) before saving
    const incompleteCoding = attempt.codingResults.some((cr) => !cr.graded);
    if (incompleteCoding) {
      alert('Please run test cases for all coding questions before saving.');
      return;
    }

    setAttempts((prev) => prev.map((a, i) => (i === attemptIdx ? { ...a, saving: true } : a)));

    try {
      const theoryScore = Object.values(attempt.marksInput).reduce(
        (sum, v) => sum + Number(v || 0),
        0
      );
      const codingScore = attempt.codingResults.reduce(
        (sum, cr) => sum + (cr.marksAwarded || 0),
        0
      );
      const finalScore = (attempt.mcqScore || 0) + theoryScore + codingScore;

      const codingResultsToSave = {};
      attempt.codingResults.forEach((cr) => {
        codingResultsToSave[cr.question.id] = {
          passed: cr.passed,
          total: cr.total,
          marksAwarded: cr.marksAwarded,
          compileError: cr.compileError,
        };
      });

      const attemptRef = doc(db, 'testAttempts', attempt.id);
      await setDoc(
        attemptRef,
        {
          theoryMarksAwarded: attempt.marksInput,
          theoryScore,
          mcqScore: attempt.mcqScore,
          mcqTotal: attempt.mcqTotal,
          codingResults: codingResultsToSave,
          codingScore,
          finalScore,
          status: 'graded',
          gradedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setAttempts((prev) =>
        prev.map((a, i) => (i === attemptIdx ? { ...a, saving: false, saved: true } : a))
      );
    } catch (err) {
      console.error('Error saving grade:', err);
      alert('Failed to save grade. Please try again.');
      setAttempts((prev) => prev.map((a, i) => (i === attemptIdx ? { ...a, saving: false } : a)));
    }
  };

  return (
    <AdminLayout title="Grade submissions" description="Review theory responses and verify coding solutions." wide>
      <div className="admin-grading max-w-3xl mx-auto">

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Test</label>
          <select
            value={selectedTestId}
            onChange={(e) => setSelectedTestId(e.target.value)}
            className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            <option value="">-- Select a test --</option>
            {tests.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </div>

        {loading && <p className="text-gray-400">Loading attempts...</p>}
        {error && <p className="text-red-400">{error}</p>}

        {!loading && selectedTestId && attempts.length === 0 && (
          <p className="text-gray-500">No submitted attempts for this test yet.</p>
        )}

        {attempts.map((attempt, idx) => (
          <div key={attempt.id} className="bg-gray-800 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <p className="font-semibold">{attempt.data.registrationNumber}</p>
                <p className="text-sm text-gray-400">
                  MCQ: {attempt.mcqScore} / {attempt.mcqTotal}
                  {attempt.codingResults.length > 0 && (
                    <>
                      {' · Coding: '}
                      {attempt.codingResults.every((cr) => cr.graded)
                        ? attempt.codingResults.reduce((s, cr) => s + (cr.marksAwarded || 0), 0)
                        : 'not graded'}
                      {' / '}
                      {attempt.codingResults.reduce((s, cr) => s + cr.question.marks, 0)}
                    </>
                  )}
                </p>
              </div>
              {attempt.saved && <span className="text-green-400 text-sm">Graded</span>}
            </div>

            {attempt.theoryQuestions.length === 0 && attempt.codingResults.length === 0 && (
              <p className="text-gray-500 text-sm">No theory or coding questions in this attempt.</p>
            )}

            {/* Theory questions - manual marking (unchanged from before) */}
            {attempt.theoryQuestions.length > 0 && (
              <div className="mb-4">
                <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Theory</p>
                {attempt.theoryQuestions.map((q) => (
                  <div key={q.id} className="mb-3 bg-gray-700 rounded-lg p-3">
                    <p className="text-sm font-medium mb-1">{q.questionText}</p>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap mb-2">
                      {attempt.data.answers?.[q.id] || 'Not answered'}
                    </p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        max={q.marks}
                        value={attempt.marksInput[q.id]}
                        onChange={(e) => handleMarkChange(idx, q.id, e.target.value, q.marks)}
                        className="w-20 bg-gray-600 rounded-lg px-2 py-1 text-sm"
                      />
                      <span className="text-sm text-gray-400">/ {q.marks} marks</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Coding questions - auto-graded against test cases */}
            {attempt.codingResults.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Coding</p>
                  <button
                    onClick={() => handleGradeCoding(idx)}
                    disabled={gradingCoding}
                    className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg text-xs font-medium disabled:opacity-50"
                  >
                    {gradingCoding ? 'Running...' : 'Run Test Cases'}
                  </button>
                </div>
                {attempt.codingResults.map((cr) => (
                  <div key={cr.question.id} className="mb-3 bg-gray-700 rounded-lg p-3">
                    <p className="text-sm font-medium mb-1">{cr.question.questionText}</p>
                    <pre className="text-xs text-gray-300 bg-gray-900 rounded p-2 whitespace-pre-wrap mb-2 max-h-40 overflow-y-auto">
                      {cr.code || 'Not answered'}
                    </pre>
                    {!cr.graded && (
                      <p className="text-sm text-gray-500">
                        Not graded yet — click "Run Test Cases" above.
                      </p>
                    )}
                    {cr.graded && cr.compileError && (
                      <div>
                        <p className="text-red-400 text-sm font-semibold mb-1">Compile Error</p>
                        <pre className="text-red-300 text-xs whitespace-pre-wrap">{cr.compileError}</pre>
                        <p className="text-sm text-gray-400 mt-1">0 / {cr.question.marks} marks</p>
                      </div>
                    )}
                    {cr.graded && !cr.compileError && (
                      <p className="text-sm text-gray-300">
                        Passed {cr.passed} / {cr.total} test cases —{' '}
                        <span className="font-medium">
                          {cr.marksAwarded} / {cr.question.marks} marks
                        </span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => handleSaveGrade(idx)}
              disabled={attempt.saving}
              className="mt-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {attempt.saving ? 'Saving...' : 'Save Grade'}
            </button>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminGradeTheory;
