import React, { useState } from "react";
import { GoogleLogin } from "@react-oauth/google";
import { 
  X, User, Mail, Lock, KeyRound, AlertCircle, Loader2, Phone, MapPin, ShieldCheck, Users 
} from "lucide-react";

export default function AuthModal({ 
  isOpen, 
  onClose, 
  onAuthSuccess, 
  isDarkMode, 
  apiBaseUrl = "http://localhost:5001", 
  neonLime = "#D2FF00" 
}) {
  const [authMode, setAuthMode] = useState("login"); // "login" | "register" | "otp"
  const [authError, setAuthError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpUserId, setOtpUserId] = useState(null);
  const [rememberDevice, setRememberDevice] = useState(false);

  // Kumpletong form data state para sa Login at Registration
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    gender: "Male",
    address: ""
  });

  if (!isOpen) return null;

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 🔑 Standard Email/Password Login & Full Register
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthError(null);

    // Password matching validation para sa Register
    if (authMode === "register" && formData.password !== formData.confirmPassword) {
      setAuthError("Passwords do not match. Please double check.");
      setIsSubmitting(false);
      return;
    }

    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const deviceToken = localStorage.getItem("gym_device_token");

    // Dynamic payload depende sa mode
    const bodyPayload = authMode === "login" 
      ? { email: formData.email, password: formData.password, deviceToken }
      : { 
          name: formData.name, 
          email: formData.email, 
          password: formData.password,
          phone: formData.phone,
          gender: formData.gender,
          address: formData.address
        };

    try {
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.message || `Error ${response.status}: Authentication failed.`);
        return;
      }

      if (data.requiresOtp) {
        setOtpUserId(data.userId);
        setAuthMode("otp");
      } else {
        onAuthSuccess(data.user || { name: data.name || formData.name, email: formData.email }, data.token);
      }
    } catch (err) {
      console.error("Auth Network Error:", err);
      setAuthError("Cannot connect to server. Ensure Express backend is running on port 5001.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 📧 OTP Verification
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: otpUserId, otpCode, rememberDevice })
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.message || "Invalid OTP Code.");
        return;
      }

      if (data.deviceToken) {
        localStorage.setItem("gym_device_token", data.deviceToken);
      }

      onAuthSuccess(data.user, data.token);
    } catch (err) {
      console.error("OTP Verification Error:", err);
      setAuthError("Failed to verify OTP code. Check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🌐 Google Login Authentication
  const handleGoogleSuccess = async (credentialResponse) => {
    setIsSubmitting(true);
    setAuthError(null);
    const deviceToken = localStorage.getItem("gym_device_token");

    try {
      const response = await fetch(`${apiBaseUrl}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential, deviceToken })
      });

      const data = await response.json();

      if (!response.ok) {
        setAuthError(data.message || "Google Authentication failed on server.");
        return;
      }

      if (data.requiresOtp) {
        setOtpUserId(data.userId);
        setAuthMode("otp");
      } else {
        onAuthSuccess(data.user || { name: data.name, email: data.email }, data.token);
      }
    } catch (err) {
      console.error("Backend Google Auth Network Error:", err);
      setAuthError("Cannot connect to backend server. Ensure Express backend is running on port 5001.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-pop-in">
      <div className={`w-full max-w-md rounded-2xl p-5 sm:p-6 relative border max-h-[90vh] flex flex-col ${
        isDarkMode ? "bg-zinc-900 border-zinc-800 text-white" : "bg-white border-zinc-200 text-zinc-900 shadow-xl"
      }`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-4 shrink-0">
          <h3 className="text-lg sm:text-xl font-bold uppercase tracking-tight">
            {authMode === "otp" ? "Security Verification" : authMode === "login" ? "Welcome Back" : "Create Account"}
          </h3>
          <p className="text-zinc-400 text-xs mt-1">
            {authMode === "otp" 
              ? "Enter the 6-digit verification code sent to your email" 
              : authMode === "login"
              ? "Access gym passes, write reviews & track orders"
              : "Fill in your details to get started with GymHub"}
          </p>
        </div>

        {/* Error Alert */}
        {authError && (
          <div className="mb-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium flex items-center justify-center gap-1.5 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* Scrollable Form Body */}
        <div className="overflow-y-auto pr-1 custom-scrollbar">
          {/* OTP FORM FLOW */}
          {authMode === "otp" ? (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="p-3 bg-[#D2FF00]/10 border border-[#D2FF00]/20 rounded-xl text-center text-xs text-[#D2FF00]">
                <span className="font-bold flex items-center justify-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Security Check Required
                </span>
                <p className="text-[11px] text-zinc-300 mt-1">
                  A 6-digit OTP code has been sent to your email address.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-400 mb-1 uppercase">Verification Code</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className={`w-full border rounded-xl pl-9 pr-3 py-2.5 text-center font-mono tracking-widest text-lg font-bold focus:outline-none ${
                      isDarkMode ? "bg-zinc-950 border-zinc-800 text-white focus:border-[#D2FF00]" : "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-500"
                    }`}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-400">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-950 text-[#D2FF00] focus:ring-0"
                />
                <span>Remember this device for 30 days</span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{ backgroundColor: neonLime }}
                className="w-full text-black font-extrabold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2 shadow-md active:scale-95"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify & Sign In"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthError(null);
                  setAuthMode("login");
                }}
                className="w-full text-xs text-zinc-500 hover:underline text-center block pt-2"
              >
                Back to Sign In
              </button>
            </form>
          ) : (
            /* LOGIN / FULL REGISTER FORM FLOW */
            <>
              {authMode === "login" && (
                <>
                  <div className="flex justify-center mb-3">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => setAuthError("Google Sign-In failed or origin not allowed in Google Console.")}
                      theme={isDarkMode ? "filled_black" : "outline"}
                      shape="pill"
                      width="300"
                    />
                  </div>

                  <div className="relative my-3 text-center">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800"></div></div>
                    <span className={`relative px-3 text-[10px] uppercase font-bold tracking-wider ${isDarkMode ? "bg-zinc-900 text-zinc-500" : "bg-white text-zinc-400"}`}>
                      or continue with email
                    </span>
                  </div>
                </>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-3">
                {/* REGISTER ONLY: Full Name */}
                {authMode === "register" && (
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1 uppercase">Full Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                      <input
                        type="text"
                        name="name"
                        required
                        placeholder="Juan Dela Cruz"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`w-full border rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none ${
                          isDarkMode ? "bg-zinc-950 border-zinc-800 text-white focus:border-[#D2FF00]" : "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-500"
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* EMAIL ADDRESS */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1 uppercase">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                    <input
                      type="email"
                      name="email"
                      required
                      placeholder="juan@gymhub.ph"
                      value={formData.email}
                      onChange={handleInputChange}
                      className={`w-full border rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none ${
                        isDarkMode ? "bg-zinc-950 border-zinc-800 text-white focus:border-[#D2FF00]" : "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-500"
                      }`}
                    />
                  </div>
                </div>

                {/* REGISTER ONLY: Phone Number & Gender */}
                {authMode === "register" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 mb-1 uppercase">Phone Number</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                        <input
                          type="tel"
                          name="phone"
                          required
                          placeholder="09171234567"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className={`w-full border rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none ${
                            isDarkMode ? "bg-zinc-950 border-zinc-800 text-white focus:border-[#D2FF00]" : "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-500"
                          }`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-400 mb-1 uppercase">Gender</label>
                      <div className="relative">
                        <Users className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleInputChange}
                          className={`w-full border rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none ${
                            isDarkMode ? "bg-zinc-950 border-zinc-800 text-white focus:border-[#D2FF00]" : "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-500"
                          }`}
                        >
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Prefer not to say</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* REGISTER ONLY: Address */}
                {authMode === "register" && (
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1 uppercase">Address</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                      <input
                        type="text"
                        name="address"
                        required
                        placeholder="123 Gym St, Quezon City"
                        value={formData.address}
                        onChange={handleInputChange}
                        className={`w-full border rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none ${
                          isDarkMode ? "bg-zinc-950 border-zinc-800 text-white focus:border-[#D2FF00]" : "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-500"
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* PASSWORD */}
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1 uppercase">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                    <input
                      type="password"
                      name="password"
                      required
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      className={`w-full border rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none ${
                        isDarkMode ? "bg-zinc-950 border-zinc-800 text-white focus:border-[#D2FF00]" : "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-500"
                      }`}
                    />
                  </div>
                </div>

                {/* REGISTER ONLY: Confirm Password */}
                {authMode === "register" && (
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1 uppercase">Confirm Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                      <input
                        type="password"
                        name="confirmPassword"
                        required
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className={`w-full border rounded-xl pl-9 pr-3 py-2.5 text-xs focus:outline-none ${
                          isDarkMode ? "bg-zinc-950 border-zinc-800 text-white focus:border-[#D2FF00]" : "bg-zinc-50 border-zinc-300 text-zinc-900 focus:border-zinc-500"
                        }`}
                      />
                    </div>
                  </div>
                )}

                {/* SUBMIT BUTTON */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ backgroundColor: neonLime }}
                  className="w-full text-black font-extrabold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-3 shadow-md active:scale-95 cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : authMode === "login" ? (
                    "Sign In"
                  ) : (
                    "Create Account"
                  )}
                </button>
              </form>

              {/* FOOTER SWITCHER */}
              <div className="text-center mt-4 pt-3 border-t border-zinc-800 text-xs text-[#a1a1aa]">
                {authMode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  onClick={() => {
                    setAuthError(null);
                    setAuthMode(authMode === "login" ? "register" : "login");
                  }}
                  className={`font-bold hover:underline ml-1 ${isDarkMode ? "text-[#D2FF00]" : "text-lime-700"}`}
                >
                  {authMode === "login" ? "Sign Up" : "Log In"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}