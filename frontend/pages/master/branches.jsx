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
import { Store, MapPin, Loader2, RefreshCw, Plus, Edit2, Archive, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

export default function BranchManagementPage() {
  const [branches, setBranches] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 10, total_data: 0, total_pages: 1 });
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [serverRegions, setServerRegions] = useState([]);
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
  const [regionFilter, setRegionFilter] = useState('ALL');

  // state untuk form
  const initialForm = {
    id: null,
    branch_name: '',
    region: '',
    city: '',
    address: '',
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

  const fetchBranches = async () => {
    setIsLoading(true);
    try {
      const headers = getAuthHeaders();
      const params = new URLSearchParams({
        page: currentPage,
        limit: limit,
      });
      if (searchQuery) params.append('search', searchQuery);
      if (regionFilter !== 'ALL') params.append('region', regionFilter);

      const res = await fetch(`http://localhost:8000/api/master/branches?${params.toString()}`, { headers });

      if (res.ok) {
        const response = await res.json();
        setBranches(response.data);
        setMeta(response.meta);
      }
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRegions = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/master/branch-regions', { headers: getAuthHeaders() });
      if (res.ok) {
        setServerRegions(await res.json());
      }
    } catch (err) {}
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBranches();
    }, 300);
    return () => clearTimeout(timer);
  }, [currentPage, limit, searchQuery, regionFilter]);

  useEffect(() => {
    fetchRegions();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('http://localhost:8000/api/master/branches', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          branch_name: formData.branch_name,
          region: formData.region,
          city: formData.city,
          address: formData.address,
          is_active: true
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Gagal menambahkan cabang');
      }

      setSuccessMsg('Cabang berhasil ditambahkan!');
      setIsCreateOpen(false);
      setFormData(initialForm);
      fetchBranches();
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

    try {
      const res = await fetch(`http://localhost:8000/api/master/branches/${formData.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          branch_name: formData.branch_name,
          region: formData.region,
          city: formData.city,
          address: formData.address,
          is_active: formData.is_active
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Gagal mengubah cabang');
      }

      setSuccessMsg('Cabang berhasil diperbarui!');
      setIsEditOpen(false);
      setFormData(initialForm);
      fetchBranches();
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
      const res = await fetch(`http://localhost:8000/api/master/branches/${formData.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Gagal menonaktifkan cabang');
      }

      setSuccessMsg('Cabang berhasil dinonaktifkan!');
      setIsDeleteOpen(false);
      setFormData(initialForm);
      fetchBranches();
    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (branch) => {
    setFormData({ ...branch });
    setIsEditOpen(true);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const openDeleteModal = (branch) => {
    setFormData({ ...branch });
    setIsDeleteOpen(true);
    setErrorMsg('');
    setSuccessMsg('');
  };

  return (
    <DashboardLayout>
      <Head>
        <title>Branch Management | Master Data</title>
      </Head>

      <div className="p-8 space-y-6 min-h-screen">
        {/* bagian header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Branch Management</h2>
            <p className="text-muted-foreground mt-1">Kelola data seluruh outlet dan wilayah operasional.</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            if(!open) setFormData(initialForm);
            setIsCreateOpen(open);
            setErrorMsg('');
          }}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20">
                <Plus className="mr-2 h-4 w-4" /> Tambah Cabang Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Store className="h-5 w-5 text-red-600" />
                  Tambah Cabang Baru
                </DialogTitle>
                <DialogDescription>
                  Masukkan informasi outlet baru ke dalam sistem.
                </DialogDescription>
              </DialogHeader>

              {errorMsg && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2 border border-red-200">
                  <span className="shrink-0 font-bold">Error:</span> {errorMsg}
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nama Cabang (Outlet)</Label>
                  <Input required value={formData.branch_name} onChange={e => setFormData({...formData, branch_name: e.target.value})} placeholder="Misal: D'BESTO Kuta" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Region (Wilayah)</Label>
                    <Input required value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} placeholder="Misal: Bali" />
                  </div>
                  <div className="space-y-2">
                    <Label>Kota/Kabupaten</Label>
                    <Input required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="Misal: Denpasar" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Alamat Lengkap</Label>
                  <Input required value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Nama jalan, nomor, patokan..." />
                </div>

                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                    Simpan Cabang
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

        <Card className="shadow-sm border-border bg-card">
          <CardHeader className="bg-muted/50 border-b border-border py-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-lg">Daftar Cabang Terdaftar</CardTitle>
                <CardDescription>
                  Total {meta.total_data || 0} cabang terdaftar dalam sistem.
                </CardDescription>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-[250px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Cari cabang, kota..." 
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="pl-9 w-full bg-background"
                  />
                </div>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Select value={regionFilter} onValueChange={(val) => { setRegionFilter(val); setCurrentPage(1); }}>
                    <SelectTrigger className="w-full sm:w-[150px] bg-background">
                      <SelectValue placeholder="Pilih Region" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Semua Region</SelectItem>
                      {serverRegions.map(region => (
                        <SelectItem key={region} value={region}>{region}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button variant="outline" size="icon" onClick={fetchBranches} disabled={isLoading} className="shrink-0 bg-background">
                  <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin text-muted-foreground")} />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-red-500" />
                <p className="animate-pulse">Memuat data cabang...</p>
              </div>
            ) : branches.length === 0 ? (
              <div className="text-center py-20 bg-muted/50 rounded-xl border border-border border-dashed">
                <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-bold text-foreground">Tidak ada cabang ditemukan</h3>
                <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
                  Cobalah untuk mengubah kata kunci pencarian atau reset filter region.
                </p>
                {(searchQuery !== '' || regionFilter !== 'ALL') && (
                  <Button 
                    variant="link" 
                    onClick={() => { setSearchQuery(''); setRegionFilter('ALL'); }}
                    className="mt-2 text-red-600"
                  >
                    Reset Filter
                  </Button>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden bg-card">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold text-muted-foreground">Nama Cabang</TableHead>
                      <TableHead className="font-semibold text-muted-foreground">Lokasi</TableHead>
                      <TableHead className="font-semibold text-muted-foreground text-center">Status</TableHead>
                      <TableHead className="font-semibold text-muted-foreground text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branches.map((branch) => (
                      <TableRow key={branch.id} className="group transition-colors hover:bg-muted/50 cursor-default">
                        <TableCell className="font-medium text-foreground">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                              branch.is_active ? "bg-red-100 text-red-600" : "bg-muted text-muted-foreground"
                            )}>
                              <Store size={14} />
                            </div>
                            <span className={!branch.is_active ? "text-muted-foreground" : ""}>{branch.branch_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={cn("flex flex-col", !branch.is_active ? "opacity-60" : "")}>
                            <span className="text-sm font-medium text-foreground flex items-center gap-1.5">
                              <MapPin size={12} className="text-muted-foreground" />
                              {branch.city}, {branch.region}
                            </span>
                            <span className="text-xs text-muted-foreground mt-0.5 truncate max-w-[250px]" title={branch.address}>
                              {branch.address}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn(
                            "px-2.5 py-0.5 rounded-full font-medium border",
                            branch.is_active 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          )}>
                            {branch.is_active ? 'Aktif' : 'Non-Aktif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => openEditModal(branch)}
                            >
                              <Edit2 size={14} className="mr-1.5" /> Edit
                            </Button>
                            
                            {branch.is_active && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                onClick={() => openDeleteModal(branch)}
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
                        Menampilkan <span className="font-medium">{branches.length === 0 ? 0 : (currentPage - 1) * limit + 1}</span> sampai <span className="font-medium">{Math.min(currentPage * limit, meta.total_data)}</span> dari <span className="font-medium">{meta.total_data}</span> data
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
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-blue-600" />
                Edit Data Cabang
              </DialogTitle>
              <DialogDescription>
                Ubah informasi detail untuk {formData.branch_name}.
              </DialogDescription>
            </DialogHeader>

            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm flex items-center gap-2 border border-red-200">
                <span className="shrink-0 font-bold">Error:</span> {errorMsg}
              </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nama Cabang (Outlet)</Label>
                <Input required value={formData.branch_name} onChange={e => setFormData({...formData, branch_name: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Region (Wilayah)</Label>
                  <Input required value={formData.region} onChange={e => setFormData({...formData, region: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Kota/Kabupaten</Label>
                  <Input required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Alamat Lengkap</Label>
                <Input required value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
              
              <div className="space-y-2 pt-2">
                <Label>Status Operasional</Label>
                <Select 
                  value={formData.is_active ? "aktif" : "nonaktif"} 
                  onValueChange={(val) => setFormData({...formData, is_active: val === "aktif"})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aktif">Beroperasi (Aktif)</SelectItem>
                    <SelectItem value="nonaktif">Tutup Sementara / Permanen (Non-Aktif)</SelectItem>
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
                Arsipkan Cabang
              </DialogTitle>
              <DialogDescription className="pt-2">
                Apakah Anda yakin ingin menonaktifkan <strong>{formData.branch_name}</strong>? 
                Cabang ini tidak akan bisa dipilih oleh pengguna baru, namun riwayat datanya akan tetap tersimpan.
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
