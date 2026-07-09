import React, { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, History, FileText, BrainCircuit, Calendar as CalendarIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function StrategicPage() {
    const [periodStart, setPeriodStart] = useState("2024-01-01");
    const [periodEnd, setPeriodEnd] = useState("2024-12-31");
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentReport, setCurrentReport] = useState(null);
    const [history, setHistory] = useState([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(true);

    const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const res = await fetch("http://localhost:8000/api/strategic/reports", {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setHistory(data);
            }
        } catch (error) {
            console.error("Failed to fetch history", error);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleGenerate = async () => {
        setIsGenerating(true);
        setCurrentReport(null);
        try {
            const res = await fetch("http://localhost:8000/api/strategic/generate-report", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    period_start: periodStart,
                    period_end: periodEnd
                })
            });

            if (!res.ok) {
                const errData = await res.json();
                toast.error("Error", { description: errData.detail || "Failed to generate report" });
                setIsGenerating(false);
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let done = false;

            toast.loading("Memulai proses agen AI...", { id: "generate-report" });

            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                
                if (value) {
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');
                    
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            try {
                                const dataStr = line.substring(6);
                                const parsed = JSON.parse(dataStr);
                                
                                if (parsed.error) {
                                    toast.error("Error", { id: "generate-report", description: parsed.error });
                                    break;
                                }
                                
                                toast.loading(`Agen sedang memproses tahap: ${parsed.node}...`, { id: "generate-report" });
                                
                                if (parsed.is_final) {
                                    setCurrentReport(parsed);
                                }
                            } catch (e) {
                                console.error("Error parsing chunk", e);
                            }
                        }
                    }
                }
            }

            toast.success("Success", {
                id: "generate-report",
                description: "Strategic report generated successfully."
            });
            fetchHistory();
        } catch (error) {
            toast.error("Error", {
                id: "generate-report",
                description: "Network error occurred"
            });
        } finally {
            setIsGenerating(false);
        }
    };

    const handleViewReport = (report) => {
        setCurrentReport({
            report_markdown: report.report_markdown,
            analysis_data: report.analysis_json,
            kpis_snapshot: report.kpis_snapshot
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <DashboardLayout>
            <style jsx global>{`
                .report-wrapper {
                    --navy: #1B2A4A;
                    --blue: #2E5C8A;
                    --light-blue: #D6E4F0;
                    --gold: #C9A84C;
                    --light-gold: #FFF8E1;
                    --green: #1A7A4A;
                    --green-light: #D4EDDA;
                    --red: #C0392B;
                    --red-light: #FADBD8;
                    --orange: #E67E22;
                    --orange-light: #FDEBD0;
                    --gray: #F5F7FA;
                    --mid-gray: #6C7A89;
                    --dark: #1C1C2E;
                    --white: #FFFFFF;
                    background: #EAECF0;
                    color: var(--dark);
                    font-size: 13px;
                }
                .report-wrapper .page {
                    max-width: 1100px; margin: 0 auto; padding: 24px 16px 60px;
                }
                .report-wrapper .cover {
                    background: linear-gradient(135deg, #991B1B 0%, #DC2626 100%);
                    border-radius: 12px; padding: 40px 48px; margin-bottom: 24px; color: white;
                }
                .report-wrapper .cover .tag {
                    background: white; color: #DC2626; font-weight: 700; font-size: 10px;
                    letter-spacing: 2px; padding: 4px 12px; border-radius: 4px; display: inline-block; margin-bottom: 14px;
                }
                .report-wrapper .cover h1 { font-size: 28px; font-weight: 800; letter-spacing: -0.5px; line-height: 1.2; }
                .report-wrapper .cover h2 { font-size: 15px; font-weight: 400; opacity: .85; margin-top: 6px; }
                .report-wrapper .section-title {
                    display: flex; align-items: center; gap: 12px; margin: 28px 0 14px;
                }
                .report-wrapper .section-title .num {
                    background: #DC2626; color: white; font-weight: 800; font-size: 12px;
                    width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center;
                    justify-content: center; flex-shrink: 0;
                }
                .report-wrapper .section-title h3 { font-size: 15px; font-weight: 800; color: #DC2626; text-transform: uppercase; letter-spacing: 1px; }
                .report-wrapper .section-title .line { flex: 1; height: 1px; background: linear-gradient(to right, #DC2626, transparent); }
                .report-wrapper .card { background: white; border-radius: 10px; padding: 20px 24px; margin-bottom: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.08); border-left: 4px solid transparent; }
                .report-wrapper .card.blue { border-color: var(--blue); }
                .report-wrapper .card.gold { border-color: var(--gold); }
                .report-wrapper .card.green { border-color: var(--green); }
                .report-wrapper .card.red { border-color: var(--red); }
                .report-wrapper .card.orange { border-color: var(--orange); }
                .report-wrapper .card h4 { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
                .report-wrapper .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
                .report-wrapper .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
                .report-wrapper .grid4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; }
                .report-wrapper table { width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,.08); margin-bottom: 14px; }
                .report-wrapper thead th { background: #DC2626; color: white; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: .8px; }
                .report-wrapper tbody tr:nth-child(even) { background: var(--gray); }
                .report-wrapper tbody td { padding: 9px 12px; font-size: 12px; vertical-align: top; border-bottom: 1px solid #E8EAF0; }
                .report-wrapper tbody tr:hover { background: var(--light-blue); }
                .report-wrapper .pill { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: 700; letter-spacing: .5px; }
                .report-wrapper .pill.high { background: #FADBD8; color: var(--red); }
                .report-wrapper .pill.med  { background: #FDEBD0; color: var(--orange); }
                .report-wrapper .pill.low  { background: var(--green-light); color: var(--green); }
                .report-wrapper .pill.blue { background: var(--light-blue); color: var(--blue); }
                .report-wrapper .pill.gold { background: var(--light-gold); color: #7D5A00; }
                .report-wrapper .kpi-tile { background: white; border-radius: 10px; padding: 16px 18px; box-shadow: 0 1px 4px rgba(0,0,0,.08); text-align: center; }
                .report-wrapper .kpi-tile .kv { font-size: 24px; font-weight: 800; color: #DC2626; }
                .report-wrapper .kpi-tile .kk { font-size: 10px; color: var(--mid-gray); text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
                .report-wrapper .swot { display: grid; grid-template-columns: 1fr 1fr; gap: 0; border-radius: 10px; overflow: hidden; }
                .report-wrapper .swot-cell { padding: 18px 20px; }
                .report-wrapper .swot-cell h4 { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
                .report-wrapper .swot-cell ul { padding-left: 14px; }
                .report-wrapper .swot-cell ul li { font-size: 12px; margin-bottom: 5px; line-height: 1.45; }
                .report-wrapper .sw { background: #059669; color: white; }
                .report-wrapper .sw h4 { color: #A7F3D0; }
                .report-wrapper .ow { background: #0284C7; color: white; }
                .report-wrapper .ow h4 { color: #BAE6FD; }
                .report-wrapper .ww { background: #E11D48; color: white; }
                .report-wrapper .ww h4 { color: #FECDD3; }
                .report-wrapper .tw { background: #D97706; color: white; }
                .report-wrapper .tw h4 { color: #FDE68A; }
                .report-wrapper .porter-ring { display: grid; grid-template-columns: 1fr 3fr 1fr; gap: 12px; align-items: center; }
                .report-wrapper .porter-center { background: #334155; color: white; border-radius: 10px; padding: 20px; text-align: center; }
                .report-wrapper .porter-side { display: flex; flex-direction: column; gap: 12px; }
                .report-wrapper .porter-box { background: white; border-radius: 8px; padding: 14px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
                .report-wrapper .porter-top-bottom { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 12px 0; }
                .report-wrapper .vc-row { display: flex; gap: 0; margin-bottom: 10px; border-radius: 8px; overflow: hidden; }
                .report-wrapper .vc-cell { flex: 1; padding: 12px 10px; font-size: 11px; text-align: center; position: relative; }
                .report-wrapper .vc-primary { background: #1E293B; color: white; }
                .report-wrapper .vc-support { background: #475569; color: white; }
                .report-wrapper .rec-card { background: white; border-radius: 10px; padding: 18px 20px; box-shadow: 0 1px 4px rgba(0,0,0,.08); border-top: 4px solid #DC2626; margin-bottom: 12px; }
                .report-wrapper .rec-card .rec-num { background: #FEE2E2; color: #991B1B; font-weight: 800; font-size: 10px; padding: 3px 10px; border-radius: 12px; display: inline-block; margin-bottom: 8px; }
                .report-wrapper .brief { background: #1E293B; color: white; border-radius: 12px; padding: 32px 36px; margin-top: 24px; }
                .report-wrapper .brief h2 { font-size: 18px; font-weight: 800; color: #F87171; margin-bottom: 4px; }
                .report-wrapper .brief-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            `}</style>

            <div className="p-8 space-y-8 print:p-0 print:space-y-0">
                {/* header */}
                <div className="print:hidden">
                    <h1 className="text-3xl font-bold tracking-tight">Strategic AI Generation</h1>
                    <p className="text-muted-foreground mt-2">Generate comprehensive strategic business insights for boardroom decision-making.</p>
                </div>

                {/* bagian atas: parameter dan riwayat */}
                <div className="flex flex-col xl:flex-row gap-8 items-start print:hidden">
                    {/* kartu parameter */}
                    <Card className="w-full xl:w-fit shrink-0">
                        <CardHeader>
                            <CardTitle>AI Report Parameters</CardTitle>
                            <CardDescription>Configure the analysis scope before invoking the multi-agent pipeline.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col md:flex-row items-end gap-4">
                                <div className="space-y-2 w-full md:w-48">
                                    <Label>Period Start</Label>
                                    <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="block w-full" />
                                </div>
                                <div className="space-y-2 w-full md:w-48">
                                    <Label>Period End</Label>
                                    <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="block w-full" />
                                </div>
                                <Button 
                                    onClick={handleGenerate} 
                                    disabled={isGenerating}
                                    className="bg-blue-700 hover:bg-blue-800 text-white w-full md:w-auto mt-4 md:mt-0"
                                >
                                    {isGenerating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Running LangGraph...
                                        </>
                                    ) : (
                                        <>
                                            <BrainCircuit className="mr-2 h-4 w-4" />
                                            Generate Report
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* kartu riwayat memori */}
                    <Card className="w-full flex-1 border-border">
                        <CardHeader className="bg-muted/50 px-6 pt-6 pb-3 border-b border-border">
                            <CardTitle className="flex items-center text-lg">
                                <History className="mr-2 h-5 w-5 text-muted-foreground" />
                                Memory History
                            </CardTitle>
                            <CardDescription>Previously generated strategic reports</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoadingHistory ? (
                                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                            ) : history.length === 0 ? (
                                <div className="p-8 text-center flex flex-col items-center">
                                    <FileText className="h-10 w-10 text-muted mb-4" />
                                    <p className="text-sm text-muted-foreground">No reports generated yet.</p>
                                </div>
                            ) : (
                                <ScrollArea className="h-[250px]">
                                    <div className="space-y-3 px-4 pt-3 pb-4">
                                        {history.map((item) => (
                                            <div 
                                                key={item.id} 
                                                className="group relative p-4 border rounded-xl cursor-pointer hover:border-primary/50 hover:shadow-md hover:bg-accent transition-all duration-200"
                                                onClick={() => handleViewReport(item)}
                                            >
                                                <div className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1 leading-snug">
                                                    {item.title}
                                                </div>
                                                <div className="flex items-center justify-between mt-3">
                                                    <div className="flex items-center text-xs text-muted-foreground font-medium">
                                                        <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                                                        {new Date(item.generated_at).toLocaleDateString()}
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] bg-background">
                                                        {(item.model_used || "").split("/")[1] || item.model_used || "AI"}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* bagian bawah: laporan yang dihasilkan */}
                {currentReport && (
                    <Card className="border-gold shadow-lg animate-in fade-in zoom-in duration-500 mt-8 print:border-none print:shadow-none print:m-0">
                        <CardHeader className="bg-slate-50 border-b print:hidden">
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="text-navy text-xl">Generated Board Report</CardTitle>
                                    <CardDescription className="text-xs font-mono mt-1 text-slate-500 flex items-center">
                                        Model: <Badge variant="secondary" className="ml-2">{currentReport.model_used || "llama-3.3-70b-versatile"}</Badge>
                                    </CardDescription>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => window.print()}>
                                    <FileText className="mr-2 h-4 w-4" /> Export PDF
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="report-wrapper bg-[#EAECF0] rounded-b-lg overflow-hidden print:overflow-visible print:rounded-none">
                                <div 
                                    className="page text-left" 
                                    dangerouslySetInnerHTML={{ __html: currentReport.report_markdown }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </DashboardLayout>
    );
}
