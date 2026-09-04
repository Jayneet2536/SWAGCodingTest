import { useState, useEffect } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase'; // adjust path to your firebase config
import { Link } from 'react-router-dom'; // adjust if using different routing
import AdminLayout from './AdminLayout';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: null,
    totalQuestions: null,
    totalTests: null,
    submittedAttempts: null,
    pendingTheoryGrading: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      setError('');
      try {
        const [studentsSnap, questionsSnap, testsSnap, submittedSnap, gradedSnap] = await Promise.all([
          getDocs(collection(db, 'registeredUsers')),
          getDocs(collection(db, 'questions')),
          getDocs(collection(db, 'tests')),
          getDocs(query(collection(db, 'testAttempts'), where('status', '==', 'submitted'))),
          getDocs(query(collection(db, 'testAttempts'), where('status', '==', 'graded'))),
        ]);

        setStats({
          totalStudents: studentsSnap.size,
          totalQuestions: questionsSnap.size,
          totalTests: testsSnap.size,
          submittedAttempts: submittedSnap.size + gradedSnap.size,
          pendingTheoryGrading: submittedSnap.size, // submitted but not yet graded
        });
      } catch (err) {
        console.error('Error loading admin stats:', err);
        setError('Failed to load live stats from Firebase.');
      }
      setLoading(false);
    };

    loadStats();
  }, []);

  const navCards = [
    {
      to: '/admin/add-student',
      title: 'Add Student',
      desc: 'Whitelist a student by registration number',
    },
    {
      to: '/admin/questions',
      title: 'Add Question',
      desc: 'Add MCQ or Theory questions, tagged by committee',
    },
    {
      to: '/admin/all-questions',
      title: 'All Questions',
      desc: 'Search, filter, and sort the complete question bank',
    },
    {
      to: '/admin/create-test',
      title: 'Create Test',
      desc: 'Set title, start/end window, and duration',
    },
    {
      to: '/admin/grade-theory',
      title: 'Grade Theory',
      desc: 'Manually grade theory answers and finalize scores',
      badge: stats.pendingTheoryGrading > 0 ? stats.pendingTheoryGrading : null,
    },
    {
  to: '/admin/results',
  title: 'Student Results',
  desc: 'View scores for all submitted attempts',
},
  ];

  const StatCard = ({ label, value }) => (
    <div className="bg-gray-800 rounded-lg p-4 text-center">
      <p className="text-2xl font-bold">{loading ? '—' : value}</p>
      <p className="text-gray-400 text-sm mt-1">{label}</p>
    </div>
  );

  return (
    <AdminLayout title="Dashboard" description="A live overview of your assessment programme." wide>

        {error && <p className="text-red-400 mb-4">{error}</p>}

        <div className="admin-stat-grid grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
          <StatCard label="Registered Students" value={stats.totalStudents} />
          <StatCard label="Questions" value={stats.totalQuestions} />
          <StatCard label="Tests" value={stats.totalTests} />
          <StatCard label="Submitted Attempts" value={stats.submittedAttempts} />
          <StatCard label="Pending Theory Grading" value={stats.pendingTheoryGrading} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {navCards.map((card) => (
            <Link
              key={card.to}
              to={card.to}
              className="admin-action-card bg-gray-800 hover:bg-gray-700 rounded-lg p-5 transition-colors relative"
            >
              {card.badge && (
                <span className="absolute top-3 right-3 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {card.badge}
                </span>
              )}
              <h3 className="font-semibold text-lg mb-1">{card.title}</h3>
              <p className="text-gray-400 text-sm">{card.desc}</p>
            </Link>
          ))}
        </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
