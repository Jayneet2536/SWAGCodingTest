import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase'; // adjust path to your firebase config
import { useNavigate, useLocation } from 'react-router-dom'; // adjust if using different routing

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
    <div className="bg-gray-800 rounded-lg p-4 mb-3 flex justify-between items-center">
      <div>
        <h3 className="font-semibold text-lg">{test.title}</h3>
        <p className="text-gray-400 text-sm">
          {formatTime(test.startTime)} — {formatTime(test.endTime)}
        </p>
        <span className="text-xs text-gray-500">{test.statusLabel}</span>
      </div>
      <button
        onClick={() => handleAction(test)}
        disabled={test.disabled}
        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
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
    <div className="min-h-screen bg-neutral-900 text-white p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">{student?.name}</h1>
          <p className="text-gray-400">{student?.registrationNumber}</p>
          <p className="text-gray-400">Committee: {committeeLabel}</p>
        </div>

        {error && <p className="text-red-400 mb-4">{error}</p>}

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Upcoming Tests</h2>
          {upcomingTests.length === 0 ? (
            <p className="text-gray-500">No upcoming tests.</p>
          ) : (
            upcomingTests.map((test) => <TestCard key={test.id} test={test} />)
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Previous Tests</h2>
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
