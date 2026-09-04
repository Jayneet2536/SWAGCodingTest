import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { fetchQuestionsByIds } from '../utils/fetchQuestion';
import { Link } from 'react-router-dom';
import AdminLayout from './AdminLayout';

const AdminResults = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadResults = async () => {
      setLoading(true);
      setError('');
      try {
        const attemptsSnap = await getDocs(collection(db, 'testAttempts'));
        const attempts = attemptsSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((a) => a.status === 'submitted' || a.status === 'graded');

        const computed = await Promise.all(
          attempts.map(async (a) => {
            const questions = await fetchQuestionsByIds(a.questionOrder || []);
            let mcqScore = 0;
            let mcqTotal = 0;
            let theoryTotal = 0;

            questions.forEach((q) => {
              if (q.type === 'mcq') {
                mcqTotal += q.marks;
                if (a.answers?.[q.id] === q.correctAnswer) mcqScore += q.marks;
              } else {
                theoryTotal += q.marks;
              }
            });

            return {
              attemptId: a.id,
              registrationNumber: a.registrationNumber || a.id.split('_')[0],
              testId: a.testId,
              status: a.status,
              mcqScore,
              mcqTotal,
              theoryTotal,
              finalScore: a.finalScore, // set once admin grades theory
            };
          })
        );

        setRows(computed);
      } catch (err) {
        console.error('Error loading admin results:', err);
        setError('Failed to load results from Firebase.');
      }
      setLoading(false);
    };

    loadResults();
  }, []);

  return (
    <AdminLayout title="Student results" description="Review submitted attempts and grading status." wide>
        <div className="flex items-center justify-between mb-6">
          <Link to="/admin" className="text-sm text-indigo-400 hover:text-indigo-300">
            Back to Dashboard
          </Link>
        </div>

        {error && <p className="text-red-400 mb-4">{error}</p>}
        {loading && <p className="text-gray-400">Loading results...</p>}

        {!loading && !error && (
          <div className="admin-table overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-gray-400 border-b border-gray-700">
                <tr>
                  <th className="py-2 pr-4">Reg No</th>
                  <th className="py-2 pr-4">Test</th>
                  <th className="py-2 pr-4">MCQ Score</th>
                  <th className="py-2 pr-4">Theory</th>
                  <th className="py-2 pr-4">Final</th>
                  <th className="py-2 pr-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.attemptId} className="border-b border-gray-800">
                    <td className="py-2 pr-4">{r.registrationNumber}</td>
                    <td className="py-2 pr-4">{r.testId}</td>
                    <td className="py-2 pr-4">{r.mcqScore} / {r.mcqTotal}</td>
                    <td className="py-2 pr-4">{r.theoryTotal > 0 ? `${r.theoryTotal} pending` : '—'}</td>
                    <td className="py-2 pr-4">{r.finalScore ?? '—'}</td>
                    <td className="py-2 pr-4 capitalize">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </AdminLayout>
  );
};

export default AdminResults;
