import React, { useState, useEffect, useRef, useCallback } from 'react';
import SplitText from '../reactBits/SplitText/SplitText.jsx';
import ShinyText from '../reactBits/ShinyText/ShinyText.jsx';
import TextPressure from '../reactBits/TextPressure/TextPressure.jsx';
import { db } from '../firebase.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
// Test Questions Data
const questions = [
  {
    id: 1,
    title: "Number Pattern",
    text: "Write a function that takes an integer n and prints a number pattern where each row i (1-indexed) contains numbers from 1 to i.",
    example: "Input: 4\nOutput:\n1\n12\n123\n1234",
    constraints: "Number of rows: 1 ≤ n ≤ 50",
    starter: {
      javascript: "function numberPattern(n) {\n    // Write your code here\n    \n}",
      python: "def number_pattern(n):\n    # Write your code here\n    pass",
      java: "public class Solution {\n    public static void numberPattern(int n) {\n        // Write your code here\n    }\n}",
      cpp: "#include <iostream>\nusing namespace std;\n\nvoid numberPattern(int n) {\n    // Write your code here\n}",
      c: "#include <stdio.h>\n\nvoid numberPattern(int n) {\n    // Write your code here\n}"
    },
    testCases: [
      { input: 3, expected: "1\n12\n123" },
      { input: 1, expected: "1" },
      { input: 5, expected: "1\n12\n123\n1234\n12345" }
    ]
  },
  {
    id: 2,
    title: "Factorial",
    text: "Write a function that takes an integer n and returns the factorial of n. The factorial of n (denoted as n!) is the product of all positive integers less than or equal to n.",
    example: "Input: 5\nOutput: 120 (5! = 5 × 4 × 3 × 2 × 1 = 120)",
    constraints: "Number: 0 ≤ n ≤ 20",
    starter: {
      javascript: "function factorial(n) {\n    // Write your code here\n    \n}",
      python: "def factorial(n):\n    # Write your code here\n    pass",
      java: "public class Solution {\n    public static long factorial(int n) {\n        // Write your code here\n        return 0;\n    }\n}",
      cpp: "#include <iostream>\nusing namespace std;\n\nlong long factorial(int n) {\n    // Write your code here\n    return 0;\n}",
      c: "#include <stdio.h>\n\nlong long factorial(int n) {\n    // Write your code here\n    return 0;\n}"
    },
    testCases: [
      { input: 0, expected: 1 },
      { input: 1, expected: 1 },
      { input: 5, expected: 120 },
      { input: 7, expected: 5040 }
    ]
  },
  {
    id: 3,
    title: "Check Palindrome",
    text: "Write a function that takes a string as input and returns true if the string is a palindrome (reads the same forwards and backwards), false otherwise. Ignore case sensitivity.",
    example: "Input: 'racecar'\nOutput: true",
    constraints: "String length: 1 ≤ n ≤ 1000\nString contains only alphabetic characters",
    starter: {
      javascript: "function isPalindrome(str) {\n    // Write your code here\n    \n}",
      python: "def is_palindrome(s):\n    # Write your code here\n    pass",
      java: "public class Solution {\n    public static boolean isPalindrome(String str) {\n        // Write your code here\n        return false;\n    }\n}",
      cpp: "#include <string>\n#include <algorithm>\nusing namespace std;\n\nbool isPalindrome(string str) {\n    // Write your code here\n    return false;\n}",
      c: "#include <stdio.h>\n#include <string.h>\n#include <ctype.h>\n\nint isPalindrome(char* str) {\n    // Write your code here (return 1 for true, 0 for false)\n    return 0;\n}"
    },
    testCases: [
      { input: "racecar", expected: true },
      { input: "hello", expected: false },
      { input: "A", expected: true },
      { input: "Madam", expected: true }
    ]
  }
];

// Simple Code Editor Component
const CodeEditor = ({ value, language, onChange }) => {
  const textareaRef = useRef(null);

  const handleChange = (e) => {
    onChange(e.target.value);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = value.substring(0, start) + '    ' + value.substring(end);
      onChange(newValue);

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  };

  return (
    <div className="h-full border border-zinc-600 rounded-lg overflow-hidden bg-gray-900">
      <div className="bg-zinc-700 px-4 py-2 text-sm text-gray-400 border-b border-gray-600">
        {language}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="w-full h-full p-4 bg-zinc-900 text-white font-mono text-sm resize-none focus:outline-none"
        style={{ minHeight: '400px' }}
        spellCheck={false}
      />
    </div>
  );
};

// Updated RegistrationForm Component (User inputs all fields, Firebase checks email)
const RegistrationForm = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    registrationNumber: '',
    email: '',
    phone: '',
    committee: [],
  });
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowForm(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone number must be 10 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const checkUserRegistration = async (email) => {
    try {
      const userRef = doc(db, 'registeredUsers', email);
      const userSnap = await getDoc(userRef);
      return userSnap.exists();
    } catch (error) {
      console.error('Error checking user registration:', error);
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Check if email is registered in our system
      const isRegistered = await checkUserRegistration(formData.email);
      
      if (!isRegistered) {
        setErrors({ email: 'Email not registered. Contact admin for access.' });
        setLoading(false);
        return;
      }

      // Email is registered, use the form data provided by user
      onSubmit({
        name: formData.name,
        email: formData.email,
        phone: formData.phone
      });
      
    } catch (error) {
      console.error('Error:', error);
      setErrors({ general: 'Something went wrong. Please try again.' });
    }
    setLoading(false);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });

    if (errors[e.target.name]) {
      setErrors({
        ...errors,
        [e.target.name]: ''
      });
    }
  };

  const [titleAnimated, setTitleAnimated] = useState(false);

  return (
    <div className="min-h-screen flex justify-center p-4 bg-neutral-900 text-white">
      <div className="flex flex-col items-center w-full max-w-md">
        <h1 className="text-8xl md:text-8xl font-extrabold text-indigo-100 mt-14 mb-2">
          <SplitText
            text="SWAG"
            delay={titleAnimated ? 0 : 130}
            duration={0.6}
            ease="elastic.out(1, 0.3)"
            splitType="chars"
            from={{ opacity: 0, y: 40 }}
            to={{ opacity: 1, y: 0 }}
            textAlign="center"
            threshold={titleAnimated ? 0.9 : 0.1}
            onLetterAnimationComplete={() => setTitleAnimated(true)}
          />
        </h1>
        <div className={`w-full space-y-6 transition-opacity duration-700 ${showForm ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <img src='./swag.png' alt="SWAG Logo" className="absolute h-1/9 top-2 right-4 mb-6" />
          <img src='./gdg.png' alt="GDG Logo" className="absolute w-1/8 top-2 left-2 mb-6" />
          <p className="text-gray-400 text-lg font-bold text-center mb-8">
            <ShinyText text="Code Compete Conquer" disabled={false} speed={2} className='animate-shine' />
          </p>

          {errors.general && <p className="text-red-400 text-sm text-center">{errors.general}</p>}

          <div>
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={`w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 ${errors.name ? 'border-2 border-red-500' : ''}`}
              placeholder="Enter your full name"
            />
            {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">College Email ID</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 ${errors.email ? 'border-2 border-red-500' : ''}`}
              placeholder="Enter your college email"
            />
            {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 ${errors.phone ? 'border-2 border-red-500' : ''}`}
              placeholder="Enter your phone number"
            />
            {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone}</p>}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full mt-3 bg-gray-600 hover:bg-gray-700 py-3 rounded-lg font-medium outline-2 outline-gray-400 transition-colors disabled:opacity-50"
          >
            {loading ? 'Checking Email...' : 'Start Test'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Warning Modal Component
const WarningModal = ({ isOpen, warningCount, onContinue }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <div className="bg-zinc-800 rounded-lg p-8 max-w-md text-center">
        <div className="text-red-400 text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold mb-4 text-red-400">Last Warning!</h2>
        <p className="text-gray-300 mb-6">
          You attempted to leave the test window. This action has been recorded.
        </p>
        <p className="text-sm text-gray-400 mb-6">
          The test will be automatically submitted this time.
        </p>
        <button
          onClick={onContinue}
          className="bg-gray-500 hover:bg-gray-600 px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Continue Test
        </button>
      </div>
    </div>
  );
};

// Results Screen Component
const ResultsScreen = ({ timeTaken, submissionId, answers }) => {
  const minutes = Math.floor(timeTaken / 60000);
  const seconds = Math.floor((timeTaken % 60000) / 1000);
  const completedQuestions = Object.keys(answers).length;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-900 text-white">
      <div style={{ position: 'absolute',zIndex: '', width: '100%' }}>
        <TextPressure
          text="SWAG"
          flex={true}
          alpha={false}
          stroke={false}
          width={true}
          weight={false}
          italic={false}
          textColor="#ffffff"
          strokeColor="#ff0000"
          minFontSize={36}
        />
      </div>
      <div className="bg-zinc-700 rounded-lg p-8 max-w-md text-center z-10 opacity-90">
        <div className="text-green-400 text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold mb-4 text-green-500">Test Completed!</h2>
        <p className="text-white mb-6">Your test has been successfully submitted.</p>
        <div className="text-sm text-black font-bold space-y-2">
          <p>Time taken: <span className="text-white">{minutes}m {seconds}s</span></p>
          <p>Questions attempted: <span className="text-white">{completedQuestions} of {questions.length}</span></p>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-600">
          <p className="text-xs text-gray-500">
            Your results will be reviewed and you will be contacted soon.
          </p>
        </div>
      </div>
    </div>
  );
};

// Test Interface Component
const TestInterface = ({ studentData, onSubmit }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(60 * 60); // 60 minutes
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const [showOutput, setShowOutput] = useState(false);
  const [output, setOutput] = useState('');
  const [warningCount, setWarningCount] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);

  const timerRef = useRef(null);
  const testStartTime = useRef(Date.now());

  // Timer effect
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      // If not in fullscreen and test is not completed, show warning
      if (
        !document.fullscreenElement &&
        !testCompleted
      ) {
        handleWarning();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [testCompleted]);

  // Anti-cheating measures
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (testCompleted) return;

      if (e.keyCode === 123 || // F12
        (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
        (e.ctrlKey && e.shiftKey && e.keyCode === 67) || // Ctrl+Shift+C
        (e.ctrlKey && e.keyCode === 85)) { // Ctrl+U
        e.preventDefault();
        handleWarning();
      }
    };

    const handleContextMenu = (e) => {
      if (!testCompleted) {
        e.preventDefault();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && !testCompleted) {
        handleWarning();
      }
    };

    const handleBlur = () => {
      if (!testCompleted) {
        handleWarning();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [testCompleted]);

  const handleWarning = () => {
    setWarningCount(prevCount => {
      const newWarningCount = prevCount + 1;
      setShowWarning(true);
      if (newWarningCount >= 3) {
        handleSubmit();
      }
      return newWarningCount;
    });
  };

  const handleContinue = () => {
    setShowWarning(false);
  };

  const currentQuestion = questions[currentQuestionIndex];

  const handleCodeChange = (code) => {
    if (testCompleted) return;

    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: {
        code,
        language: selectedLanguage,
        timestamp: new Date().toISOString()
      }
    }));
  };

  const handleLanguageChange = (newLanguage) => {
    if (testCompleted) return;

    setSelectedLanguage(newLanguage);
    setShowOutput(false);
  };

  const handleRunCode = () => {
    if (testCompleted) return;

    const code = answers[currentQuestion.id]?.code || '';

    if (!code.trim()) {
      setOutput('Error: Please write some code before running.');
      setShowOutput(true);
      return;
    }

    // Simulate code execution
    let result = `✅ Code executed successfully!\n\n`;
    result += `Language: ${selectedLanguage}\n`;
    result += `Code length: ${code.length} characters\n\n`;

    // Simple test case simulation
    const testCase = currentQuestion.testCases?.[0];
    if (testCase) {
      result += `Test case: ${JSON.stringify(testCase.input)} → Expected: ${JSON.stringify(testCase.expected)}\n`;
      result += `Note: Full test evaluation will be done after submission.\n\n`;
    }

    result += `Note: This is a simulation. Your code will be properly evaluated after submission.`;

    setOutput(result);
    setShowOutput(true);
  };

  const handlePrevious = () => {
    if (testCompleted || currentQuestionIndex === 0) return;
    setCurrentQuestionIndex(prev => prev - 1);
    setShowOutput(false);
  };

  const handleNext = () => {
    if (testCompleted || currentQuestionIndex === questions.length - 1) return;
    setCurrentQuestionIndex(prev => prev + 1);
    setShowOutput(false);
  };

  const handleSubmit = useCallback(async () => {
  if (testCompleted) return;

  setTestCompleted(true);
  if (timerRef.current) {
    clearInterval(timerRef.current);
  }

  const testEndTime = Date.now();
  const timeTaken = testEndTime - testStartTime.current;
  const submissionId = 'SUB_' + Date.now().toString(36).toUpperCase();

  const submissionData = {
    // This will now contain user-provided name, email, phone
    name: studentData.name,        // From user input
    email: studentData.email,      // From user input  
    phone: studentData.phone,      // From user input
    answers,
    timeTaken,
    timeLeft,
    warningCount,
    submittedAt: serverTimestamp(),
    totalQuestions: questions.length,
    submissionId,
    completedQuestions: Object.keys(answers).length
  };

  try {
    // Save to Firestore
    await setDoc(doc(db, 'testSubmissions', submissionId), submissionData);
    
    await setDoc(doc(db, 'userSubmissions', studentData.email), {
      ...submissionData,
      lastSubmission: serverTimestamp()
    });

    console.log('Test submitted successfully');
    onSubmit(submissionData, timeTaken, submissionId);
  } catch (error) {
    console.error('Error saving to Firestore:', error);
    onSubmit(submissionData, timeTaken, submissionId);
  }
}, [studentData, answers, timeLeft, warningCount, testCompleted, onSubmit]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentCode = () => {
    const savedAnswer = answers[currentQuestion.id];
    if (savedAnswer && savedAnswer.language === selectedLanguage) {
      return savedAnswer.code;
    }
    return currentQuestion.starter[selectedLanguage] || '';
  };

  const getQuestionStatus = (questionId) => {
    return answers[questionId] ? 'attempted' : 'unattempted';
  };

  return (
    <div className="bg-neutral-900 text-white h-screen overflow-auto">
      {/* Header */}
      <header className="bg-zinc-800 p-3 shadow-lg">
        <div className="max-w-7xl mx-auto flex flex-row justify-between items-center">
          <div className="flex flex-col space-x-4">
            <h1 className="text-2xl font-bold text-gray-300">SWAG Coding Test</h1>
            <div className="text-sm text-gray-400 pl-0.5">
              Welcome, {studentData.name.split(' ')[0]}!<br />
            </div>
          </div>
          {/* Question Navigation */}
          <div className="flex mr-12 space-x-2">
            {questions.map((q, index) => (
              <button
                key={q.id}
                onClick={() => {
                  setCurrentQuestionIndex(index);
                  setShowOutput(false);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${index === currentQuestionIndex
                  ? 'bg-slate-700 text-white'
                  : getQuestionStatus(q.id) === 'attempted'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
              >
                {index + 1}
              </button>
            ))}
          </div>
          <div className="flex items-center space-x-6">
            <div className={`font-mono text-lg font-bold ${timeLeft <= 300 ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
              {formatTime(timeLeft)}
            </div>
            <div className="text-gray-400">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
          </div>
        </div>
      </header>
      {/* Question */}
      <main className="max-w-7xl mx-auto p-3 h-[calc(100vh-80px)]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
          {/* Left Side: Question + Output */}
          <div className="grid grid-rows-2 gap-4 h-full">
            {/* Question Panel */}
            <div className="bg-zinc-800 flex flex-col items-start rounded-lg p-4 overflow-auto">
              <h2 className="text-xl font-semibold mb-3 text-gray-300">
                Question {currentQuestionIndex + 1}: {currentQuestion.title}
              </h2>
              <div className="bg-zinc-700 rounded-lg p-4 mb-6">
                <p className="text-gray-300 leading-relaxed">
                  {currentQuestion.text}
                </p>
              </div>
              <h3 className="text-lg font-medium mb-3 text-green-400">Example:</h3>
              <div className="bg-zinc-700 rounded-lg p-4 font-mono text-sm">
                <pre className="text-gray-300 whitespace-pre-wrap">
                  {currentQuestion.example}
                </pre>
              </div>
            </div>
            {/* Output Section */}
            <div className="bg-zinc-800 rounded-lg p-4 flex flex-col items-start">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Output:</h4>
              <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                {showOutput ? output : "Run your code to see output here."}
              </pre>
            </div>
          </div>
          {/* Right Side: Code Editor */}
          <div className="bg-zinc-800 rounded-lg p-6 flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-300">Code Editor</h3>
              <div className="flex items-center space-x-4">
                <select
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value)}
                  className="bg-zinc-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-zinc-500"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="c">C</option>
                </select>
                <button
                  onClick={handleRunCode}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Run Code
                </button>
              </div>
            </div>
            <div className="flex-1 mb-4">
              <CodeEditor
                value={getCurrentCode()}
                language={selectedLanguage}
                onChange={handleCodeChange}
              />
            </div>
            <div className="flex justify-between">
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {currentQuestionIndex === questions.length - 1 ? (
                <button
                  onClick={handleSubmit}
                  className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Submit Test
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="bg-gray-500 hover:bg-gray-600 px-6 py-2 rounded-lg font-medium transition-colors"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Warning Modal */}
      <WarningModal
        isOpen={showWarning}
        warningCount={warningCount}
        onContinue={handleContinue}
      />
    </div>
  );
};

// Main App Component
const CodingTestPlatform = () => {
  const [currentScreen, setCurrentScreen] = useState('registration');
  const [studentData, setStudentData] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);

  const handleRegistration = (formData) => {
    setStudentData({
      ...formData,
      timestamp: new Date().toISOString()
    });
    setCurrentScreen('test');
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen();
    } else if (document.documentElement.mozRequestFullScreen) { // Firefox
      document.documentElement.mozRequestFullScreen();
    } else if (document.documentElement.webkitRequestFullscreen) { // Chrome, Safari, Opera
      document.documentElement.webkitRequestFullscreen();
    } else if (document.documentElement.msRequestFullscreen) { // IE/Edge
      document.documentElement.msRequestFullscreen();
    }
  };

  const handleTestSubmission = async (submissionData, timeTaken) => {
    const submissionId = 'SUB_' + Date.now().toString(36).toUpperCase();

    // Show results immediately
    setSubmissionResult({
      timeTaken,
      submissionId,
      answers: submissionData.answers
    });
    setCurrentScreen('results');

    // Log submission data (in production, save to database)
    console.log('Test submission:', {
      ...submissionData,
      submissionId
    });
  };

  // Prevent page refresh during test
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (currentScreen === 'test') {
        e.preventDefault();
        e.returnValue = 'Are you sure you want to leave? Your test progress will be lost.';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentScreen]);

  return (
    <div className="min-h-screen bg-gray-900">
      {currentScreen === 'registration' && (
        <RegistrationForm onSubmit={handleRegistration} />
      )}

      {currentScreen === 'test' && (
        <TestInterface
          studentData={studentData}
          onSubmit={handleTestSubmission}
        />
      )}

      {currentScreen === 'results' && (
        <ResultsScreen
          timeTaken={submissionResult.timeTaken}
          submissionId={submissionResult.submissionId}
          answers={submissionResult.answers}
        />
      )}
    </div>
  );
};

export default CodingTestPlatform;