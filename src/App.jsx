// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, PublicRoute } from "@/routes/ProtectedRoute";

// Auth
import LoginPage          from "@/pages/auth/LoginPage";
import RegisterPage       from "@/pages/auth/RegisterPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";

// Trainer
import TrainerLayout      from "@/pages/trainer/TrainerLayout";
import TrainerDashboard   from "@/pages/trainer/TrainerDashboard";
import StudentsPage       from "@/pages/trainer/StudentsPage";
import StudentDetailPage  from "@/pages/trainer/StudentDetailPage";
import WorkoutsPage       from "@/pages/trainer/WorkoutsPage";
import WorkoutBuilderPage from "@/pages/trainer/WorkoutBuilderPage";
import AssessmentsPage    from "@/pages/trainer/AssessmentsPage";
import PaymentsPage       from "@/pages/trainer/PaymentsPage";

// Student
import StudentLayout   from "@/pages/student/StudentLayout";
import StudentHome     from "@/pages/student/StudentHome";
import StudentProgress from "@/pages/student/StudentProgress";
import StudentMedals   from "@/pages/student/StudentMedals";
import StudentProfile  from "@/pages/student/StudentProfile";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { borderRadius: "12px", fontSize: "14px", fontFamily: "Inter, sans-serif" },
            success: { iconTheme: { primary: "#FF5722", secondary: "#fff" } },
          }}
        />
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Públicas */}
          <Route element={<PublicRoute />}>
            <Route path="/login"           element={<LoginPage />} />
            <Route path="/register"        element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          {/* Trainer */}
          <Route element={<ProtectedRoute role="trainer" />}>
            <Route path="/trainer" element={<TrainerLayout />}>
              <Route index               element={<TrainerDashboard />} />
              <Route path="students"     element={<StudentsPage />} />
              <Route path="students/:id" element={<StudentDetailPage />} />
              <Route path="workouts"     element={<WorkoutsPage />} />
              <Route path="workouts/new" element={<WorkoutBuilderPage />} />
              <Route path="workouts/:id" element={<WorkoutBuilderPage />} />
              <Route path="assessments"  element={<AssessmentsPage />} />
              <Route path="payments"     element={<PaymentsPage />} />
            </Route>
          </Route>

          {/* Student */}
          <Route element={<ProtectedRoute role="student" />}>
            <Route path="/student" element={<StudentLayout />}>
              <Route index              element={<StudentHome />} />
              <Route path="progress"    element={<StudentProgress />} />
              <Route path="medals"      element={<StudentMedals />} />
              <Route path="profile"     element={<StudentProfile />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}