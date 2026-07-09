import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, ShieldCheck, KeyRound, User, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function SettingsPage() {
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    // dapatkan sesi user saat ini
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email || '');
      }
      
      // ambil data profil dari backend untuk mengetahui role
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await fetch('http://localhost:8000/api/master/users/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const me = await res.json();
            if (me) {
              setUserRole(me.role);
            }
          }
        } catch (err) {
          console.error("Failed to fetch profile", err);
        }
      }
    };
    
    fetchSession();
  }, []);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (passwordForm.newPassword.length < 6) {
      setErrorMsg('Password baru harus minimal 6 karakter.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setErrorMsg('Konfirmasi password tidak cocok.');
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) {
        throw new Error(error.message);
      }

      setSuccessMsg('Password berhasil diubah! Silakan gunakan password baru pada login berikutnya.');
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      
    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat mengubah password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <Head>
        <title>Settings & Profile | Agentic BI</title>
      </Head>

      <div className="p-8 max-w-5xl mx-auto space-y-8 min-h-screen">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Settings & Profile</h2>
          <p className="text-muted-foreground mt-1">Atur preferensi akun dan keamanan Anda di sini.</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="bg-muted p-1">
            <TabsTrigger value="profile" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <User className="h-4 w-4 mr-2" /> Profil Saya
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <ShieldCheck className="h-4 w-4 mr-2" /> Keamanan Akun
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="border-border shadow-xl bg-card/60 backdrop-blur-xl">
              <CardHeader className="border-b border-border/50 pb-6">
                <CardTitle>Informasi Akun</CardTitle>
                <CardDescription>Detail akun Anda yang terdaftar pada sistem.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex items-start gap-6">
                  <Avatar className="h-24 w-24 border-4 border-muted shadow-sm">
                    <AvatarFallback className="bg-blue-100 text-blue-700 text-2xl font-bold">
                      {userEmail ? userEmail.charAt(0).toUpperCase() : 'HQ'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-4 flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Alamat Email</Label>
                        <div className="font-medium text-foreground text-lg">
                          {userEmail || 'Memuat...'}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground">Peran (Role)</Label>
                        <div>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            {userRole ? userRole.toUpperCase() : 'ADMIN'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card className="border-border shadow-xl bg-card/60 backdrop-blur-xl">
              <CardHeader className="border-b border-border/50 pb-6">
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-foreground" />
                  Ubah Password
                </CardTitle>
                <CardDescription>
                  Pastikan akun Anda menggunakan kombinasi password yang kuat dan aman.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 max-w-xl">
                
                {errorMsg && (
                  <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg flex items-start gap-3 border border-red-200 animate-in fade-in">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <span className="font-medium">{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="mb-6 bg-emerald-50 text-emerald-700 p-4 rounded-lg flex items-start gap-3 border border-emerald-200 animate-in fade-in">
                    <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-500" />
                    <span className="font-medium">{successMsg}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordChange} className="space-y-5">
                  <div className="space-y-2">
                    <Label>Password Baru</Label>
                    <Input 
                      type="password" 
                      placeholder="Minimal 6 karakter" 
                      required
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      className="bg-background/50"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Konfirmasi Password Baru</Label>
                    <Input 
                      type="password" 
                      placeholder="Ulangi password baru" 
                      required
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      className="bg-background/50"
                    />
                  </div>

                  <div className="pt-2">
                    <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2"/>
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Simpan Password Baru
                    </Button>
                  </div>
                </form>

              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
