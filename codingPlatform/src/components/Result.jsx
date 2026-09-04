import { useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate, useLocation, useParams } from 'react-router-dom';

const ResultPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { testId } = useParams();
  const { student, test } = location.state || {};

  const attemptId = student && testId ? `${student.registrationNumber}_${testId}` : null;

  // ① Confirm the attempt was actually submitted — no score is fetched or shown here.
  useEffect(() => {
    let cancelled = false;

    const verifySubmission = async () => {
      if (!student || !testId) {
        navigate('/dashboard', { replace: true });
        return;
      }
      try {
        const attemptRef = doc(db, 'testAttempts', attemptId);
        const attemptSnap = await getDoc(attemptRef);

        // Do not let this asynchronous check redirect after the user leaves
        // this screen (for example, by clicking Back to Dashboard).
        if (cancelled) return;

        if (!attemptSnap.exists()) {
          navigate('/dashboard', { replace: true, state: { student } });
          return;
        }

        const attemptData = attemptSnap.data();

        if (attemptData.status !== 'submitted' && attemptData.status !== 'graded') {
          // Not submitted yet — send them back to the test instead
          navigate(`/test/${testId}`, { replace: true, state: { student, test } });
        }
      } catch (err) {
        console.error('Error verifying submission:', err);
      }
    };

    verifySubmission();
    return () => {
      cancelled = true;
    };
  }, [student, testId, attemptId, navigate]);

  // ② Student view: confirmation only, no score/answers shown
  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-900 text-white p-4">
      <div className="w-full max-w-xl bg-gray-800 rounded-2xl p-8 sm:p-10 text-center">
      <div className="w-14 h-14 mx-auto mb-6 rounded-full bg-green-500/15 border border-green-400/25 flex items-center justify-center text-2xl text-green-300">✓</div>
      <p className="text-blue-300 text-sm font-medium tracking-wide mb-2">SUBMISSION RECEIVED</p>
      <h1 className="text-3xl font-semibold tracking-tight">Test submitted</h1>
      <p className="text-gray-400 text-center max-w-md mx-auto mt-3 leading-relaxed">
        Your responses for {test?.title || 'this test'} have been recorded. Results will be announced by the admin.
      </p>
      <button
        onClick={() => navigate('/dashboard', { replace: true, state: { student } })}
        className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-medium transition-colors mt-8"
      >
        Back to Dashboard
      </button>
      </div>
    </div>
  );
};

export default ResultPage;
