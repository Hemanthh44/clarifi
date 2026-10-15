import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, AlertCircle } from "lucide-react";
import AuthLayout from "../layouts/AuthLayout";
import { Input } from "../components/Input";
import Button from "../components/Button";
import { useAuth } from "../lib/auth";

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password.length < 8) {
      setError("Please choose a password of at least 8 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await signup({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Could not create your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <AuthLayout
      side={{
        quote: "Understand your money. Before it moves.",
        attribution: "ClariFi Intelligence",
      }}
    >
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-[#181A2A] mb-2">Create an account.</h1>
        <p className="text-sm text-[#52586B]">Start understanding your money with precision.</p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <Input
          id="name"
          label="Full name"
          type="text"
          autoComplete="name"
          placeholder="e.g. Eleanor Vance"
          value={form.name}
          onChange={update("name")}
          required
        />
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
          autoComplete="new-password"
          placeholder="At least 8 characters"
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
          {submitting ? "Creating account..." : "Get started"}
        </Button>
      </form>

      <p className="text-[0.75rem] text-[#52586B] mt-6 text-center leading-relaxed">
        Educational and analytical tool. Not personalized investment advice.
      </p>

      <p className="text-xs text-[#52586B] mt-4 text-center">
        Already have an account?{" "}
        <Link to="/login" className="text-[#181A2A] font-semibold underline underline-offset-4 hover:text-brand-berry transition-colors">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
