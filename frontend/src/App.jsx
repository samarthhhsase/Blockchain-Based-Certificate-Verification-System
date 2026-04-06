import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRegister from "./pages/AdminRegister";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import IssuerDashboard from "./pages/IssuerDashboard";
import Login from "./pages/Login";
import ManageCertificates from "./pages/ManageCertificates";
import ManageIssuers from "./pages/ManageIssuers";
import ManageStudents from "./pages/ManageStudents";
import Register from "./pages/Register";
import RoleSelection from "./pages/RoleSelection";
import StudentDashboard from "./pages/StudentDashboard";
import VerifyCertificate from "./pages/VerifyCertificate";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RoleSelection />} />
        <Route path="/login" element={<Login />} />
        <Route path="/admin-register" element={<AdminRegister />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<VerifyCertificate />} />
        <Route path="/verify-certificate" element={<VerifyCertificate />} />
        <Route path="/verify/:id" element={<VerifyCertificate />} />
        <Route
          path="/issuer-dashboard"
          element={
            <ProtectedRoute role="issuer">
              <IssuerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/student-dashboard"
          element={
            <ProtectedRoute role="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute role="admin" redirectTo="/admin-login">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/issuers"
          element={
            <ProtectedRoute role="admin" redirectTo="/admin-login">
              <ManageIssuers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/students"
          element={
            <ProtectedRoute role="admin" redirectTo="/admin-login">
              <ManageStudents />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/certificates"
          element={
            <ProtectedRoute role="admin" redirectTo="/admin-login">
              <ManageCertificates />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
