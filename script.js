// ═══════════════════════════════════════════════════════════
// 1. CONFIG & STATE
// ═══════════════════════════════════════════════════════════
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzMWG2Fx-77aWzZmHMWXbNOZQe3K-cSIAkzsc3-aADBt7_csJ0r8h93AuOLxq7tHE0t/exec';
const TELEGRAM_API_URL = 'https://telegram-bot-729928920450.asia-northeast1.run.app/';
const TELEGRAM_LINK = 'https://t.me/SAKANAYAJAPON';

let currentLang = (navigator.language || navigator.userLanguage || 'en').startsWith('ja') ? 'jp' : 'en';
let currentCategory = 'ALL';
let allProducts = [];
let cart = {};

// ═══════════════════════════════════════════════════════════
// 2. UI TEXT (辞書)
// ═══════════════════════════════════════════════════════════
const UI_TEXT = {
    jp: {
        cat_all: "すべて", cat_frozen: "冷凍品", cat_whole: "鮮魚一匹", cat_dr: "鮮魚セミドレス",
        cat_fillet: "鮮魚フィレ", cat_oil: "調味料・油", cat_kitchen: "厨房用品", cat_vege: "野菜",
        cat_sake: "酒類", cat_waiting: "入荷待ち",inquiry: "問い合わせ",
        searchPlaceholder: "商品名で検索...", noticeTitle: "【 お知らせ 】 クリックで詳細を表示",
        orderBarLabel: "📋 ご注文内容", orderNote: "* 最終的な数量・重量は納品時に確定いたします",
        clearBtn: 'クリア', recommendTitle: "🔥 本日のおすすめ", noProducts: '該当商品なし',
        selectItems: '商品を選択してください。', stock: 'STOCK', size: 'サイズ',
        emptyCart: '商品が選択されていません。', variantGuideDefault: '種類をお選びください',
        weightCalc: '重量計算', qtyCalc: '数量計算', labelNotes: '備考 (アレルギー、配送希望など)',
        notesPlaceholder: 'ご要望があれば入力してください', btnFirstOrder: "初めての方",
        btnRepeatOrder: "ご注文", formFirstTitle: "初めての方 (新規登録)", formRepeatTitle: "ご注文 (リピート)",
        placeholderStore: "店名", placeholderName: "担当者名", placeholderPhone: "電話番号",
        btnSubmitFirst: "登録案内を受け取る", btnSubmitRepeat: "Telegramで注文する",
        noticeBody: `<strong>JP:</strong><br>・商品はカテゴリーや名前で絞り込みが可能です。<br>・Telegramでご注文後、注文確認シートが送付されます。`
    },
    en: {
        cat_all: "ALL", cat_frozen: "FROZEN", cat_whole: "WHOLE", cat_dr: "SEMI DRESS",
        cat_fillet: "FILLET", cat_oil: "OIL & SEASONING", cat_kitchen: "KITCHEN", cat_vege: "VEGETABLES",
        cat_sake: "SAKE", cat_waiting: "OUT OF STOCK",inquiry: "INQUIRY",
        searchPlaceholder: "Search...", noticeTitle: "【 NOTICE 】 Click for details",
        orderBarLabel: "📋 Your Order", orderNote: "* Final price confirmed upon delivery",
        clearBtn: 'Clear', recommendTitle: "🔥 Recommendation", noProducts: 'No products',
        selectItems: 'Select items.', stock: 'STOCK', size: 'Size',
        emptyCart: 'Cart is empty.', variantGuideDefault: 'Select a type',
        weightCalc: 'Weight', qtyCalc: 'Quantity', labelNotes: 'Notes',
        notesPlaceholder: 'Any requests?', btnFirstOrder: "First Time",
        btnRepeatOrder: "Order(Repeat)", formFirstTitle: "New Registration", formRepeatTitle: "Repeat Order",
        placeholderStore: "Store", placeholderName: "Name", placeholderPhone: "Phone",
        btnSubmitFirst: "Get Guide", btnSubmitRepeat: "Send to Telegram",
        noticeBody: `<strong>EN:</strong><br>- Filter items by category.<br>- You'll receive a confirmation sheet via Telegram.`
    }
};

// ═══════════════════════════════════════════════════════════
// 3. HELPERS
// ═══════════════════════════════════════════════════════════
function esc(str) { return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function getProductName(p) { return currentLang === 'jp' ? (p.name_jp || p.name_en || '') : (p.name_en || p.name_jp || ''); }
function getProductComment(p) { return currentLang === 'jp' ? (p.comment_jp || p.comment_en || '') : (p.comment_en || p.comment_jp || ''); }
function getVariantName(v) { return currentLang === 'jp' ? (v.variant_name_jp || v.variant_name_en || '') : (v.variant_name_en || v.variant_name_jp || ''); }
function getCategoryValue(p) { return (p.category_id || p.category || '').trim(); }
function toNumber(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function getUnitLabel(v) { const r = String(v.price_unit || v.order_type || '').trim().toLowerCase(); return ['kg', 'pic', 'pc', 'case', 'bottle'].includes(r) ? r : (r || 'unit'); }
function getCalcClass(p) { return (p.variants || []).some(v => String(v.price_unit).toLowerCase() === 'kg') ? 'weight' : 'qty'; }
function getCalcLabel(p) { return getCalcClass(p) === 'weight' ? UI_TEXT[currentLang].weightCalc : UI_TEXT[currentLang].qtyCalc; }

// ═══════════════════════════════════════════════════════════
// 4. CORE FUNCTIONS (Fetch & Filter)
// ═══════════════════════════════════════════════════════════
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
        document.getElementById('product-container').innerHTML = `<p>⚠️ Load Failed: ${esc(e.message)}</p>`;
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
        const totalStock = (p.variants || []).reduce((sum, v) => sum + toNumber(v.stock, 0), 0);
        let matchesCat = false;
        if (currentCategory === 'OUT_OF_STOCK') {
            matchesCat = (totalStock === 0);
        } else {
            const catMatch = (currentCategory === 'ALL' || getCategoryValue(p) === currentCategory);
            matchesCat = catMatch && (totalStock > 0);
        }
        const matchesSearch = !search || getProductName(p).toLowerCase().includes(search) || getProductComment(p).toLowerCase().includes(search);
        return matchesCat && matchesSearch;
    });
    displayProducts(filtered);
}

// ═══════════════════════════════════════════════════════════
// 5. DISPLAY & RENDER
// ═══════════════════════════════════════════════════════════
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
    const totalStock = (p.variants || []).reduce((sum, v) => sum + toNumber(v.stock, 0), 0);
    
    const vsHTML = (p.variants || []).map(v => {
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
                <h3>${name}</h3>
                <div class="size-calc-row"><p class="size-detail">${esc(p.size || '')}</p><span class="calc-mini ${getCalcClass(p)}">${getCalcLabel(p)}</span></div>
                <div class="variant-list">${vsHTML}</div>
            </div>
        </div>`;
}

// ═══════════════════════════════════════════════════════════
// 6. CART & LANGUAGE LOGIC
// ═══════════════════════════════════════════════════════════
function renderCart() {
    const t = UI_TEXT[currentLang];
    const items = Object.values(cart);
    const panel = document.getElementById('cart-panel');
    const el = document.getElementById('cart-items');
    
    if (panel) items.length > 0 ? panel.classList.add('show') : panel.classList.remove('show');
    if (!el) return;

    if (items.length === 0) {
        el.innerHTML = `<p class="cart-empty">${t.emptyCart}</p>`;
        document.getElementById('cart-count-badge').textContent = '0';
        return;
    }
    
    el.innerHTML = items.map(item => `
        <div class="cart-item">
            <div class="cart-item-info"><strong>${esc(currentLang==='jp'?item.product_name_jp:item.product_name_en)}</strong>
            <span>${item.qty} × $${item.price_usd}</span></div>
            <div class="cart-item-actions">
                <button class="qty-btn" onclick="changeCartQty('${item.variant_id}', -1)">−</button>
                <button class="qty-btn" onclick="changeCartQty('${item.variant_id}', 1)">＋</button>
            </div>
        </div>`).join('');
    document.getElementById('cart-count-badge').textContent = items.reduce((s, i) => s + i.qty, 0);
}

function setLang(lang) {
    currentLang = lang;
    const t = UI_TEXT[lang];
    
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.id === 'lang-' + lang));

    const mapping = {
        'cat-all': t.cat_all, 'cat-frozen': t.cat_frozen, 'cat-whole': t.cat_whole,
        'cat-dr': t.cat_dr, 'cat-fillet': t.cat_fillet, 'cat-oil': t.cat_oil,
        'cat-sake': t.cat_sake, 'cat-kitchen': t.cat_kitchen, 'cat-vege': t.cat_vege,
        'cat-waiting': t.cat_waiting, 'inquiry-text': t.inquiry,'search-input': t.searchPlaceholder,
        'btn-first-order': t.btnFirstOrder, 'btn-repeat-order': t.btnRepeatOrder,
        'order-clear-btn': t.clearBtn, 'form-first-title': t.formFirstTitle,
        'form-repeat-title': t.formRepeatTitle, 'btn-submit-first': t.btnSubmitFirst,
        'btn-submit-repeat': t.btnSubmitRepeat
    };

    for (let id in mapping) {
        const el = document.getElementById(id);
        if (el) el.tagName === 'INPUT' ? el.placeholder = mapping[id] : el.textContent = mapping[id];
    }

    applyFilters();
    renderCart();
}

// ═══════════════════════════════════════════════════════════
// 7. INITIALIZE & EVENT LISTENERS
// ═══════════════════════════════════════════════════════════
function changeCartQty(vid, delta) {
    let found = null;
    allProducts.forEach(p => {
        const v = p.variants.find(x => String(x.variant_id) === String(vid));
        if (v) found = {p, v};
    });
    if (!found) return;

    if (!cart[vid] && delta > 0) {
        cart[vid] = {
            variant_id: vid, product_name_jp: found.p.name_jp, product_name_en: found.p.name_en,
            price_usd: toNumber(found.v.price_usd), qty: 0
        };
    }
    if (cart[vid]) {
        cart[vid].qty += delta;
        if (cart[vid].qty <= 0) delete cart[vid];
        renderCart();
    }
}

function clearCart() { cart = {}; renderCart(); }
function openModal(src) { document.getElementById('modal-img').src = src; document.getElementById('image-modal').style.display = 'block'; }
function closeModal() { document.getElementById('image-modal').style.display = 'none'; }
function selectVariantImage(pid, vImg, fImg, btn) {
    const img = document.getElementById(`product-image-${pid}`);
    if (img) img.src = vImg && vImg.trim() !== '' ? vImg : fImg;
}

// フォーム表示切替
function showFirstOrderForm() { document.getElementById('first-order-form').style.display = 'block'; document.getElementById('repeat-order-form').style.display = 'none'; }
function showRepeatOrderForm() { document.getElementById('repeat-order-form').style.display = 'block'; document.getElementById('first-order-form').style.display = 'none'; }

document.addEventListener('DOMContentLoaded', () => {
    fetchProducts();
    setLang(currentLang);
});

//═══════════════════════════════════════════════════════════
// ORDER & INITIALIZE
//═══════════════════════════════════════════════════════════
async function sendOrderTelegram() {
    const items = Object.values(cart);
    const ni = document.getElementById('cart-notes');
    const notes = ni ? ni.value.trim() : "";
    if (items.length === 0) { alert(UI_TEXT[currentLang].selectItems); return; }

    let msg = '【New Order / Web注文】\n--------------------------\n';
    items.forEach(item => {
        const name = currentLang==='jp'?(item.product_name_jp||item.product_name_en):(item.product_name_en||item.product_name_jp);
        const vname = currentLang==='jp'?(item.variant_name_jp||item.variant_name_en):(item.variant_name_en||item.variant_name_jp);
        msg += `${item.code || 'N/A'} ${name} (${vname}) ${item.qty}点\n`;
    });
    msg += '--------------------------\n';
    if (notes) msg += `📝 Notes:\n${notes}\n--------------------------\n`;
    msg += `Total Items: ${items.reduce((s,i)=>s+i.qty,0)}\n`;

    const pi = document.getElementById('repeat-phone');
    const phone = pi ? pi.value.trim() : "";
if (!phone) { 
    alert('電話番号を入力してください。'); 
    return; // 番号がない場合は送信を中断する
}

    try {
        await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'send_order', phone, product: msg }) });
        alert('注文を送信しました。DN/IVの作成をお待ちください。');
        if (ni) ni.value = '';
        if (pi) pi.value = '';
        cart = {}; applyFilters(); renderCart();
        document.getElementById('cart-panel')?.classList.remove('show');
    } catch (e) { alert('送信に失敗しました。'); }
}

function clearCart() { cart = {}; applyFilters(); renderCart(); document.getElementById('cart-panel')?.classList.remove('show'); }
function toggleCartPanel() { document.getElementById('cart-panel')?.classList.toggle('show'); }
function openModal(src) { if(src) { document.getElementById('modal-img').src = src; document.getElementById('image-modal').style.display = 'block'; } }
function closeModal() { document.getElementById('image-modal').style.display = 'none'; }

async function init() {
    await fetchProducts();
    setLang(currentLang);
}
document.addEventListener('DOMContentLoaded', init);

// --- script.js に統合する注文管理ロジック ---

function getCartSummary() {
    const items = Object.values(cart);
    return items.length > 0 ? items : null;
}

function showFirstOrderForm() {
    if (!getCartSummary()) { alert('Please select products first.'); return; }
    document.getElementById('first-order-form').style.display = 'block';
    document.getElementById('repeat-order-form').style.display = 'none';
}

function showRepeatOrderForm() {
    if (!getCartSummary()) { alert('Please select products first.'); return; }
    document.getElementById('repeat-order-form').style.display = 'block';
    document.getElementById('first-order-form').style.display = 'none';
}

// 初めての方：Telegram登録案内（別タブ版）
async function submitFirstOrder() {
    // 1. 入力内容を取得
    const storeName = document.getElementById('first-store-name')?.value.trim();
    const contactName = document.getElementById('first-contact-name')?.value.trim();
    const phone = document.getElementById('first-phone')?.value.trim();

    // 2. 入力チェック
    if (!storeName || !contactName || !phone) {
        alert(currentLang === 'jp' ? "すべての項目を入力してください。" : "Please fill in all fields.");
        return;
    }

    // 3. GASにデータを送信
    const btn = document.querySelector('#first-order-form button');
    try {
        if (btn) btn.disabled = true;

        // 【修正点】mode: 'no-cors' を追加して確実にGASへ飛ばす
        await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors', 
            body: JSON.stringify({
                action: 'register_user',
                phone: phone,
                username: storeName,    // 店名
                firstName: contactName  // 担当者名
            })
        });

    } catch (e) {
        console.error("Registration error:", e);
    }

    // 4. Telegramへの案内
    const botUsername = "SAKANAYAJAPON_bot"; // ★ここをご自身のボット名（@なし）に修正！
    const message = currentLang === 'jp' 
        ? "ご入力ありがとうございます！\n\n最後に、別画面で開くTelegramで「開始 (START)」ボタンを一度だけ押して登録を完了させてください。"
        : "Thank you!\n\nFinally, please click the 'START' button on the Telegram screen that opens in a new tab to complete your registration.";
    
    if (confirm(message)) {
        // カートの中身を保存
        localStorage.setItem('temp_cart', JSON.stringify(cart));
        
        // Telegramを別タブで開く（電話番号をパラメータとして渡す）
        const cleanPhone = phone.replace(/\D/g, "");
        window.open(`https://t.me/${botUsername}?start=${cleanPhone}`, '_blank');
        
        // フォームを閉じる
        document.getElementById('first-order-form').style.display = 'none';
        closeCartPanel();
    }
    
    // 最後にボタンを戻す（送信完了後）
    if (btn) btn.disabled = false;
}
// 2回目以降の方：GASへ注文送信
async function submitRepeatOrder() {
    const phoneInput = document.getElementById('repeat-phone');
    const phone = phoneInput ? phoneInput.value.trim() : "";
    const notesInput = document.getElementById('cart-notes');
    const notes = notesInput ? notesInput.value.trim() : "";
    const items = Object.values(cart);

    // ★電話番号の必須チェック（デフォルト096...は削除済み）
    if (!phone) {
        alert(currentLang === 'jp' ? '電話番号を入力してください。' : 'Please enter your phone number.');
        return;
    }
    if (items.length === 0) {
        alert('Please select products first.');
        return;
    }

    let totalQty = 0;
    let message = '【New Order / Web注文】\n--------------------------\n';

    items.forEach(item => {
        const productName = currentLang === 'jp' ? (item.name_jp || item.name_en) : (item.name_en || item.name_jp);
        const variantName = currentLang === 'jp' ? (item.variant_name_jp || item.variant_name_en) : (item.variant_name_en || item.variant_name_jp);
        message += `${item.code || 'N/A'} ${productName} (${variantName}) ${item.qty}点\n`;
        totalQty += item.qty;
    });

    message += '--------------------------\n';
    if (notes) message += `📝 Notes:\n${notes}\n--------------------------\n`;
    message += `Total Items: ${totalQty}\n`;

    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'send_order', phone: phone, name: "Web User", product: message })
        });
        alert('注文を送信しました。DN/IVの作成をお待ちください。');
        clearCart();
        closeCartPanel();
    } catch (e) {
        alert('送信に失敗しました。ネットワークを確認してください。');
    }
}

// ページ読み込み時に保存されたカートを復活させる
window.addEventListener('load', () => {
    // 他の処理が終わるのを少し待ってから実行（0.5秒）
    setTimeout(() => {
        const savedData = localStorage.getItem('temp_cart');
        if (savedData) {
            try {
                // 保存されたデータを取得してカート(cart変数)に合体させる
                const parsedCart = JSON.parse(savedData);
                Object.assign(cart, parsedCart); 
                
                // 画面表示（バッジやリスト）を更新
                if (typeof renderCart === 'function') {
                    renderCart();
                }
                
                // 復活が完了したら、保存データは削除する
                localStorage.removeItem('temp_cart');
                console.log("Cart items restored successfully!");
            } catch (e) {
                console.error("Cart restore failed:", e);
            }
        }
    }, 500); 
});

// カートパネルを閉じる関数
function closeCartPanel() {
    const cartPanel = document.getElementById('cart-panel');
    if (cartPanel) {
        cartPanel.classList.remove('active'); // CSSで .active で表示を制御している場合
        // もし style.display で制御している場合はこちら↓
        // cartPanel.style.display = 'none';
    }
}
