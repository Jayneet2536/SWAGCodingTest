import { BrowserRouter, Routes, Route } from 'react-router-dom';
import StudentReg from './components/StudentReg';
import StudentDashboard from './components/StudentDashboard';
import TestPanel from './components/Test';
import ResultPage from './components/Result';
import AdminQuestionForm from './components/AdminquestionForm';
import AdminCreateTest from './components/CreateTest';
import AdminGradeTheory from './components/AdminTheoryPage';
import AddStudent from './components/AddStudent';
import AdminDashboard from './components/AdminDashBoard';
// adjust the above import paths to match your actual folder structure
import AdminResults from './components/AdminResults';
import TestRules from './components/TestRules';

function App() {
  return (
    <BrowserRouter basename="/SWAGCodingTest">
      <Routes>
        {/* Student flow */}
        <Route path="/" element={<StudentReg />} />
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/result/:testId" element={<ResultPage />} />
        <Route path="/test/:testId" element={<TestRules />} />
        <Route path="/test/:testId/panel" element={<TestPanel />} />

        {/* Admin flow */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/add-student" element={<AddStudent />} />
        <Route path="/admin/questions" element={<AdminQuestionForm />} />
        <Route path="/admin/create-test" element={<AdminCreateTest />} />
        <Route path="/admin/grade-theory" element={<AdminGradeTheory />} />
        <Route path="/admin/results" element={<AdminResults />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;