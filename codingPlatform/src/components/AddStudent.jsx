import { useState } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase'; // adjust path to your firebase config
import AdminLayout from './AdminLayout';

const COMMITTEE_OPTIONS = ['web', 'app', 'graphics'];

const normalizeRegNo = (regNo) => regNo.trim().toUpperCase();

const AddStudent = () => {
  const [formData, setFormData] = useState({
    name: '',
    registrationNumber: '',
    phone: '',
    committee: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) newErrors.name = 'Name is required';

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

    if (!formData.committee) {
      newErrors.committee = 'Select a committee';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    if (!validateForm()) return;

    setLoading(true);
    const regNo = normalizeRegNo(formData.registrationNumber);

    try {
      const userRef = doc(db, 'registeredUsers', regNo);
      const existingSnap = await getDoc(userRef);

      if (existingSnap.exists()) {
        const confirmOverwrite = window.confirm(
          `${regNo} is already registered. Overwrite existing record?`
        );
        if (!confirmOverwrite) {
          setLoading(false);
          return;
        }
      }

      await setDoc(userRef, {
        name: formData.name.trim(),
        registrationNumber: regNo,
        phone: formData.phone.trim(),
        committee: formData.committee,
        registeredAt: new Date().toISOString(),
      });

      setSuccessMsg(`${regNo} added successfully.`);
      setFormData({ name: '', registrationNumber: '', phone: '', committee: '' });
    } catch (error) {
      console.error('Error adding student:', error);
      setErrors({ general: 'Something went wrong. Please try again.' });
    }
    setLoading(false);
  };

  return (
    <AdminLayout title="Add a student" description="Grant a student access to the assessment portal.">
      <form onSubmit={handleSubmit} className="admin-form max-w-md mx-auto space-y-5">

        {errors.general && <p className="text-red-400 text-sm">{errors.general}</p>}
        {successMsg && <p className="text-green-400 text-sm">{successMsg}</p>}

        <div>
          <label className="block text-sm font-medium mb-2">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 ${errors.name ? 'border-2 border-red-500' : ''}`}
            placeholder="Enter student name"
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
            placeholder="Enter phone number"
          />
          {errors.phone && <p className="text-red-400 text-sm mt-1">{errors.phone}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Committee</label>
          <div className="flex gap-4">
            {COMMITTEE_OPTIONS.map((option) => (
              <label key={option} className="flex items-center gap-2 capitalize">
                <input
                  type="radio"
                  name="committee"
                  value={option}
                  checked={formData.committee === option}
                  onChange={handleChange}
                />
                {option}
              </label>
            ))}
          </div>
          {errors.committee && <p className="text-red-400 text-sm mt-1">{errors.committee}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Student'}
        </button>
      </form>
    </AdminLayout>
  );
};

export default AddStudent;
