// 1. CONFIG & STATE
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzMWG2Fx-77aWzZmHMWXbNOZQe3K-cSIAkzsc3-aADBt7_csJ0r8h93AuOLxq7tHE0t/exec';
const TELEGRAM_API_URL = 'https://telegram-bot-729928920450.asia-northeast1.run.app/';
const TELEGRAM_LINK = 'https://t.me/SAKANAYAJAPON';

let currentLang = (navigator.language || navigator.userLanguage || 'ja').startsWith('ja') ? 'jp' : 'en';
let currentCategory = 'ALL';
let allProducts = [];
let cart = {};

// 2. UI TEXT
const UI_TEXT = {
    jp: {
        cat_all: "すべて", cat_kh: "🇰🇭 カンボジア産", cat_jp: "🇯🇵 日本産", origin_kh: "カンボジア産", origin_jp: "日本産", size_selectable: "サイズ選択可", noProducts: '該当商品なし', cat_frozen: "冷凍品", cat_whole: "鮮魚一匹", 
        cat_fillet: "鮮魚フィレ・セミドレス・ドレス", cat_oil: "調味料・油", cat_kitchen: "厨房用品", cat_vege: "野菜", cat_waiting: "入荷待ち", inquiry: "問い合わせ",
        searchPlaceholder: "商品名で検索...", noticeTitle: "【 お知らせ 】 クリックで詳細を表示",
        orderBarLabel: "📋 ご注文内容", orderNote: "* 最終的な数量・重量は納品時に確定いたします",
        clearBtn: 'クリア', recommendTitle: "🔥 本日のおすすめ", noProducts: '該当商品なし',
        stock: 'STOCK', size: 'サイズ', emptyCart: '商品が選択されていません。',
        weightCalc: '重量計算', qtyCalc: '数量計算', labelNotes: 'メモ',
        modalTitle: "新規登録",
        labelShop: "店名",
        labelStaff: "担当者名",
        labelPhone: "電話番号",
        btnCancel: "キャンセル",
        btnRegister: "登録",
        btnFirstOrder: "初めての方", btnRepeatOrder: "ご注文",
        btnSubmitFirst: "登録案内を受け取る", btnSubmitRepeat: "注文する",
        noticeBody:`・初めてのご注文の際には、必ず「初めての方」のボタンからご登録お願い致します。<br>・Telegramでご注文後、注文確認シートが送付されます。`,
    },
    en: {
        cat_all: "ALL", cat_kh: "🇰🇭 CAMBODIA", cat_jp: "🇯🇵 JAPAN", origin_kh: "CAMBODIA", origin_jp: "JAPAN", size_selectable: "Size Selection Available", noProducts: 'No products', cat_frozen: "FROZEN", cat_whole: "WHOLE", 
        cat_fillet: "FILLET/DR/SD", cat_oil: "OIL & SEASONING", cat_kitchen: "KITCHEN", cat_vege: "VEGETABLES", cat_waiting: "OUT OF STOCK", inquiry: "INQUIRY",
        searchPlaceholder: "Search...", noticeTitle: "【 NOTICE 】 Click for details",
        orderBarLabel: "📋 Your Order", orderNote: "* Final price confirmed upon delivery",
        clearBtn: 'Clear', recommendTitle: "🔥 Recommendation", noProducts: 'No products',
        stock: 'STOCK', size: 'Size', emptyCart: 'Cart is empty.',
        weightCalc: 'Weight', qtyCalc: 'Quantity', labelNotes: 'Notes',
        modalTitle: "Registration",
        labelShop: "Shop Name",
        labelStaff: "Contact Person",
        labelPhone: "Phone Number",
        btnCancel: "Cancel",
        btnRegister: "Register",
        btnFirstOrder: "First Time", btnRepeatOrder: "Order",
        btnSubmitFirst: "Get Guide", btnSubmitRepeat: "Order",
        noticeBody:`- For your first order, please make sure to register via the "First Time" button.<br>- You'll receive a confirmation sheet via Telegram.`
    }
};

// 3. HELPERS
function esc(str) { return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function getProductName(p) { return currentLang === 'jp' ? (p.name_jp || p.name_en || '') : (p.name_en || p.name_jp || ''); }
function getProductComment(p) { return currentLang === 'jp' ? (p.comment_jp || p.comment_en || '') : (p.comment_en || p.comment_jp || ''); }
function getVariantName(v) { return currentLang === 'jp' ? (v.variant_name_jp || v.variant_name_en || '') : (v.variant_name_en || v.variant_name_jp || ''); }
function getCategoryValue(p) { return (p.category_id || p.category || '').trim(); }
function toNumber(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function getCalcClass(p) { return (p.variants || []).some(v => String(v.price_unit).toLowerCase() === 'kg') ? 'weight' : 'qty'; }
function getCalcLabel(p) { return getCalcClass(p) === 'weight' ? UI_TEXT[currentLang].weightCalc : UI_TEXT[currentLang].qtyCalc; }

// 4. CORE FUNCTIONS
async function fetchProducts() {
    try {
        const res = await fetch(GAS_URL);
        const data = await res.json();
        if (data.updateDate && document.getElementById('update-date')) {
            document.getElementById('update-date').textContent = 'UPDATE: ' + data.updateDate;
        }
        const raw = Array.isArray(data.products) ? data.products : [];
        allProducts = raw.map(p => {
            const vs = Array.isArray(p.variants) ? p.variants : [];
            const sortedVs = vs.sort((a, b) => toNumber(a.sort_order, 9999) - toNumber(b.sort_order, 9999));
            return { ...p, variants: sortedVs };
        }).filter(p => (p.name_jp || p.name_en || '').trim() !== '')
          .sort((a, b) => toNumber(a.sort_order, 9999) - toNumber(b.sort_order, 9999));
        applyFilters();
    } catch (e) {
        const pc = document.getElementById('product-container');
        if (pc) pc.innerHTML = `<p>⚠️ Load Failed: ${esc(e.message)}</p>`;
    }
}

function filterCategory(cat, btn) {
    currentCategory = cat;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    applyFilters();
}

function applyFilters() {
    const search = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
    const filtered = allProducts.filter(p => {
        const totalStock = (p.variants || []).reduce((sum, v) => {
            const val = Number(v.stock);
            return sum + (isNaN(val) ? 0 : val);
        }, 0);

        let matchesCat = false;
        if (currentCategory === 'OUT_OF_STOCK') {
            matchesCat = (totalStock <= 0);
        } else if (currentCategory === 'COUNTRY_KH') {
            // カテゴリー「カンボジア」選択時
            matchesCat = (countryVal === 'CAMBODIA' && totalStock > 0);
        } else if (currentCategory === 'COUNTRY_JP') {
            // カテゴリー「日本」選択時
            matchesCat = (countryVal === 'JAPAN' && totalStock > 0);
        } else {
            const catMatch = (currentCategory === 'ALL' || getCategoryValue(p) === currentCategory);
            matchesCat = catMatch && (totalStock > 0);
        }
        const matchesSearch = !search || 
            getProductName(p).toLowerCase().includes(search) || 
            getProductComment(p).toLowerCase().includes(search);
        return matchesCat && matchesSearch;
    });
    displayProducts(filtered);
}

// 5. DISPLAY & RENDER
function displayProducts(products) {
    const pc = document.getElementById('product-container');
    const rs = document.getElementById('recommend-section');
    const rc = document.getElementById('recommend-container');
    if (!pc) return;

    const recs = products.filter(p => toNumber(p.recommend_today, 0) === 1);
    const norms = products.filter(p => toNumber(p.recommend_today, 0) !== 1);

    if (rc) rc.innerHTML = recs.map(buildCard).join('');
    if (rs) recs.length > 0 ? rs.classList.remove('hidden') : rs.classList.add('hidden');
    
    pc.innerHTML = norms.length === 0 && recs.length === 0 
        ? `<p style="text-align:center;padding:30px;">${UI_TEXT[currentLang].noProducts}</p>` 
        : norms.map(buildCard).join('');
}

function buildCard(p) {
    const t = UI_TEXT[currentLang];
    const pid = esc(p.product_id);
    const name = esc(getProductName(p));

    let originHTML = '';
    const countryVal = String(p.country || '').trim().toUpperCase(); 
    if (countryVal === 'CAMBODIA') {
        originHTML = `<div class="origin-tag"><span class="origin-text">${t.origin_kh}</span><img src="images/kh-flag.png" class="country-flag" alt="KH"></div>`;
    } else if (countryVal === 'JAPAN') {
        originHTML = `<div class="origin-tag"><span class="origin-text">${t.origin_jp}</span><img src="images/jp-flag.png" class="country-flag" alt="JP"></div>`;
    }
    
    const totalStock = (p.variants || []).reduce((sum, v) => sum + toNumber(v.stock, 0), 0);

    const vsHTML = (p.variants || [])
        .filter(v => {
            const stockNum = toNumber(v.stock, 0);
            return currentCategory === 'OUT_OF_STOCK' ? stockNum <= 0 : stockNum > 0;
        })
        .map(v => {
            const vid = esc(v.variant_id);
            const qty = cart[vid]?.qty || 0;
            const isOut = toNumber(v.stock, 0) <= 0;
            return `
                <div class="variant-row">
                    <button class="variant-select-btn" onclick="selectVariantImage('${pid}', '${esc(v.image_variant)}', '${esc(p.image_main)}', this)">
                        ${esc(getVariantName(v))} / $${toNumber(v.price_usd).toFixed(2)}
                    </button>
                    <div class="variant-qty-wrap">
                        <button class="qty-btn" onclick="changeCartQty('${vid}', -1)">−</button>
                        <span class="variant-qty">${qty}</span>
                        <button class="qty-btn" onclick="changeCartQty('${vid}', 1)" ${isOut ? 'disabled' : ''}>＋</button>
                    </div>
                </div>`;
        }).join('');

    return `
    <div class="card" data-category="${esc(getCategoryValue(p))}">
        <div class="img-wrapper">
            ${p.image_main ? `<img id="product-image-${pid}" src="${esc(p.image_main)}" alt="${name}" onclick="openModal(this.src)">` : `<div class="img-placeholder">🐟</div>`}
            ${totalStock > 0 ? `<span class="stock-badge">${t.stock}: ${totalStock}</span>` : ''}
        </div>
        <div class="info">
            <div class="product-title-row">
                <h3>[${esc(p.code || '---')}] ${name}</h3>
                ${originHTML}
            </div>
            <div class="size-calc-row">
                <p class="size-detail">${esc(p.size || '')}</p>
                <span class="calc-mini ${getCalcClass(p)}">${getCalcLabel(p)}</span>
            </div>
            <div class="variant-list">${vsHTML}</div>
        </div>
    </div>`;
}

// 6. CART LOGIC
function changeCartQty(vid, delta) {
    let targetVariant = null, targetProduct = null;
    for (const p of allProducts) {
        const v = p.variants.find(v => v.variant_id === vid);
        if (v) { targetVariant = v; targetProduct = p; break; }
    }
    if (!targetVariant) return;
    if (!cart[vid]) {
        if (delta <= 0) return;
        cart[vid] = { variant_id: vid, qty: 0, price_usd: toNumber(targetVariant.price_usd), product_name_jp: targetProduct.name_jp, product_name_en: targetProduct.name_en, variant_name_jp: targetVariant.variant_name_jp || "", variant_name_en: targetVariant.variant_name_en || "", code: targetVariant.variant_code || targetProduct.code };
    }
    cart[vid].qty += delta;
    if (cart[vid].qty <= 0) delete cart[vid];
    applyFilters(); 
    renderCart();
}

function renderCart() {
    const t = UI_TEXT[currentLang];
    const items = Object.values(cart);
    const panel = document.getElementById('cart-panel');
    if (!panel) return;
    const currentNotes = document.getElementById('cart-notes')?.value || "";
    const cartTitle = currentLang === 'jp' ? "ご注文内容" : "Your Order";
    const notesTitle = currentLang === 'jp' ? "メモ" : "Notes";

    let listContent = items.length === 0 ? `<p style="text-align:center; padding:30px; color:#999; margin:0;">${t.emptyCart}</p>` : items.map(item => `
        <div class="cart-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #eee;">
            <div style="flex:1; text-align:left;">
                 <strong style="font-size:0.9rem; display:block;">[${esc(item.code || '---')}] ${esc(currentLang === 'jp' ? item.product_name_jp : item.product_name_en)}</strong>
                 <span style="font-size:0.85rem; color:#555; display:block;">${esc(currentLang === 'jp' ? item.variant_name_jp : item.variant_name_en)}</span>
                 <span style="font-size:0.85rem; color:#666;"> × ${item.qty}</span>
            </div>
            <div style="display:flex; gap:5px;">
                <button class="qty-btn" onclick="changeCartQty('${item.variant_id}', -1)">−</button>
                <button class="qty-btn" onclick="changeCartQty('${item.variant_id}', 1)">＋</button>
            </div>
        </div>`).join('');

    panel.innerHTML = `
        <div style="background:#333; color:#fff; padding:12px 15px; display:flex; justify-content:space-between; align-items:center;">
            <h2 style="margin:0; font-size:1rem; color:#fff;">🛒 ${cartTitle}</h2>
            <button onclick="closeCartPanel()" style="color:#fff; border:none; background:none; font-size:1.5rem; cursor:pointer; line-height:1;">×</button>
        </div>
        <div style="flex:1; overflow-y:auto; padding:15px; display:flex; flex-direction:column;">
            ${listContent}
            <div style="margin-top:auto; padding-top:15px; text-align:left;">
                <label style="display:block; font-weight:bold; margin-bottom:5px; font-size:0.85rem;">${notesTitle}</label>
                <textarea id="cart-notes" style="width:100%; height:60px; border:1px solid #ccc; border-radius:4px; padding:5px; box-sizing:border-box;">${esc(currentNotes)}</textarea>
            </div>
        </div>
        <div style="padding:15px; background:#f9f9f9; border-top:1px solid #ddd;">
            <div style="display:flex; gap:8px;">
                <button onclick="submitFirstOrder()" style="flex:1; padding:12px 5px; font-size:0.75rem; font-weight:bold; border-radius:6px; background:#666; color:#fff; border:none;">${currentLang === 'jp' ? '初めての方' : 'First Time'}</button>
                <button onclick="showOrderCheckModal()" style="flex:1; padding:12px 5px; font-size:0.75rem; font-weight:bold; border-radius:6px; background:#333; color:#fff; border:none;">${currentLang === 'jp' ? 'ご注文' : 'Order'}</button>
                <button onclick="clearCart()" style="padding:12px 10px; font-size:0.75rem; border-radius:6px; background:#eee; border:none;">${currentLang === 'jp' ? 'クリア' : 'Clear'}</button>
            </div>
        </div>`;
    const badge = document.getElementById('cart-count-badge');
    if (badge) badge.textContent = items.reduce((s, i) => s + i.qty, 0);
}

function clearCart() { cart = {}; applyFilters(); renderCart(); closeCartPanel(); }

function setLang(lang) {
    currentLang = lang;
    const t = UI_TEXT[lang];
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.id === 'lang-' + lang));
    const mapping = { 'cat-all': t.cat_all, 'cat-kh': t.cat_kh, 'cat-jp': t.cat_jp,'cat-frozen': t.cat_frozen, 'cat-whole': t.cat_whole, 'cat-fillet': t.cat_fillet, 'cat-oil': t.cat_oil, 'cat-kitchen': t.cat_kitchen, 'cat-vege': t.cat_vege, 'cat-waiting': t.cat_waiting, 'inquiry-text': t.inquiry, 'search-input': t.searchPlaceholder, 'notice-summary-text': t.noticeTitle, 'notice-body-content': t.noticeBody };
    for (let id in mapping) {
        const el = document.getElementById(id);
        if (el) {
            if (id === 'notice-body-content') el.innerHTML = mapping[id];
            else if (el.tagName === 'INPUT') el.placeholder = mapping[id];
            else el.textContent = mapping[id];
        }
    }
    applyFilters(); renderCart();
}

// 7. UI CONTROL
function toggleCartPanel() { document.getElementById('cart-panel')?.classList.toggle('show'); }
function closeCartPanel() { document.getElementById('cart-panel')?.classList.remove('show'); }
function openModal(src) { const m = document.getElementById('image-modal'), i = document.getElementById('modal-img'); if (m && i) { i.src = src; m.style.display = 'flex'; } }
function closeModal() { document.getElementById('image-modal').style.display = 'none'; }
function selectVariantImage(pid, vImg, fImg, btn) {
    const img = document.getElementById(`product-image-${pid}`);
    if (img) img.src = vImg && vImg.trim() !== '' ? vImg : fImg;
    if (btn) { btn.closest('.variant-list').querySelectorAll('.variant-select-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
}

// 8. ORDER LOGIC
function submitFirstOrder() {
    const t = UI_TEXT[currentLang];
    document.getElementById('modal-title').textContent = t.modalTitle;
    document.getElementById('label-shop').textContent = t.labelShop;
    document.getElementById('label-staff').textContent = t.labelStaff;
    document.getElementById('label-phone').textContent = t.labelPhone;
    document.getElementById('btn-cancel').textContent = t.btnCancel;
    document.getElementById('btn-submit').textContent = t.btnRegister;
    document.getElementById('first-time-modal').style.display = 'flex';
}
function closeFirstTimeModal() { document.getElementById('first-time-modal').style.display = 'none'; }
async function processFirstTimeRegistration() {
    const s = document.getElementById('reg-shop-name')?.value.trim(), n = document.getElementById('reg-staff-name')?.value.trim(), p = document.getElementById('reg-phone')?.value.trim();
    if (!p || !s || !n) { alert(currentLang === 'jp' ? "入力項目が不足しています" : "Please fill in all fields."); return; }
    fetch(GAS_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({ action: 'register_user', spreadsheetId: '1DLqtzAX3Hb9_lSRccB6ywB0SGnjUHLbSnHo_Vgu7KCs', phone: p, username: s, firstName: n })});
    localStorage.setItem('temp_cart', JSON.stringify(cart));
    closeFirstTimeModal();
    window.open(`https://t.me/sakanaya_bot?start=${p.replace(/\D/g, "")}`, '_blank');
}
function showOrderCheckModal() {
    if (Object.values(cart).length === 0) { alert(currentLang === 'jp' ? "カートが空です" : "Cart is empty"); return; }
    document.getElementById('order-check-modal').style.display = 'flex';
    const saved = localStorage.getItem('user_phone');
    if (saved) document.getElementById('check-phone').value = saved;
}
async function finalizeOrderProcess() {
    const p = document.getElementById('check-phone')?.value.trim(), n = document.getElementById('cart-notes')?.value.trim(), items = Object.values(cart);
    if (!p) { alert(currentLang === 'jp' ? "電話番号を入力してください。" : "Please enter your phone number."); return; }
    document.getElementById('order-check-modal').style.display = 'none';
    localStorage.setItem('user_phone', p);
    let orderData = '【New Order】\n';
    items.forEach(i => { orderData += `${i.code || '---'} ${currentLang === 'jp' ? i.product_name_jp : i.product_name_en} ${currentLang === 'jp' ? i.variant_name_jp : i.variant_name_en} x ${i.qty}点\n`; });
    try {
        const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'send_order', spreadsheetId: '1DLqtzAX3Hb9_lSRccB6ywB0SGnjUHLbSnHo_Vgu7KCs', targetGroupId: '-4710396177', phone: p, orderData: orderData, notes: n })});
        const result = await res.json();
        if (result.status === "unregistered") { alert(currentLang === 'jp' ? "未登録の番号です。初めての方ボタンから登録をお願いします。" : "Not registered."); return; }
        alert(currentLang === 'jp' ? '注文を送信しました！' : 'Order sent!');
        clearCart();
    } catch (e) { alert(currentLang === 'jp' ? '注文を送信しました！' : 'Order sent!'); clearCart(); }
}

// 9. INITIALIZE
document.addEventListener('DOMContentLoaded', async () => {
    await fetchProducts();
    setLang(currentLang);
    const saved = localStorage.getItem('temp_cart');
    if (saved) { try { Object.assign(cart, JSON.parse(saved)); renderCart(); localStorage.removeItem('temp_cart'); } catch (e) {} }
});
