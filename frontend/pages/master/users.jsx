import React, { useState, useEffect } from 'react';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { UserPlus, ShieldAlert, Loader2, RefreshCw, Check, ChevronsUpDown, Edit2, Archive, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function UserManagementPage() {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 10, total_data: 0, total_pages: 1 });
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [branches, setBranches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // state untuk modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [openBranchBox, setOpenBranchBox] = useState(false);

  // state untuk form
  const initialForm = {
    id: null,
    email: '',
    password: '',
    full_name: '',
    role: 'manager',
    branch_id: '',
    telegram_id: ''
  };
  const [formData, setFormData] = useState(initialForm);

  const getAuthHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const headers = getAuthHeaders();
      const params = new URLSearchParams({
        page: currentPage,
        limit: limit,
      });
      if (searchQuery) params.append('search', searchQuery);

      const [usersRes, branchesRes] = await Promise.all([
        fetch(`http://localhost:8000/api/master/users?${params.toString()}`, { headers }),
        fetch('http://localhost:8000/api/master/branches?limit=100', { headers })
      ]);

      if (usersRes.ok) {
        const response = await usersRes.json();
        setUsers(response.data || []);
        if (response.meta) setMeta(response.meta);
      }
      
      if (branchesRes.ok) {
        const branchesData = await branchesRes.json();
        setBranches(branchesData.data || branchesData);
      }
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [currentPage, limit, searchQuery]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const trimmedEmail = formData.email ? formData.email.trim() : '';
      if (!trimmedEmail) {
        throw new Error("Email wajib diisi dan tidak boleh hanya spasi.");
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        throw new Error("Format email tidak valid (harus mengandung @ dan .)");
      }

      const trimmedName = formData.full_name ? formData.full_name.trim() : '';
      if (!trimmedName) throw new Error("Nama Lengkap wajib diisi dan tidak boleh hanya spasi.");

      const trimmedPassword = formData.password ? formData.password.trim() : '';
      if (!trimmedPassword) throw new Error("Password wajib diisi dan tidak boleh hanya spasi.");

      const profilePayload = {
        email: trimmedEmail,
        full_name: trimmedName,
        role: formData.role,
        branch_id: (formData.role === 'manager' || formData.role === 'kasir') ? formData.branch_id : null,
        telegram_id: formData.role === 'kasir' ? formData.telegram_id : null
      };

      // 1. pra-validasi di backend sebelum membuat user di supabase
      const validateRes = await fetch('http://localhost:8000/api/master/users/validate', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(profilePayload)
      });
      if (!validateRes.ok) {
        const errData = await validateRes.json();
        throw new Error(errData.detail || 'Gagal memvalidasi data pegawai');
      }

      // 2. buat user di supabase auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: trimmedPassword,
      });

      if (authError) throw new Error(authError.message);

      // 3. selesaikan pembuatan profil di backend
      profilePayload.id = authData.user?.id;

      const res = await fetch('http://localhost:8000/api/master/users', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(profilePayload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Gagal menyimpan profil ke database');
      }

      setSuccessMsg('Pegawai berhasil ditambahkan!');
      setIsCreateOpen(false);
      setFormData(initialForm);
      fetchData(); 

    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const trimmedName = formData.full_name ? formData.full_name.trim() : '';
      if (!trimmedName) throw new Error("Nama Lengkap wajib diisi dan tidak boleh hanya spasi.");

      const profilePayload = {
        full_name: trimmedName,
        role: formData.role,
        branch_id: (formData.role === 'manager' || formData.role === 'kasir') ? formData.branch_id : null,
        telegram_id: formData.role === 'kasir' ? formData.telegram_id : null
      };

      const res = await fetch(`http://localhost:8000/api/master/users/${formData.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(profilePayload)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Gagal mengupdate profil');
      }

      setSuccessMsg('Pegawai berhasil diperbarui!');
      setIsEditOpen(false);
      setFormData(initialForm);
      fetchData(); 

    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`http://localhost:8000/api/master/users/${formData.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Gagal menonaktifkan pegawai');
      }

      const result = await res.json();
      setSuccessMsg(result.message || 'Pegawai berhasil dihapus!');
      setIsDeleteOpen(false);
      setFormData(initialForm);
      fetchData(); 

    } catch (err) {
      setErrorMsg(err.message || 'Terjadi kesalahan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (user) => {
    setFormData({ 
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      branch_id: user.branch_id,
      telegram_id: user.telegram_id || ''
    });
    setIsEditOpen(true);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const openDeleteModal = (user) => {
    setFormData({ id: user.id, full_name: user.full_name, email: user.email });
    setIsDeleteOpen(true);
    setErrorMsg('');
    setSuccessMsg('');
  };

  return (
    <DashboardLayout>
      <Head>
        <title>User Management | Master Data</title>
      </Head>

      <div className="p-8 space-y-6 min-h-screen">
        {/* bagian header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">User Management</h2>
            <p className="text-muted-foreground mt-1">Kelola hak akses Admin, Manager Outlet, dan Kasir.</p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            if(!open) setFormData(initialForm);
            setIsCreateOpen(open);
          }}>
            <DialogTrigger asChild>
              <Button className="bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20">
                <UserPlus className="mr-2 h-4 w-4" /> Tambah Pegawai
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Tambah Pegawai Baru</DialogTitle>
                <DialogDescription>
                  Akun ini akan langsung dapat digunakan untuk login ke Dashboard atau Telegram POS.
                </DialogDescription>
              </DialogHeader>
              
              {errorMsg && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md flex items-start gap-2 border border-red-200">
                  <ShieldAlert className="h-4 w-4 mt-0.5" /> {errorMsg}
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nama Lengkap</Label>
                  <Input required value={formData.full_name || ''} onChange={e => setFormData({...formData, full_name: e.target.value})} placeholder="John Doe" />
                </div>
                
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="john@dbesto.com" />
                </div>

                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Minimal 6 karakter" />
                </div>

                <div className="space-y-2">
                  <Label>Role (Hak Akses)</Label>
                  <Select value={formData.role} onValueChange={val => setFormData({...formData, role: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin HQ</SelectItem>
                      <SelectItem value="manager">Manager Outlet</SelectItem>
                      <SelectItem value="kasir">Kasir</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(formData.role === 'manager' || formData.role === 'kasir') && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2 flex flex-col">
                    <Label>Cabang (Outlet)</Label>
                    <Popover open={openBranchBox} onOpenChange={setOpenBranchBox}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openBranchBox}
                          className="w-full justify-between"
                        >
                          {formData.branch_id
                            ? branches.find((b) => b.id === formData.branch_id)?.branch_name
                            : "Pilih cabang..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[375px] p-0" align="start">
                        <Command>
                          <CommandInput placeholder="Cari nama cabang atau kota..." />
                          <CommandList>
                            <CommandEmpty>Cabang tidak ditemukan.</CommandEmpty>
                            <CommandGroup>
                              {branches.map((b) => (
                                <CommandItem
                                  key={b.id}
                                  value={b.branch_name}
                                  onSelect={() => {
                                    setFormData({ ...formData, branch_id: b.id });
                                    setOpenBranchBox(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.branch_id === b.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  {b.branch_name} ({b.city})
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                )}

                {formData.role === 'kasir' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <Label>Telegram ID (Wajib untuk POS Bot)</Label>
                    <Input required value={formData.telegram_id || ''} onChange={e => setFormData({...formData, telegram_id: e.target.value})} placeholder="Misal: 123456789" />
                  </div>
                )}

                <DialogFooter className="pt-4">
                  <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                    Simpan Akun
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
              <CardTitle className="text-lg">Daftar Pegawai Terdaftar</CardTitle>
              <CardDescription>Total {meta.total_data || users.length} pegawai.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-[250px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Cari nama, email..." 
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-9 w-full bg-background"
                />
              </div>
              <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading} className="shrink-0 bg-background">
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin text-muted-foreground")} /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="font-semibold text-muted-foreground">Nama</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Email</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Role</TableHead>
                  <TableHead className="font-semibold text-muted-foreground">Penempatan Cabang</TableHead>
                  <TableHead className="font-semibold text-muted-foreground text-center">Status</TableHead>
                  <TableHead className="font-semibold text-muted-foreground text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-slate-500">
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                        Memuat data pegawai...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-20 text-slate-500">Belum ada pegawai terdaftar.</TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => {
                    const branch = branches.find(b => b.id === user.branch_id);
                    const isActive = user.role !== 'inactive';
                    return (
                      <TableRow key={user.id} className="group hover:bg-muted/50 cursor-default">
                        <TableCell className="font-medium text-foreground">
                          <div className={cn("flex items-center gap-2", !isActive && "opacity-60")}>
                            {user.full_name || 'Tanpa Nama'}
                          </div>
                        </TableCell>
                        <TableCell className={cn("text-muted-foreground", !isActive && "opacity-60")}>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === 'admin' ? 'destructive' : user.role === 'manager' ? 'default' : user.role === 'kasir' ? 'secondary' : 'outline'} className={!isActive ? "opacity-60 grayscale" : ""}>
                            {user.role.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell className={cn("text-foreground", !isActive && "opacity-60")}>
                          {branch ? <span className="text-sm font-medium">{branch.branch_name}</span> : <span className="text-muted-foreground text-xs italic">HQ / Semua Cabang</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          {isActive ? (
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 px-2.5 py-0.5 rounded-full font-medium">Aktif</Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50 px-2.5 py-0.5 rounded-full font-medium">Non-aktif</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {isActive && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  onClick={() => openEditModal(user)}
                                >
                                  <Edit2 size={14} className="mr-1.5" /> Edit
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                  onClick={() => openDeleteModal(user)}
                                >
                                  <Archive size={14} className="mr-1.5" /> Arsip
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
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
                    Menampilkan <span className="font-medium">{users.length === 0 ? 0 : (currentPage - 1) * limit + 1}</span> sampai <span className="font-medium">{Math.min(currentPage * limit, meta.total_data)}</span> dari <span className="font-medium">{meta.total_data}</span> data
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
          </CardContent>
        </Card>

        {/* modal edit */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-blue-600" />
                Edit Pegawai
              </DialogTitle>
              <DialogDescription>
                Ubah penempatan cabang atau role untuk {formData.full_name || formData.email}.
              </DialogDescription>
            </DialogHeader>
            
            {errorMsg && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md flex items-start gap-2 border border-red-200">
                <ShieldAlert className="h-4 w-4 mt-0.5" /> {errorMsg}
              </div>
            )}

              <form onSubmit={handleUpdateUser} className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nama Lengkap</Label>
                  <Input required value={formData.full_name || ''} onChange={e => setFormData({...formData, full_name: e.target.value})} placeholder="John Doe" />
                </div>
                
                <div className="space-y-2">
                  <Label>Role (Hak Akses)</Label>
                <Select value={formData.role} onValueChange={val => setFormData({...formData, role: val})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin HQ</SelectItem>
                    <SelectItem value="manager">Manager Outlet</SelectItem>
                    <SelectItem value="kasir">Kasir</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(formData.role === 'manager' || formData.role === 'kasir') && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 flex flex-col">
                  <Label>Cabang (Outlet)</Label>
                  <Popover open={openBranchBox} onOpenChange={setOpenBranchBox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openBranchBox}
                        className="w-full justify-between"
                      >
                        {formData.branch_id
                          ? branches.find((b) => b.id === formData.branch_id)?.branch_name
                          : "Pilih cabang..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[375px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Cari nama cabang atau kota..." />
                        <CommandList>
                          <CommandEmpty>Cabang tidak ditemukan.</CommandEmpty>
                          <CommandGroup>
                            {branches.map((b) => (
                              <CommandItem
                                key={b.id}
                                value={b.branch_name}
                                onSelect={() => {
                                  setFormData({ ...formData, branch_id: b.id });
                                  setOpenBranchBox(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.branch_id === b.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {b.branch_name} ({b.city})
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {formData.role === 'kasir' && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                  <Label>Telegram ID (Wajib untuk POS Bot)</Label>
                  <Input required value={formData.telegram_id || ''} onChange={e => setFormData({...formData, telegram_id: e.target.value})} placeholder="Misal: 123456789" />
                </div>
              )}

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
                Nonaktifkan Pegawai
              </DialogTitle>
              <DialogDescription className="pt-2">
                Apakah Anda yakin ingin menonaktifkan <strong>{formData.full_name || formData.email}</strong>? 
                Pegawai ini tidak akan bisa lagi login ke sistem, namun riwayat data kasirnya tetap tersimpan dengan aman.
              </DialogDescription>
            </DialogHeader>

            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mt-2 border border-red-200">
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
                onClick={handleDeleteUser}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                Ya, Nonaktifkan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
