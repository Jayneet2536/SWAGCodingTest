import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import AdminLayout from './AdminLayout';

const label = (value) => value ? value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : '—';

const AdminQuestionList = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [committee, setCommittee] = useState('all');
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'questions'));
        setQuestions(snapshot.docs.map((question) => ({ id: question.id, ...question.data() })));
      } catch (err) {
        console.error('Error loading questions:', err);
        setError('Could not load questions. Please refresh and try again.');
      } finally {
        setLoading(false);
      }
    };

    loadQuestions();
  }, []);

  const filteredQuestions = useMemo(() => {
    const term = search.trim().toLowerCase();
    const createdAtMs = (question) => question.createdAt?.toMillis?.() || 0;
    const result = questions.filter((question) => {
      const matchesSearch = !term || [question.questionText, question.committee, question.type, question.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
      return matchesSearch
        && (committee === 'all' || question.committee === committee)
        && (type === 'all' || question.type === type);
    });

    return result.sort((a, b) => {
      if (sort === 'oldest') return createdAtMs(a) - createdAtMs(b);
      if (sort === 'marks-high') return (b.marks || 0) - (a.marks || 0);
      if (sort === 'marks-low') return (a.marks || 0) - (b.marks || 0);
      if (sort === 'question-az') return (a.questionText || '').localeCompare(b.questionText || '');
      return createdAtMs(b) - createdAtMs(a);
    });
  }, [questions, search, committee, type, sort]);

  return (
    <AdminLayout title="Question bank" description="Search, review, and maintain every assessment question." wide>
        <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
          <div>
            <p className="text-gray-400 text-sm">{filteredQuestions.length} of {questions.length} questions shown</p>
          </div>
          <div className="flex gap-2">
            <Link to="/admin" className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm">Dashboard</Link>
            <Link to="/admin/questions" className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-sm">Add Question</Link>
          </div>
        </div>

        <div className="admin-filter-panel grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search question text"
            className="sm:col-span-2 bg-gray-800 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select value={committee} onChange={(event) => setCommittee(event.target.value)} className="bg-gray-800 rounded-lg px-3 py-2">
            <option value="all">All committees</option>
            <option value="dsa">DSA</option>
            <option value="web">Web</option>
            <option value="app">App</option>
            <option value="graphics">Graphics</option>
          </select>
          <select value={type} onChange={(event) => setType(event.target.value)} className="bg-gray-800 rounded-lg px-3 py-2">
            <option value="all">All types</option>
            <option value="mcq">MCQ</option>
            <option value="theory">Theory</option>
            <option value="coding">Coding</option>
          </select>
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="bg-gray-800 rounded-lg px-3 py-2 lg:col-start-4">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="marks-high">Highest marks</option>
            <option value="marks-low">Lowest marks</option>
            <option value="question-az">Question A–Z</option>
          </select>
        </div>

        {error && <p className="text-red-400 mb-4">{error}</p>}
        {loading ? (
          <p className="text-gray-400">Loading questions...</p>
        ) : filteredQuestions.length === 0 ? (
          <p className="text-gray-500">No questions match these filters.</p>
        ) : (
          <div className="space-y-3">
            {filteredQuestions.map((question, index) => (
              <details key={question.id} className="bg-gray-800 rounded-lg p-4 group">
                <summary className="cursor-pointer list-none flex flex-wrap items-start gap-3">
                  <span className="text-gray-500 text-sm pt-0.5">{index + 1}</span>
                  <p className="flex-1 font-medium whitespace-pre-wrap">{question.questionText}</p>
                  <span className="bg-indigo-900 text-indigo-200 text-xs px-2 py-1 rounded">{label(question.committee)}</span>
                  <span className="bg-gray-700 text-gray-200 text-xs px-2 py-1 rounded">{label(question.type)}</span>
                  <span className="text-gray-400 text-sm">{question.marks || 0} marks</span>
                </summary>
                <div className="mt-4 pt-4 border-t border-gray-700 text-sm space-y-3">
                  {question.category && <p><span className="text-gray-400">Category:</span> {label(question.category)}</p>}
                  {question.type === 'mcq' && (
                    <div>
                      <p className="text-gray-400 mb-1">Options</p>
                      <ul className="list-disc list-inside space-y-1">
                        {(question.options || []).map((option) => (
                          <li key={option} className={option === question.correctAnswer ? 'text-green-400' : ''}>{option}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {question.type === 'coding' && <p className="text-gray-400">Language: <span className="text-white">{label(question.language)}</span> · Test cases: <span className="text-white">{(question.testCases || []).length}</span></p>}
                </div>
              </details>
            ))}
          </div>
        )}
    </AdminLayout>
  );
};

export default AdminQuestionList;
