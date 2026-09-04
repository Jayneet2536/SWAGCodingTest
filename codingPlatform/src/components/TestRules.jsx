import { useNavigate, useLocation, useParams } from 'react-router-dom';

const TestRules = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { testId } = useParams();
  const { student, test } = location.state || {};

  const handleStart = () => {
    if (!student || !testId) {
      navigate('/dashboard');
      return;
    }
    // Hand off to the actual test panel, same nav-state pattern you already use
    navigate(`/test/${testId}/panel`, { state: { student, test } });
  };

  if (!student || !testId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900 text-white">
        <p className="text-red-400">Missing student or test info. Please return to dashboard.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-900 text-white p-4">
      <div className="max-w-lg bg-gray-800 border border-red-700 rounded-lg p-6">
        <h1 className="text-xl font-bold mb-4">Before you start: {test?.title || 'Test'}</h1>
        <p className="text-gray-400 text-sm mb-4">{student?.name} — {student?.registrationNumber}</p>
        <ul className="space-y-2 text-sm text-gray-200 mb-6 list-disc list-inside">
          <li>Copy, cut, paste, and right-click are disabled for the entire test.</li>
          <li>DevTools shortcuts (F12, Ctrl+Shift+I/J/C, Ctrl+U) are blocked.</li>
          <li>
            Do <strong>not</strong> switch tabs, minimize the window, or open another app.
            The first switch gives you a warning; a second switch{' '}
            <strong>auto-submits your test immediately</strong>.
          </li>
          <li>The timer starts the moment you click "Start Test" below and does not pause.</li>
          <li>Once submitted, you cannot re-enter or change your answers.</li>
        </ul>
        <button
          onClick={handleStart}
          className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-lg font-medium transition-colors"
        >
          I understand — Start Test
        </button>
      </div>
    </div>
  );
};

export default TestRules;