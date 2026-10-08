import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import {
  FiPhone,
  FiLock,
  FiEye,
  FiEyeOff,
  FiArrowRight,
  FiLoader,
} from "react-icons/fi";

const Login = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // API URL from environment or fallback
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  console.log('🔗 API URL:', API_URL);
  console.log('👤 Current user from context:', user);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    console.log('📝 Form submitted');

    // Validate input
    if (!phone || !password) {
      setError("Please enter your phone number and password.");
      return;
    }

    if (phone.length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);

    try {
      console.log("📤 Attempting login for:", phone);
      console.log("📤 Password length:", password.length);

      // Call your backend login API
      const response = await axios.post(`${API_URL}/auth/login`, {
        phone: phone,
        password: password,
      });

      console.log("📥 Full response:", response);
      console.log("📥 Response status:", response.status);
      console.log("📥 Response data:", response.data);

      if (response.data.success) {
        const userData = response.data.data;
        const token = response.data.token;

        console.log("✅ User data received:", userData);
        console.log("✅ Token received:", token ? "Yes - " + token.substring(0, 20) + "..." : "No");

        // Store token in localStorage
        if (token) {
          localStorage.setItem('token', token);
          console.log("✅ Token stored in localStorage");
        } else {
          console.warn("⚠️ No token received from server");
        }

        // Store user in localStorage
        localStorage.setItem('user', JSON.stringify(userData));
        console.log("✅ User stored in localStorage");

        // Verify localStorage was set
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        console.log("🔍 Verifying localStorage - Token:", savedToken ? "Exists" : "Missing");
        console.log("🔍 Verifying localStorage - User:", savedUser ? JSON.parse(savedUser) : "Missing");

        // Use AuthContext login
        console.log("📞 Calling login context with:", userData);
        login({
          id: userData.id,
          phone: userData.phone,
          role: userData.role,
          name: userData.name,
          email: userData.email,
          token: token,
        });

        console.log("✅ Login context called");

        // Force a small delay to ensure state updates
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log("🔀 Navigating based on role:", userData.role);
        
        // Navigate based on role
        if (userData.role === "admin") {
          console.log("🚀 Navigating to /admin/dashboard");
          navigate("/admin/dashboard");
        } else if (userData.role === "retailer") {
          console.log("🚀 Navigating to /retailer/dashboard");
          navigate("/retailer/dashboard");
        } else if (userData.role === "driver") {
          console.log("🚀 Navigating to /driver/dashboard");
          navigate("/driver/dashboard");
        } else {
          console.log("🚀 Navigating to /dashboard");
          navigate("/dashboard");
        }
        
        console.log("✅ Navigation called");
      } else {
        console.log("❌ Login failed:", response.data.message);
        setError(response.data.message || "Invalid phone number or password.");
      }
    } catch (error) {
      console.error("❌ Login error:", error);
      
      if (error.response) {
        console.error("❌ Server responded with error:", error.response.status);
        console.error("❌ Error data:", error.response.data);
        setError(error.response.data?.message || "Invalid phone number or password.");
      } else if (error.request) {
        console.error("❌ No response from server:", error.request);
        setError("Server is not responding. Please try again later.");
      } else {
        console.error("❌ Request error:", error.message);
        setError("An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-2">
      {/* LEFT SIDE */}
      <section className="relative hidden min-h-screen overflow-hidden bg-[#111714] p-12 text-white lg:flex lg:flex-col xl:p-16">
        <div className="absolute -bottom-52 -right-52 h-[500px] w-[500px] rounded-full border border-white/5" />
        <div className="absolute -bottom-32 -right-32 h-[350px] w-[350px] rounded-full border border-white/5" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-lg font-bold text-[#111714]">B</div>
          <div>
            <h2 className="text-[15px] font-bold tracking-[0.2em]">BISMILLAH</h2>
            <p className="mt-1 text-[8px] tracking-[0.35em] text-white/40">CHICKEN CENTER</p>
          </div>
        </div>

        <div className="relative z-10 my-auto max-w-xl">
          <p className="mb-6 text-[10px] font-medium tracking-[0.3em] text-white/40">
            WHOLESALE POULTRY MANAGEMENT
          </p>
          <h1 className="text-6xl font-medium leading-[0.95] tracking-[-0.05em] xl:text-7xl">
            Business made
            <br />
            <span className="text-white/35">simple.</span>
          </h1>
          <p className="mt-8 max-w-md text-sm leading-7 text-white/45">
            Manage retailers, orders, deliveries, payments and your daily
            poultry operations from one simple platform.
          </p>
        </div>

        <div className="relative z-10 text-[8px] tracking-[0.3em] text-white/25">
          BISMILLAH CHICKEN CENTER
        </div>
      </section>

      {/* RIGHT SIDE - Login Form */}
      <section className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-10 lg:px-14">
        <div className="w-full max-w-[420px]">
          <div className="mb-16 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#111714] text-lg font-bold text-white">B</div>
            <div>
              <h2 className="text-sm font-bold tracking-[0.2em] text-[#111714]">BISMILLAH</h2>
              <p className="mt-1 text-[8px] tracking-[0.3em] text-gray-400">CHICKEN CENTER</p>
            </div>
          </div>

          <div className="mb-10">
            <p className="text-[10px] font-semibold tracking-[0.25em] text-gray-400">WELCOME BACK</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#151a17]">Sign in to your account</h2>
            <p className="mt-2 text-sm text-gray-400">Enter your credentials to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700">Phone Number</label>
              <div className="flex h-14 items-center rounded-lg border border-gray-200 bg-white px-4 transition focus-within:border-[#111714] focus-within:ring-4 focus-within:ring-black/5">
                <FiPhone className="mr-3 text-lg text-gray-400" />
                <span className="mr-3 border-r border-gray-200 pr-3 text-sm text-gray-600">+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter phone number"
                  className="h-full w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-700">Password</label>
              <div className="flex h-14 items-center rounded-lg border border-gray-200 bg-white px-4 transition focus-within:border-[#111714] focus-within:ring-4 focus-within:ring-black/5">
                <FiLock className="mr-3 text-lg text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-full w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="ml-3 cursor-pointer text-lg text-gray-400 transition hover:text-gray-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isLoading}
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="group flex h-14 w-full cursor-pointer items-center justify-center gap-3 rounded-lg bg-[#111714] text-[11px] font-semibold tracking-[0.2em] text-white transition hover:bg-[#29312d] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <FiLoader className="animate-spin" />
                  SIGNING IN...
                </>
              ) : (
                <>
                  SIGN IN
                  <FiArrowRight className="transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-[11px] leading-5 text-gray-400">
              Having trouble signing in?
              <br />
              Contact your administrator.
            </p>
          </div>

          {/* Debug info */}
          {import.meta.env.DEV && (
            <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <p className="text-xs font-semibold text-gray-700">Debug Info:</p>
              <p className="text-xs text-gray-500">API URL: {API_URL}</p>
              <p className="text-xs text-gray-500">Test users:</p>
              <p className="text-xs text-gray-400">Admin: 9999999999 / admin123</p>
              <p className="text-xs text-gray-400">Driver: 6309357023 / Ajith@1441</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Login;