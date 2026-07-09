from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import get_db
from app.models.product import Product
from app.models.fact_transaction import FactTransaction
from app.models.profile import Profile
from app.models.retail_branch import RetailBranch
from pydantic import BaseModel
from typing import Any, List

router = APIRouter(tags=["Telegram Integration"])

# schema item dalam keranjang
class CartItem(BaseModel):
    sku_id: Any
    quantity: int = 1

# schema bulk order dari tma
class BulkOrderPayload(BaseModel):
    telegram_id: Any
    items: List[CartItem]
    timestamp: Any

# schema order tunggal (backward compatibility)
class OrderPayload(BaseModel):
    telegram_id: Any
    sku_id: Any
    quantity: int = 1
    timestamp: Any

@router.get("/get-active-products")
def get_active_products(db: Session = Depends(get_db)):
    """
    ambil produk aktif dari dim_products, termasuk kategori dan sub-kategori.
    """
    products = db.query(Product).filter(Product.is_active == True).all()
    
    return [
        {
            "sku_id": p.sku_id,
            "product_name": p.product_name,
            "base_selling_price": p.base_selling_price or 0,
            "category": p.category or "Lainnya",
            "sub_category": p.sub_category or "",
            "preparation_time_min": p.preparation_time_min or 0,
        }
        for p in products
    ]

@router.post("/save-transaction")
def save_transaction(payload: OrderPayload, db: Session = Depends(get_db)):
    """
    simpan satu transaksi dari bot telegram ke postgres.
    """
    from datetime import datetime
    try:
        parsed_time = datetime.fromisoformat(payload.timestamp.replace("Z", "+00:00"))
    except:
        parsed_time = datetime.utcnow()

    # cari data kasir menggunakan orm join
    profile = db.query(Profile).filter(Profile.telegram_id == str(payload.telegram_id)).first()

    kasir_id = None
    branch_id = None
    outlet_name = None
    region = None
    city = None

    if profile and profile.branch:
        kasir_id = profile.id
        branch_id = profile.branch.id
        outlet_name = profile.branch.branch_name
        region = profile.branch.region
        city = profile.branch.city
    else:
        # jika telegram_id tidak terdaftar di profiles, tolak request
        return {"status": "error", "message": "ID Telegram Anda belum terdaftar sebagai Kasir di cabang manapun."}

    product = db.query(Product).filter(Product.sku_id == str(payload.sku_id)).first()
    if product:
        qty = payload.quantity
        total = qty * product.base_selling_price
        price_str = f"{int(product.base_selling_price):,}".replace(",", ".")
        total_str = f"{int(total):,}".replace(",", ".")
        jawaban_bot = f"*{product.product_name}* x{qty}\nTotal: Rp{total_str}"
    else:
        total = None
        jawaban_bot = f"Pesanan kode produk {payload.sku_id} diterima."

    # buat id transaksi unik
    trx_id = f"TG-{payload.telegram_id}-{int(parsed_time.timestamp())}"

    new_order = FactTransaction(
        owner_id=kasir_id,
        branch_id=branch_id,
        transaction_id=trx_id,
        date=parsed_time,
        region=region,
        city=city,
        outlet_name=outlet_name,
        product_name=product.product_name if product else "Unknown Product",
        sku_variant=str(payload.sku_id),
        category=product.category if product else "Uncategorized",
        qty_sold=payload.quantity,
        price_per_unit=product.base_selling_price if product else 0,
        total_sales=total,
        sales_channel="telegram",
        payment_status="paid",
        source="telegram",
        kasir_id=kasir_id
    )
    
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    
    return {"status": "success", "order_id": str(new_order.id), "message": jawaban_bot}

@router.post("/save-bulk-order")
def save_bulk_order(payload: BulkOrderPayload, db: Session = Depends(get_db)):
    """
    simpan bulk order dari tma (keranjang belanja) ke postgres.
    setiap item dalam keranjang disimpan sebagai baris terpisah.
    """
    from datetime import datetime
    try:
        parsed_time = datetime.fromisoformat(payload.timestamp.replace("Z", "+00:00"))
    except:
        parsed_time = datetime.utcnow()

    # cari data kasir menggunakan orm join
    profile = db.query(Profile).filter(Profile.telegram_id == str(payload.telegram_id)).first()

    kasir_id = None
    branch_id = None
    outlet_name = None
    region = None
    city = None

    if profile and profile.branch:
        kasir_id = profile.id
        branch_id = profile.branch.id
        outlet_name = profile.branch.branch_name
        region = profile.branch.region
        city = profile.branch.city
    else:
        # jika telegram_id tidak terdaftar di profiles, tolak request
        return {"status": "error", "message": "ID Telegram Anda belum terdaftar sebagai Kasir di cabang manapun."}

    # buat satu id transaksi untuk semua item di keranjang
    trx_id = f"TG-BULK-{payload.telegram_id}-{int(parsed_time.timestamp())}"
    order_ids = []
    receipt_lines = []
    grand_total = 0

    for item in payload.items:
        product = db.query(Product).filter(Product.sku_id == str(item.sku_id)).first()
        if not product:
            continue

        total = item.quantity * product.base_selling_price
        grand_total += total

        new_order = FactTransaction(
            owner_id=kasir_id,
            branch_id=branch_id,
            transaction_id=trx_id,
            date=parsed_time,
            region=region,
            city=city,
            outlet_name=outlet_name,
            product_name=product.product_name,
            sku_variant=str(item.sku_id),
            category=product.category if product.category else "Uncategorized",
            qty_sold=item.quantity,
            price_per_unit=product.base_selling_price,
            total_sales=total,
            sales_channel="telegram",
            payment_status="paid",
            source="telegram",
            kasir_id=kasir_id
        )
        db.add(new_order)
        db.flush()  # dapatkan id sebelum commit
        order_ids.append(str(new_order.id))

        price_str = f"{int(total):,}".replace(",", ".")
        receipt_lines.append(f"• {product.product_name} x{item.quantity} = Rp{price_str}")

    db.commit()

    total_str = f"{int(grand_total):,}".replace(",", ".")
    receipt = "\n".join(receipt_lines)
    message = f"*Struk Pesanan*\n\n{receipt}\n\n*Total: Rp{total_str}*\n\nTerima kasih! 🙏"

    return {
        "status": "success",
        "order_ids": order_ids,
        "grand_total": grand_total,
        "message": message
    }

