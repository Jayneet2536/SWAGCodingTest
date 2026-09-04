import { Navigate, Outlet } from "react-router-dom";

function AdminProtectedRoute() {
  const regNo = sessionStorage.getItem("regNo");
  const isAdmin = sessionStorage.getItem("isAdmin") === "true";

  // Not logged in
  if (!regNo) {
    return <Navigate to="/" replace />;
  }

  // StudentReg sets this flag only after recognizing a configured admin
  // registration number. Using it here prevents two different admin lists
  // from redirecting the user immediately after a successful admin login.
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Admin
  return <Outlet />;
}

export default AdminProtectedRoute;
