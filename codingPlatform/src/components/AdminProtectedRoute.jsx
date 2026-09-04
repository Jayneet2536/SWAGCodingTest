import { Navigate, Outlet } from "react-router-dom";

const ADMIN_REG = [
  "2025BCS063",
];

function AdminProtectedRoute() {
  const regNo = sessionStorage.getItem("regNo");

  // Not logged in
  if (!regNo) {
    return <Navigate to="/" replace />;
  }

  // Logged in but not an admin
  if (!ADMIN_REG.includes(regNo.toUpperCase())) {
    return <Navigate to="/dashboard" replace />;
  }

  // Admin
  return <Outlet />;
}

export default AdminProtectedRoute;