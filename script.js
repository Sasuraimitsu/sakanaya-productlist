// ═══════════════════════════════════════════════════════════
// 1. CONFIG & STATE
// ═══════════════════════════════════════════════════════════
const GAS_URL = 'https://script.google.com/macros/s/AKfycbzMWG2Fx-77aWzZmHMWXbNOZQe3K-cSIAkzsc3-aADBt7_csJ0r8h93AuOLxq7tHE0t/exec';
const TELEGRAM_API_URL = 'https://telegram-bot-729928920450.asia-northeast1.run.app/';
const TELEGRAM_LINK = 'https://t.me/SAKANAYAJAPON';

let currentLang = (navigator.language || navigator.userLanguage || 'ja').startsWith('ja') ? 'jp' : 'en';
let currentCategory = 'ALL';
let allProducts = [];
let cart = {};

// ═══════════════════════════════════════════════════════════
// 2. UI TEXT (辞書)
// ═══════════════════════════════════════════════════════════
const UI_TEXT = {
    jp: {
        cat_all: "すべて", cat_frozen: "冷凍品", cat_whole: "鮮魚一匹", 
        cat_fillet: "鮮魚フィレ・セミドレス・ドレス", cat_oil: "調味料・油", cat_kitchen: "厨房用品", cat_vege: "野菜",
        cat_sake: "酒類", cat_waiting: "入荷待ち", inquiry: "問い合わせ",
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
        cat_all: "ALL", cat_frozen: "FROZEN", cat_whole: "WHOLE", 
        cat_fillet: "FILLET/DR/SD", cat_oil: "OIL & SEASONING", cat_kitchen: "KITCHEN", cat_vege: "VEGETABLES",
        cat_sake: "SAKE", cat_waiting: "OUT OF STOCK", inquiry: "INQUIRY",
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

// ═══════════════════════════════════════════════════════════
// 3. HELPERS
// ═══════════════════════════════════════════════════════════
function esc(str) { return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function getProductName(p) { return currentLang === 'jp' ? (p.name_jp || p.name_en || '') : (p.name_en || p.name_jp || ''); }
function getProductComment(p) { return currentLang === 'jp' ? (p.comment_jp || p.comment_en || '') : (p.comment_en || p.comment_jp || ''); }
function getVariantName(v) { return currentLang === 'jp' ? (v.variant_name_jp || v.variant_name_en || '') : (v.variant_name_en || v.variant_name_jp || ''); }
function getCategoryValue(p) { return (p.category_id || p.category || '').trim(); }
function toNumber(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
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
        // 1. 在庫の合計を計算（空文字やエラー値を確実に 0 に変換）
        const totalStock = (p.variants || []).reduce((sum, v) => {
            const val = Number(v.stock);
            return sum + (isNaN(val) ? 0 : val);
        }, 0);

        let matchesCat = false;
        
        // 2. タブごとの表示条件
        if (currentCategory === 'OUT_OF_STOCK') {
            // 「入荷待ち」タブ：在庫が 0 以下の商品だけを表示
            matchesCat = (totalStock <= 0);
        } else {
            // その他のタブ（ALL含む）：
            // カテゴリーが一致し、かつ「在庫がある(>0)」商品だけを表示
            const catMatch = (currentCategory === 'ALL' || getCategoryValue(p) === currentCategory);
            matchesCat = catMatch && (totalStock > 0);
        }

        // 3. 検索キーワードとの照合
        const matchesSearch = !search || 
            getProductName(p).toLowerCase().includes(search) || 
            getProductComment(p).toLowerCase().includes(search);

        return matchesCat && matchesSearch;
    });

    // 4. 絞り込んだ結果を画面に送る
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
            <h3>[${esc(p.code || '---')}] ${name}</h3> 
            <div class="size-calc-row">
                <p class="size-detail">${esc(p.size || '')}</p>
                <span class="calc-mini ${getCalcClass(p)}">${getCalcLabel(p)}</span>
            </div>
            <div class="variant-list">${vsHTML}</div>
        </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// 6. CART & UI LOGIC
// ═══════════════════════════════════════════════════════════
function changeCartQty(vid, delta) {
    let targetVariant = null;
    let targetProduct = null;
    for (const p of allProducts) {
        const v = p.variants.find(v => v.variant_id === vid);
        if (v) { targetVariant = v; targetProduct = p; break; }
    }
    if (!targetVariant) return;

    if (!cart[vid]) {
        if (delta <= 0) return;
        cart[vid] = {
            variant_id: vid,
            qty: 0,
            price_usd: toNumber(targetVariant.price_usd),
            product_name_jp: targetProduct.name_jp,
            product_name_en: targetProduct.name_en,
            code: targetVariant.variant_code || targetProduct.code
        };
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

    // メモを一時保存
    const currentNotes = document.getElementById('cart-notes')?.value || "";

    // 1. 言語によるタイトルの切り替え
    const cartTitle = currentLang === 'jp' ? "ご注文内容" : "Your Order";
    const notesTitle = currentLang === 'jp' ? "メモ" : "Notes";

    // 2. 固定ヘッダー（黒いバー）
    const headerHtml = `
        <div style="background:#333; color:#fff; padding:12px 15px; display:flex; justify-content:space-between; align-items:center;">
            <h2 style="margin:0; font-size:1rem; color:#fff;">🛒 ${cartTitle}</h2>
            <button onclick="closeCartPanel()" style="color:#fff; border:none; background:none; font-size:1.5rem; cursor:pointer; line-height:1;">×</button>
        </div>
    `;

    // 3. 商品リスト部分（空の時とある時で中身を分岐）
    let listContent = '';
    if (items.length === 0) {
        // 空の時はメッセージを表示
        listContent = `<p style="text-align:center; padding:30px; color:#999; margin:0;">${t.emptyCart}</p>`;
    } else {
        // 商品がある時はリストを表示
        listContent = items.map(item => `
            <div class="cart-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #eee;">
                <div style="flex:1; text-align:left;">
                    <strong style="font-size:0.9rem; display:block;">[${esc(item.code || '---')}] ${esc(currentLang === 'jp' ? item.product_name_jp : item.product_name_en)}</strong>
                    <span style="font-size:0.85rem; color:#666;"> × ${item.qty}</span>
                </div>
                <div style="display:flex; gap:5px;">
                    <button class="qty-btn" onclick="changeCartQty('${item.variant_id}', -1)">−</button>
                    <button class="qty-btn" onclick="changeCartQty('${item.variant_id}', 1)">＋</button>
                </div>
            </div>`).join('');
    }

    // 4. 商品リスト・メモ・フッターを合体
    const bodyHtml = `
        <div style="flex:1; overflow-y:auto; padding:15px; display:flex; flex-direction:column;">
            ${listContent}
            
            <div style="margin-top:auto; padding-top:15px; text-align:left;">
                <label style="display:block; font-weight:bold; margin-bottom:5px; font-size:0.85rem;">${notesTitle}</label>
                <textarea id="cart-notes" style="width:100%; height:60px; border:1px solid #ccc; border-radius:4px; padding:5px; box-sizing:border-box;">${esc(currentNotes)}</textarea>
            </div>
        </div>
        <div style="padding:15px; background:#f9f9f9; border-top:1px solid #ddd;">
            <div class="order-bar-actions" style="display:flex; gap:8px;">
                <button class="order-send-btn" id="btn-submit-first" onclick="submitFirstOrder()" style="flex:1; padding:12px 5px; font-size:0.75rem; font-weight:bold; border-radius:6px;">
                    ${currentLang === 'jp' ? '初めての方' : 'First Time'}
                </button>
                <button class="order-send-btn" onclick="submitRepeatOrder()" style="flex:1; padding:12px 5px; font-size:0.75rem; font-weight:bold; border-radius:6px;">
                    ${currentLang === 'jp' ? 'ご注文' : 'Order'}
                </button>
                <button class="order-clear-btn" onclick="clearCart()" style="padding:12px 10px; font-size:0.75rem; border-radius:6px;">
                    ${currentLang === 'jp' ? 'クリア' : 'Clear'}
                </button>
            </div>
        </div>
    `;

    panel.innerHTML = headerHtml + bodyHtml; 
    
    // バッジ更新
    const badge = document.getElementById('cart-count-badge');
    if (badge) badge.textContent = items.reduce((s, i) => s + i.qty, 0);
}
function clearCart() {
    cart = {};
    applyFilters();
    renderCart();
    closeCartPanel();
}

function setLang(lang) {
    currentLang = lang;
    const t = UI_TEXT[lang];
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.id === 'lang-' + lang));

    const mapping = {
        'cat-all': t.cat_all, 'cat-frozen': t.cat_frozen, 'cat-whole': t.cat_whole,
        'cat-dr': t.cat_dr, 'cat-fillet': t.cat_fillet, 'cat-oil': t.cat_oil,
        'cat-sake': t.cat_sake, 'cat-kitchen': t.cat_kitchen, 'cat-vege': t.cat_vege,
        'cat-waiting': t.cat_waiting, 'inquiry-text': t.inquiry, 'search-input': t.searchPlaceholder,
        'notice-summary-text': t.noticeTitle, 'notice-body-content': t.noticeBody,
        'btn-first-order': t.btnFirstOrder, 'btn-repeat-order': t.btnRepeatOrder
    };

    for (let id in mapping) {
        const el = document.getElementById(id);
        if (el) {
            if (id === 'notice-body-content') el.innerHTML = mapping[id];
            else if (el.tagName === 'INPUT') el.placeholder = mapping[id];
            else el.textContent = mapping[id];
        }
    }
    applyFilters();
    renderCart();
}

// ═══════════════════════════════════════════════════════════
// 7. UI CONTROL
// ═══════════════════════════════════════════════════════════
function toggleCartPanel() {
    const panel = document.getElementById('cart-panel');
    if (panel) panel.classList.toggle('show');
}

function closeCartPanel() {
    const panel = document.getElementById('cart-panel');
    if (panel) panel.classList.remove('show');
}

function openModal(src) {
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('modal-img');
    if (modal && modalImg) {
        modalImg.src = src;
        modal.style.display = 'flex';
    }
}

function closeModal() {
    const modal = document.getElementById('image-modal');
    if (modal) modal.style.display = 'none';
}

function selectVariantImage(pid, vImg, fImg, btn) {
    const img = document.getElementById(`product-image-${pid}`);
    if (img) img.src = vImg && vImg.trim() !== '' ? vImg : fImg;
    if (btn) {
        btn.closest('.variant-list').querySelectorAll('.variant-select-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
}

// ═══════════════════════════════════════════════════════════
// 8. ORDER LOGIC
// ═══════════════════════════════════════════════════════════
// ① カートのボタンを押した時：ポップアップを開くだけ
function submitFirstOrder() {
    // 現在の言語に応じた辞書を取得
    const t = UI_TEXT[currentLang];

    // 辞書の文字をHTMLに流し込む
    document.getElementById('modal-title').textContent = t.modalTitle;
    document.getElementById('label-shop').textContent = t.labelShop;
    document.getElementById('label-staff').textContent = t.labelStaff;
    document.getElementById('label-phone').textContent = t.labelPhone;
    document.getElementById('btn-cancel').textContent = t.btnCancel;
    document.getElementById('btn-submit').textContent = t.btnRegister;

    // ポップアップを表示
    document.getElementById('first-time-modal').style.display = 'flex';
}

// ポップアップを閉じる
function closeFirstTimeModal() {
    document.getElementById('first-time-modal').style.display = 'none';
}

// ② ポップアップ内の「登録」ボタンを押した時：実際にデータを送る
async function processFirstTimeRegistration() {
    // 新しいポップアップ内のIDから値を取得
    const store = document.getElementById('reg-shop-name')?.value.trim();
    const name = document.getElementById('reg-staff-name')?.value.trim();
    const phone = document.getElementById('reg-phone')?.value.trim();

    if (!phone || !store || !name) {
        alert(currentLang === 'jp' ? "入力項目が不足しています" : "Please fill in all fields.");
        return;
    }

    try {
        // GASへデータを送信
        await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify({
                action: 'register_user',
                spreadsheetId: '1DLqtzAX3Hb9_lSRccB6ywB0SGnjUHLbSnHo_Vgu7KCs',
                phone: phone, 
                username: store, 
                firstName: name
            })
        });

        const msg = currentLang === 'jp' ? "登録案内を送信しました。Telegramで開始ボタンを押してください。" : "Guide sent. Press START on Telegram.";
        
        if (confirm(msg)) {
            // カートを一時保存
            localStorage.setItem('temp_cart', JSON.stringify(cart));
            // ポップアップを閉じる
            closeFirstTimeModal();
            // Telegramを開く
            const botUsername = "sakanaya_bot"; // @は含めない
window.open(`https://t.me/${botUsername}?start=${phone.replace(/\D/g, "")}`, '_blank');
        }
    } catch (e) { 
        console.error(e);
        alert("エラーが発生しました。");
    }
}

async function submitRepeatOrder() {
    // IDを「order-phone」に合わせ、localStorageからも取得できるようにします
    const phoneInput = document.getElementById('order-phone');
    const phone = phoneInput?.value.trim();
    const notes = document.getElementById('cart-notes')?.value.trim();
    const items = Object.values(cart);

    if (!phone || items.length === 0) {
        alert(currentLang === 'jp' ? "電話番号を入力してください。" : "Please enter your phone number.");
        return;
    }

    // 次回のために電話番号をブラウザに保存
    localStorage.setItem('user_phone', phone);

    let orderData = '【New Order】\n';
    items.forEach(i => {
        const pName = currentLang === 'jp' ? i.product_name_jp : i.product_name_en;
        orderData += `[${i.code || '---'}] ${pName} x ${i.qty}\n`;
    });

    try {
        const response = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'send_order',
                spreadsheetId: '1DLqtzAX3Hb9_lSRccB6ywB0SGnjUHLbSnHo_Vgu7KCs',
                targetGroupId: '-4710396177',
                phone: phone, 
                orderData: orderData, 
                notes: notes
            })
        });

        // GAS側で「未登録」と判定された場合の処理を追加
        const result = await response.json();
        if (result.status === "unregistered") {
            alert(currentLang === 'jp' ? 
                "この番号は登録されていません。左下の「初めての方」から登録をお願いします。" : 
                "This number is not registered. Please register first.");
            return;
        }

        alert(currentLang === 'jp' ? '注文を送信しました！' : 'Order sent!');
        clearCart();
    } catch (e) { 
        // fetch(mode: 'no-cors') の場合はエラーが出ることもあるため、成功とみなす運用かチェックが必要
        alert(currentLang === 'jp' ? '注文を送信しました（確認中）' : 'Order submitted.');
        clearCart();
    }
}

// ═══════════════════════════════════════════════════════════
// 9. INITIALIZE
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    await fetchProducts();
    setLang(currentLang);
    
    const savedData = localStorage.getItem('temp_cart');
    if (savedData) {
        try {
            Object.assign(cart, JSON.parse(savedData));
            renderCart();
            localStorage.removeItem('temp_cart');
        } catch (e) { console.error(e); }
    }
});
