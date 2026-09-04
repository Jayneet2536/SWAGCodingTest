import { useState } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase'; // adjust path

const COMMITTEE_OPTIONS = [
  'Web',
  'App',
  'Game',
  'Graphics',
];

const normalizeRegNo = (regNo) => regNo.trim().toUpperCase();

const AdminRegistrationForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    registrationNumber: '',
    email: '',
    phone: '',
    committee: [],
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

    if (formData.committee.length === 0) {
      newErrors.committee = 'Select at least one committee';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCommitteeToggle = (option) => {
    setFormData((prev) => ({
      ...prev,
      committee: prev.committee.includes(option)
        ? prev.committee.filter((c) => c !== option)
        : [...prev.committee, option],
    }));
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
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        committee: formData.committee,
        registeredAt: new Date().toISOString(),
      });

      setSuccessMsg(`${regNo} registered successfully.`);
      setFormData({ name: '', registrationNumber: '', email: '', phone: '', committee: [] });
    } catch (error) {
      console.error('Error registering user:', error);
      setErrors({ general: 'Something went wrong. Please try again.' });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: '0 auto' }}>
      <h2>Admin: Register Student</h2>

      <div>
        <label>Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        {errors.name && <p style={{ color: 'red' }}>{errors.name}</p>}
      </div>

      <div>
        <label>Registration Number</label>
        <input
          type="text"
          placeholder="2025BCS061"
          value={formData.registrationNumber}
          onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
        />
        {errors.registrationNumber && <p style={{ color: 'red' }}>{errors.registrationNumber}</p>}
      </div>

      <div>
        <label>Email</label>
        <input
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        {errors.email && <p style={{ color: 'red' }}>{errors.email}</p>}
      </div>

      <div>
        <label>Phone</label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        />
        {errors.phone && <p style={{ color: 'red' }}>{errors.phone}</p>}
      </div>

      <div>
        <label>Committee</label>
        {COMMITTEE_OPTIONS.map((option) => (
          <label key={option} style={{ display: 'block' }}>
            <input
              type="checkbox"
              checked={formData.committee.includes(option)}
              onChange={() => handleCommitteeToggle(option)}
            />
            {option}
          </label>
        ))}
        {errors.committee && <p style={{ color: 'red' }}>{errors.committee}</p>}
      </div>

      {errors.general && <p style={{ color: 'red' }}>{errors.general}</p>}
      {successMsg && <p style={{ color: 'green' }}>{successMsg}</p>}

      <button type="submit" disabled={loading}>
        {loading ? 'Registering...' : 'Register Student'}
      </button>
    </form>
  );
};

export default AdminRegistrationForm;