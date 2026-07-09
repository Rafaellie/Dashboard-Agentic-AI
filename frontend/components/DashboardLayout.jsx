import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { LayoutDashboard, Rocket, TableProperties, LogOut, Moon, Sun, ChevronLeft, ChevronRight, Database, Users, Store, Package, Settings, Bell, AlertTriangle, AlertCircle, CheckCircle2, User, X, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

let globalCachedUser = null;

export default function DashboardLayout({ children }) {
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    const [isCollapsed, setIsCollapsed] = useState(false);
    const [user, setUser] = useState(globalCachedUser);
    const [alerts, setAlerts] = useState([]);
    const [dismissedAlerts, setDismissedAlerts] = useState([]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedDismissed = localStorage.getItem('dismissedAlerts');
            if (savedDismissed) {
                try {
                    setDismissedAlerts(JSON.parse(savedDismissed));
                } catch(e) {}
            }
        }
    }, []);

    const dismissAlert = (id) => {
        setAlerts(prev => prev.filter(a => a.id !== id));
        setDismissedAlerts(prev => {
            const newDismissed = [...prev, id];
            localStorage.setItem('dismissedAlerts', JSON.stringify(newDismissed));
            return newDismissed;
        });
    };

    // ambil notifikasi kpi global
    useEffect(() => {
        const fetchGlobalAlerts = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            const savedDismissedStr = localStorage.getItem('dismissedAlerts');
            const currentDismissed = savedDismissedStr ? JSON.parse(savedDismissedStr) : [];
            const today = new Date().toISOString().split('T')[0];

            const dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const dateTo = new Date().toISOString().split('T')[0];

            try {
                const resMock = await fetch('http://localhost:8000/api/ingestion/data');
                const resultMock = await resMock.json();
                
                let finalData = resultMock.status === 'success' ? resultMock.data : null;
                
                try {
                    const resReal = await fetch(`http://localhost:8000/api/dashboard/kpi?date_from=${dateFrom}&date_to=${dateTo}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (resReal.ok) {
                        const realData = await resReal.json();
                        if (finalData && realData.kpi) {
                            finalData.kpis.critical_stock = realData.kpi.total_waste;
                        }
                    }
                } catch (e) {}

                if (finalData) {
                    const { kpis, charts } = finalData;
                    let newAlerts = [];
                    if (kpis.critical_stock > 0) {
                        newAlerts.push({
                            id: `stock-${today}`,
                            type: 'danger',
                            title: 'Critical Stock Detection',
                            message: `Detected ${kpis.critical_stock} items below safety limit across ${kpis.active_branches || 0} branches.`,
                            aiRecommendation: "Rekomendasi AI: Segera lakukan restock ke supplier utama atau pindahkan stok dari gudang regional terdekat.",
                            actionLabel: 'Restock Now',
                            actionHref: '/master/products'
                        });
                    }
                    if (charts.inventory_velocity?.days_remaining < 5) {
                        newAlerts.push({
                            id: `velocity-${today}`,
                            type: 'danger',
                            title: 'Inventory Velocity Warning',
                            message: `Only ${charts.inventory_velocity.days_remaining} days of stock remaining based on current sales velocity.`,
                            aiRecommendation: "Rekomendasi AI: Tunda kampanye promosi baru untuk mencegah stock-out sebelum restock tiba.",
                            actionLabel: 'View Logistics',
                            actionHref: '/dashboard/operational'
                        });
                    }
                    const lowMarginBranches = charts.regional_profit?.filter(b => b.Margin < 30) || [];
                    if (lowMarginBranches.length > 0) {
                        newAlerts.push({
                            id: `margin-${today}`,
                            type: 'warning',
                            title: 'Low Margin Branch Alert',
                            message: `${lowMarginBranches.length} branches are operating below 30% margin threshold.`,
                            aiRecommendation: "Rekomendasi AI: Tinjau ulang diskon promosi yang sedang berjalan di area ini dan optimalkan efisiensi biaya logistik.",
                            actionLabel: 'Analyze Branch',
                            actionHref: '/dashboard/strategic'
                        });
                    }
                    
                    // saring notifikasi yang sudah diabaikan
                    newAlerts = newAlerts.filter(a => !currentDismissed.includes(a.id));

                    if (newAlerts.length === 0) {
                        newAlerts.push({
                            id: 'healthy',
                            type: 'success',
                            title: 'Operational Health: Optimal',
                            message: 'All systems report normal parameters. No critical risks detected.'
                        });
                    }
                    
                    setAlerts(prev => {
                        // tampilkan pemberitahuan toast untuk notifikasi bahaya/peringatan baru yang belum ada sebelumnya
                        newAlerts.forEach(newAlert => {
                            if (newAlert.type !== 'success' && !prev.find(p => p.id === newAlert.id)) {
                                if (newAlert.type === 'danger') {
                                    toast.error(newAlert.title, { description: newAlert.message });
                                } else {
                                    toast.warning(newAlert.title, { description: newAlert.message });
                                }
                            }
                        });
                        return newAlerts;
                    });
                }
            } catch (err) {
                console.error("Failed to fetch global alerts", err);
            }
        };

        if (mounted) {
            fetchGlobalAlerts();
            const interval = setInterval(fetchGlobalAlerts, 60000); // perbarui data setiap menit
            return () => clearInterval(interval);
        }
    }, [mounted]);

    // mencegah kesalahan hidrasi dan menangani tata letak atau autentikasi
    useEffect(() => {
        setMounted(true);
        if (router.pathname.includes('drilldown')) {
            setIsCollapsed(true);
        }
    }, [router.pathname, router]);

    // validasi sesi dan pemeriksaan role
    useEffect(() => {
        if (!mounted) return;

        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }

        const fetchUserProfile = async () => {
            try {
                const res = await fetch('http://localhost:8000/api/master/users/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (res.status === 401 || res.status === 403) {
                    const data = await res.json().catch(() => ({}));
                    toast.error(data.detail || "Sesi login kedaluwarsa atau tidak valid. Silakan login kembali.");
                    localStorage.removeItem('token');
                    localStorage.removeItem('user_profile');
                    globalCachedUser = null;
                    setUser(null);
                    router.push('/login');
                    return;
                }
                if (res.ok) {
                    const profile = await res.json();
                    if (profile.role === 'kasir') {
                        toast.error("Kasir tidak memiliki akses ke dashboard. Silakan hubungi Administrator.");
                        localStorage.removeItem('token');
                        localStorage.removeItem('user_profile');
                        globalCachedUser = null;
                        setUser(null);
                        router.push('/login');
                        return;
                    }
                    setUser(profile);
                    globalCachedUser = profile;
                    localStorage.setItem('user_profile', JSON.stringify(profile));
                } else {
                    toast.error("Gagal mengambil data profil.");
                }
            } catch (err) {
                console.error("Fetch profile error:", err);
            }
        };

        // muat dari localstorage jika tersedia, jika tidak ambil dari server
        const cached = localStorage.getItem('user_profile');
        if (cached && !globalCachedUser) {
            try {
                const parsed = JSON.parse(cached);
                setUser(parsed);
                globalCachedUser = parsed;
            } catch (e) {}
        }

        // selalu periksa profil di latar belakang secara diam-diam
        fetchUserProfile();
    }, [mounted, router]);

    // proteksi rute
    useEffect(() => {
        if (!user) return;

        const roleRoutes = {
            admin: [
                "/dashboard/operational",
                "/dashboard/strategic",
                "/dashboard/drilldown",
                "/data-integration",
                "/master/users",
                "/master/branches",
                "/master/products",
                "/settings"
            ],
            manager: [
                "/dashboard/operational",
                "/dashboard/drilldown",
                "/settings"
            ],
            csuite: [
                "/dashboard/strategic",
                "/dashboard/operational",
                "/settings"
            ]
        };

        const allowed = roleRoutes[user.role] || [];
        const isPathAllowed = allowed.some(route => 
            router.pathname === route || router.pathname.startsWith(route + '/')
        );

        if (!isPathAllowed) {
            toast.error("Anda tidak memiliki akses ke halaman ini.");
            
            // alihkan ke halaman beranda default
            if (user.role === 'csuite') {
                router.push('/dashboard/strategic');
            } else {
                router.push('/dashboard/operational');
            }
        }
    }, [user, router.pathname]);

    const navItems = [
        {
            href: "/dashboard/operational",
            label: "Daily Operational",
            icon: LayoutDashboard,
        },
        {
            href: "/dashboard/strategic",
            label: "Strategic Business",
            icon: Rocket,
        },
        {
            href: "/dashboard/drilldown",
            label: "Excel Drill Down",
            icon: TableProperties,
        },
        {
            href: "/data-integration",
            label: "Data Integration",
            icon: Database,
        },
        {
            href: "/master/users",
            label: "User Management",
            icon: Users,
        },
        {
            href: "/master/branches",
            label: "Branch Management",
            icon: Store,
        },
        {
            href: "/master/products",
            label: "Product Management",
            icon: Package,
        },
        {
            href: "/settings",
            label: "Settings",
            icon: Settings,
        },
    ];

    const roleRoutesList = {
        admin: [
            "/dashboard/operational",
            "/dashboard/strategic",
            "/dashboard/drilldown",
            "/data-integration",
            "/master/users",
            "/master/branches",
            "/master/products",
            "/settings"
        ],
        manager: [
            "/dashboard/operational",
            "/dashboard/drilldown",
            "/settings"
        ],
        csuite: [
            "/dashboard/strategic",
            "/dashboard/operational",
            "/settings"
        ]
    };

    const allowedPaths = user ? (roleRoutesList[user.role] || []) : [];
    const filteredNavItems = navItems.filter(item => allowedPaths.includes(item.href));

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 transition-colors duration-500">
            {/* panel samping */}
            <aside className={cn(
                "border-r flex flex-col shadow-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 transition-all duration-500 z-30 relative shrink-0",
                isCollapsed ? "w-[80px]" : "w-64"
            )}>
                {/* pengalih ciutkan */}
                <button 
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3.5 top-8 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full p-1.5 text-slate-400 hover:text-red-500 dark:hover:text-red-400 shadow-md z-40 cursor-pointer transition-colors"
                >
                    {isCollapsed ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
                </button>

                <div className={cn("p-8 font-bold text-red-600 transition-all duration-500 whitespace-nowrap overflow-hidden flex items-center justify-center", isCollapsed ? "text-xl px-0" : "text-2xl")}>
                    {isCollapsed ? "BZ" : "BizAgent"}
                </div>

                <nav className={cn("flex-1 space-y-3 py-4 transition-all duration-500", isCollapsed ? "px-2" : "px-4")}>
                    {filteredNavItems.map((item) => (
                        <Link key={item.href} href={item.href} className="block" title={isCollapsed ? item.label : undefined}>
                            <Button
                                variant="ghost"
                                className={cn(
                                    "h-12 rounded-xl border border-transparent transition-all duration-300 w-full",
                                    isCollapsed ? "justify-center px-0" : "justify-start gap-3 px-4",
                                    router.pathname === item.href
                                        ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/20 shadow-sm dark:shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-100 hover:text-slate-900 dark:hover:text-slate-100"
                                )}
                            >
                                <item.icon
                                    size={isCollapsed ? 22 : 18}
                                    className={cn("shrink-0 transition-all duration-300", router.pathname === item.href ? "text-red-600 dark:text-red-400" : "text-slate-500")}
                                />
                                {!isCollapsed && <span className="font-bold tracking-tight text-sm truncate">{item.label}</span>}
                            </Button>
                        </Link>
                    ))}
                </nav>

                <div className={cn("p-4 space-y-2 border-t border-slate-100 dark:border-slate-800 transition-all duration-500 flex flex-col items-center", isCollapsed ? "px-2" : "px-4")}>
                    <Button
                        variant="ghost"
                        title={isCollapsed ? "Toggle Theme" : undefined}
                        className={cn(
                            "h-12 rounded-xl transition-all duration-300 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-yellow-500 dark:hover:text-yellow-400 relative overflow-hidden group w-full",
                            isCollapsed ? "justify-center px-0" : "justify-start gap-3"
                        )}
                        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    >
                        {!mounted ? (
                             <div className="w-5 h-5 animate-pulse bg-slate-200 dark:bg-slate-800 rounded-full shrink-0" />
                        ) : (
                            <>
                                <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
                                    <Sun
                                        size={isCollapsed ? 20 : 18}
                                        className={cn(
                                            "transition-all duration-500 ease-in-out",
                                            theme === 'dark' 
                                                ? "scale-100 rotate-0 opacity-100 text-yellow-400" 
                                                : "scale-0 -rotate-90 opacity-0"
                                        )}
                                    />
                                    <Moon
                                        size={isCollapsed ? 20 : 18}
                                        className={cn(
                                            "absolute transition-all duration-500 ease-in-out",
                                            theme === 'dark' 
                                                ? "scale-0 rotate-90 opacity-0" 
                                                : "scale-100 rotate-0 opacity-100 text-slate-400"
                                        )}
                                    />
                                </div>
                                {!isCollapsed && (
                                    <span className="font-bold text-sm transition-all duration-300 truncate">
                                        {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                                    </span>
                                )}
                            </>
                        )}
                    </Button>
                </div>
            </aside>

            {/* area konten utama */}
            <main className="flex-1 flex flex-col overflow-auto scrollbar-hide bg-slate-50/50 dark:bg-slate-950 transition-colors duration-500 relative">
                {/* topbar */}
                <header className="h-16 shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm sticky top-0 z-20 flex items-center justify-between px-6 shadow-sm">
                    <div className="flex items-center gap-2">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 text-sm flex items-center gap-2">
                            <span className="text-slate-500">Dashboard</span>
                            <ChevronRight className="h-4 w-4 text-slate-400" />
                            <span className="text-red-600 dark:text-red-500 capitalize">{router.pathname.split('/').pop().replace('-', ' ') || 'Overview'}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex flex-col items-end mr-2">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{user?.full_name || 'Loading...'}</span>
                            <span className="text-xs text-slate-500">{user?.email || ''}</span>
                        </div>
                        <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="icon" className="relative rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700">
                                <Bell className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                                {alerts.some(a => a.type !== 'success') && (
                                    <span className="absolute top-0 right-0 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0 mr-6 mt-2" align="end">
                            <div className="flex flex-col">
                                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                    <h4 className="font-bold text-slate-900 dark:text-slate-100">Notifications</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">You have {alerts.filter(a => a.type !== 'success').length} unread alerts.</p>
                                </div>
                                <div className="max-h-[300px] overflow-auto scrollbar-hide divide-y divide-slate-100 dark:divide-slate-800">
                                    {alerts.map(alert => {
                                        const isDanger = alert.type === 'danger';
                                        const isWarning = alert.type === 'warning';
                                        const Icon = isDanger ? AlertCircle : isWarning ? AlertTriangle : CheckCircle2;
                                        
                                        return (
                                            <div key={alert.id} className="p-4 flex gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group relative">
                                                {alert.type !== 'success' && (
                                                    <button 
                                                        onClick={() => dismissAlert(alert.id)}
                                                        className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-slate-800 rounded-full p-0.5 shadow-sm border border-slate-100 dark:border-slate-700 z-10"
                                                        title="Dismiss"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                                <div className={cn("mt-0.5 shrink-0 rounded-full p-1 h-fit", isDanger ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" : isWarning ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400")}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div className="flex flex-col gap-1 w-full pr-4">
                                                    <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100">{alert.title}</h5>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{alert.message}</p>
                                                    {alert.aiRecommendation && (
                                                        <div className="mt-1.5 p-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-md">
                                                            <div className="flex items-center gap-1.5 mb-1">
                                                                <Rocket className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                                                                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">AI Insight</span>
                                                            </div>
                                                            <p className="text-xs text-indigo-700 dark:text-indigo-300 leading-snug">{alert.aiRecommendation.replace("Rekomendasi AI: ", "")}</p>
                                                        </div>
                                                    )}
                                                    {alert.actionLabel && alert.actionHref && (
                                                        <Button 
                                                            variant="default" 
                                                            size="sm" 
                                                            className={cn("mt-2 w-fit h-7 text-xs px-3", isDanger ? "bg-red-600 hover:bg-red-700 text-white" : "bg-amber-600 hover:bg-amber-700 text-white")}
                                                            onClick={() => router.push(alert.actionHref)}
                                                        >
                                                            {alert.actionLabel}
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                    <DropdownMenu>
                        <DropdownMenuTrigger className="outline-none">
                            <div className="h-9 w-9 rounded-full bg-red-100 dark:bg-red-900/40 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-sm shadow-sm cursor-pointer hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors">
                                {user?.full_name ? user.full_name[0].toUpperCase() : 'U'}
                            </div>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 mt-2">
                            <DropdownMenuLabel>My Account</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => router.push('/settings')}>
                                <User className="h-4 w-4 text-slate-500" />
                                <span>Profile</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => router.push('/settings')}>
                                <Settings className="h-4 w-4 text-slate-500" />
                                <span>Settings</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                                className="cursor-pointer gap-2 text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/50"
                                onClick={async () => {
                                    try {
                                        const { supabase } = await import("@/lib/supabase");
                                        await supabase.auth.signOut();
                                    } catch (e) {
                                        console.error(e);
                                    }
                                    localStorage.removeItem('token');
                                    localStorage.removeItem('user_profile');
                                    globalCachedUser = null;
                                    setUser(null);
                                    router.push('/');
                                }}
                            >
                                <LogOut className="h-4 w-4" />
                                <span>Log out</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </header>
                
                <div className="flex-1 overflow-auto scrollbar-hide">
                    {children}
                </div>
            </main>
        </div>
    );
}
