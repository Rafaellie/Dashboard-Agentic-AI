"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Line, ComposedChart, Legend, AreaChart, Area, Label
} from "recharts";
import DashboardLayout from "@/components/DashboardLayout";
import {
    Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter
} from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { useTheme } from "next-themes";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    TrendingUp, Package, MapPin, AlertCircle, UploadCloud, Loader2,
    Users, ShoppingCart, Activity, Target, Trophy, Zap, TrendingUpIcon,
    AlertTriangleIcon, CircleCheckIcon, CircleAlertIcon
} from "lucide-react";
import {
    Alert,
    AlertTitle,
    AlertDescription,
} from "@/components/reui/alert";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
} from "@/components/ui/chart";
import { Badge as ReBadge } from "@/components/reui/badge";

const chartConfig = {
    revenue: {
        label: "Revenue",
        color: "var(--chart-3)",
    },
    male: {
        label: "Male (L)",
        color: "var(--chart-2)",
    },
    female: {
        label: "Female (P)",
        color: "var(--chart-2)",
    },
    transactions: {
        label: "Transactions",
        color: "#f97316",
    },
};

const CustomGradientBar = (props) => {
    const { fill, x, y, width, height, dataKey } = props;
    return (
        <>
            <defs>
                <linearGradient id={`gradient-bar-pattern-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={fill} stopOpacity={0.7} />
                    <stop offset="50%" stopColor={fill} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={fill} stopOpacity={0.2} />
                </linearGradient>
            </defs>
            <rect x={x} y={y} width={width} height={height} stroke="none" fill={`url(#gradient-bar-pattern-${dataKey})`} rx="6" ry="6" />
        </>
    );
};

export default function OperationalBI() {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";

    // gaya chart untuk tema gelap/terang
    const chartStyles = {
        grid: isDark ? "#1e293b" : "#f1f5f9",
        text: isDark ? "#94a3b8" : "#64748b",
        tooltip: isDark ? "#0f172a" : "#ffffff",
        tooltipText: isDark ? "#f8fafc" : "#0f172a",
    };

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('sales'); // sales, logistics, management
    const [data, setData] = useState(null);

    const getAuthHeaders = () => {
        let token = '';
        if (typeof window !== 'undefined') {
            token = localStorage.getItem('token') || '';
        }
        return {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };
    };

    const cleanWasteAnalysis = (data) => {
        if (!data) return [];
        const categoryMapping = {
            'kadaluarsa': 'Expired',
            'expired': 'Expired',
            'kesalahan masak': 'Salah Masak',
            'salah masak': 'Salah Masak',
            'kualitas buruk': 'Kualitas Buruk',
            'rusak kemasan': 'Rusak Kemasan',
            'tumpah': 'Tumpah',
            'sisa display': 'Sisa Display',
        };
        const grouped = {};
        data.forEach(item => {
            const rawName = (item.name || '').toLowerCase().trim();
            const cleanName = categoryMapping[rawName] || item.name;
            if (!grouped[cleanName]) grouped[cleanName] = 0;
            grouped[cleanName] += item.value;
        });
        return Object.keys(grouped).map(key => ({ name: key, value: grouped[key] })).sort((a, b) => b.value - a.value);
    };

    const fetchData = async () => {
        try {
            const dateFrom = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const dateTo = new Date().toISOString().split('T')[0];
            
            const resReal = await fetch(`http://localhost:8000/api/dashboard/kpi?date_from=${dateFrom}&date_to=${dateTo}`, {
                headers: getAuthHeaders()
            });
            
            if (resReal.ok) {
                const realData = await resReal.json();
                const rKpi = realData.kpi;
                const rCharts = realData.charts;
                
                const monthlyData = {};
                (rCharts.trend_revenue || []).forEach(tr => {
                    const d = new Date(tr.date || tr.trx_date);
                    const monthKey = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
                    if (!monthlyData[monthKey]) {
                        monthlyData[monthKey] = 0;
                    }
                    monthlyData[monthKey] += tr.revenue;
                });
                const monthly_revenue = Object.keys(monthlyData).map(key => ({
                    month: key,
                    revenue: monthlyData[key]
                }));

                const dbData = {
                    kpis: {
                        total_sales: rKpi.total_revenue || 0,
                        total_profit: rKpi.net_profit || 0,
                        avg_margin: rKpi.margin_percentage || 0,
                        critical_stock: rKpi.critical_stock || 0,
                        active_branches: rKpi.active_branches || 0
                    },
                    charts: {
                        profit_by_channel: (rCharts.breakdown_channel || []).map(ch => ({
                            Sales_Channel: ch.name,
                            Total_Sales: ch.value,
                            Net_Profit: ch.value * ((rKpi.margin_percentage || 0) / 100)
                        })),
                        monthly_revenue: monthly_revenue,
                        demographic_pattern: rCharts.demographic_pattern || [],
                        waste_analysis: cleanWasteAnalysis(rCharts.waste_analysis),
                        hourly_peak: rCharts.hourly_peak || [],
                        affinity: rCharts.affinity || [],
                        inventory_velocity: rCharts.inventory_velocity || {
                            avg_stock: 0,
                            days_remaining: 0,
                            is_critical: false,
                            bom_mapping: []
                        },
                        regional_profit: rCharts.regional_profit || [],
                        sku_leaderboard: rCharts.sku_leaderboard || []
                    },
                    operational_data: []
                };
                
                setData(dbData);
            }
        } catch (err) {
            console.error("Fetch failed", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    if (loading) {
        return (
            <DashboardLayout>
                <div className="flex h-[80vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-red-600" />
                    <span className="ml-3 font-bold text-slate-600 dark:text-slate-400 italic">Initializing Dashboard Intelligence...</span>
                </div>
            </DashboardLayout>
        );
    }

    if (!data) {
        return (
            <DashboardLayout>
                <div className="flex flex-col h-[80vh] items-center justify-center space-y-4">
                    <AlertCircle className="h-12 w-12 text-red-500" />
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">Failed to load data</h2>
                    <p className="text-slate-500 text-center max-w-md">There was a problem fetching the dashboard metrics. The uploaded data file might be incompatible or the server encountered an error.</p>
                </div>
            </DashboardLayout>
        );
    }

    const { kpis, charts, operational_data } = data;

    return (
        <DashboardLayout>
            <div className="p-6 space-y-6 bg-transparent min-h-screen flex flex-col">
                {/* header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">Operational Intelligence Dashboard</h1>
                        <p className="text-muted-foreground dark:text-slate-400 mt-1">Real-time analytical visibility across departments.</p>
                    </div>
                    <div className="flex bg-white dark:bg-slate-900 p-1 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 transition-colors duration-300">
                        <button
                            onClick={() => setActiveTab('sales')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'sales' ? 'bg-[#ef4444] text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                            Sales & Marketing
                        </button>
                        <button
                            onClick={() => setActiveTab('logistics')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'logistics' ? 'bg-[#ef4444] text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                            Logistic & Inventory
                        </button>
                        <button
                            onClick={() => setActiveTab('management')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'management' ? 'bg-[#ef4444] text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                            Management View
                        </button>
                    </div>
                </div>

                {/* baris kpi */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border border-slate-300 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950">
                        <CardHeader className="pb-1">
                            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">Total Sales Revenue</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-slate-900 dark:text-slate-50">Rp {kpis.total_sales.toLocaleString()}</div>
                            <div className="mt-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Gross Revenue</div>
                        </CardContent>
                    </Card>
                    <Card className="border border-slate-300 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950">
                        <CardHeader className="pb-1">
                            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">Net Profit</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-slate-900 dark:text-slate-50">Rp {kpis.total_profit.toLocaleString()}</div>
                            <div className={`mt-1 text-[10px] font-bold uppercase ${kpis.avg_margin > 30 ? 'text-blue-500' : 'text-amber-500'}`}>
                                {kpis.avg_margin > 30 ? 'Healthy Margin' : 'Low Margin Analysis'}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-slate-300 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950">
                        <CardHeader className="pb-1">
                            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">Operational Margin</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-slate-900 dark:text-slate-50">{kpis.avg_margin}%</div>
                            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
                                <div className={`h-full ${kpis.avg_margin >= 30 ? 'bg-emerald-500' : kpis.avg_margin >= 15 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${kpis.avg_margin}%` }}></div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-slate-300 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950">
                        <CardHeader className="pb-1">
                            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">Inventory Alerts</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-black text-red-600">{kpis.critical_stock} Critical</div>
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 uppercase">Detected in {kpis.active_branches} branches</p>
                        </CardContent>
                    </Card>
                </div>

                {/* area konten utama */}
                <div className="flex-1 w-full mt-6">
                    <div className="w-full space-y-6">
                        {/* departemen penjualan & pemasaran */}
                        {activeTab === 'sales' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <Card className="border border-slate-300 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-bold">
                                            Real Profitability per Channel
                                        </CardTitle>
                                        <CardDescription className="dark:text-slate-400">Annual sales trend visualization</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={charts.profit_by_channel}>
                                                <defs>
                                                    <pattern
                                                        id="chart5-diagonal-stripe-pattern"
                                                        patternUnits="userSpaceOnUse"
                                                        width="8"
                                                        height="8"
                                                    >
                                                        <rect width="8" height="8" fill="#ef4444" opacity="0.1" />
                                                        <path
                                                            d="M0,8 L8,0 M4,12 L12,4 M-4,4 L4,-4"
                                                            stroke="#ef4444"
                                                            strokeWidth="1.5"
                                                            opacity="0.6"
                                                        />
                                                        <path
                                                            d="M2,10 L10,2 M6,14 L14,6 M-2,6 L6,-2"
                                                            stroke="#ef4444"
                                                            strokeWidth="1"
                                                            opacity="0.3"
                                                        />
                                                    </pattern>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartStyles.grid} />
                                                <XAxis dataKey="Sales_Channel" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: chartStyles.text }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: chartStyles.text }} />
                                                <Tooltip
                                                    contentStyle={{ 
                                                        borderRadius: '12px', 
                                                        border: 'none', 
                                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                                        backgroundColor: chartStyles.tooltip,
                                                        color: chartStyles.tooltipText
                                                    }}
                                                    itemStyle={{ color: chartStyles.tooltipText }}
                                                    formatter={(value) => `Rp ${value.toLocaleString()}`}
                                                />
                                                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                                                <Bar dataKey="Total_Sales" name="Gross Sales" fill="url(#chart5-diagonal-stripe-pattern)" stroke="#ef4444" strokeWidth={1} radius={[6, 6, 0, 0]} barSize={30} />
                                                <Line type="monotone" dataKey="Net_Profit" name="Net Profit" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: "#ef4444", strokeWidth: 2, stroke: isDark ? "#0f172a" : "#fff" }} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card className="border border-slate-300 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-bold">
                                            Monthly Revenue
                                        </CardTitle>
                                        <CardDescription className="dark:text-slate-400">
                                            Total pendapatan bisnis per bulan
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer config={chartConfig} className="h-[280px] w-full">
                                            <BarChart
                                                accessibilityLayer
                                                data={charts.monthly_revenue}
                                                margin={{ top: 20, right: 12, bottom: 12, left: 12 }}
                                                barCategoryGap="15%"
                                            >
                                                <XAxis
                                                    dataKey="month"
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickMargin={8}
                                                    tick={{ fontSize: 10, fontWeight: 700, fill: chartStyles.text }}
                                                />
                                                <ChartTooltip
                                                    cursor={false}
                                                    content={
                                                        <ChartTooltipContent
                                                            indicator="dot"
                                                            className="min-w-40 gap-2.5"
                                                            labelFormatter={(value) => (
                                                                <div className="border-border/50 mb-0.5 flex flex-col gap-0.5 border-b pb-2">
                                                                    <span className="text-xs font-medium">{value} 2024</span>
                                                                </div>
                                                            )}
                                                            formatter={(value, name) => (
                                                                <div className="flex w-full items-center justify-between gap-2">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div
                                                                            className="h-2.5 w-2.5 shrink-0 rounded-xs"
                                                                            style={{ backgroundColor: "#ef4444" }}
                                                                        />
                                                                        <span className="text-muted-foreground">Revenue</span>
                                                                    </div>
                                                                    <span className="text-foreground font-semibold">
                                                                        Rp {value.toLocaleString()}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        />
                                                    }
                                                />
                                                <Bar
                                                    dataKey="revenue"
                                                    fill="#ef4444"
                                                    shape={<CustomGradientBar />}
                                                />
                                            </BarChart>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>

                                <Card className="border border-slate-300 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-bold">
                                            Customer Persona Sales
                                        </CardTitle>
                                        <CardDescription className="dark:text-slate-400">Customer loyalty across segments</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ChartContainer config={chartConfig} className="h-[280px] w-full">
                                            <BarChart
                                                accessibilityLayer
                                                data={charts.demographic_pattern}
                                                margin={{ top: 20, right: 12, bottom: 12, left: 12 }}
                                            >
                                                <defs>
                                                    <pattern id="chart6-elegant-dotted-pattern" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
                                                        <rect width="5" height="5" fill="#3b82f6" opacity="0.1" />
                                                        <circle cx="5" cy="5" r="1.4" fill="#3b82f6" opacity={1}></circle>
                                                    </pattern>
                                                </defs>
                                                <XAxis dataKey="age" tickLine={false} axisLine={false} tickMargin={8} tick={{ fontSize: 10, fontWeight: 700, fill: chartStyles.text }} />
                                                <ChartTooltip
                                                    cursor={false}
                                                    content={
                                                        <ChartTooltipContent
                                                            indicator="dot"
                                                            className="min-w-40 gap-2.5"
                                                            labelFormatter={(value) => (
                                                                <div className="border-border/50 mb-0.5 flex flex-col gap-0.5 border-b pb-2">
                                                                    <span className="text-xs font-medium">Age Group: {value}</span>
                                                                </div>
                                                            )}
                                                            formatter={(value, name, item) => (
                                                                <div className="flex w-full flex-col gap-1">
                                                                    <div className="flex w-full items-center justify-between gap-2">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <div
                                                                                className="h-2.5 w-2.5 shrink-0 rounded-xs"
                                                                                style={{ backgroundColor: name === 'male' ? "#3b82f6" : "#60a5fa" }}
                                                                            />
                                                                            <span className="text-muted-foreground">{name === 'male' ? 'Male (L)' : 'Female (P)'}</span>
                                                                        </div>
                                                                        <span className="text-foreground font-semibold">Rp {value.toLocaleString()}</span>
                                                                    </div>
                                                                    <div className="flex w-full items-center justify-between gap-2 pl-4">
                                                                        <span className="text-[10px] text-muted-foreground italic">Total Customers</span>
                                                                        <span className="text-[10px] font-bold text-slate-500">
                                                                            {name === 'male' ? item.payload.male_count : item.payload.female_count} transactions
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        />
                                                    }
                                                />
                                                <Bar
                                                    dataKey="male"
                                                    fill="url(#chart6-elegant-dotted-pattern)"
                                                    stroke="#3b82f6"
                                                    strokeWidth={1}
                                                    radius={[4, 4, 4, 4]}
                                                />
                                                <Bar
                                                    dataKey="female"
                                                    fill="#60a5fa"
                                                    stroke="#60a5fa"
                                                    strokeWidth={1}
                                                    radius={[4, 4, 4, 4]}
                                                />
                                            </BarChart>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>

                                <Card className="border border-slate-300 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-bold">
                                            Cross-sell Affinity
                                        </CardTitle>
                                        <CardDescription className="dark:text-slate-400">Product co-occurrence heatmap for bundling strategy.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[250px] overflow-auto scrollbar-hide">
                                        <div className="grid grid-cols-2 gap-2 mt-2">
                                            {charts.affinity.map((item, idx) => (
                                                <div key={idx} className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30 flex flex-col justify-center items-center text-center">
                                                    <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400">{item.product_a} + {item.product_b}</span>
                                                    <div className="w-full bg-emerald-100 h-1.5 rounded-full mt-2">
                                                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${item.affinity * 100}%` }}></div>
                                                    </div>
                                                    <span className="text-[9px] font-black text-emerald-600 mt-1">{(item.affinity * 100).toFixed(0)}% Match</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {activeTab === 'logistics' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500 items-start">
                                <Card className="md:col-span-2 border border-slate-300 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2 text-lg font-bold">
                                            Peak Hour Operations
                                        </CardTitle>
                                        <CardDescription className="dark:text-slate-400">Hourly transaction frequency analysis for staff optimization.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[350px]">
                                        <ChartContainer config={chartConfig} className="h-full w-full">
                                            <AreaChart
                                                accessibilityLayer
                                                data={charts.hourly_peak}
                                                margin={{ top: 20, right: 10, bottom: 0, left: 10 }}
                                            >
                                                <defs>
                                                    <linearGradient id="chartHour-fill" x1="0" y1="0" x2="0" y2="1">
                                                        <stop
                                                            offset="5%"
                                                            stopColor="var(--color-transactions)"
                                                            stopOpacity={0.35}
                                                        />
                                                        <stop
                                                            offset="95%"
                                                            stopColor="var(--color-transactions)"
                                                            stopOpacity={0}
                                                        />
                                                    </linearGradient>
                                                    <filter
                                                        id="chartHour-dot-glow"
                                                        x="-50%"
                                                        y="-50%"
                                                        width="200%"
                                                        height="200%"
                                                    >
                                                        <feGaussianBlur stdDeviation="3" result="blur" />
                                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                                    </filter>
                                                    <filter
                                                        id="chartHour-line-glow"
                                                        x="-10%"
                                                        y="-20%"
                                                        width="120%"
                                                        height="140%"
                                                    >
                                                        <feGaussianBlur stdDeviation="8" result="blur" />
                                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                                    </filter>
                                                </defs>
                                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={chartStyles.grid} />
                                                <XAxis
                                                    dataKey="hour"
                                                    tickLine={false}
                                                    axisLine={false}
                                                    tickMargin={8}
                                                    tickFormatter={(h) => `${h}:00`}
                                                    tick={{ fontSize: 10, fontWeight: 700, fill: chartStyles.text }}
                                                />
                                                <ChartTooltip
                                                    cursor={false}
                                                    content={
                                                        <ChartTooltipContent
                                                            indicator="dot"
                                                            className="min-w-36 gap-2.5"
                                                            labelFormatter={(value) => `${value}:00 - Operation Window`}
                                                            formatter={(value, name) => (
                                                                <div className="flex w-full items-center justify-between gap-2">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <div
                                                                            className="h-2.5 w-2.5 shrink-0 rounded-xs"
                                                                            style={{ backgroundColor: "#f97316" }}
                                                                        />
                                                                        <span className="text-muted-foreground">
                                                                            {chartConfig[name]?.label || "Transactions"}
                                                                        </span>
                                                                    </div>
                                                                    <span className="text-foreground font-semibold tabular-nums">
                                                                        {Number(value).toLocaleString()} trx
                                                                    </span>
                                                                </div>
                                                            )}
                                                        />
                                                    }
                                                />
                                                <Area
                                                    dataKey="transactions"
                                                    type="natural"
                                                    fill="url(#chartHour-fill)"
                                                    stroke="var(--color-transactions)"
                                                    strokeWidth={2}
                                                    filter="url(#chartHour-line-glow)"
                                                    dot={{
                                                        r: 4,
                                                        fill: "#f97316",
                                                        strokeWidth: 2,
                                                        stroke: isDark ? "#0f172a" : "#fff",
                                                        filter: "url(#chartHour-line-glow)",
                                                    }}
                                                    activeDot={{ 
                                                        r: 6, 
                                                        strokeWidth: 3, 
                                                        stroke: isDark ? "#0f172a" : "#fff",
                                                        fill: "#f97316"
                                                    }}
                                                />
                                            </AreaChart>
                                        </ChartContainer>
                                    </CardContent>
                                </Card>

                                <Card className="border border-slate-300 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
                                    <CardHeader className="items-center pb-0">
                                        <CardTitle className="text-lg font-bold">
                                            Loss Analysis (Waste)
                                        </CardTitle>
                                        <CardDescription className="dark:text-slate-400">Waste quantification by cause.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex-1 pb-0">
                                        <ChartContainer
                                            config={{}}
                                            className="mx-auto aspect-square max-h-[280px]"
                                        >
                                            <PieChart accessibilityLayer>
                                                <ChartTooltip
                                                    cursor={false}
                                                    content={
                                                        <ChartTooltipContent
                                                            hideLabel
                                                            className="min-w-32"
                                                            formatter={(value, name) => (
                                                                <div className="flex w-full items-center justify-between gap-2">
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-muted-foreground text-xs">{name}:</span>
                                                                    </div>
                                                                    <span className="text-foreground font-bold">{value} units</span>
                                                                </div>
                                                            )}
                                                        />
                                                    }
                                                />
                                                <ChartLegend
                                                    content={<ChartLegendContent nameKey="name" />}
                                                    className="-translate-y-2"
                                                />
                                                <Pie
                                                    data={charts.waste_analysis.map((d, i) => ({ ...d, fill: ["#ef4444", "#f97316", "#eab308", "#84cc16", "#06b6d4", "#8b5cf6", "#ec4899", "#64748b"][i % 8] }))}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={4}
                                                    cornerRadius={6}
                                                    stroke="var(--background)"
                                                    strokeWidth={3}
                                                >
                                                    <Label
                                                        content={({ viewBox }) => {
                                                            if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                                                                const total = charts.waste_analysis.reduce((sum, curr) => sum + curr.value, 0);
                                                                return (
                                                                    <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                                                        <tspan x={viewBox.cx} y={viewBox.cy} className="fill-slate-900 dark:fill-slate-100 text-3xl font-black">
                                                                            {total}
                                                                        </tspan>
                                                                        <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 24} className="fill-slate-400 dark:fill-slate-500 text-[10px] font-bold uppercase tracking-wider">
                                                                            Total Qty
                                                                        </tspan>
                                                                    </text>
                                                                );
                                                            }
                                                        }}
                                                    />
                                                </Pie>
                                            </PieChart>
                                        </ChartContainer>
                                    </CardContent>
                                    <CardFooter className="flex-col gap-2 text-xs pt-0">
                                        <div className="flex items-center gap-2 font-bold text-slate-500 leading-none">
                                            Inventory Loss quantification active
                                        </div>
                                    </CardFooter>
                                </Card>

                                <Card className="border border-slate-300 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 flex flex-col h-full">
                                    <CardHeader className="text-center pb-0">
                                        <CardTitle className="text-lg font-bold">
                                            Inventory & BoM Mapping
                                        </CardTitle>
                                        <CardDescription className="dark:text-slate-400">Stock velocity and detailed variant mapping.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex flex-col items-center justify-start p-6 space-y-6 flex-1">
                                        <div className="relative flex items-center justify-center w-[180px] h-[180px]">
                                            <div className="w-36 h-36 rounded-full border-[8px] border-slate-50 dark:border-slate-800 flex flex-col items-center justify-center">
                                                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{charts.inventory_velocity.days_remaining}</span>
                                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Days Left</span>
                                            </div>
                                            <svg className="absolute w-36 h-36 -rotate-90 pointer-events-none">
                                                <circle
                                                    cx="72" cy="72" r="62"
                                                    fill="none"
                                                    stroke={charts.inventory_velocity.is_critical ? "#ef4444" : "#f97316"}
                                                    strokeWidth="8"
                                                    strokeDasharray={390}
                                                    strokeDashoffset={390 - (390 * (Math.min(charts.inventory_velocity.days_remaining, 14) / 14))}
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs font-bold text-slate-500 uppercase">Average Stock: {charts.inventory_velocity.avg_stock.toFixed(1)} Unit</p>
                                            {charts.inventory_velocity.is_critical && (
                                                <Badge variant="destructive" className="mt-2 animate-pulse">Critical Stock Alert</Badge>
                                            )}
                                        </div>

                                        <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-800 flex-1 overflow-auto scrollbar-hide">
                                            <details className="group">
                                                <summary className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 uppercase text-center cursor-pointer flex justify-center items-center gap-1 list-none outline-none [&::-webkit-details-marker]:hidden">
                                                    Product Details & Mapping
                                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-open:rotate-180"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                                </summary>
                                                <div className="flex flex-col gap-3 mt-4">
                                                    {(charts.inventory_velocity.bom_mapping || []).map((item, idx) => (
                                                        <div key={idx} className="flex flex-col p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-700/50">
                                                            <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 mb-2">{item.product}</span>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {item.bom.map((material, mIdx) => (
                                                                    <Badge key={mIdx} variant="outline" className="text-[9px] bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-100 cursor-default">
                                                                        {material}
                                                                    </Badge>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {activeTab === 'management' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <Card className="md:col-span-2 border border-slate-300 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-bold">
                                            Regional Profitability View
                                        </CardTitle>
                                        <CardDescription>Comparison of city performance by net margin.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Branch City</TableHead>
                                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Outlet</TableHead>
                                                    <TableHead className="font-bold text-center text-slate-700 dark:text-slate-300">Trx Count</TableHead>
                                                    <TableHead className="font-bold text-right text-slate-700 dark:text-slate-300">Total Sales</TableHead>
                                                    <TableHead className="font-bold text-right text-slate-700 dark:text-slate-300">Net Profit</TableHead>
                                                    <TableHead className="font-bold text-center text-slate-700 dark:text-slate-300">Margin %</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {charts.regional_profit.map((item, idx) => (
                                                    <TableRow key={idx} className="border-slate-100 dark:border-slate-800">
                                                        <TableCell className="font-bold text-slate-900 dark:text-slate-100 text-sm">{item.name}</TableCell>
                                                        <TableCell className="text-sm text-slate-600 dark:text-slate-400 font-medium">{item.outlet}</TableCell>
                                                        <TableCell className="text-center text-sm font-medium text-slate-600 dark:text-slate-400">{item.Trx_Count || 0}</TableCell>
                                                        <TableCell className="text-right text-sm font-medium text-slate-600 dark:text-slate-400">Rp {item.Total_Sales.toLocaleString()}</TableCell>
                                                        <TableCell className="text-right text-sm font-bold text-slate-900 dark:text-slate-100">Rp {item.Net_Profit.toLocaleString()}</TableCell>
                                                        <TableCell className="text-center">
                                                            <span className="text-sm font-black text-emerald-600">{item.Margin}%</span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>

                                <Card className="border border-slate-300 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900">
                                    <CardHeader>
                                        <CardTitle className="text-lg font-bold">
                                            SKU Leaderboard
                                        </CardTitle>
                                        <CardDescription className="dark:text-slate-400">Winning variants per city.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[400px] overflow-auto scrollbar-hide">
                                        <div className="space-y-4 pt-2">
                                            {charts.sku_leaderboard.slice(0, 8).map((item, idx) => (
                                                <div key={idx} className="flex flex-col p-3 bg-white dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase">{item.Branch_City}</span>
                                                        <span className="text-xs font-bold text-amber-600">#{idx + 1}</span>
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">{item.SKU_Variant}</span>
                                                    <div className="flex justify-between items-center mt-2">
                                                        <span className="text-[10px] text-slate-400 dark:text-slate-500">Total Sold</span>
                                                        <span className="text-xs font-black text-slate-900 dark:text-slate-100">{item.Qty_Sold} Units</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
