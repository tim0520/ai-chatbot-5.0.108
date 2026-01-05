"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { toast } from "@/components/toast"; 
import { Smartphone, Lock, User, Eye, EyeOff, Loader2, MessageCircle, KeyRound } from "lucide-react";
import CaptchaModal from "@/components/CaptchaModal"; 
import { sendVerificationCode, getAppConfig } from "../actions"; 

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"password" | "code">("password");

  // === 状态 ===
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState(""); 
  const [countdown, setCountdown] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 🛡️ 控制逻辑：默认开启验证码 (安全优先)
  const [isCaptchaEnabled, setIsCaptchaEnabled] = useState(true);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);

  // === 密码登录状态 ===
  const [username, setUsername] = useState(""); 
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // 1️⃣ 初始化：同步后台配置
  useEffect(() => {
    const initConfig = async () => {
      try {
        const config = await getAppConfig();
        setIsCaptchaEnabled(config.enableCaptcha);
      } finally {
        setIsConfigLoaded(true);
      }
    };
    initConfig();
  }, []);

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 2️⃣ 统一发送逻辑 (带自动纠错)
  const executeSendCode = async (captchaToken: string = "", captchaId: string = "") => {
    const res = await sendVerificationCode(phone, captchaToken, captchaId, "login");
    
    if (res.msg === "Turing test failed") {
      console.warn("需要图形验证码，正在自动弹出...");
      setIsCaptchaEnabled(true);
      setIsModalOpen(true);
      return; 
    }

    if (res.status === "ok" || res.success) {
      toast({ type: "success", description: "Verification code sent!" });
      setCountdown(60);
    } else {
      toast({ type: "error", description: res.msg || res.error || "Failed to send code" });
    }
  };

  // 3️⃣ 弹窗回调
  const handleCaptchaVerify = async (token: string, id: string) => {
    setIsModalOpen(false);
    await executeSendCode(token, id);
  };

  // 4️⃣ 点击按钮
  const onGetCodeClick = async () => {
    if (!phone || phone.length < 11) {
      return toast({ type: "error", description: "Please enter a valid phone number" });
    }
    if (!isConfigLoaded) return setIsModalOpen(true);

    if (isCaptchaEnabled) {
      setIsModalOpen(true); 
    } else {
      await executeSendCode();
    }
  };

  // 5️⃣ 提交登录
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = loginMethod === "password" 
      ? { username: username, password: password, loginType: "password" }
      : { username: phone, password: smsCode, loginType: "code" };

    try {
      const result = await signIn("casdoor-credentials", {
        ...payload,
        redirect: false,
      });

      if (result?.error) {
        toast({ type: "error", description: "Login failed: " + result.error });
      } else {
        toast({ type: "success", description: "Successfully logged in!" });
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      toast({ type: "error", description: "Login error occurred" });
    } finally {
      setLoading(false);
    }
  };

  const handleWeChatLogin = () => {
    signIn("casdoor", { callbackUrl: "/" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-zinc-950">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl transition-all dark:bg-zinc-900 dark:border dark:border-zinc-800">
        
        {/* Header */}
        <div className="bg-black p-8 text-center dark:bg-zinc-950">
          <h2 className="text-3xl font-bold text-white tracking-tight">Welcome Back</h2>
          <p className="mt-2 text-sm text-gray-400">Sign in to continue to AI Chatbot</p>
        </div>

        {/* Tab */}
        <div className="flex border-b border-gray-100 dark:border-zinc-800">
          <button type="button" onClick={() => setLoginMethod("password")} className={`flex-1 py-4 text-sm font-medium transition-all ${loginMethod === "password" ? "border-b-2 border-black text-black bg-gray-50 dark:bg-zinc-800 dark:text-white dark:border-white" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-zinc-800"}`}>Password</button>
          <button type="button" onClick={() => setLoginMethod("code")} className={`flex-1 py-4 text-sm font-medium transition-all ${loginMethod === "code" ? "border-b-2 border-black text-black bg-gray-50 dark:bg-zinc-800 dark:text-white dark:border-white" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-zinc-800"}`}>SMS Code</button>
        </div>

        {/* Form */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {loginMethod === "password" && (
              <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500 uppercase">Username / Phone</label>
                  <div className="relative">
                    <input value={username} onChange={(e) => setUsername(e.target.value)} required className="w-full rounded-lg border border-gray-200 bg-white p-3 pl-10 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-all dark:bg-zinc-950 dark:border-zinc-800 dark:text-white" placeholder="admin" />
                    <User className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  </div>
                </div>
                <div>
                  {/* ✅ 修改：Flex 布局包含 Label 和 Forgot Password 链接 */}
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-medium text-gray-500 uppercase">Password</label>
                    <Link 
                      href={`${process.env.NEXT_PUBLIC_CASDOOR_SERVER_URL || ""}/forget`}
                      target="_blank"
                      className="text-xs font-semibold text-gray-400 hover:text-black dark:hover:text-white hover:underline transition-all"
                    >
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <input value={password} onChange={(e) => setPassword(e.target.value)} type={showPassword ? "text" : "password"} required className="w-full rounded-lg border border-gray-200 bg-white p-3 pl-10 pr-10 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-all dark:bg-zinc-950 dark:border-zinc-800 dark:text-white" placeholder="••••••••" />
                    <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loginMethod === "code" && (
              <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500 uppercase">Phone Number</label>
                  <div className="relative">
                    <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" required className="w-full rounded-lg border border-gray-200 bg-white p-3 pl-10 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-all dark:bg-zinc-950 dark:border-zinc-800 dark:text-white" placeholder="13800123456" />
                    <Smartphone className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-gray-500 uppercase">Verification Code</label>
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <input value={smsCode} onChange={(e) => setSmsCode(e.target.value)} required className="w-full rounded-lg border border-gray-200 bg-white p-3 pl-10 text-sm outline-none focus:border-black focus:ring-1 focus:ring-black transition-all dark:bg-zinc-950 dark:border-zinc-800 dark:text-white" placeholder="123456" />
                      <KeyRound className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    </div>
                    <button type="button" disabled={countdown > 0} onClick={onGetCodeClick} className="h-[46px] min-w-[100px] rounded-lg bg-gray-100 px-4 text-xs font-bold text-gray-900 hover:bg-gray-200 disabled:opacity-50 transition-colors dark:bg-zinc-800 dark:text-gray-300">
                      {countdown > 0 ? `${countdown}s` : "Get Code"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading} className="mt-2 w-full flex items-center justify-center rounded-lg bg-black py-3.5 text-sm font-bold text-white shadow-lg hover:bg-gray-800 disabled:opacity-70 transition-all hover:scale-[1.01] active:scale-[0.99] dark:bg-white dark:text-black dark:hover:bg-gray-200">
              {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : null} {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="my-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-800"></div>
            <span className="text-xs font-medium text-gray-400 uppercase">Or continue with</span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-zinc-800"></div>
          </div>
          <button type="button" onClick={handleWeChatLogin} className="group flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all dark:bg-zinc-950 dark:border-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-900">
            <MessageCircle size={20} className="text-green-600 group-hover:scale-110 transition-transform" /> <span>WeChat Login</span>
          </button>
          <p className="mt-8 text-center text-sm text-gray-500 dark:text-zinc-500">
            {"Don't have an account? "}
            <Link href="/register" className="font-semibold text-black hover:underline dark:text-white">Sign up</Link>
          </p>
        </div>
      </div>

      <CaptchaModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onVerify={handleCaptchaVerify} />
    </div>
  );
}