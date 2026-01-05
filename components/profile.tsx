'use client';

import { useState, useEffect, useRef } from 'react';
import useSWR, { mutate } from 'swr';
import { useSession, signOut } from 'next-auth/react';
import { 
  User, Mail, Phone, LogOut, LogIn, 
  Loader2, Github, MessageCircle, Edit2, Save, X, Link as LinkIcon, Unlink,
  UploadCloud, Lock, Eye, EyeOff // 
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner'; 

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ProfileProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    type?: string; 
  } | null;
}

export function Profile({ user: sessionUser }: ProfileProps) {
  const { update } = useSession();
  const { data: userDetails, isLoading } = useSWR('/api/user/details', fetcher);
  
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const organization = process.env.NEXT_PUBLIC_CASDOOR_ORGANIZATION || "";
  
  // === 修改密码相关状态 ===
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  
  // ✅ 1. 密码表单状态 (包含确认密码)
  const [passwordForm, setPasswordForm] = useState({ 
    oldPassword: '', 
    newPassword: '', 
    confirmPassword: '' 
  });

  // ✅ 2. 密码可见性状态
  const [showOldPass, setShowOldPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  
  // @ts-ignore 
  const isGuest = sessionUser?.type === 'guest';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    email: '',
    avatar: '',
    wechat: '',
    github: '',
  });

  useEffect(() => {
    if (userDetails) {
      setFormData({
        displayName: userDetails.displayName || userDetails.name || '',
        phone: userDetails.phone || '',
        email: userDetails.email || '', 
        avatar: userDetails.avatar || '',
        wechat: userDetails.wechat || '', 
        github: userDetails.github || '',
      });
    }
  }, [userDetails]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        toast.error("Please select an image file.");
        return;
    }
    if (file.size > 2 * 1024 * 1024) { 
        toast.error("Image size should be less than 2MB.");
        return;
    }

    setIsUploading(true);
    const uploadData = new FormData();
    uploadData.append('file', file);

    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: uploadData,
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Upload failed");
        setFormData(prev => ({ ...prev, avatar: data.url }));
        toast.success("Image uploaded! Don't forget to click 'Save'.");
    } catch (error: any) {
        console.error(error);
        toast.error(error.message || "Failed to upload image.");
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ✅ 处理修改密码提交
  const handleChangePassword = async () => {
    const { oldPassword, newPassword, confirmPassword } = passwordForm;

    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    // ✅ 验证两次密码是否一致
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          oldPassword, 
          newPassword // API 不需要 confirmPassword
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      toast.success("Password changed successfully! Please login again.");
      setIsPasswordModalOpen(false);
      // 重置所有状态
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
      setShowOldPass(false);
      setShowNewPass(false);
      setShowConfirmPass(false);

    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/user/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: formData.displayName,
          phone: formData.phone,
          email: formData.email,
          avatar: formData.avatar,
          wechat: formData.wechat,
          github: formData.github,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to update');

      toast.success("Profile updated successfully!");
      setIsEditing(false);
      
      await mutate('/api/user/details'); 
      await update(); 

    } catch (error) {
      console.error(error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (userDetails) {
      setFormData({
        displayName: userDetails.displayName || userDetails.name || '',
        phone: userDetails.phone || '',
        email: userDetails.email || '',
        avatar: userDetails.avatar || '',
        wechat: userDetails.wechat || '',
        github: userDetails.github || '',
      });
    }
  };

  const handleUnlink = (provider: 'wechat' | 'github') => {
    setFormData(prev => ({ ...prev, [provider]: '' }));
    toast.info(`Unlinked ${provider}. Click Save to apply.`);
  };

  const handleLink = (provider: string) => {
    const casdoorUrl = process.env.NEXT_PUBLIC_CASDOOR_SERVER_URL || "";
    window.open(`${casdoorUrl}/account?organization=${encodeURIComponent(organization)}`, '_blank');
  };

  const handleSignIn = async () => {
    setIsLoggingOut(true);
    await signOut({ callbackUrl: '/login' });
  };

  const renderProviderRow = (providerName: string, icon: React.ReactNode, fieldKey: 'wechat' | 'github') => {
    const isLinkedNow = formData[fieldKey] && formData[fieldKey].length > 0;
    
    return (
      <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isLinkedNow ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
            {icon}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-sm">{providerName}</span>
            <span className="text-xs text-muted-foreground">
              {isLinkedNow ? 'Connected' : 'Not Connected'}
            </span>
          </div>
        </div>

        <div>
          {isEditing ? (
            isLinkedNow ? (
              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleUnlink(fieldKey)}>
                <Unlink className="w-4 h-4 mr-1" /> Unlink
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground italic pr-3">Unlinked</span>
            )
          ) : (
            isLinkedNow ? (
              <Badge variant="default" className="bg-green-600 hover:bg-green-600">Linked</Badge>
            ) : (
              <Button variant="outline" size="sm" onClick={() => handleLink(providerName)} disabled={isGuest}>
                <LinkIcon className="w-4 h-4 mr-1" /> Link
              </Button>
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="container max-w-2xl py-6">
      <Card className="shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Account Profile</CardTitle>
              <CardDescription>Manage your account settings.</CardDescription>
            </div>
            {!isLoading && !isGuest && (
              <div>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                    <Edit2 className="mr-2 h-4 w-4" /> Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isSaving}>
                      <X className="mr-2 h-4 w-4" /> Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isSaving}>
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        <Separator />

        <CardContent className="space-y-6 pt-6">
          {/* 头像区域 */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <Avatar className="h-20 w-20 border-2 border-background shadow-sm">
                <AvatarImage src={formData.avatar || sessionUser?.image || ''} className="object-cover" />
                <AvatarFallback>{sessionUser?.name?.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              
              {isEditing && (
                <>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        accept="image/png, image/jpeg, image/gif" 
                        className="hidden" 
                    />
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        className="absolute -bottom-2 -right-2 rounded-full h-8 w-8 p-0 shadow-sm border border-border"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        title="Upload new avatar"
                    >
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                    </Button>
                </>
              )}
            </div>
            
            <div className="text-center sm:text-left space-y-1 flex-1">
              <h2 className="text-xl font-bold">
                {formData.displayName || userDetails?.displayName || sessionUser?.name}
              </h2>
              <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-2">
                 <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">UID</span>
                 <span className="font-medium font-mono">
                    {userDetails?.name || 'Loading...'}
                 </span>
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {isLoading ? (
               <div className="space-y-3">
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-10 w-full" />
               </div>
            ) : userDetails ? (
              <>
                <div className="grid gap-2">
                  <Label>Display Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      name="displayName"
                      readOnly={!isEditing} 
                      value={formData.displayName} 
                      onChange={handleInputChange}
                      className={`pl-9 ${!isEditing ? 'bg-muted/50' : 'bg-background border-primary'}`} 
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      name="email"
                      readOnly={!isEditing} 
                      value={formData.email} 
                      onChange={handleInputChange}
                      className={`pl-9 ${!isEditing ? 'bg-muted/50' : 'bg-background border-primary'}`} 
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      name="phone"
                      readOnly={!isEditing}
                      value={formData.phone}
                      onChange={handleInputChange}
                      className={`pl-9 ${!isEditing ? 'bg-muted/50' : 'bg-background border-primary'}`} 
                    />
                  </div>
                </div>
                
                {/* ✅ 修改密码区域 (包含确认和眼睛) */}
                {!isGuest && (
                    <>
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between p-1">
                        <div>
                        <h3 className="text-sm font-medium">Password</h3>
                        <p className="text-xs text-muted-foreground">Change your account password securely.</p>
                        </div>
                        
                        <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={isEditing}>
                                <Lock className="mr-2 h-4 w-4" /> Change Password
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                            <DialogTitle>Change Password</DialogTitle>
                            <DialogDescription>
                                Enter your current password and define a new one.
                            </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                            
                            {/* Current Password */}
                            <div className="grid gap-2">
                                <Label htmlFor="old-pass">Current Password</Label>
                                <div className="relative">
                                  <Input
                                    id="old-pass"
                                    type={showOldPass ? "text" : "password"}
                                    value={passwordForm.oldPassword}
                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, oldPassword: e.target.value }))}
                                    className="pr-10"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowOldPass(!showOldPass)}
                                  >
                                    {showOldPass ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                                  </Button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div className="grid gap-2">
                                <Label htmlFor="new-pass">New Password</Label>
                                <div className="relative">
                                  <Input
                                    id="new-pass"
                                    type={showNewPass ? "text" : "password"}
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                                    className="pr-10"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowNewPass(!showNewPass)}
                                  >
                                    {showNewPass ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                                  </Button>
                                </div>
                            </div>

                            {/* ✅ Confirm New Password */}
                            <div className="grid gap-2">
                                <Label htmlFor="confirm-pass">Confirm New Password</Label>
                                <div className="relative">
                                  <Input
                                    id="confirm-pass"
                                    type={showConfirmPass ? "text" : "password"}
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                    className="pr-10"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                                  >
                                    {showConfirmPass ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                                  </Button>
                                </div>
                            </div>

                            </div>
                            <DialogFooter>
                            <Button 
                                onClick={handleChangePassword} 
                                disabled={isChangingPassword}
                            >
                                {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update Password
                            </Button>
                            </DialogFooter>
                        </DialogContent>
                        </Dialog>
                    </div>
                    </>
                )}

                <Separator className="my-2" />
                
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">Connected Accounts</h3>
                <div className="grid gap-3">
                  {renderProviderRow("WeChat", <MessageCircle size={16} />, 'wechat')}
                  {renderProviderRow("GitHub", <Github size={16} />, 'github')}
                </div>
              </>
            ) : (
              <div className="text-red-500">Failed to load data</div>
            )}
          </div>
        </CardContent>

        <CardFooter className="bg-muted/10 pt-6">
          {isGuest ? (
            <Button 
              className="w-full sm:w-auto ml-auto gap-2"
              onClick={handleSignIn}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? <Loader2 className="animate-spin" size={16} /> : <LogIn size={16} />}
              Sign In / Register
            </Button>
          ) : (
            <Button 
              variant="destructive" 
              className="w-full sm:w-auto ml-auto gap-2"
              onClick={() => signOut({ callbackUrl: '/' })}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? <Loader2 className="animate-spin" size={16} /> : <LogOut size={16} />}
              Sign Out
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}