import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, AlertCircle } from "lucide-react";
import AuthLayout from "../layouts/AuthLayout";
import { Input } from "../components/Input";
import Button from "../components/Button";
import { useAuth } from "../lib/auth";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Send people back to whatever page sent them to /login.
  const redirectTo = location.state?.from || "/dashboard";

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login({ email: form.email.trim(), password: form.password });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || "Could not log you in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <AuthLayout
      side={{
        quote: "ClariFi finally made me understand what was actually in my financial documents.",
        attribution: "Verified investor",
      }}
    >
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-[#181A2A] mb-2">Welcome back.</h1>
        <p className="text-sm text-[#52586B]">Sign in to your financial intelligence workspace.</p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <Input
          id="email"
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="name@example.com"
          value={form.email}
          onChange={update("email")}
          required
        />
        <Input
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={form.password}
          onChange={update("password")}
          required
        />

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs text-red-800"
          >
            <AlertCircle size={15} className="mt-0.5 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" icon={ArrowRight} iconPosition="right" className="mt-2 w-full" disabled={submitting}>
          {submitting ? "Signing in..." : "Continue"}
        </Button>
      </form>

      <p className="text-xs text-[#52586B] mt-8 text-center">
        New to ClariFi?{" "}
        <Link to="/signup" className="text-[#181A2A] font-semibold underline underline-offset-4 hover:text-brand-berry transition-colors">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  );
}
