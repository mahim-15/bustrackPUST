import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth.js';

const institutionalEmailPattern = /^[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)*pust\.ac\.bd$/i;

export default function Login() {
  const [mode, setMode] = useState('register');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const { login, register, requestEmailOtp, verifyEmailOtp } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setSubmitting(true);

    try {
      if (mode === 'register') {
        if (!otpSent) {
          await requestEmailOtp(email);
          setOtpSent(true);
          setNotice('A verification code has been sent to your email. It expires in 10 minutes.');
          return;
        }
        if (!emailVerified) {
          await verifyEmailOtp(email, otp);
          setEmailVerified(true);
        }
        await register({ fullName, studentId, email, password });
        setNotice('Account created. Sign in with your institutional email and password.');
        setMode('login');
        return;
      } else {
        await login(email, password);
      }
      navigate('/routes');
    } catch (err) {
      setError(
        err.message
      );
    } finally {
      setSubmitting(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError(null);
    setNotice(null);
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <div className="rounded-[28px] border border-[#dfeae4] bg-white p-6 shadow-[0_18px_40px_rgba(17,34,25,0.08)] dark:border-[#18342d] dark:bg-[#0d1715]">
        <div className="mb-6 flex rounded-xl border border-[#dfeae4] bg-[#f6faf7] p-1 dark:border-[#18342d] dark:bg-[#102620]">
          <button
            type="button"
            onClick={() => changeMode('register')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
              mode === 'register' ? 'bg-[#0b5d3b] text-white' : 'text-[#49635b] dark:text-[#dff4e8]'
            }`}
          >
            Register
          </button>
          <button
            type="button"
            onClick={() => changeMode('login')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
              mode === 'login' ? 'bg-[#0b5d3b] text-white' : 'text-[#49635b] dark:text-[#dff4e8]'
            }`}
          >
            Sign in
          </button>
        </div>

        <h1 className="mb-2 text-2xl font-semibold text-[#122218] dark:text-white">
          {mode === 'login'
            ? 'Student sign in'
            : otpSent && !emailVerified
              ? 'Verify your institutional email'
              : 'Create student account'}
        </h1>
        <p className="mb-6 text-sm text-[#5c6f67] dark:text-[#bae0cc]">
          {mode === 'login'
            ? 'Sign in with your verified PUST institutional email and password.'
            : otpSent && !emailVerified
              ? `Enter the six-digit code sent to ${email}.`
              : emailVerified
                ? 'Email verified. Complete your student details to create your account.'
                : 'Start with your PUST institutional email. We will send a one-time code to verify that you can access it.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (!otpSent || emailVerified) && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2b3e36] dark:text-[#dff4e8]">Full name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-[#dfeae4] bg-[#f7faf8] px-3 py-2.5 text-[#123528] outline-none placeholder:text-[#6d7d77] focus:border-[#0b5d3b] focus:ring-2 focus:ring-[#c8ead7] dark:border-[#18342d] dark:bg-[#0f1d1a] dark:text-[#edf7f2] dark:placeholder:text-[#9bb6ae]"
                placeholder="e.g. Rahman, A."
                required
              />
            </div>
          )}

          {mode === 'register' && (!otpSent || emailVerified) && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2b3e36] dark:text-[#dff4e8]">Student ID</label>
              <input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full rounded-xl border border-[#dfeae4] bg-[#f7faf8] px-3 py-2.5 text-[#123528] outline-none placeholder:text-[#6d7d77] focus:border-[#0b5d3b] focus:ring-2 focus:ring-[#c8ead7] dark:border-[#18342d] dark:bg-[#0f1d1a] dark:text-[#edf7f2] dark:placeholder:text-[#9bb6ae]"
                placeholder="e.g. 202112050"
                required
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-[#2b3e36] dark:text-[#dff4e8]">Institutional email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setOtpSent(false);
                setEmailVerified(false);
                setOtp('');
                setNotice(null);
              }}
              className="w-full rounded-xl border border-[#dfeae4] bg-[#f7faf8] px-3 py-2.5 text-[#123528] outline-none placeholder:text-[#6d7d77] focus:border-[#0b5d3b] focus:ring-2 focus:ring-[#c8ead7] dark:border-[#18342d] dark:bg-[#0f1d1a] dark:text-[#edf7f2] dark:placeholder:text-[#9bb6ae]"
              placeholder="name@pust.ac.bd"
              pattern={institutionalEmailPattern.source}
              readOnly={mode === 'register' && emailVerified}
              required
            />
          </div>

          {mode === 'register' && otpSent && !emailVerified && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2b3e36] dark:text-[#dff4e8]">Email verification code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full rounded-xl border border-[#dfeae4] bg-[#f7faf8] px-3 py-2.5 tracking-[0.3em] text-[#123528] outline-none placeholder:text-[#6d7d77] focus:border-[#0b5d3b] focus:ring-2 focus:ring-[#c8ead7] dark:border-[#18342d] dark:bg-[#0f1d1a] dark:text-[#edf7f2] dark:placeholder:text-[#9bb6ae]"
                placeholder="6-digit code"
                pattern="[0-9]{6}"
                maxLength={6}
                required
              />
              <button
                type="button"
                onClick={async () => {
                  setError(null);
                  setNotice(null);
                  setSubmitting(true);
                  try {
                    await requestEmailOtp(email);
                    setOtp('');
                    setNotice('A new verification code has been sent to your email.');
                  } catch (err) {
                    setError(err.message);
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={submitting}
                className="mt-2 text-sm font-medium text-[#0b5d3b] underline underline-offset-2 disabled:opacity-60 dark:text-[#9fe0be]"
              >
                Resend code
              </button>
            </div>
          )}

          {(mode === 'login' || !otpSent || emailVerified) && (
            <div>
              <label className="mb-1 block text-sm font-medium text-[#2b3e36] dark:text-[#dff4e8]">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-[#dfeae4] bg-[#f7faf8] px-3 py-2.5 text-[#123528] outline-none placeholder:text-[#6d7d77] focus:border-[#0b5d3b] focus:ring-2 focus:ring-[#c8ead7] dark:border-[#18342d] dark:bg-[#0f1d1a] dark:text-[#edf7f2] dark:placeholder:text-[#9bb6ae]"
                placeholder="Minimum 6 characters"
                minLength={6}
                required
              />
            </div>
          )}

          {error && (
            <div className="space-y-2">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setMode('register');
                  }}
                  className="text-sm font-medium text-[#0b5d3b] underline underline-offset-2 dark:text-[#9fe0be]"
                >
                  Register this student email
                </button>
              )}
            </div>
          )}
          {notice && <p className="text-sm text-[#0b5d3b] dark:text-[#9fe0be]">{notice}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-[#0b5d3b] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(11,93,59,0.15)] transition hover:bg-[#084a2f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting
              ? (mode === 'login' ? 'Signing in...' : !otpSent ? 'Sending code...' : !emailVerified ? 'Verifying code...' : 'Creating account...')
              : mode === 'login' ? 'Continue to tracking' : !otpSent ? 'Send verification code' : emailVerified ? 'Create account' : 'Verify email and create account'}
          </button>
        </form>
      </div>
    </div>
  );
}
