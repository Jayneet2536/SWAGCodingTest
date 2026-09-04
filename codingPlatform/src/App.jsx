import { BrowserRouter, Routes, Route } from "react-router-dom";

import StudentReg from "./components/StudentReg";
import StudentDashboard from "./components/StudentDashboard";
import TestPanel from "./components/Test";
import ResultPage from "./components/Result";
import AdminQuestionForm from "./components/AdminquestionForm";
import AdminCreateTest from "./components/CreateTest";
import AdminGradeTheory from "./components/AdminTheoryPage";
import AddStudent from "./components/AddStudent";
import AdminDashboard from "./components/AdminDashBoard";
import AdminResults from "./components/AdminResults";
import TestRules from "./components/TestRules";

import AdminProtectedRoute from "./components/AdminProtectedRoute";

function App() {
  return (
    <BrowserRouter basename="/SWAGCodingTest">

      <Routes>

        {/* ================= LOGIN ================= */}

        <Route
          path="/"
          element={<StudentReg />}
        />

        {/* ================= STUDENT FLOW ================= */}

        <Route
          path="/dashboard"
          element={<StudentDashboard />}
        />

        <Route
          path="/result/:testId"
          element={<ResultPage />}
        />

        <Route
          path="/test/:testId"
          element={<TestRules />}
        />

        <Route
          path="/test/:testId/panel"
          element={<TestPanel />}
        />

        {/* ================= PROTECTED ADMIN FLOW ================= */}

        <Route element={<AdminProtectedRoute />}>

          <Route
            path="/admin"
            element={<AdminDashboard />}
          />

          <Route
            path="/admin/add-student"
            element={<AddStudent />}
          />

          <Route
            path="/admin/questions"
            element={<AdminQuestionForm />}
          />

          <Route
            path="/admin/create-test"
            element={<AdminCreateTest />}
          />

          <Route
            path="/admin/grade-theory"
            element={<AdminGradeTheory />}
          />

          <Route
            path="/admin/results"
            element={<AdminResults />}
          />

        </Route>

      </Routes>

    </BrowserRouter>
  );
}

export default App;