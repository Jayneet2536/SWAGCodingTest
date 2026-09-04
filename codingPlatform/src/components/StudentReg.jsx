import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import SplitText from '../../reactBits/SplitText/SplitText';
import ShinyText from '../../reactBits/ShinyText/ShinyText';

// Admin registration numbers
const ADMIN_REG = [
  "2025BCS063",
];

const normalizeRegNo = (regNo) => regNo.trim().toUpperCase();

const StudentReg = () => {
  const navigate = useNavigate();

  const [registrationNumber, setRegistrationNumber] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [titleAnimated, setTitleAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowForm(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Fetch the student's registered profile from Firestore.
  // Returns the full document data (including registrationNumber) or null if not found.
  const fetchStudentRecord = async (regNo) => {
    try {
      const userRef = doc(db, 'registeredUsers', regNo);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) return null;

      // Merge in the doc id as registrationNumber in case it isn't stored as a field.
      return { registrationNumber: regNo, ...userSnap.data() };
    } catch (error) {
      console.error('Error checking registration:', error);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const regNo = normalizeRegNo(registrationNumber);

    // Basic validation
    if (!regNo) {
      setError('Registration number is required');
      return;
    }

    // Validate registration number format
    if (!/^\d{4}[A-Z]{3}\d{3}$/.test(regNo)) {
      setError('Format should be like 2025BCS061');
      return;
    }

    setLoading(true);
    setError('');

    try {

      // ==========================================
      // ADMIN CHECK
      // ==========================================

      if (ADMIN_REG.includes(regNo)) {

        console.log('Admin login:', regNo);

        sessionStorage.setItem('regNo', regNo);
        sessionStorage.setItem('isAdmin', 'true');

        navigate('/admin');

        return;
      }

      // ==========================================
      // STUDENT CHECK
      // ==========================================

      const student = await fetchStudentRecord(regNo);

      if (!student) {
        setError(
          'Registration number not found. Contact admin for access.'
        );

        return;
      }

      // Save full student profile (name, email, phone, preferredCommittee, etc.)
      // so the dashboard can read it back after a refresh, not just the reg number.
      sessionStorage.setItem('regNo', regNo);
      sessionStorage.setItem('isAdmin', 'false');
      sessionStorage.setItem('student', JSON.stringify(student));

      console.log('Student login:', regNo);

      // Go to student dashboard
      navigate('/dashboard', {
        state: { student }
      });

    } catch (error) {

      console.error('Login error:', error);

      setError(
        'Something went wrong. Please try again.'
      );

    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setRegistrationNumber(e.target.value);

    if (error) {
      setError('');
    }
  };

  return (
    <div className="min-h-screen flex justify-center p-4 bg-neutral-900 text-white">

      <div className="flex flex-col items-center w-full max-w-md">

        {/* SWAG TITLE */}
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
            onLetterAnimationComplete={() =>
              setTitleAnimated(true)
            }
          />

        </h1>

        {/* FORM */}
        <div
          className={`w-full space-y-6 transition-opacity duration-700 ${
            showForm
              ? 'opacity-100'
              : 'opacity-0 pointer-events-none'
          }`}
        >

          {/* LOGOS */}
          <img
            src="./swag.png"
            alt="SWAG Logo"
            className="absolute h-1/9 top-2 right-4 mb-6"
          />

          <img
            src="./gdg.png"
            alt="GDG Logo"
            className="absolute w-1/8 top-2 left-2 mb-6"
          />

          {/* TAGLINE */}
          <p className="text-gray-400 text-lg font-bold text-center mb-8">

            <ShinyText
              text="Code Compete Conquer"
              disabled={false}
              speed={2}
              className="animate-shine"
            />

          </p>

          {/* ERROR */}
          {error && (
            <p className="text-red-400 text-sm text-center">
              {error}
            </p>
          )}

          {/* REGISTRATION NUMBER */}
          <div>

            <label className="block text-sm font-medium mb-2">
              Registration Number
            </label>

            <input
              type="text"
              name="registrationNumber"
              value={registrationNumber}
              onChange={handleChange}
              className={`w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 ${
                error
                  ? 'border-2 border-red-500'
                  : ''
              }`}
              placeholder="e.g. 2025BCS061"
              autoComplete="off"
            />

          </div>

          {/* LOGIN BUTTON */}
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full mt-3 bg-gray-600 hover:bg-gray-700 py-3 rounded-lg font-medium outline-2 outline-gray-400 transition-colors disabled:opacity-50"
          >
            {loading
              ? 'Checking Registration...'
              : 'Login'}
          </button>

        </div>

      </div>

    </div>
  );
};

export default StudentReg;