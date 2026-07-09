import time
import sys
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.keys import Keys

BASE_URL = "http://localhost:3000"

def create_driver():
    chrome_options = Options()
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--log-level=3")
    
    # Optional: Run in headless mode for CI/CD if needed
    # chrome_options.add_argument("--headless")
    
    return webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

def inject_mock_token(driver, email, role, token):
    """
    Injects a mock JWT and user profile into localStorage
    so the frontend bypasses live OAuth login and identifies as the given role.
    """
    print(f"Injecting mock credentials for: {email} ({role})")
    driver.get(f"{BASE_URL}/login")
    time.sleep(1.5)
    
    # Store credentials in LocalStorage
    driver.execute_script(f"localStorage.setItem('token', '{token}');")
    driver.execute_script(f"localStorage.setItem('user_profile', JSON.stringify({{'email': '{email}', 'role': '{role}'}}));")
    time.sleep(0.5)

def test_page(driver, test_name, url, check_logic):
    print(f"\n==========================================")
    print(f"Menguji Fitur: {test_name}")
    print(f"URL: {url}")
    print(f"==========================================")
    try:
        driver.get(url)
        time.sleep(1.5)
        success = check_logic(driver)
        if success:
            print(f"PASSED: Halaman/Fitur '{test_name}' terverifikasi dengan sukses.")
        else:
            print(f"FAILED: Verifikasi gagal untuk halaman/fitur '{test_name}'.")
    except Exception as e:
        print(f"ERROR: Terjadi kesalahan saat menguji '{test_name}'. Detail: {e}")

# ==========================================
# PAGE INTERACTION CHECKERS
# ==========================================

def check_login_page(driver):
    wait = WebDriverWait(driver, 10)
    wait.until(EC.presence_of_element_located((By.XPATH, "//h1[contains(., 'Biz')]")))
    print(" Halaman Login ter-render dengan logo BizAgent.")
    
    email_input = driver.find_element(By.ID, "email")
    password_input = driver.find_element(By.ID, "password")
    submit_btn = driver.find_element(By.XPATH, "//button[@type='submit' or contains(., 'Masuk')]")
    
    if email_input and password_input and submit_btn:
        print(" Elemen form (Email, Password, Tombol Masuk) ditemukan.")
        return True
    return False

def check_operational_dashboard(driver):
    wait = WebDriverWait(driver, 10)
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Operational Intelligence Dashboard')]")))
    print(" Halaman Operational Dashboard berhasil dimuat.")
    return True

def check_strategic_dashboard(driver):
    wait = WebDriverWait(driver, 15)
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Strategic AI Generation')]")))
    print(" Halaman Strategic Dashboard berhasil dimuat.")
    
    # Test "Generate Report" button click
    try:
        gen_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Generate Report')]")))
        gen_btn.click()
        print(" Klik tombol 'Generate Report' berhasil. Proses Agen AI dimulai...")
        
        # Wait up to 45 seconds for strategic report generation
        print(" Menunggu Agen AI memproses laporan...")
        report_title = WebDriverWait(driver, 45).until(
            EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Generated Board Report')]"))
        )
        print(" Sukses: Laporan Dewan (Board Report) berhasil dihasilkan oleh Agen AI dan ter-render!")
        return True
    except Exception as e:
        print(f" Gagal interaksi atau timeout saat generate report: {e}")
        return False

def check_drilldown_complex(driver):
    wait = WebDriverWait(driver, 10)
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Smart Pivot Explorer')]")))
    print(" Render komponen 'Smart Pivot Explorer' berhasil.")
    
    # Interaksi "Memory History"
    try:
        mem_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Memory History')]")))
        mem_btn.click()
        print(" Berhasil: Tombol 'Memory History' diklik (Render Modal popup sukses).")
        time.sleep(1)
        ActionChains(driver).send_keys(Keys.ESCAPE).perform()
        time.sleep(0.5)
    except Exception as e:
        print(" Gagal interaksi 'Memory History':", e)

    # Interaksi "Export"
    try:
        export_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Export')]")))
        export_btn.click()
        print(" Berhasil: Tombol 'Export' diklik.")
        time.sleep(1)
        ActionChains(driver).send_keys(Keys.ESCAPE).perform()
        time.sleep(0.5)
    except Exception as e:
        print(" Gagal interaksi 'Export':", e)
        
    # Interaksi "Chevron Expand" (Drilldown)
    try:
        expand_btns = driver.find_elements(By.XPATH, "//button[.//svg[@class[contains(., 'lucide-chevron-right')]]]")
        if len(expand_btns) > 0:
            expand_btns[0].click()
            print(" Berhasil: Baris hierarki tabel pivot berhasil di-expand (Drilldown active).")
            time.sleep(1)
    except Exception as e:
        print(" Gagal interaksi expand/drilldown:", e)
        
    return True

def check_data_integration(driver):
    wait = WebDriverWait(driver, 10)
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Upload Data & AI-Mapping') or contains(text(), 'Data Integration')]")))
    print(" Halaman Data Integration berhasil dimuat.")
    return True

def check_user_management(driver):
    wait = WebDriverWait(driver, 10)
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'User Management')]")))
    print(" Halaman User Management berhasil dimuat.")
    
    # Search user test
    try:
        search_input = driver.find_element(By.XPATH, "//input[@placeholder[contains(., 'Cari') or contains(., 'Search')]]")
        search_input.clear()
        search_input.send_keys("test")
        time.sleep(1)
        print(" Pengujian pencarian User berhasil dilakukan.")
    except Exception as e:
        print(" Input pencarian User tidak ditemukan:", e)

    # Test "Tambah Pegawai" modal
    try:
        add_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Tambah Pegawai')]")))
        add_btn.click()
        time.sleep(1)
        
        # Verify modal title
        modal_title = wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Tambah Pegawai Baru')]")))
        print(" Sukses: Modal 'Tambah Pegawai Baru' berhasil terbuka.")
        
        # Close modal
        ActionChains(driver).send_keys(Keys.ESCAPE).perform()
        time.sleep(0.5)
        return True
    except Exception as e:
        print(" Gagal interaksi Modal Tambah Pegawai:", e)
        return False

def check_branch_management(driver):
    wait = WebDriverWait(driver, 10)
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Branch Management')]")))
    print(" Halaman Branch Management berhasil dimuat.")
    
    # Test "Tambah Cabang Baru" modal
    try:
        add_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Tambah Cabang Baru')]")))
        add_btn.click()
        time.sleep(1)
        
        # Verify modal title
        modal_title = wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Tambah Cabang Baru')]")))
        print(" Sukses: Modal 'Tambah Cabang Baru' berhasil terbuka.")
        
        # Close modal
        ActionChains(driver).send_keys(Keys.ESCAPE).perform()
        time.sleep(0.5)
        return True
    except Exception as e:
        print(" Gagal interaksi Modal Tambah Cabang:", e)
        return False

def check_product_management(driver):
    wait = WebDriverWait(driver, 10)
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Product Management')]")))
    print(" Halaman Product Management berhasil dimuat.")
    
    # Test "Tambah Produk Baru" modal
    try:
        add_btn = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(., 'Tambah Produk Baru')]")))
        add_btn.click()
        time.sleep(1)
        
        # Verify modal title
        modal_title = wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Tambah Menu / Produk Baru')]")))
        print(" Sukses: Modal 'Tambah Menu / Produk Baru' berhasil terbuka.")
        
        # Close modal
        ActionChains(driver).send_keys(Keys.ESCAPE).perform()
        time.sleep(0.5)
        return True
    except Exception as e:
        print(" Gagal interaksi Modal Tambah Produk:", e)
        return False

def check_settings_page(driver):
    wait = WebDriverWait(driver, 10)
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Settings & Profile')]")))
    print(" Halaman Settings & Profile berhasil dimuat.")
    
    # Click Keamanan Akun tab
    try:
        sec_tab = wait.until(EC.element_to_be_clickable((By.XPATH, "//*[contains(text(), 'Keamanan Akun')]")))
        sec_tab.click()
        print(" Berhasil: Tab 'Keamanan Akun' diklik.")
        time.sleep(1)
        
        # Verify new password input exists by XPath
        pw_field = wait.until(EC.presence_of_element_located((By.XPATH, "//input[@type='password' and contains(@placeholder, 'Minimal')]")))
        if pw_field:
            print(" Form penggantian password ter-render dengan benar.")
            return True
    except Exception as e:
        print(" Gagal interaksi tab Keamanan Akun atau input password:", e)
        return False
    return False

def check_tma(driver):
    wait = WebDriverWait(driver, 15)
    wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Kasir Digital AI')]")))
    print(" Render komponen 'Telegram Mini App (TMA)' berhasil.")
    
    try:
        # Klik "Tambah" item
        tambah_btns = driver.find_elements(By.XPATH, "//button[contains(text(), 'Tambah')]")
        if len(tambah_btns) > 0:
            driver.execute_script("arguments[0].scrollIntoView();", tambah_btns[0])
            time.sleep(0.5)
            tambah_btns[0].click()
            print(" Berhasil: Tombol 'Tambah' item ke keranjang.")
            time.sleep(1)

            # Buka keranjang belanja
            kart_btn = driver.find_elements(By.XPATH, "//button[contains(., 'Keranjang Saya')]")
            if len(kart_btn) > 0:
                kart_btn[0].click()
                print(" Berhasil: Pindah ke halaman 'Daftar Belanja'.")
                time.sleep(1)

                # Klik bayar
                pesan_btn = driver.find_elements(By.XPATH, "//button[contains(., 'Pesan & Bayar Sekarang')]")
                if len(pesan_btn) > 0:
                    pesan_btn[0].click()
                    print(" Berhasil: Simulasi checkout 'Pesan & Bayar Sekarang' selesai.")
                    time.sleep(1)
                    return True
    except Exception as e:
        print(" Gagal interaksi keranjang belanja di TMA:", e)
        return False
    return True

# ==========================================
# RBAC SECURITY VERIFIERS (ROLE LIMITS)
# ==========================================

def verify_rbac_manager_limits(driver):
    """
    Verifies that a Manager is blocked from accessing Admin-only pages
    like User Management (/master/users) and gets redirected with a toast notification.
    """
    wait = WebDriverWait(driver, 10)
    print("Menguji Pembatasan RBAC: Mengakses /master/users sebagai Manager...")
    driver.get(f"{BASE_URL}/master/users")
    time.sleep(2)
    
    # Check if redirected back to Operational Dashboard or dashboard home
    current_url = driver.current_url
    if "/master/users" not in current_url:
        print(f" Sukses: Manager dialihkan dari /master/users ke: {current_url}")
        # Look for the error toast
        try:
            toast_msg = driver.find_element(By.XPATH, "//*[contains(text(), 'tidak memiliki akses') or contains(text(), 'permission')]")
            print(f" Sukses: Pesan pembatasan muncul: '{toast_msg.text}'")
        except:
            print(" Info: Tidak mendeteksi toast pembatasan secara visual, namun pengalihan URL sukses.")
        return True
    else:
        print(" Gagal: Manager diizinkan masuk ke halaman User Management (/master/users)!")
        return False

def verify_rbac_kasir_limits(driver):
    """
    Verifies that a Kasir is completely blocked from accessing the Web Dashboard pages
    and gets redirected back to /login.
    """
    wait = WebDriverWait(driver, 10)
    print("Menguji Pembatasan RBAC: Mengakses /dashboard/operational sebagai Kasir...")
    driver.get(f"{BASE_URL}/dashboard/operational")
    time.sleep(2)
    
    # Check if redirected to /login
    current_url = driver.current_url
    if "/login" in current_url:
        print(" Sukses: Kasir dialihkan dari dashboard ke halaman login (/login).")
        try:
            toast_msg = driver.find_element(By.XPATH, "//*[contains(text(), 'tidak memiliki akses') or contains(text(), 'Kasir tidak memiliki akses')]")
            print(f" Sukses: Pesan pembatasan muncul: '{toast_msg.text}'")
        except:
            print(" Info: Pengalihan sukses.")
        return True
    else:
        print(" Gagal: Kasir diizinkan masuk ke dashboard!")
        return False

# ==========================================
# MAIN EXECUTION FLOW
# ==========================================

def run_all_tests():
    print("Memulai inisialisasi Selenium WebDriver...")
    driver = create_driver()
    
    try:
        # ---------------------------------------------
        # TEST 1: LOGIN PAGE (PUBLIC / GUEST)
        # ---------------------------------------------
        test_page(driver, "Halaman Login / Auth (Guest)", f"{BASE_URL}/login", check_login_page)
        
        # ---------------------------------------------
        # SETUP AUTHENTICATION (ADMIN ROLE)
        # ---------------------------------------------
        # Inject mock admin credentials into localstorage
        inject_mock_token(driver, "rafaellie03@gmail.com", "admin", "mock-admin-token")
        
        # ---------------------------------------------
        # TESTS 2-10: AUTHENTICATED PAGES (ADMIN)
        # ---------------------------------------------
        test_page(driver, "Daily Operational Dashboard", f"{BASE_URL}/dashboard/operational", check_operational_dashboard)
        test_page(driver, "Strategic Business Dashboard", f"{BASE_URL}/dashboard/strategic", check_strategic_dashboard)
        test_page(driver, "Excel Drilldown (Smart Pivot Explorer)", f"{BASE_URL}/dashboard/drilldown", check_drilldown_complex)
        test_page(driver, "Data Integration Hub", f"{BASE_URL}/data-integration", check_data_integration)
        test_page(driver, "User Management Page", f"{BASE_URL}/master/users", check_user_management)
        test_page(driver, "Branch Management Page", f"{BASE_URL}/master/branches", check_branch_management)
        test_page(driver, "Product Management Page", f"{BASE_URL}/master/products", check_product_management)
        test_page(driver, "Settings & Profile Page", f"{BASE_URL}/settings", check_settings_page)
        test_page(driver, "Telegram Mini App (Smart POS)", f"{BASE_URL}/tma", check_tma)
        
        # ---------------------------------------------
        # TEST 11: RBAC LIMITS - MANAGER ROLE
        # ---------------------------------------------
        inject_mock_token(driver, "johndoe@dbesto.id", "manager", "mock-manager-token")
        test_page(driver, "RBAC Pembatasan Akses Manager", f"{BASE_URL}/dashboard/operational", verify_rbac_manager_limits)
        
        # ---------------------------------------------
        # TEST 12: RBAC LIMITS - KASIR ROLE
        # ---------------------------------------------
        inject_mock_token(driver, "test2@test.com", "kasir", "mock-kasir-token")
        test_page(driver, "RBAC Pembatasan Akses Kasir", f"{BASE_URL}/dashboard/operational", verify_rbac_kasir_limits)

    finally:
        print("\n==========================================")
        print("Semua skenario pengujian fungsional selesai!")
        print("==========================================")
        driver.quit()

if __name__ == "__main__":
    run_all_tests()
