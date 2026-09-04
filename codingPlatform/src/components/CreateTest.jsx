import { useState } from 'react';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase'; // adjust path to your firebase config

const AdminCreateTest = () => {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState(''); // datetime-local string
  const [endTime, setEndTime] = useState('');
  const [duration, setDuration] = useState(''); // minutes
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const validate = () => {
    const newErrors = {};

    if (!title.trim()) newErrors.title = 'Title is required';

    if (!startTime) {
      newErrors.startTime = 'Start time is required';
    }
    if (!endTime) {
      newErrors.endTime = 'End time is required';
    }
    if (startTime && endTime && new Date(startTime) >= new Date(endTime)) {
      newErrors.endTime = 'End time must be after start time';
    }
    if (!duration || duration <= 0) {
      newErrors.duration = 'Duration must be greater than 0 minutes';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const resetForm = () => {
    setTitle('');
    setStartTime('');
    setEndTime('');
    setDuration('');
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    if (!validate()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'tests'), {
        title: title.trim(),
        startTime: Timestamp.fromDate(new Date(startTime)),
        endTime: Timestamp.fromDate(new Date(endTime)),
        durationMinutes: Number(duration),
        createdAt: serverTimestamp(),
      });

      setSuccessMsg('Test created successfully.');
      resetForm();
    } catch (error) {
      console.error('Error creating test:', error);
      setErrors({ general: 'Something went wrong. Please try again.' });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-white p-4">
      <form onSubmit={handleSubmit} className="max-w-xl mx-auto space-y-5">
        <h2 className="text-2xl font-bold mb-4">Create Test</h2>

        {errors.general && <p className="text-red-400 text-sm">{errors.general}</p>}
        {successMsg && <p className="text-green-400 text-sm">{successMsg}</p>}

        <div>
          <label className="block text-sm font-medium mb-2">Test Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={`w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 ${errors.title ? 'border-2 border-red-500' : ''}`}
            placeholder="e.g. DSA Club Entrance Test"
          />
          {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Start Time</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className={`w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 ${errors.startTime ? 'border-2 border-red-500' : ''}`}
          />
          {errors.startTime && <p className="text-red-400 text-sm mt-1">{errors.startTime}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">End Time</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className={`w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 ${errors.endTime ? 'border-2 border-red-500' : ''}`}
          />
          {errors.endTime && <p className="text-red-400 text-sm mt-1">{errors.endTime}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
          <input
            type="number"
            min="1"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            className={`w-full bg-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gray-400 ${errors.duration ? 'border-2 border-red-500' : ''}`}
            placeholder="e.g. 60"
          />
          {errors.duration && <p className="text-red-400 text-sm mt-1">{errors.duration}</p>}
          <p className="text-xs text-gray-500 mt-1">
            Note: individual timer currently uses the test's End Time, not this duration. Flagging in case you want per-student duration instead of a fixed window — let me know if so.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Test'}
        </button>
      </form>
    </div>
  );
};

export default AdminCreateTest;