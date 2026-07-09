import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Package, Utensils, Loader2, RefreshCw, Plus, Edit2, Archive, Search, Filter, CircleDollarSign, Clock, Check, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ProductManagementPage() {
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 10, total_data: 0, total_pages: 1 });
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [serverCategories, setServerCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // state untuk modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // state untuk pemfilteran
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // kategori umum untuk dropdown
  const PREDEFINED_CATEGORIES = [
    "Makanan Utama",
    "Minuman",
    "Cemilan",
    "Paket Hemat",
    "Ekstra",
    "Lainnya"
  ];

  // state untuk form
  const initialForm = {
    sku_id: null,
    product_name: '',
    category: '',
    sub_category: '',
    base_selling_price: '',
    preparation_time_min: '',
    is_active: true
  };
  const [formData, setFormData] = useState(initialForm);

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const headers = getAuthHeaders();
      const params = new URLSearchParams({
        page: currentPage,
        limit: limit,
      });
      if (searchQuery) params.append('search', searchQuery);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter);

      const res = await fetch(`http://localhost:8000/api/master/products?${params.toString()}`, { headers });

      if (res.ok) {
        const response = await res.json();
        setProducts(response.data);
        setMeta(response.meta);
      }
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/master/product-categories', { headers: getAuthHeaders() });
      if (res.ok) {
        setServerCategories(await res.json());
      }
    } catch (err) {}
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300);
    return () => clearTimeout(timer);
  }, [currentPage, limit, searchQuery, categoryFilter]);

  useEffect(() => {
    fetchCategories();
  }, []);

  // format mata uang
  const formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(number);
  };

  // gabungkan predefined_categories dan servercategories
  const displayCategories = useMemo(() => {
    const cats = new Set([...PREDEFINED_CATEGORIES, ...serverCategories]);
    return Array.from(cats).sort();
  }, [serverCategories]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const pName = formData.product_name?.trim();
    const cName = formData.category?.trim();
    const sName = formData.sub_category?.trim();
    const price = parseFloat(formData.base_selling_price);
    const prepTime = parseInt(formData.preparation_time_min, 10);

    if (!pName) {
      setErrorMsg('Nama produk tidak boleh kosong atau hanya berisi spasi.');
      setIsSubmitting(false);
      return;
    }
    if (!cName) {
      setErrorMsg('Kategori utama tidak boleh kosong atau hanya berisi spasi.');
      setIsSubmitting(false);
      return;
    }
    if (formData.sub_category && !sName) {
      setErrorMsg('Sub-kategori tidak boleh hanya berisi spasi.');
      setIsSubmitting(false);
      return;
    }
    if (isNaN(price) || price < 0) {
      setErrorMsg('Harga dasar jual tidak valid (minimal Rp 0).');
      setIsSubmitting(false);
      return;
    }
    if (isNaN(prepTime) || prepTime < 1) {
      setErrorMsg('Waktu persiapan tidak valid (minimal 1 menit).');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:8000/api/master/products', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          product_name: pName,
          category: cName,
          sub_category: sName || null,
          base_selling_price: price,
          preparation_time_min: prepTime,
          is_active: true
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Gagal menambahkan produk');
      }

      setSuccessMsg('Produk berhasil ditambahkan!');
      setIsCreateOpen(false);
      setFormData(initialForm);
      fetchProducts();
    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const pName = formData.product_name?.trim();
    const cName = formData.category?.trim();
    const sName = formData.sub_category?.trim();
    const price = parseFloat(formData.base_selling_price);
    const prepTime = parseInt(formData.preparation_time_min, 10);

    if (!pName) {
      setErrorMsg('Nama produk tidak boleh kosong atau hanya berisi spasi.');
      setIsSubmitting(false);
      return;
    }
    if (!cName) {
      setErrorMsg('Kategori utama tidak boleh kosong atau hanya berisi spasi.');
      setIsSubmitting(false);
      return;
    }
    if (formData.sub_category && !sName) {
      setErrorMsg('Sub-kategori tidak boleh hanya berisi spasi.');
      setIsSubmitting(false);
      return;
    }
    if (isNaN(price) || price < 0) {
      setErrorMsg('Harga dasar jual tidak valid (minimal Rp 0).');
      setIsSubmitting(false);
      return;
    }
    if (isNaN(prepTime) || prepTime < 1) {
      setErrorMsg('Waktu persiapan tidak valid (minimal 1 menit).');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`http://localhost:8000/api/master/products/${formData.sku_id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          product_name: pName,
          category: cName,
          sub_category: sName || null,
          base_selling_price: price,
          preparation_time_min: prepTime,
          is_active: formData.is_active
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Gagal mengubah produk');
      }

      setSuccessMsg('Produk berhasil diperbarui!');
      setIsEditOpen(false);
      setFormData(initialForm);
      fetchProducts();
    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`http://localhost:8000/api/master/products/${formData.sku_id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Gagal menonaktifkan produk');
      }

      setSuccessMsg('Produk berhasil dinonaktifkan/diarsipkan!');
      setIsDeleteOpen(false);
      setFormData(initialForm);
      fetchProducts();
    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (product) => {
    setFormData({ ...product });
    setIsEditOpen(true);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const openDeleteModal = (product) => {
    setFormData({ ...product });
    setIsDeleteOpen(true);
    setErrorMsg('');
    setSuccessMsg('');
  };

  return (
    <DashboardLayout>
      <Head>
        <title>Product Management | Master Data</title>
      </Head>

      <div className="p-8 space-y-6 min-h-screen">
        {/* bagian header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Product Management</h2>
            <p className="text-muted-foreground mt-1">Kelola data menu, harga, dan pengaturan inventori makanan.</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            if(!open) setFormData(initialForm);
            setIsCreateOpen(open);
            setErrorMsg('');
          }}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20">
                <Plus className="mr-2 h-4 w-4" /> Tambah Produk Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Utensils className="h-5 w-5 text-red-600" />
                  Tambah Menu / Produk Baru
                </DialogTitle>
                <DialogDescription>
                  Data produk baru akan otomatis mendapatkan nomor SKU (Barcode).
                </DialogDescription>
              </DialogHeader>

              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2 border border-red-200">
                  <span className="shrink-0 font-bold">Error:</span> {errorMsg}
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Nama Menu / Produk</Label>
                  <Input required value={formData.product_name} onChange={e => setFormData({...formData, product_name: e.target.value})} placeholder="Misal: Paket Nasi Ayam Geprek" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Kategori Utama</Label>
                    <Select 
                      required 
                      value={formData.category} 
                      onValueChange={(val) => setFormData({...formData, category: val})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        {PREDEFINED_CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Sub-Kategori (Opsional)</Label>
                    <Input value={formData.sub_category || ''} onChange={e => setFormData({...formData, sub_category: e.target.value})} placeholder="Misal: Ekstra Pedas" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Harga Dasar Jual (Rp)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">Rp</span>
                    <Input required type="number" min="0" step="500" value={formData.base_selling_price} onChange={e => setFormData({...formData, base_selling_price: e.target.value})} placeholder="25000" className="pl-9" />
                  </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Waktu Persiapan (Menit)</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input required type="number" min="1" value={formData.preparation_time_min} onChange={e => setFormData({...formData, preparation_time_min: e.target.value})} placeholder="15" className="pl-9" />
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                    Simpan Produk
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {successMsg && (
          <div className="bg-emerald-50 text-emerald-700 p-4 rounded-lg flex items-center border border-emerald-200 animate-in fade-in slide-in-from-top-2">
            <Check className="h-5 w-5 mr-3 text-emerald-500" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {/* bagian tabel */}
        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="bg-muted/50 border-b border-border py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Daftar Menu Terdaftar</CardTitle>
              <CardDescription>
                Total {products.length} menu makanan & minuman.
              </CardDescription>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari menu, SKU..." 
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-9 w-full bg-background"
                />
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select value={categoryFilter} onValueChange={(val) => { setCategoryFilter(val); setCurrentPage(1); }}>
                  <SelectTrigger className="w-full sm:w-[150px] bg-background">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">Semua Kategori</SelectItem>
                    {displayCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" size="icon" onClick={fetchProducts} disabled={isLoading} className="shrink-0 bg-background">
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin text-muted-foreground")} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-red-500" />
                <p className="animate-pulse">Memuat data produk...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-bold text-foreground">Tidak ada produk ditemukan</h3>
                <p className="text-muted-foreground mt-1">Coba sesuaikan filter atau kata kunci pencarian.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold text-muted-foreground">Info Produk</TableHead>
                      <TableHead className="font-semibold text-muted-foreground">Kategori</TableHead>
                      <TableHead className="font-semibold text-muted-foreground">Harga Dasar</TableHead>
                      <TableHead className="font-semibold text-muted-foreground text-center">Status</TableHead>
                      <TableHead className="font-semibold text-muted-foreground text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.sku_id} className="group hover:bg-muted/50 cursor-default">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border",
                              product.is_active ? "bg-red-50 border-red-100 text-red-600" : "bg-muted border-border text-muted-foreground"
                            )}>
                              <Utensils size={18} />
                            </div>
                            <div>
                              <div className={cn("font-medium", !product.is_active ? "text-muted-foreground" : "text-foreground")}>
                                {product.product_name}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 font-mono">
                                SKU: {product.sku_id}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={cn("flex flex-col", !product.is_active ? "opacity-60" : "")}>
                            <span className="text-sm font-medium text-foreground">
                              {product.category || '-'}
                            </span>
                            {product.sub_category && (
                              <span className="text-xs text-muted-foreground mt-0.5">
                                {product.sub_category}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={cn("flex flex-col", !product.is_active ? "opacity-60" : "")}>
                            <span className="font-semibold text-foreground">
                              {formatRupiah(product.base_selling_price || 0)}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock size={10} /> {product.preparation_time_min} menit
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn(
                            "px-2.5 py-0.5 rounded-full font-medium border",
                            product.is_active 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          )}>
                            {product.is_active ? 'Tersedia' : 'Arsip/Kosong'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => openEditModal(product)}
                            >
                              <Edit2 size={14} className="mr-1.5" /> Edit
                            </Button>
                            
                            {product.is_active && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                onClick={() => openDeleteModal(product)}
                              >
                                <Archive size={14} className="mr-1.5" /> Arsip
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* kontrol halaman */}
                <div className="border-t border-border px-4 py-3 flex items-center justify-between sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                      Sebelumnya
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p + 1))} disabled={currentPage >= meta.total_pages}>
                      Selanjutnya
                    </Button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div>
                        Menampilkan <span className="font-medium">{products.length === 0 ? 0 : (currentPage - 1) * limit + 1}</span> sampai <span className="font-medium">{Math.min(currentPage * limit, meta.total_data)}</span> dari <span className="font-medium">{meta.total_data}</span> data
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Tampilkan:</span>
                        <Select value={String(limit)} onValueChange={(val) => { setLimit(Number(val)); setCurrentPage(1); }}>
                          <SelectTrigger className="h-8 w-[70px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                        <Button
                          variant="outline"
                          className="rounded-l-md rounded-r-none border-border px-2 py-2"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <span className="sr-only">Previous</span>
                          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <div className="px-4 py-2 border border-y-border border-x-0 bg-background text-sm font-medium text-foreground flex items-center">
                          Halaman {currentPage} dari {meta.total_pages || 1}
                        </div>
                        <Button
                          variant="outline"
                          className="rounded-r-md rounded-l-none border-border px-2 py-2"
                          onClick={() => setCurrentPage(p => Math.max(1, p + 1))}
                          disabled={currentPage >= meta.total_pages}
                        >
                          <span className="sr-only">Next</span>
                          <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </nav>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* modal edit */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-blue-600" />
                Edit Data Produk
              </DialogTitle>
              <DialogDescription>
                Ubah informasi produk dengan SKU: <span className="font-mono font-bold text-slate-700">{formData.sku_id}</span>
              </DialogDescription>
            </DialogHeader>

            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2 border border-red-200">
                <span className="shrink-0 font-bold">Error:</span> {errorMsg}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nama Menu / Produk</Label>
                <Input required value={formData.product_name} onChange={e => setFormData({...formData, product_name: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kategori Utama</Label>
                  <Select 
                    required 
                    value={formData.category} 
                    onValueChange={(val) => setFormData({...formData, category: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {PREDEFINED_CATEGORIES.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sub-Kategori (Opsional)</Label>
                  <Input value={formData.sub_category || ''} onChange={e => setFormData({...formData, sub_category: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Harga Dasar Jual (Rp)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">Rp</span>
                    <Input required type="number" min="0" step="500" value={formData.base_selling_price} onChange={e => setFormData({...formData, base_selling_price: e.target.value})} className="pl-9" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Waktu Persiapan (Menit)</Label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input required type="number" min="1" value={formData.preparation_time_min} onChange={e => setFormData({...formData, preparation_time_min: e.target.value})} className="pl-9" />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 pt-2">
                <Label>Status Ketersediaan</Label>
                <Select 
                  value={formData.is_active ? "aktif" : "nonaktif"} 
                  onValueChange={(val) => setFormData({...formData, is_active: val === "aktif"})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aktif">Tersedia (Aktif)</SelectItem>
                    <SelectItem value="nonaktif">Kosong / Ditarik (Non-Aktif)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                  Simpan Perubahan
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* modal hapus / arsip */}
        <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-600">
                <Archive className="h-5 w-5" />
                Arsipkan Menu
              </DialogTitle>
              <DialogDescription className="pt-2">
                Apakah Anda yakin ingin menonaktifkan <strong>{formData.product_name}</strong>? 
                Produk ini tidak akan muncul lagi di kasir cabang, namun riwayat penjualannya akan tetap tersimpan.
              </DialogDescription>
            </DialogHeader>

            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mt-2">
                {errorMsg}
              </div>
            )}

            <DialogFooter className="pt-6">
              <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>
                Batal
              </Button>
              <Button 
                type="button" 
                className="bg-orange-600 hover:bg-orange-700" 
                disabled={isSubmitting}
                onClick={handleDelete}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                Ya, Arsipkan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
      </div>
    </DashboardLayout>
  );
}
