import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase'; // adjust path to your firebase config
import { SUPPORTED_LANGUAGES } from '../utils/runCode'; // adjust path

const COMMITTEE_OPTIONS = [
  { value: 'dsa', label: 'DSA (common — shown to all committees)' },
  { value: 'web', label: 'Web' },
  { value: 'app', label: 'App' },
  { value: 'graphics', label: 'Graphics' },
];

const LANGUAGE_LABELS = {
  javascript: 'JavaScript',
  python: 'Python',
  java: 'Java',
  c: 'C',
  cpp: 'C++',
};

const emptyTestCase = () => ({ input: '', expectedOutput: '', hidden: false });

const AdminQuestionForm = () => {
  const [committee, setCommittee] = useState('dsa');
  const [type, setType] = useState('mcq');
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [marks, setMarks] = useState(1);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [category, setCategory] = useState('theory');

  // --- coding-question-only state ---
  const [codingLanguage, setCodingLanguage] = useState('javascript');
  const [starterCode, setStarterCode] = useState('');
  const [testCases, setTestCases] = useState([emptyTestCase(), emptyTestCase()]);

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const addOptionField = () => {
    if (options.length < 6) setOptions([...options, '']);
  };

  const removeOptionField = (index) => {
    if (options.length <= 2) return; // keep at least 2 options
    const updated = options.filter((_, i) => i !== index);
    setOptions(updated);
    if (correctAnswer === options[index]) setCorrectAnswer('');
  };

  // --- test case helpers (same add/remove pattern as options) ---
  const handleTestCaseChange = (index, field, value) => {
    const updated = [...testCases];
    updated[index] = { ...updated[index], [field]: value };
    setTestCases(updated);
  };

  const addTestCase = () => {
    if (testCases.length < 10) setTestCases([...testCases, emptyTestCase()]);
  };

  const removeTestCase = (index) => {
    if (testCases.length <= 1) return; // keep at least 1 test case
    setTestCases(testCases.filter((_, i) => i !== index));
  };

  const validate = () => {
    const newErrors = {};

    if (!questionText.trim()) newErrors.questionText = 'Question text is required';
    if (!marks || marks <= 0) newErrors.marks = 'Marks must be greater than 0';

    if (type === 'mcq') {
      const filledOptions = options.map((o) => o.trim()).filter(Boolean);
      if (filledOptions.length < 2) {
        newErrors.options = 'At least 2 non-empty options are required';
      }
      const uniqueOptions = new Set(filledOptions);
      if (uniqueOptions.size !== filledOptions.length) {
        newErrors.options = 'Options must be unique';
      }
      if (!correctAnswer.trim()) {
        newErrors.correctAnswer = 'Select the correct answer';
      } else if (!filledOptions.includes(correctAnswer.trim())) {
        newErrors.correctAnswer = 'Correct answer must match one of the options';
      }
    }

    if (type === 'coding') {
      const filledCases = testCases.filter(
        (tc) => tc.input.trim() !== '' || tc.expectedOutput.trim() !== ''
      );
      const invalidCases = testCases.some((tc) => !tc.expectedOutput.trim());
      if (testCases.length === 0) {
        newErrors.testCases = 'At least 1 test case is required';
      } else if (invalidCases) {
        newErrors.testCases = 'Every test case needs an expected output';
      }
      // at least one visible test case so students see an example
      const hasVisible = testCases.some((tc) => !tc.hidden && tc.expectedOutput.trim());
      if (!hasVisible) {
        newErrors.testCases = 'At least one test case must be visible (not hidden) as an example';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setQuestionText('');
    setOptions(['', '', '', '']);
    setCorrectAnswer('');
    setMarks(1);
    setErrors({});
    setCodingLanguage('javascript');
    setStarterCode('');
    setTestCases([emptyTestCase(), emptyTestCase()]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        committee,
        type,
        questionText: questionText.trim(),
        marks: Number(marks),
        createdAt: serverTimestamp(),
      };

      if (type === 'mcq') {
        payload.options = options.map((o) => o.trim()).filter(Boolean);
        payload.correctAnswer = correctAnswer.trim();
      }

      if (type === 'theory') {
        payload.category = category;
      }

      if (type === 'coding') {
        payload.language = codingLanguage;
        payload.starterCode = starterCode;
        payload.testCases = testCases
          .filter((tc) => tc.expectedOutput.trim() !== '')
          .map((tc) => ({
            input: tc.input,
            expectedOutput: tc.expectedOutput,
            hidden: tc.hidden,
          }));
      }

      await addDoc(collection(db, 'questions'), payload);

      setSuccessMsg('Question added successfully.');
      resetForm();
    } catch (error) {
      console.error('Error adding question:', error);
      setErrors({ general: 'Something went wrong. Please try again.' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4">
      <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-5">
        <h2 className="text-2xl font-bold mb-4">Add Question</h2>

        {errors.general && <p className="text-red-400 text-sm">{errors.general}</p>}
        {successMsg && <p className="text-green-400 text-sm">{successMsg}</p>}

        <div>
          <label className="block text-sm font-medium mb-2">Committee</label>
          <select
            value={committee}
            onChange={(e) => setCommittee(e.target.value)}
            className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            {COMMITTEE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Question Type</label>
          <div className="flex gap-4 flex-wrap">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="type"
                value="mcq"
                checked={type === 'mcq'}
                onChange={() => setType('mcq')}
              />
              MCQ
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="type"
                value="theory"
                checked={type === 'theory'}
                onChange={() => setType('theory')}
              />
              Theory
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="type"
                value="coding"
                checked={type === 'coding'}
                onChange={() => setType('coding')}
              />
              Coding
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            {type === 'coding' ? 'Problem Statement' : 'Question Text'}
          </label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            rows={type === 'coding' ? 5 : 3}
            className={`w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 ${errors.questionText ? 'border-2 border-red-500' : ''}`}
            placeholder={type === 'coding' ? 'Describe the problem, input/output format, constraints...' : 'Enter the question'}
          />
          {errors.questionText && <p className="text-red-400 text-sm mt-1">{errors.questionText}</p>}
        </div>

        {type === 'mcq' && (
          <div>
            <label className="block text-sm font-medium mb-2">Options</label>
            {options.map((opt, index) => (
              <div key={index} className="flex items-center gap-2 mb-2">
                <input
                  type="radio"
                  name="correctAnswer"
                  checked={correctAnswer === opt && opt.trim() !== ''}
                  onChange={() => setCorrectAnswer(opt)}
                  title="Mark as correct answer"
                />
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    handleOptionChange(index, e.target.value);
                    if (correctAnswer === opt) setCorrectAnswer(e.target.value);
                  }}
                  className="flex-1 bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
                  placeholder={`Option ${index + 1}`}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOptionField(index)}
                    className="text-red-400 px-2"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            {options.length < 6 && (
              <button
                type="button"
                onClick={addOptionField}
                className="text-indigo-400 text-sm mt-1"
              >
                + Add option
              </button>
            )}
            <p className="text-xs text-gray-500 mt-1">Select the radio next to the correct option.</p>
            {errors.options && <p className="text-red-400 text-sm mt-1">{errors.options}</p>}
            {errors.correctAnswer && <p className="text-red-400 text-sm mt-1">{errors.correctAnswer}</p>}
          </div>
        )}

        {type === 'theory' && (
          <div>
            <label className="block text-sm font-medium mb-2">Theory Category</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="category"
                  value="theory"
                  checked={category === 'theory'}
                  onChange={() => setCategory('theory')}
                />
                Theory
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="category"
                  value="code_analysis"
                  checked={category === 'code_analysis'}
                  onChange={() => setCategory('code_analysis')}
                />
                Code Analysis
              </label>
            </div>
          </div>
        )}

        {type === 'coding' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">Default Language</label>
              <select
                value={codingLanguage}
                onChange={(e) => setCodingLanguage(e.target.value)}
                className="w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {LANGUAGE_LABELS[lang]}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Students can switch languages in the editor; this just sets what loads first.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Starter Code (optional)</label>
              <textarea
                value={starterCode}
                onChange={(e) => setStarterCode(e.target.value)}
                rows={5}
                spellCheck={false}
                className="w-full bg-gray-950 text-gray-100 font-mono text-sm rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
                placeholder="// pre-filled in the student's editor, e.g. a function signature"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Test Cases</label>
              <p className="text-xs text-gray-500 mb-2">
                Visible test cases are shown to students as examples. Hidden ones are only used for grading.
              </p>

              {testCases.map((tc, index) => (
                <div key={index} className="bg-gray-800 rounded-lg p-3 mb-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-400">Test Case {index + 1}</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-gray-400">
                        <input
                          type="checkbox"
                          checked={tc.hidden}
                          onChange={(e) => handleTestCaseChange(index, 'hidden', e.target.checked)}
                        />
                        Hidden
                      </label>
                      {testCases.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTestCase(index)}
                          className="text-red-400 text-sm"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  <label className="block text-xs text-gray-500 mb-1">Input (stdin)</label>
                  <textarea
                    value={tc.input}
                    onChange={(e) => handleTestCaseChange(index, 'input', e.target.value)}
                    rows={2}
                    spellCheck={false}
                    className="w-full bg-gray-900 text-gray-100 font-mono text-xs rounded-lg px-3 py-2 mb-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder="(leave blank if no input)"
                  />

                  <label className="block text-xs text-gray-500 mb-1">Expected Output</label>
                  <textarea
                    value={tc.expectedOutput}
                    onChange={(e) => handleTestCaseChange(index, 'expectedOutput', e.target.value)}
                    rows={2}
                    spellCheck={false}
                    className="w-full bg-gray-900 text-gray-100 font-mono text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder="Expected stdout, trimmed and compared exactly"
                  />
                </div>
              ))}

              {testCases.length < 10 && (
                <button
                  type="button"
                  onClick={addTestCase}
                  className="text-indigo-400 text-sm"
                >
                  + Add test case
                </button>
              )}
              {errors.testCases && <p className="text-red-400 text-sm mt-1">{errors.testCases}</p>}
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium mb-2">Marks</label>
          <input
            type="number"
            min="1"
            value={marks}
            onChange={(e) => setMarks(e.target.value)}
            className={`w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 ${errors.marks ? 'border-2 border-red-500' : ''}`}
          />
          {errors.marks && <p className="text-red-400 text-sm mt-1">{errors.marks}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Question'}
        </button>
      </form>
    </div>
  );
};

export default AdminQuestionForm;