import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase'; // adjust path to your firebase config
import { useNavigate, useLocation } from 'react-router-dom'; // adjust if using different routing
import BrandHeader from './BrandHeader';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Prefer student passed via router state; fall back to sessionStorage
  // (handles page refresh, since location.state is lost on reload).
  const stateStudent = location.state?.student;
  const storedStudent = (() => {
    try {
      const raw = sessionStorage.getItem('student');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();
  const student = stateStudent || storedStudent;

  // Keep sessionStorage in sync whenever we do have fresh state data.
  useEffect(() => {
    if (stateStudent) {
      sessionStorage.setItem('student', JSON.stringify(stateStudent));
    }
  }, [stateStudent]);
  // student = { name, registrationNumber, email, phone, preferredCommittee }
  const [upcomingTests, setUpcomingTests] = useState([]);
  const [previousTests, setPreviousTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setError('');
      try {
        const now = new Date();

        // Fetch all tests
        const testsSnap = await getDocs(collection(db, 'tests'));
        const allTests = testsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Fetch this student's attempts
        const attemptsQuery = query(
          collection(db, 'testAttempts'),
          where('registrationNumber', '==', student.registrationNumber)
        );
        const attemptsSnap = await getDocs(attemptsQuery);
        const attemptsMap = {};
        attemptsSnap.docs.forEach((d) => {
          const data = d.data();
          attemptsMap[data.testId] = data;
        });

        const upcoming = [];
        const previous = [];

        allTests.forEach((test) => {
          const startTime = test.startTime?.toDate ? test.startTime.toDate() : new Date(test.startTime);
          const endTime = test.endTime?.toDate ? test.endTime.toDate() : new Date(test.endTime);
          const attempt = attemptsMap[test.id];
          const inRange = now >= startTime && now <= endTime;

          if (attempt && attempt.status === 'submitted') {
            // Already submitted — goes to previous, always shows "Submitted"
            previous.push({
              ...test,
              startTime,
              endTime,
              buttonLabel: 'View Result',
              buttonAction: 'result',
              disabled: false,
              statusLabel: 'Submitted',
            });
          } else if (attempt && attempt.status === 'in_progress') {
            // Started but not finished — resume if still in range, else expired
            previous.push({
              ...test,
              startTime,
              endTime,
              buttonLabel: inRange ? 'Resume' : 'Expired',
              buttonAction: inRange ? 'resume' : null,
              disabled: !inRange,
              statusLabel: inRange ? 'In Progress' : 'Expired',
            });
          } else {
            // No attempt yet — upcoming test
            upcoming.push({
              ...test,
              startTime,
              endTime,
              buttonLabel: inRange ? 'Start' : now < startTime ? 'Not Started Yet' : 'Expired',
              buttonAction: inRange ? 'start' : null,
              disabled: !inRange,
              statusLabel: inRange ? 'Live Now' : now < startTime ? 'Upcoming' : 'Missed',
            });
          }
        });

        // Sort: upcoming by soonest start time, previous by most recent first
        upcoming.sort((a, b) => a.startTime - b.startTime);
        previous.sort((a, b) => b.startTime - a.startTime);

        setUpcomingTests(upcoming);
        setPreviousTests(previous);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard. Please refresh.');
      }
      setLoading(false);
    };

    if (student?.registrationNumber) {
      fetchDashboardData();
    } else {
      setError('No student session found. Please log in again.');
      setLoading(false);
    }
  }, [student]);

  const handleAction = (test) => {
    if (test.buttonAction === 'start' || test.buttonAction === 'resume') {
      navigate(`/test/${test.id}`, { state: { student, test } });
    } else if (test.buttonAction === 'result') {
      navigate(`/result/${test.id}`, { state: { student, test } });
    }
  };

  const formatTime = (date) =>
    date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  const committee = student?.preferredCommittee || student?.committee || 'Not assigned';
  const committeeLabel = committee === 'Not assigned'
    ? committee
    : committee.charAt(0).toUpperCase() + committee.slice(1);

  const TestCard = ({ test }) => (
    <div className="bg-gray-800 rounded-lg p-5 mb-3 flex flex-col sm:flex-row gap-4 justify-between sm:items-center transition-transform duration-200 hover:-translate-y-0.5">
      <div className="min-w-0">
        <h3 className="font-semibold text-lg tracking-tight">{test.title}</h3>
        <p className="text-gray-400 text-sm">
          {formatTime(test.startTime)} — {formatTime(test.endTime)}
        </p>
        <span className="text-xs text-gray-500">{test.statusLabel}</span>
      </div>
      <button
        onClick={() => handleAction(test)}
        disabled={test.disabled}
        className={`px-4 py-2 rounded-lg font-medium transition-all shrink-0 ${
          test.disabled
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
        }`}
      >
        {test.buttonLabel}
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-900 text-white">
        Loading dashboard...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-900 text-white px-4 py-6 sm:p-8">
      <BrandHeader title="Student Assessment Portal" meta="Your tests, progress, and results" />
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 bg-gray-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute -right-12 -top-16 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl" />
          <p className="text-blue-300 text-sm font-medium mb-2">STUDENT PORTAL</p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">Welcome back, {student?.name?.split(' ')[0] || 'Student'}.</h1>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            <span className="bg-gray-700 px-3 py-1.5 rounded-full">{student?.registrationNumber}</span>
            <span className="bg-gray-700 px-3 py-1.5 rounded-full">{committeeLabel} Committee</span>
          </div>
        </div>

        {error && <p className="text-red-400 mb-4">{error}</p>}

        <section className="mb-8">
          <div className="flex items-center justify-between mb-3"><h2 className="text-xl font-semibold tracking-tight">Available tests</h2><span className="text-xs text-gray-400">Live schedule</span></div>
          {upcomingTests.length === 0 ? (
            <p className="text-gray-500">No upcoming tests.</p>
          ) : (
            upcomingTests.map((test) => <TestCard key={test.id} test={test} />)
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-3"><h2 className="text-xl font-semibold tracking-tight">Test history</h2><span className="text-xs text-gray-400">Submitted & in progress</span></div>
          {previousTests.length === 0 ? (
            <p className="text-gray-500">No previous tests.</p>
          ) : (
            previousTests.map((test) => <TestCard key={test.id} test={test} />)
          )}
        </section>
      </div>
    </div>
  );
};

export default StudentDashboard;
