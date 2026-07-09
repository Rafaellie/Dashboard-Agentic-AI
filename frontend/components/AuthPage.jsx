import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { supabase } from "../lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2, Github, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AuthPage() {
    const [mode, setMode] = useState('Login')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState(null)
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // useeffect hanya dijalankan pada klien, sehingga antarmuka pengguna dapat ditampilkan dengan aman
    useEffect(() => {
        setMounted(true)
    }, [])

    async function handleLogin(e) {
        e?.preventDefault()
        setLoading(true); setMessage(null)
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        setLoading(false)
        if (error) setMessage({ type: 'error', text: error.message })
        else { window.location.href = '/dashboard/operational' }
    }

    async function handleSignUp(e) {
        e?.preventDefault()
        setLoading(true); setMessage(null)
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
        setLoading(false)
        if (error) setMessage({ type: 'error', text: error.message })
        else setMessage({ type: 'success', text: 'Cek email konfirmasi Anda untuk verifikasi akun.' })
    }

    async function handleGoogleLogin() {
        setLoading(true); setMessage(null)
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/dashboard/operational`
            }
        })
        if (error) {
            setLoading(false)
            setMessage({ type: 'error', text: error.message })
        }
    }

    return (
        <div className="min-h-screen w-full flex justify-center bg-slate-50 dark:bg-slate-950 font-sans overflow-hidden transition-colors duration-500 relative">
            {/* pengalih tema */}
            <div className="absolute top-6 right-6 z-50">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className="rounded-full w-12 h-12 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300"
                >
                    {mounted && (theme === "dark" ? (
                        <Sun className="h-5 w-5 text-yellow-500 rotate-0 scale-100 transition-all" />
                    ) : (
                        <Moon className="h-5 w-5 text-slate-700 rotate-0 scale-100 transition-all" />
                    ))}
                    <span className="sr-only">Toggle theme</span>
                </Button>
            </div>

            <div className="flex w-full max-w-[1440px]">
                {/* sisi kiri */}
                <div className="flex-1 flex items-center justify-center lg:justify-end p-8 lg:pr-15 transition-all">
                    <div className="w-full max-w-[460px]">
                        <Card className="border border-slate-200 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-2xl bg-white dark:bg-slate-900 overflow-hidden transition-colors duration-500">
                            <div className="pt-8 pb-4 px-8 space-y-1">
                                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Dashboard Agentic AI</h1>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Please sign-in to your account</p>
                            </div>

                            <CardHeader className="p-0 border-b border-slate-100 dark:border-slate-800">
                                <div className="flex w-full bg-slate-50/50 dark:bg-slate-800/50 p-1.5 px-8">
                                    <button
                                        onClick={() => setMode('Login')}
                                        className={cn(
                                            "flex-1 py-3 text-sm font-bold transition-all rounded-xl",
                                            mode === 'Login' ? "bg-[#ef4444] text-white shadow-md mx-1" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                        )}
                                    >
                                        Login
                                    </button>
                                    <button
                                        onClick={() => setMode('Sign Up')}
                                        className={cn(
                                            "flex-1 py-3 text-sm font-bold transition-all rounded-xl",
                                            mode === 'Sign Up' ? "bg-[#ef4444] text-white shadow-md mx-1" : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                        )}
                                    >
                                        Sign Up
                                    </button>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-5 pt-8 px-8">
                                {mode === 'Sign Up' && (
                                    <Input
                                        placeholder="Full name"
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                        className="h-12 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 rounded-xl px-4 focus:ring-2 focus:ring-red-500/10 transition-all"
                                    />
                                )}

                                <Input
                                    placeholder="Email"
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="h-12 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 rounded-xl px-4 focus:ring-2 focus:ring-red-500/10 transition-all"
                                />

                                <div className="relative group">
                                    <Input
                                        placeholder="Password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={e => setPassword(e.target.value)}
                                        className="h-12 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 rounded-xl px-4 pr-12 focus:ring-2 focus:ring-red-500/10 transition-all"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                <div className="flex items-center justify-between text-sm py-1">
                                    <label className="flex items-center gap-2 text-slate-500 dark:text-slate-400 cursor-pointer group">
                                        <input type="checkbox" className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-[#ef4444] focus:ring-[#ef4444] dark:bg-slate-950" />
                                        <span className="group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">Remember Me</span>
                                    </label>
                                    <button className="text-[#ef4444] font-medium hover:underline">Forgot Password?</button>
                                </div>

                                {message && (
                                    <div className={cn(
                                        "p-3 rounded-xl text-xs font-bold border text-center animate-in fade-in slide-in-from-top-1",
                                        message.type === 'error' ? "bg-red-50 text-red-600 border-red-100" : "bg-green-50 text-green-600 border-green-100"
                                    )}>
                                        {message.text}
                                    </div>
                                )}

                                <Button
                                    className="w-full h-12 rounded-xl bg-[#ef4444] hover:bg-red-600 text-white font-bold tracking-tight shadow-md shadow-red-100 dark:shadow-red-900/10 transition-transform active:scale-[0.98]"
                                    onClick={mode === 'Login' ? handleLogin : handleSignUp}
                                    disabled={loading}
                                >
                                    {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : mode.toUpperCase()}
                                </Button>

                                <div className="text-center pt-2">
                                    <p className="text-sm text-slate-500">
                                        {mode === 'Login' ? "New on our platform? " : "Already have an account? "}
                                        <button
                                            onClick={() => setMode(mode === 'Login' ? 'Sign Up' : 'Login')}
                                            className="text-[#ef4444] font-bold hover:underline"
                                        >
                                            {mode === 'Login' ? "Create an account" : "Sign in instead"}
                                        </button>
                                    </p>
                                </div>
                            </CardContent>

                             <CardFooter className="flex flex-col space-y-4 pb-8 px-8">
                                <div className="relative w-full flex items-center">
                                    <div className="flex-1 border-t border-slate-100 dark:border-slate-800"></div>
                                    <span className="px-4 text-[10px] uppercase tracking-widest text-slate-300 font-bold">or</span>
                                    <div className="flex-1 border-t border-slate-100 dark:border-slate-800"></div>
                                </div>

                                <Button
                                    variant="outline"
                                    onClick={handleGoogleLogin}
                                    disabled={loading}
                                    className="w-full h-12 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 gap-3 text-sm font-bold text-slate-600 dark:text-slate-300 transition-colors"
                                >
                                    {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : (
                                        <svg width="18" height="18" viewBox="0 0 18 18">
                                            <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
                                            <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
                                            <path fill="#FBBC05" d="M3.964 10.705A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.705V4.963H.957A8.996 8.996 0 0 0 0 9c0 1.482.36 2.884.957 4.132l3.007-2.427z" />
                                            <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.443 2.043.957 4.963L3.964 7.295C4.672 5.168 6.656 3.58 9 3.58z" />
                                        </svg>
                                    )}
                                    Sign in with Google
                                </Button>

                                <p className="text-center text-[10px] font-bold text-slate-300 mt-4">
                                    ©2026 All rights reserved
                                </p>
                            </CardFooter>
                        </Card>
                    </div>
                </div>

                {/* sisi kanan */}
                <div className="hidden lg:flex flex-1 items-center justify-center lg:justify-start p-8 lg:pl-16 bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
                    <div className="relative w-full max-w-[620px] aspect-[4/5] rounded-[3rem] overflow-hidden shadow-[0_25px_70px_-15px_rgba(0,0,0,0.15)] dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.4)] group">
                        <img
                            src="/empty-business-office-with-cubicles-used-organizational-activity-efficiency.jpg"
                            alt="Advanced Analytics Dashboard"
                            className="w-full h-full object-cover transition-transform duration-[3000ms] group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-60"></div>
                        <div className="absolute bottom-10 left-10 right-10 p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-white transform transition-transform duration-700 group-hover:translate-y-[-5px]">
                            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">System Intelligence</p>
                            <h3 className="text-xl font-black leading-tight tracking-tight">Empowering Decision Making through Agentic Orchestration</h3>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
