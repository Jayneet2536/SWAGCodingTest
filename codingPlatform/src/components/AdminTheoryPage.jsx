import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase'; // adjust path to your firebase config
import { fetchQuestionsByIds } from '../utils/fetchQuestion'; // adjust path

const AdminGradeTheory = () => {
  const [tests, setTests] = useState([]);
  const [selectedTestId, setSelectedTestId] = useState('');
  const [attempts, setAttempts] = useState([]); // each: { id, data, theoryQuestions, marksInput, saving, saved }
  const [loading, setLoading] = useState(false);
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

            return {
              id: d.id,
              data,
              theoryQuestions,
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

  const handleSaveGrade = async (attemptIdx) => {
    const attempt = attempts[attemptIdx];

    // Require every theory question to have a mark entered before saving
    const incomplete = attempt.theoryQuestions.some(
      (q) => attempt.marksInput[q.id] === '' || attempt.marksInput[q.id] === undefined
    );
    if (incomplete) {
      alert('Please enter marks for all theory questions before saving.');
      return;
    }

    setAttempts((prev) => prev.map((a, i) => (i === attemptIdx ? { ...a, saving: true } : a)));

    try {
      const theoryScore = Object.values(attempt.marksInput).reduce(
        (sum, v) => sum + Number(v || 0),
        0
      );
      const finalScore = (attempt.mcqScore || 0) + theoryScore;

      const attemptRef = doc(db, 'testAttempts', attempt.id);
      await setDoc(
        attemptRef,
        {
          theoryMarksAwarded: attempt.marksInput,
          theoryScore,
          mcqScore: attempt.mcqScore,
          mcqTotal: attempt.mcqTotal,
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
    <div className="min-h-screen bg-neutral-900 text-white p-4">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Grade Theory Answers</h2>

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
                </p>
              </div>
              {attempt.saved && <span className="text-green-400 text-sm">Graded</span>}
            </div>

            {attempt.theoryQuestions.length === 0 ? (
              <p className="text-gray-500 text-sm">No theory questions in this attempt.</p>
            ) : (
              attempt.theoryQuestions.map((q) => (
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
              ))
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
    </div>
  );
};

export default AdminGradeTheory;