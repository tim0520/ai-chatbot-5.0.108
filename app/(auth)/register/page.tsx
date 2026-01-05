"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Smartphone, User, MessageCircle, Loader2, Lock, KeyRound, Eye, EyeOff } from "lucide-react";
import CaptchaModal from "@/components/CaptchaModal";
import { sendVerificationCode, registerWithPhone, registerWithPassword, getAppConfig } from "../actions"; 

export default function RegisterPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"phone" | "password">("phone");
  const [loading, setLoading] = useState(false);
  
  // === 验证码相关 ===
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isCaptchaEnabled, setIsCaptchaEnabled] = useState(true);

  // === 👁️ 密码显示 ===
  const [showPhonePass, setShowPhonePass] = useState(false);
  const [showPhoneConfirmPass, setShowPhoneConfirmPass] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  
  // === 数据状态 ===
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [phonePassword, setPhonePassword] = useState("");
  const [confirmPhonePassword, setConfirmPhonePassword] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isPhoneMismatch = confirmPhonePassword && phonePassword !== confirmPhonePassword;
  const isPasswordMismatch = confirmPassword && password !== confirmPassword;

  // 1️⃣ 初始化配置
  useEffect(() => {
    const initConfig = async () => {
      const config = await getAppConfig();
      setIsCaptchaEnabled(config.enableCaptcha);
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

  // ✅ 2️⃣ 兜底方案：注册成功但自动登录失败时，跳转到我们自己的登录页
  const handleLoginFallback = () => {
    // 这是一个保险措施，防止用户卡在注册页
    alert("注册成功！请前往登录页面进行登录。");
    router.push("/login");
  };

  // 3️⃣ 统一发送逻辑
  const executeSendCode = async (captchaToken: string = "", captchaId: string = "") => {
    const res = await sendVerificationCode(phone, captchaToken, captchaId);
    if (res.status === "ok") {
      alert("✅ 验证码已发送");
      setCountdown(60);
    } else {
      alert("❌ 发送失败: " + res.msg);
    }
  };

  // 4️⃣ 弹窗回调
  const handleCaptchaVerify = async (token: string, id: string) => {
    setIsModalOpen(false);
    await executeSendCode(token, id);
  };

  // 5️⃣ 点击发送按钮
  const onGetCodeClick = async () => {
    if (!phone) return alert("请先填写手机号");
    if (isCaptchaEnabled) {
      setIsModalOpen(true);
    } else {
      await executeSendCode();
    }
  };

  // 6️⃣ 手机注册提交
  const handlePhoneSubmit = async () => {
    if (!phone || !smsCode || !phonePassword || !confirmPhonePassword) return alert("请填写完整信息");
    if (phonePassword !== confirmPhonePassword) return alert("两次密码不一致");
    if (phonePassword.length < 6) return alert("密码长度至少为 6 位");
    
    setLoading(true);
    const res = await registerWithPhone(phone, smsCode, phonePassword);

    if (res.status === "ok") {
      try {
        // 尝试自动登录
        const result = await signIn("casdoor-credentials", {
          username: phone,
          password: phonePassword,
          loginType: "password",
          redirect: false,
        });
        
        if (result?.error) {
           // 登录失败，执行兜底
           handleLoginFallback();
        } else { 
           router.push("/"); 
           router.refresh(); 
        }
      } catch (error) { 
        handleLoginFallback(); 
      }
    } else {
      alert("❌ 注册失败: " + res.msg);
    }
    setLoading(false);
  };

  // 7️⃣ 账号密码注册提交
  const handlePasswordSubmit = async () => {
    if (!username || !password || !confirmPassword) return alert("请填写完整信息");
    if (password !== confirmPassword) return alert("两次密码不一致");

    setLoading(true);
    const res = await registerWithPassword(username, password);

    if (res.status === "ok") {
      try {
        const result = await signIn("casdoor-credentials", {
          username: username,
          password: password,
          loginType: "password",
          redirect: false,
        });
        
        if (result?.error) {
            handleLoginFallback();
        } else { 
            router.push("/"); 
            router.refresh(); 
        }
      } catch (error) { 
        handleLoginFallback(); 
      }
    } else {
      alert("❌ 注册失败: " + res.msg);
    }
    setLoading(false);
  };

  // 8️⃣ 跳转到自定义登录页
  const handleGoToLogin = () => {
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl transition-all">
        {/* Header */}
        <div className="bg-black p-8 text-center">
          <h2 className="text-3xl font-bold text-white tracking-tight">加入我们</h2>
          <p className="mt-2 text-sm text-gray-400">注册您的专属 AI 助手账号</p>
        </div>

        {/* Tab */}
        <div className="flex border-b border-gray-100">
          <button onClick={() => setActiveTab("phone")} className={`flex-1 py-4 text-sm font-medium transition-all ${activeTab === "phone" ? "border-b-2 border-black text-black bg-gray-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}><div className="flex items-center justify-center gap-2"><Smartphone size={18} /> 手机注册</div></button>
          <button onClick={() => setActiveTab("password")} className={`flex-1 py-4 text-sm font-medium transition-all ${activeTab === "password" ? "border-b-2 border-black text-black bg-gray-50" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"}`}><div className="flex items-center justify-center gap-2"><User size={18} /> 账号密码</div></button>
        </div>

        {/* Form Content */}
        <div className="p-8">
          {activeTab === "phone" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
              {/* ... (手机号 Inputs 保持不变) ... */}
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">手机号</label>
                <div className="relative">
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="请输入 11 位手机号" className="w-full rounded-lg border border-gray-300 p-3 pl-10 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" />
                  <Smartphone className="absolute left-3 top-3.5 text-gray-400" size={18} />
                </div>
              </div>
              
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">设置密码</label>
                <div className="relative">
                  <input type={showPhonePass ? "text" : "password"} value={phonePassword} onChange={(e) => setPhonePassword(e.target.value)} placeholder="请设置登录密码" className="w-full rounded-lg border border-gray-300 p-3 pl-10 pr-10 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" />
                  <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  <button type="button" onClick={() => setShowPhonePass(!showPhonePass)} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none">
                    {showPhonePass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">确认密码</label>
                <div className="relative">
                  <input type={showPhoneConfirmPass ? "text" : "password"} value={confirmPhonePassword} onChange={(e) => setConfirmPhonePassword(e.target.value)} placeholder="请再次输入密码" className={`w-full rounded-lg border p-3 pl-10 pr-10 text-sm outline-none transition-all ${isPhoneMismatch ? "border-red-500 focus:border-red-500 bg-red-50" : "border-gray-300 focus:border-black focus:ring-1 focus:ring-black"}`} />
                  <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  <button type="button" onClick={() => setShowPhoneConfirmPass(!showPhoneConfirmPass)} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none">
                    {showPhoneConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {isPhoneMismatch && <p className="mt-1 text-xs text-red-500">❌ 两次输入的密码不一致</p>}
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">验证码</label>
                  <div className="relative">
                    <input value={smsCode} onChange={(e) => setSmsCode(e.target.value)} placeholder="短信验证码" className="w-full rounded-lg border border-gray-300 p-3 pl-10 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" />
                    <KeyRound className="absolute left-3 top-3.5 text-gray-400" size={18} />
                  </div>
                </div>
                <div className="flex items-end">
                  <button onClick={onGetCodeClick} disabled={countdown > 0} className="h-[46px] min-w-[110px] rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-900 hover:bg-gray-200 disabled:opacity-50 transition-colors">
                    {countdown > 0 ? `${countdown}s` : "获取验证码"}
                  </button>
                </div>
              </div>

              <button onClick={handlePhoneSubmit} disabled={loading} className="mt-2 w-full flex items-center justify-center rounded-lg bg-black py-3.5 font-bold text-white shadow-lg hover:bg-gray-800 disabled:opacity-70 transition-all hover:scale-[1.01] active:scale-[0.99]">
                {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : null} {loading ? "注册中..." : "注册并登录"}
              </button>
            </div>
          )}

          {activeTab === "password" && (
             <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
                {/* ... (密码 Inputs 保持不变) ... */}
                <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">用户名</label>
                    <div className="relative">
                    <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="设置您的用户名" className="w-full rounded-lg border border-gray-300 p-3 pl-10 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" />
                    <User className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    </div>
                </div>
                <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">密码</label>
                    <div className="relative">
                    <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="设置登录密码" className="w-full rounded-lg border border-gray-300 p-3 pl-10 pr-10 text-sm focus:border-black focus:ring-1 focus:ring-black outline-none transition-all" />
                    <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none">
                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    </div>
                </div>
                <div>
                    <label className="mb-1.5 block text-sm font-semibold text-gray-700">确认密码</label>
                    <div className="relative">
                    <input type={showConfirmPass ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="请再次输入密码" className={`w-full rounded-lg border p-3 pl-10 pr-10 text-sm outline-none transition-all ${isPasswordMismatch ? "border-red-500 focus:border-red-500 bg-red-50" : "border-gray-300 focus:border-black focus:ring-1 focus:ring-black"}`} />
                    <Lock className="absolute left-3 top-3.5 text-gray-400" size={18} />
                    <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 focus:outline-none">
                        {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                    </div>
                    {isPasswordMismatch && <p className="mt-1 text-xs text-red-500">❌ 两次输入的密码不一致</p>}
                </div>
                <button onClick={handlePasswordSubmit} disabled={loading} className="mt-2 w-full flex items-center justify-center rounded-lg bg-black py-3.5 font-bold text-white shadow-lg hover:bg-gray-800 disabled:opacity-70 transition-all hover:scale-[1.01] active:scale-[0.99]">
                    {loading ? <Loader2 className="animate-spin mr-2" size={20} /> : null} {loading ? "注册中..." : "注册并登录"}
                </button>
             </div>
          )}

          <div className="my-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-gray-200"></div>
            <span className="text-xs font-medium text-gray-400">其他方式登录</span>
            <div className="h-px flex-1 bg-gray-200"></div>
          </div>
          
          <button onClick={handleGoToLogin} className="group flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all">
            <MessageCircle size={20} className="text-green-600 group-hover:scale-110 transition-transform" /> 微信一键登录 / 已有账号登录
          </button>
        </div>
      </div>
      <CaptchaModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onVerify={handleCaptchaVerify} />
    </div>
  );
}