"use client";

import { useState, useEffect } from "react";
import { X, RefreshCw } from "lucide-react";

interface CaptchaModalProps {
  isOpen: boolean;
  onClose: () => void;
  // ✅ 回调函数变了：同时传回 验证码(token) 和 核心ID(id)
  onVerify: (token: string, id: string) => void; 
}

export default function CaptchaModal({ isOpen, onClose, onVerify }: CaptchaModalProps) {
  const [captchaImage, setCaptchaImage] = useState("");
  const [captchaId, setCaptchaId] = useState(""); // 💾 存ID的地方
  const [captchaToken, setCaptchaToken] = useState("");
  const [loading, setLoading] = useState(true);
  const appId = process.env.NEXT_PUBLIC_CASDOOR_APPLICATION_ID || "";

  const fetchCaptcha = async () => {
    if (!isOpen) return;
    setLoading(true);
    setCaptchaToken(""); // 清空输入

    try {
      const timestamp = new Date().getTime();
      const res = await fetch(
        `/casdoor-api/get-captcha?applicationId=${encodeURIComponent(appId)}&isCurrentProvider=false&t=${timestamp}`
      );
      const data = await res.json();
      
      // ✅ 关键：拿到 ID 并存起来
      if (data.data?.captchaId) {
        setCaptchaId(data.data.captchaId);
      }

      if (data.data?.captchaImage) {
        setCaptchaImage(`data:image/png;base64,${data.data.captchaImage}`);
      }
    } catch (error) {
      console.error("加载验证码失败", error);
    } finally {
      setLoading(false);
    }
  };

  // 弹窗打开时自动刷新
  useEffect(() => {
    if (isOpen) fetchCaptcha();
  }, [isOpen]);

  const handleSubmit = () => {
    if (!captchaToken) return;
    if (!captchaId) {
        alert("验证码加载异常，请点击图片刷新");
        return;
    }
    // ✅ 把 答案 和 试卷ID 一起交上去
    onVerify(captchaToken, captchaId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <h3 className="mb-4 text-lg font-semibold text-gray-900">安全验证</h3>
        
        <div className="space-y-4">
          {/* 图片区域 */}
          <div 
            className="relative flex h-16 w-full cursor-pointer items-center justify-center rounded border bg-gray-50 hover:bg-gray-100"
            onClick={fetchCaptcha}
          >
            {loading ? <span className="text-sm text-gray-500">加载中...</span> : 
             captchaImage ? <img src={captchaImage} className="h-full object-contain" /> :
             <span className="text-sm text-red-400">加载失败</span>}
            <div className="absolute right-2 top-2"><RefreshCw size={14} className="text-gray-400"/></div>
          </div>

          <input
            type="text"
            value={captchaToken}
            onChange={(e) => setCaptchaToken(e.target.value)}
            placeholder="请输入图形验证码"
            className="w-full rounded border p-2 text-center text-lg tracking-widest outline-none focus:border-black"
            autoFocus
            // 允许回车提交
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />

          <button
            onClick={handleSubmit}
            disabled={!captchaToken}
            className="w-full rounded bg-black py-2.5 text-white disabled:opacity-50 hover:bg-gray-800"
          >
            确认发送
          </button>
        </div>
      </div>
    </div>
  );
}