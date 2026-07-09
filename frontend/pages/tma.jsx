import Head from 'next/head';
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_TUNNEL_URL || 'https://audit-ships-copied-mutual.trycloudflare.com';

// ikon kategori
const CATEGORY_ICONS = {
  'Minuman': '🥤',
  'Makanan': '🍱',
  'Snack': '🍿',
  'Dessert': '🍰',
  'Lainnya': '📦',
};

export default function TelegramMiniApp() {
  const [products, setProducts] = useState([]);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState({}); // { sku_id: quantity }
  const [activeCategory, setActiveCategory] = useState('Semua');
  
  // flow POS: menu -> summary -> payment
  const [viewState, setViewState] = useState('menu'); 
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // inisialisasi telegram sdk
    const initApp = async () => {
      try {
        const WebApp = (await import('@twa-dev/sdk')).default;
        WebApp.ready();
        WebApp.expand();
      } catch (e) {
        console.log("bukan di lingkungan telegram:", e);
      }
    };
    initApp();

    // ambil data produk dari fastapi
    setIsLoading(true);
    fetch(`${API_BASE_URL}/get-active-products`)
      .then(res => res.json())
      .then(data => { setProducts(data); setIsLoading(false); })
      .catch(err => { console.error("gagal load produk:", err); setIsLoading(false); });
  }, []);

  // daftar kategori unik dari produk
  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category || 'Lainnya'))];
    return ['Semua', ...cats];
  }, [products]);

  // filter produk berdasarkan kategori aktif
  const filteredProducts = useMemo(() => {
    if (activeCategory === 'Semua') return products;
    return products.filter(p => (p.category || 'Lainnya') === activeCategory);
  }, [products, activeCategory]);

  // hitung total item dan total harga di keranjang
  const { totalItems, totalPrice } = useMemo(() => {
    let items = 0;
    let price = 0;
    Object.entries(cart).forEach(([skuId, qty]) => {
      const product = products.find(p => p.sku_id === skuId);
      if (product) {
        items += qty;
        price += qty * product.base_selling_price;
      }
    });
    return { totalItems: items, totalPrice: price };
  }, [cart, products]);

  // tambah satu item ke keranjang
  const addToCart = (skuId) => {
    setCart(prev => ({ ...prev, [skuId]: (prev[skuId] || 0) + 1 }));
  };

  // kurangi satu item dari keranjang
  const removeFromCart = (skuId) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[skuId] > 1) newCart[skuId]--;
      else delete newCart[skuId];
      
      // jika keranjang kosong saat di summary, kembali ke menu
      if (Object.keys(newCart).length === 0 && viewState === 'summary') {
         setViewState('menu');
      }
      return newCart;
    });
  };

  // kirim seluruh keranjang sebagai bulk order
  const processOrder = async () => {
    setIsCheckingOut(true);
    const items = Object.entries(cart).map(([sku_id, quantity]) => ({ sku_id, quantity }));

    try {
      let tgUser = null;
      try {
        const WebApp = (await import('@twa-dev/sdk')).default;
        tgUser = WebApp.initDataUnsafe?.user;
      } catch(e) {}

      const response = await fetch(`${API_BASE_URL}/save-bulk-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegram_id: tgUser?.id || '99999',
          items,
          timestamp: new Date().toISOString()
        })
      });

      if (response.ok) {
        try { 
           const WebApp = (await import('@twa-dev/sdk')).default;
           WebApp.HapticFeedback.notificationOccurred('success'); 
        } catch (_) {}
        // lanjut ke halaman pembayaran, biarkan state keranjang agar mengetahui total pembayaran
        setViewState('payment');
      } else {
        try { 
           const WebApp = (await import('@twa-dev/sdk')).default;
           WebApp.showAlert('Gagal menyimpan pesanan. Coba lagi.'); 
        } catch (_) { alert('Gagal.'); }
      }
    } catch (e) {
      console.error("checkout gagal:", e);
      // fallback untuk lingkungan lokal
      setViewState('payment');
    } finally {
      setIsCheckingOut(false);
    }
  };

  // selesai order dan tutup / kembali
  const resetApp = () => {
     setCart({});
     setViewState('menu');
  };

  // cegah hydration mismatch
  if (!isClient) return null;

  return (
    <div className="h-screen overflow-hidden bg-slate-950 font-sans flex flex-col">
      <Head>
        <title>Kasir Digital AI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <style>{`
          * { -ms-overflow-style: none !important; scrollbar-width: none !important; }
          *::-webkit-scrollbar { display: none !important; width: 0 !important; }
          html, body { overflow: hidden !important; height: 100% !important; background: #020617 !important; }
        `}</style>
      </Head>

      {/* header */}
      <div className="shrink-0 bg-gradient-to-r from-indigo-900 to-violet-900 px-4 pt-4 pb-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-base">
               {viewState === 'menu' ? '🛒' : viewState === 'summary' ? '🧾' : '💳'}
            </div>
            <div>
              <h1 className="text-white font-bold text-sm leading-tight">
                 {viewState === 'menu' ? 'Kasir Digital AI' : viewState === 'summary' ? 'Konfirmasi Pesanan' : 'Pembayaran'}
              </h1>
              <p className="text-indigo-300 text-[11px]">
                 {isLoading ? 'Memuat...' : viewState === 'menu' ? `${products.length} produk tersedia` : 'Langkah terakhir'}
              </p>
            </div>
          </div>
          {viewState === 'menu' && totalItems > 0 && (
            <Badge className="bg-white/20 text-white border-white/20 text-[11px] px-2">
              {totalItems} item
            </Badge>
          )}
        </div>

        {/* tab kategori (hanya tampil di menu) */}
        {viewState === 'menu' && (
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  activeCategory === cat
                    ? 'bg-white text-indigo-900'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {cat === 'Semua' ? '🏪 Semua' : `${CATEGORY_ICONS[cat] || '📦'} ${cat}`}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* main content area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 relative" style={{scrollbarWidth:'none'}}>
        
        {/* === VIEW: MENU === */}
        {viewState === 'menu' && (
           <>
            {/* skeleton loading */}
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-[68px] rounded-2xl bg-white/5 animate-pulse border border-white/5" />
            ))}

            {/* kartu produk */}
            {!isLoading && filteredProducts.map((p) => {
              const qty = cart[p.sku_id] || 0;
              const icon = CATEGORY_ICONS[p.category] || '📦';

              return (
                <Card key={p.sku_id} className={`border transition-all duration-200 rounded-2xl ${
                  qty > 0
                    ? 'bg-indigo-500/15 border-indigo-400/40'
                    : 'bg-white/5 border-white/8 hover:border-white/15'
                }`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    {/* ikon produk */}
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-lg shrink-0">
                      {icon}
                    </div>

                    {/* info produk */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm leading-tight truncate">{p.product_name}</p>
                      {p.sub_category && (
                        <p className="text-white/40 text-[10px] leading-tight truncate">{p.sub_category}</p>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-indigo-300 text-xs font-bold">
                          Rp{Number(p.base_selling_price).toLocaleString('id-ID')}
                        </span>
                        {p.preparation_time_min > 0 && (
                          <span className="text-white/30 text-[9px]">⏱ {p.preparation_time_min}m</span>
                        )}
                      </div>
                    </div>

                    {/* kontrol kuantitas */}
                    {qty === 0 ? (
                      <Button
                        size="sm"
                        onClick={() => addToCart(p.sku_id)}
                        className="shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs px-4 h-8 transition-all"
                      >
                        Tambah
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => removeFromCart(p.sku_id)}
                          className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 active:scale-90 text-white font-bold text-base flex items-center justify-center transition-all"
                        >−</button>
                        <span className="text-white font-bold text-sm w-4 text-center">{qty}</span>
                        <button
                          onClick={() => addToCart(p.sku_id)}
                          className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-90 text-white font-bold text-base flex items-center justify-center transition-all"
                        >+</button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}

            {/* empty state */}
            {!isLoading && filteredProducts.length === 0 && (
               <div className="text-center py-12 space-y-2">
                 <div className="text-4xl">🍽️</div>
                 <p className="text-slate-500 text-sm">Tidak ada produk di kategori ini</p>
               </div>
            )}
           </>
        )}

        {/* === VIEW: SUMMARY & CHECKOUT === */}
        {viewState === 'summary' && (
           <div className="bg-white/5 rounded-2xl p-4 border border-white/10 animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 shadow-xl">
             <h2 className="text-white font-bold text-sm mb-4 bg-white/10 inline-block px-3 py-1 rounded-full">Daftar Belanja</h2>
             <div className="space-y-4 mb-6">
                {Object.entries(cart).map(([skuId, qty]) => {
                  const p = products.find(x => x.sku_id === skuId);
                  if (!p) return null;
                  return (
                    <div key={skuId} className="flex justify-between items-start gap-3 border-b border-white/5 pb-3">
                      <div className="flex-1">
                         <p className="text-white font-medium text-sm leading-tight mb-1">{p.product_name}</p>
                         <p className="text-white/40 text-[11px]">Rp{Number(p.base_selling_price).toLocaleString('id')} x {qty}</p>
                      </div>
                      <div className="text-right shrink-0">
                         <p className="text-indigo-300 font-bold text-sm">Rp{(p.base_selling_price * qty).toLocaleString('id')}</p>
                         {/* tombol edit di rincian */}
                         <div className="flex items-center gap-2 mt-2 justify-end">
                           <button onClick={() => removeFromCart(skuId)} className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-white text-xs hover:bg-white/20">-</button>
                           <span className="text-white text-xs min-w-[12px] text-center">{qty}</span>
                           <button onClick={() => addToCart(skuId)} className="w-5 h-5 rounded bg-indigo-600 flex items-center justify-center text-white text-xs hover:bg-indigo-500">+</button>
                         </div>
                      </div>
                    </div>
                  )
                })}
             </div>
             <div className="bg-slate-950 p-4 rounded-xl border border-white/5 shadow-inner">
                <div className="flex justify-between items-center text-white/70 mb-1 text-xs">
                   <span>Subtotal</span>
                   <span>Rp{totalPrice.toLocaleString('id')}</span>
                </div>
                <div className="flex justify-between items-center text-white/70 mb-3 text-xs">
                   <span>Pajak (0%)</span>
                   <span>Rp0</span>
                </div>
                <div className="flex justify-between items-center border-t border-white/10 pt-3">
                   <span className="text-white font-bold text-sm">Total Bayar</span>
                   <span className="text-emerald-400 font-black text-lg">Rp{totalPrice.toLocaleString('id')}</span>
                </div>
             </div>
           </div>
        )}

        {/* === VIEW: PAYMENT === */}
        {viewState === 'payment' && (
           <div className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-3xl p-6 border border-emerald-500/20 text-center animate-in zoom-in-95 duration-500 shadow-2xl">
              <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-4xl mx-auto mb-5 shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                 ✅
              </div>
              <h2 className="text-white font-bold text-xl mb-1">Pesanan Berhasil!</h2>
              <p className="text-emerald-200/70 text-xs mb-6 px-4">Sistem telah mencatat pesanan Anda dan akan segera disiapkan.</p>
              
              <div className="bg-slate-950 rounded-2xl p-5 mb-6 border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-10 text-4xl">🏦</div>
                <p className="text-white/60 text-[10px] uppercase font-bold tracking-wider mb-2 relative z-10">Total Tagihan</p>
                <p className="text-emerald-400 font-black text-2xl relative z-10 mb-4">Rp{totalPrice.toLocaleString('id')}</p>
                
                <div className="h-px w-full bg-white/10 mb-4" />

                <p className="text-white/60 text-[10px] uppercase font-bold tracking-wider mb-2 relative z-10">Transfer ke Rekening</p>
                <div className="flex flex-col items-center gap-1 relative z-10">
                   <p className="text-white font-black text-xl tracking-widest bg-white/5 py-1.5 px-4 rounded-lg">1234 567 890</p>
                   <p className="text-white/50 text-xs font-medium">BCA a/n RafTech Kasir</p>
                </div>
              </div>
              
              <Button onClick={resetApp} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl h-12 shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
                Selesai & Ke Menu Utama
              </Button>
           </div>
        )}

      </div>

      {/* footer keranjang (hanya di menu & summary) */}
      {(viewState === 'menu' || viewState === 'summary') && totalItems > 0 && (
        <div className="shrink-0 p-3 bg-slate-900/95 border-t border-white/10 backdrop-blur-xl animate-in slide-in-from-bottom-2">
           {viewState === 'menu' ? (
              <button
                onClick={() => setViewState('summary')}
                className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] text-white font-bold py-3.5 text-sm transition-all flex items-center justify-between px-5 shadow-lg shadow-indigo-500/20"
              >
                <span className="bg-white/20 rounded-lg px-2.5 py-1 text-xs">{totalItems} item</span>
                <span>Keranjang Saya</span>
                <span className="font-black">Rp{totalPrice.toLocaleString('id-ID')}</span>
              </button>
           ) : (
              <div className="flex gap-2">
                 <button
                   onClick={() => setViewState('menu')}
                   className="rounded-2xl border border-white/20 bg-transparent active:bg-white/10 text-white font-bold py-3.5 text-sm transition-all px-4"
                 >
                    Kembali
                 </button>
                 <button
                   disabled={isCheckingOut}
                   onClick={processOrder}
                   className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] disabled:opacity-50 text-white font-bold py-3.5 text-sm transition-all shadow-lg shadow-emerald-500/20"
                 >
                   {isCheckingOut ? 'Loading...' : 'Pesan & Bayar Sekarang'}
                 </button>
              </div>
           )}
        </div>
      )}
    </div>
  );
}
