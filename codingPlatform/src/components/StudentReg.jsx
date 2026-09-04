import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase'; // adjust path to your firebase config
import { useNavigate } from 'react-router-dom'; // adjust if using different routing
import SplitText from '../../reactBits/SplitText/SplitText'; // adjust paths to match your project
import ShinyText from '../../reactBits/ShinyText/ShinyText'; // adjust paths to match your project

const normalizeRegNo = (regNo) => regNo.trim().toUpperCase();

const StudentReg = ({ onSubmit }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    registrationNumber: '',
    phone: '',
    preferredCommittee: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [titleAnimated, setTitleAnimated] = useState(false);

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

    if (!formData.registrationNumber.trim()) {
      newErrors.registrationNumber = 'Registration number is required';
    } else if (!/^\d{4}[A-Z]{3}\d{3}$/.test(normalizeRegNo(formData.registrationNumber))) {
      newErrors.registrationNumber = 'Format should be like 2025BCS061';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ''))) {
      newErrors.phone = 'Phone number must be 10 digits';
    }

    if (!formData.preferredCommittee) {
      newErrors.preferredCommittee = 'Select a preferred committee';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

const checkUserRegistration = async (registrationNumber) => {
  try {
    const regNo = normalizeRegNo(registrationNumber);
    console.log('Looking up doc ID:', JSON.stringify(regNo)); // add this
    const userRef = doc(db, 'registeredUsers', regNo);
    const userSnap = await getDoc(userRef);
    console.log('Exists?', userSnap.exists()); // add this
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
      // Check if registration number is on the whitelist
      const isRegistered = await checkUserRegistration(formData.registrationNumber);

      if (!isRegistered) {
        setErrors({ registrationNumber: 'Registration number not found. Contact admin for access.' });
        setLoading(false);
        return;
      }

      // Registration number is whitelisted — build the full student object
      // and hand off to the dashboard, since everything downstream
      // (TestPanel, ResultPage) reads this from location.state.
      const student = {
        name: formData.name,
        registrationNumber: normalizeRegNo(formData.registrationNumber),
        phone: formData.phone,
        preferredCommittee: formData.preferredCommittee,
      };

      if (onSubmit) onSubmit(student); // optional callback, kept for backward compat
      navigate('/dashboard', { state: { student } });

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
            <label className="block text-sm font-medium mb-2">Registration Number</label>
            <input
              type="text"
              name="registrationNumber"
              value={formData.registrationNumber}
              onChange={handleChange}
              className={`w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 ${errors.registrationNumber ? 'border-2 border-red-500' : ''}`}
              placeholder="e.g. 2025BCS061"
            />
            {errors.registrationNumber && <p className="text-red-400 text-sm mt-1">{errors.registrationNumber}</p>}
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

          <div>
            <label className="block text-sm font-medium mb-2">Preferred Committee</label>
            <div className="flex gap-4">
              {['web', 'app', 'graphics'].map((option) => (
                <label key={option} className="flex items-center gap-2 capitalize">
                  <input
                    type="radio"
                    name="preferredCommittee"
                    value={option}
                    checked={formData.preferredCommittee === option}
                    onChange={handleChange}
                  />
                  {option}
                </label>
              ))}
            </div>
            {errors.preferredCommittee && <p className="text-red-400 text-sm mt-1">{errors.preferredCommittee}</p>}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full mt-3 bg-gray-600 hover:bg-gray-700 py-3 rounded-lg font-medium outline-2 outline-gray-400 transition-colors disabled:opacity-50"
          >
            {loading ? 'Checking Registration...' : 'Start Test'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentReg;