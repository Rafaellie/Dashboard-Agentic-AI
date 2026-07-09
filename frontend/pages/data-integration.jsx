import React, { useState, useRef } from 'react';
import Head from 'next/head';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Bot, ArrowRight, CheckCircle2, UploadCloud, FileSpreadsheet, Loader2, FileCheck2, AlertCircle, Database, History } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

const targetSchema = [
  {
    group: "Informasi Transaksi & Finansial",
    fields: [
      { key: "transaction_id", label: "Nomor Transaksi", required: true, aiSuggestion: "Transaction_ID" },
      { key: "date", label: "Tanggal Transaksi", required: true, aiSuggestion: "Date" },
      { key: "total_sales", label: "Total Gross Sales", required: true, aiSuggestion: "Total_Sales" },
      { key: "platform_fee", label: "Platform/App Fee", required: false, aiSuggestion: "Platform_Fee" },
      { key: "cogs_total", label: "COGS Total (Modal)", required: false, aiSuggestion: "COGS_Total" },
      { key: "shipping_cost", label: "Shipping/Delivery Fee", required: false, aiSuggestion: "Shipping_Cost" },
      { key: "sales_channel", label: "Sales Channel", required: false, aiSuggestion: "Sales_Channel" },
      { key: "payment_method", label: "Payment Method", required: false, aiSuggestion: "Payment_Method" },
      { key: "payment_status", label: "Payment Status", required: false, aiSuggestion: "Payment_Status" }
    ]
  },
  {
    group: "Detil Produk & Inventori",
    fields: [
      { key: "product_name", label: "Nama Produk/Menu", required: true, aiSuggestion: "Product_Name" },
      { key: "sku_variant", label: "SKU / Varian", required: false, aiSuggestion: "SKU_Variant" },
      { key: "category", label: "Kategori Produk", required: false, aiSuggestion: "Category" },
      { key: "qty_sold", label: "Quantity Sold", required: true, aiSuggestion: "Qty_Sold" },
      { key: "price_per_unit", label: "Harga per Unit", required: false, aiSuggestion: "Price_Per_Unit" },
      { key: "stock_remaining", label: "Stock Tersisa", required: false, aiSuggestion: "Stock_Remaining" },
      { key: "waste_qty", label: "Waste Quantity", required: false, aiSuggestion: "Waste_Qty" },
      { key: "waste_reason", label: "Alasan Waste", required: false, aiSuggestion: "Waste_Reason" }
    ]
  },
  {
    group: "Customer & Operasional",
    fields: [
      { key: "outlet_name", label: "Nama Outlet", required: true, aiSuggestion: "Outlet_Name" },
      { key: "city", label: "Kota", required: false, aiSuggestion: "City" },
      { key: "region", label: "Region", required: false, aiSuggestion: "Region" },
      { key: "cust_demographic", label: "Demografi Pelanggan", required: false, aiSuggestion: "Cust_Demographic" }
    ]
  }
];

export default function DataIntegrationPage() {
  const [expandedSections, setExpandedSections] = useState({
    "Informasi Transaksi & Finansial": true,
    "Detil Produk & Inventori": true,
    "Customer & Operasional": true
  });

  const toggleSection = (groupName) => {
    setExpandedSections(prev => ({ ...prev, [groupName]: !prev[groupName] }));
  };

  const [selectedPlatform, setSelectedPlatform] = useState("gofood");
  const [selectedFile, setSelectedFile] = useState(null);
  const [externalColumns, setExternalColumns] = useState([]);
  const [mapping, setMapping] = useState({});
  
  const [isUploading, setIsUploading] = useState(false);
  const [isAiMatching, setIsAiMatching] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);
  
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    try {
      const res = await fetch('http://localhost:8000/api/ingestion/history', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setHistory(data.data || []);
      }
    } catch(err) {
      console.error('Error fetching history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  React.useEffect(() => {
    fetchHistory();
  }, []);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setExternalColumns([]);
    setMapping({});
    setImportSuccess('');
    setErrorMsg('');
    
    // unggah file untuk ekstraksi header
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    try {
      const res = await fetch('http://localhost:8000/api/ingestion/extract-headers', {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setExternalColumns(["--select header--", ...data.headers]);
        // pemicu pemetaan ai secara otomatis
        await fetchAIMapping(["--select header--", ...data.headers]);
      } else {
        setErrorMsg(data.detail || "Gagal membaca kolom dari file.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Terjadi kesalahan saat membaca file.");
    } finally {
      setIsUploading(false);
    }
  };

  const fetchAIMapping = async (columns) => {
    setIsAiMatching(true);
    
    // atur pemetaan fallback awal berdasarkan kecocokan string persis atau saran dari ai
    const fallbackMapping = {};
    targetSchema.forEach(section => {
      section.fields.forEach(field => {
        let matched = "--select header--";
        if (columns.includes(field.key)) {
           matched = field.key;
        } else if (field.aiSuggestion && columns.includes(field.aiSuggestion)) {
           matched = field.aiSuggestion;
        }
        fallbackMapping[field.key] = matched;
      });
    });
    setMapping(fallbackMapping);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    try {
      const flatTargetSchema = [];
      targetSchema.forEach(section => {
        section.fields.forEach(field => {
          flatTargetSchema.push({
            key: field.key,
            label: field.label
          });
        });
      });

      const response = await fetch('http://localhost:8000/api/ingestion/match-fields', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          target_schema: flatTargetSchema,
          external_columns: columns
        })
      });

      const data = await response.json();
      
      // hanya timpa jika ai menemukan pemetaan yang sesuai
      if (data.status === 'success' && data.mapping && Object.keys(data.mapping).length > 0) {
        setMapping(prev => ({ ...prev, ...data.mapping }));
      }
    } catch (error) {
      console.error('Error fetching AI mapping:', error);
      // pemetaan fallback sudah diatur di atas
    } finally {
      setIsAiMatching(false);
    }
  };

  const handleMappingChange = (fieldKey, value) => {
    setMapping(prev => ({ ...prev, [fieldKey]: value }));
  };

  const handleImport = async () => {
    if (!selectedFile) return;
    setIsImporting(true);
    setErrorMsg('');
    setImportSuccess('');

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('mapping', JSON.stringify(mapping));

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    try {
      const res = await fetch('http://localhost:8000/api/ingestion/import-mapped', {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
          if (data.status === 'processing') {
            setImportSuccess('Data sedang diproses di belakang layar (Background Job)...');
            
            // menggunakan server-sent events (sse)
            const eventSource = new EventSource(`http://localhost:8000/api/ingestion/import-status-stream?token=${token}`);
            
            eventSource.onmessage = (event) => {
              const statusData = JSON.parse(event.data);
              
              if (statusData.status === 'success') {
                eventSource.close();
                setIsImporting(false);
                setImportSuccess(`Selesai! Berhasil mengimpor ${statusData.imported_rows} baris data (Big Data) ke database!`);
                fetchHistory();
              } else if (statusData.status === 'error') {
                eventSource.close();
                setIsImporting(false);
                setImportSuccess('');
                setErrorMsg(statusData.message || "Gagal mengimpor data di background.");
              } else if (statusData.status === 'processing') {
                setImportSuccess(`[Background] Sedang memproses dan menyimpan data... (${statusData.imported_rows} baris masuk)`);
              }
            };
            
            eventSource.onerror = (error) => {
              console.error("SSE Error:", error);
              eventSource.close();
              setIsImporting(false);
              setImportSuccess('');
              setErrorMsg("Terputus dari server saat streaming status.");
            };
            
          } else if (data.status === 'success') {         
            setImportSuccess(`Berhasil mengimpor ${data.imported_rows} baris data ke database!`);
            setIsImporting(false);
            fetchHistory();
          }
      } else {
        setErrorMsg(data.detail || "Gagal mengimpor data.");
        setIsImporting(false);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Terjadi kesalahan sistem saat proses import.");
      setIsImporting(false);
    }
  };

  return (
    <DashboardLayout>
      <Head>
        <title>Data Integration - Agentic BI</title>
      </Head>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Upload Data & AI-Mapping</h2>
          <p className="text-muted-foreground mt-1">Unggah file data eksternal (CSV/Excel) lalu biarkan AI memetakan kolom secara otomatis.</p>
        </div>

        {/* bagian unggah */}
        <Card className="border-border shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row">
              <div className="flex-1 p-8 flex flex-col justify-center items-center border-b md:border-b-0 md:border-r border-dashed border-border bg-muted/50 min-h-[250px]">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileSelect} 
                  className="hidden" 
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                />
                <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                  <UploadCloud size={32} />
                </div>
                <h3 className="font-semibold text-lg text-foreground">Pilih File Data Anda</h3>
                <p className="text-muted-foreground text-sm mt-2 mb-6 text-center max-w-xs">Mendukung format .csv atau .xlsx (Excel) dari GoFood, GrabFood, ShopeeFood, POS Lokal, dll.</p>
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  className="bg-red-600 hover:bg-red-700 w-full max-w-xs shadow-lg shadow-red-600/20 text-white"
                  disabled={isUploading}
                >
                  {isUploading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                  {isUploading ? "Membaca file..." : "Jelajahi File"}
                </Button>
              </div>

              <div className="flex-1 p-8 flex flex-col justify-center">
                <div className="space-y-4 mb-6">
                  <label className="text-sm font-medium text-foreground">Pilih Platform Sumber</label>
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Pilih Sumber Data" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gofood">GoFood Export (.csv)</SelectItem>
                      <SelectItem value="grabfood">GrabFood Export (.xlsx)</SelectItem>
                      <SelectItem value="shopeefood">ShopeeFood Export (.csv)</SelectItem>
                      <SelectItem value="pos">POS Lokal Export (.csv)</SelectItem>
                      <SelectItem value="other">Lainnya (Custom)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {selectedFile ? (
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                        <FileCheck2 size={24} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">{selectedFile.name}</h4>
                        <p className="text-sm text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                    </div>
                    {isAiMatching ? (
                      <div className="flex items-center gap-3 mt-4 text-purple-600 bg-purple-50 p-3 rounded-lg border border-purple-100 animate-pulse">
                        <Loader2 className="animate-spin h-5 w-5" />
                        <span className="text-sm font-medium">AI sedang memproses mapping kolom...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 mt-4 text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="text-sm font-medium">Berhasil memetakan {Object.values(mapping).filter(v => v !== "--select header--").length} kolom secara otomatis. Silakan review di bawah.</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center opacity-50 flex flex-col items-center">
                    <FileSpreadsheet size={48} className="text-muted-foreground mb-3" />
                    <p className="font-medium text-muted-foreground">Belum ada file terpilih.</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {errorMsg && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle size={20} className="shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {importSuccess && (
          <div className="p-4 bg-green-50 text-green-700 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle2 size={20} className="shrink-0" />
            <span className="font-medium">{importSuccess}</span>
          </div>
        )}

        {/* bagian pemetaan */}
        {externalColumns.length > 0 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-3 px-1">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-red-600 to-red-500 flex items-center justify-center text-white shadow-md">
                <Bot size={16} />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Review AI Automapping</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {targetSchema.map((section, idx) => (
                <Card key={idx} className="border-border shadow-sm flex flex-col h-full bg-card/60 backdrop-blur-sm">
                  <CardHeader 
                    className="pb-3 border-b border-border bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => toggleSection(section.group)}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-foreground uppercase tracking-wider">{section.group}</CardTitle>
                      {expandedSections[section.group] ? 
                        <ChevronUp size={16} className="text-muted-foreground"/> : 
                        <ChevronDown size={16} className="text-muted-foreground"/>
                      }
                    </div>
                  </CardHeader>
                  
                  {expandedSections[section.group] && (
                    <CardContent className="pt-4 space-y-5 flex-1">
                      {section.fields.map((field) => {
                        const currentValue = mapping[field.key] || "--select header--";
                        const isMapped = currentValue !== "--select header--";
                        
                        return (
                          <div key={field.key} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                                {field.label}
                                {field.required && <span className="text-red-500 text-xs">*</span>}
                              </label>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <ArrowRight size={14} className="text-muted-foreground shrink-0" />
                              <Select value={currentValue} onValueChange={(val) => handleMappingChange(field.key, val)}>
                                <SelectTrigger className={`w-full text-sm ${isMapped ? 'border-primary/30 bg-primary/10 text-primary' : 'bg-background text-muted-foreground border-dashed border-border'}`}>
                                  <SelectValue placeholder="--select header--" />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]">
                                  {externalColumns.map(col => (
                                    <SelectItem key={col} value={col}>{col}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button 
                onClick={handleImport} 
                className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg px-8"
                disabled={isImporting || isAiMatching || isUploading}
              >
                {isImporting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : <Database className="mr-2 h-4 w-4" />}
                {isImporting ? "Mengimpor Data..." : "Simpan & Import Data"}
              </Button>
            </div>
          </div>
        )}

        {/* bagian riwayat ingestion */}
        <div className="mt-12 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="flex items-center gap-3 mb-6 px-1">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <History size={16} />
              </div>
              <h3 className="text-xl font-bold text-foreground tracking-tight">Ingestion History</h3>
            </div>
            
            <Card className="border-border shadow-sm overflow-hidden bg-card">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 border-b border-border">
                                <TableHead className="font-semibold text-muted-foreground uppercase text-xs py-4">Filename</TableHead>
                                <TableHead className="font-semibold text-muted-foreground uppercase text-xs py-4">Status</TableHead>
                                <TableHead className="font-semibold text-muted-foreground uppercase text-xs py-4 text-right">Row Count</TableHead>
                                <TableHead className="font-semibold text-muted-foreground uppercase text-xs py-4 text-right">Date Imported</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingHistory ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-slate-300 mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : history.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground font-medium">
                                        Belum ada riwayat unggahan data.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                history.map((item) => (
                                    <TableRow key={item.id} className="border-b border-border hover:bg-muted/50">
                                        <TableCell className="font-semibold text-foreground">{item.filename}</TableCell>
                                        <TableCell>
                                            {item.status === 'success' ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">Success</Badge>
                                            ) : (
                                                <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none" title={item.error_message}>Failed</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-medium text-muted-foreground">{item.row_count.toLocaleString()}</TableCell>
                                        <TableCell className="text-right text-sm text-muted-foreground">
                                            {new Date(item.imported_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
