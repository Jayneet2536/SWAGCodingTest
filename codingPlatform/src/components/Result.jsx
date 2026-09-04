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
    <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-900 text-white p-4 gap-4">
      <h1 className="text-2xl font-bold">Test Submitted</h1>
      <p className="text-gray-400 text-center max-w-md">
        Your responses for {test?.title || 'this test'} have been recorded. Results will be announced by the admin.
      </p>
      <button
        onClick={() => navigate('/dashboard', { replace: true, state: { student } })}
        className="bg-indigo-600 hover:bg-indigo-700 px-6 py-2 rounded-lg font-medium transition-colors"
      >
        Back to Dashboard
      </button>
    </div>
  );
};

export default ResultPage;
