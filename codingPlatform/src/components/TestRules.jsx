import { useNavigate, useLocation, useParams } from 'react-router-dom';
import BrandHeader from './BrandHeader';

const TestRules = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { testId } = useParams();
  const { student, test } = location.state || {};

  const handleStart = async () => {
    if (!student || !testId) {
      navigate('/dashboard');
      return;
    }

    // This call is triggered directly by the student's click, which browsers
    // require before allowing fullscreen mode.
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (error) {
      // Continue into the test if fullscreen is unavailable or declined.
      console.warn('Fullscreen request was not accepted:', error);
    }

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
    <div className="min-h-screen bg-neutral-900 text-white p-4">
      <BrandHeader title={test?.title || 'Online Assessment'} meta="Secure exam check-in" />
      <div className="max-w-xl bg-gray-800 rounded-2xl p-6 sm:p-8 mx-auto mt-10">
        <p className="text-blue-300 text-sm font-medium mb-2">EXAM CHECK-IN</p>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Before you begin</h1>
        <p className="text-gray-400 mb-6">{test?.title || 'Test'} · {student?.name} · {student?.registrationNumber}</p>
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
          className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-lg font-medium transition-colors mt-2"
        >
          I understand — Start Test
        </button>
      </div>
    </div>
  );
};

export default TestRules;
