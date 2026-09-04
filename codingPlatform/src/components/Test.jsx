import { useState, useEffect } from 'react';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase'; // adjust path to your firebase config
import { fetchQuestionsForCommittee, fetchQuestionsByIds } from '../utils/fetchQuestion'; // adjust path
import { useNavigate, useLocation, useParams } from 'react-router-dom'; // adjust if different routing

const TestPanel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { testId } = useParams();

  // student + test passed via navigate state from StudentDashboard
  const { student, test } = location.state || {};

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // { questionId: answerValue }
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(null); // seconds remaining
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0); // ① which question is on screen

  const attemptId = student && testId ? `${student.registrationNumber}_${testId}` : null;

  useEffect(() => {
    const loadTest = async () => {
      if (!student || !testId) {
        setError('Missing student or test info. Please return to dashboard.');
        setLoading(false);
        return;
      }

      try {
        // Load or create the attempt doc first, to resume any saved answers
        const attemptRef = doc(db, 'testAttempts', attemptId);
        const attemptSnap = await getDoc(attemptRef);

        if (attemptSnap.exists() && attemptSnap.data().status === 'submitted') {
          // Already submitted — don't allow re-entry
          navigate(`/result/${testId}`, { state: { student, test } });
          return;
        }

        if (attemptSnap.exists()) {
          setAnswers(attemptSnap.data().answers || {});

          // Resume: reuse the exact question order saved on first load
          const savedOrder = attemptSnap.data().questionOrder || [];
          const fetchedQuestions = await fetchQuestionsByIds(savedOrder);
          setQuestions(fetchedQuestions);
        } else {
          // First time opening this test — fetch, shuffle, and lock in the order
          const fetchedQuestions = await fetchQuestionsForCommittee(student.preferredCommittee);
          const questionOrder = fetchedQuestions.map((q) => q.id);

          await setDoc(attemptRef, {
            registrationNumber: student.registrationNumber,
            testId,
            status: 'in_progress',
            answers: {},
            questionOrder,
            startedAt: serverTimestamp(),
          });

          setQuestions(fetchedQuestions);
        }
        const endTime = test?.endTime?.toDate
          ? test.endTime.toDate()
          : test?.endTime
          ? new Date(test.endTime)
          : null;

        if (endTime) {
          const secondsLeft = Math.max(0, Math.floor((endTime - new Date()) / 1000));
          setTimeLeft(secondsLeft);
        }
      } catch (err) {
        console.error('Error loading test:', err);
        setError('Failed to load test. Please try again.');
      }
      setLoading(false);
    };

    loadTest();
  }, [student, testId, attemptId, navigate, test]);

  // Countdown ticker — auto-submits when it hits zero
  useEffect(() => {
    if (timeLeft === null || loading || autoSubmitted) return;

    if (timeLeft <= 0) {
      setAutoSubmitted(true);
      handleSubmit(true);
      return;
    }

    const tick = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : prev));
    }, 1000);

    return () => clearInterval(tick);
  }, [timeLeft, loading, autoSubmitted]);

  const formatTimeLeft = (seconds) => {
    if (seconds === null) return '--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${m}:${String(s).padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  // Autosave answers periodically / on change, so "Resume" actually works
  useEffect(() => {
    if (!attemptId || loading) return;
    const saveTimer = setTimeout(async () => {
      try {
        const attemptRef = doc(db, 'testAttempts', attemptId);
        await setDoc(attemptRef, { answers, lastSavedAt: serverTimestamp() }, { merge: true });
      } catch (err) {
        console.error('Error autosaving answers:', err);
      }
    }, 1500); // debounce
    return () => clearTimeout(saveTimer);
  }, [answers, attemptId, loading]);

  const handleSubmit = async (isAuto = false) => {
    if (!isAuto && !window.confirm('Submit the test? You will not be able to change answers after this.')) return;

    setSubmitting(true);
    try {
      const attemptRef = doc(db, 'testAttempts', attemptId);
      await setDoc(
        attemptRef,
        {
          answers,
          status: 'submitted',
          submittedAt: serverTimestamp(),
          autoSubmitted: isAuto,
        },
        { merge: true }
      );
      navigate(`/result/${testId}`, { state: { student, test } });
    } catch (err) {
      console.error('Error submitting test:', err);
      setError('Failed to submit. Please try again.');
    }
    setSubmitting(false);
  };

  // ② navigation helpers
  const goNext = () => setCurrentIndex((i) => Math.min(i + 1, questions.length - 1));
  const goPrev = () => setCurrentIndex((i) => Math.max(i - 1, 0));
  const goTo = (i) => setCurrentIndex(i);

  const isAnswered = (q) => {
    const val = answers[q.id];
    return val !== undefined && val !== '';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900 text-white">
        Loading test...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900 text-white">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  const q = questions[currentIndex]; // ③ current question only
  const isLastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">{test?.title || 'Test'}</h1>
            <p className="text-gray-400 text-sm">{student?.name} — {student?.registrationNumber}</p>
          </div>
          <div className="flex items-center gap-4">
            <span
              className={`font-mono text-lg px-3 py-1 rounded-lg ${
                timeLeft !== null && timeLeft <= 60
                  ? 'bg-red-900 text-red-300'
                  : 'bg-gray-800 text-gray-200'
              }`}
            >
              {formatTimeLeft(timeLeft)}
            </span>
            <button
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 px-5 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Test'}
            </button>
          </div>
        </div>

        {questions.length === 0 ? (
          <p className="text-gray-500">No questions found for your committee.</p>
        ) : (
          <>
            {/* ④ jump-to-question strip */}
            <div className="flex flex-wrap gap-2 mb-4">
              {questions.map((qq, i) => (
                <button
                  key={qq.id}
                  onClick={() => goTo(i)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium flex items-center justify-center transition-colors ${
                    i === currentIndex
                      ? 'bg-indigo-600 text-white'
                      : isAnswered(qq)
                      ? 'bg-green-800 text-green-200'
                      : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>

            {/* ⑤ single question card */}
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <p className="font-medium mb-3">
                Question {currentIndex + 1} of {questions.length}: {q.questionText}
                <span className="text-gray-500 text-sm ml-2">({q.marks} marks)</span>
              </p>

              {q.type === 'mcq' ? (
                <div className="space-y-2">
                  {q.options.map((option, i) => (
                    <label key={i} className="flex items-center gap-2 bg-gray-700 rounded-lg px-3 py-2 cursor-pointer">
                      <input
                        type="radio"
                        name={q.id}
                        value={option}
                        checked={answers[q.id] === option}
                        onChange={() => handleAnswerChange(q.id, option)}
                      />
                      {option}
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  rows={5}
                  className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  placeholder="Type your answer here"
                />
              )}
            </div>

            {/* ⑥ previous / next controls */}
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="bg-gray-700 hover:bg-gray-600 px-5 py-2 rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {isLastQuestion ? (
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Test'}
                </button>
              ) : (
                <button
                  onClick={goNext}
                  className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-lg font-medium"
                >
                  Next
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TestPanel;