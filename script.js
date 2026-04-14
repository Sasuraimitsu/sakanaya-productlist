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
        noticeBody:`・商品はカテゴリーや名前で絞り込みが可能です。<br>・Telegramでご注文後、注文確認シートが送付されます。`,
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
        noticeBody:`- Filter items by category.<br>- You'll receive a confirmation sheet via Telegram.`
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
// 6. CART & LANGUAGE LOGIC
// ═══════════════════════════════════════════════════════════
function changeCartQty(vid, delta) {
    // 全商品から該当するバリアント(種類)を探す
    let targetVariant = null;
    let targetProduct = null;

    for (const p of allProducts) {
        const v = p.variants.find(v => v.variant_id === vid);
        if (v) {
            targetVariant = v;
            targetProduct = p;
            break;
        }
    }

    if (!targetVariant) return;

    // カートの状態を更新
    if (!cart[vid]) {
        if (delta <= 0) return;
        cart[vid] = {
            variant_id: vid,
            qty: 0,
            price_usd: toNumber(targetVariant.price_usd),
            product_name_jp: targetProduct.name_jp,
            product_name_en: targetProduct.name_en,
            code: targetVariant.variant_code
        };
    }

    cart[vid].qty += delta;

    // 0以下になったら削除
    if (cart[vid].qty <= 0) {
        delete cart[vid];
    }

    // 表示を更新（カード内の数字と右上のカートアイコン両方）
    applyFilters(); 
    renderCart();
}

function renderCart() {
    const t = UI_TEXT[currentLang];
    const items = Object.values(cart);
    const panel = document.getElementById('cart-panel');
    
    if (!panel) return;

    // ★追加：今のメモを消さないための「一時保存」
    const currentNotes = document.getElementById('cart-notes')?.value || "";

    // 1. 【指示事項】言語によるタイトルの切り替え
    const cartTitle = currentLang === 'jp' ? "ご注文内容" : "Your Order";
    const notesTitle = currentLang === 'jp' ? "メモ" : "Notes";

    // 商品がない場合（ここを少しだけ強化しました）
    if (items.length === 0) {
        panel.innerHTML = ""; // ★ここを追加：箱の中身を空っぽにする
        panel.classList.remove('show');
        document.getElementById('cart-count-badge').textContent = '0';
        return;
    }

    // 2. 【指示事項】ヘッダー、商品リスト、メモ、ボタンを一つの箱として構成
    const headerHtml = `
        <div style="background:#333; color:#fff; padding:12px 15px; display:flex; justify-content:space-between; align-items:center;">
            <h2 style="margin:0; font-size:1rem; color:#fff;">🛒 ${cartTitle}</h2>
            <button onclick="closeCartPanel()" style="color:#fff; border:none; background:none; font-size:1.5rem; cursor:pointer; line-height:1;">×</button>
        </div>
    `;

    const itemsHtml = `
        <div style="flex:1; overflow-y:auto; padding:15px;">
            ${items.map(item => `
                <div class="cart-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px 0; border-bottom:1px solid #eee;">
                    <div style="flex:1; text-align:left;">
                        <strong style="font-size:0.9rem; display:block;">[${esc(item.code || '---')}] ${esc(currentLang === 'jp' ? item.product_name_jp : item.product_name_en)}</strong>
                        <span style="font-size:0.85rem; color:#666;"> × ${item.qty}</span>
                    </div>
                    <div style="display:flex; gap:5px;">
                        <button class="qty-btn" onclick="changeCartQty('${item.variant_id}', -1)">−</button>
                        <button class="qty-btn" onclick="changeCartQty('${item.variant_id}', 1)">＋</button>
                    </div>
                </div>`).join('')}
            
            <div style="margin-top:15px; text-align:left;">
                <label style="display:block; font-weight:bold; margin-bottom:5px; font-size:0.85rem;">${notesTitle}</label>
                <textarea id="cart-notes" style="width:100%; height:60px; border:1px solid #ccc; border-radius:4px; padding:5px; box-sizing:border-box;"></textarea>
            </div>
        </div>
    `;

    const footerHtml = `
        <div style="padding:15px; background:#f9f9f9; border-top:1px solid #ddd;">
            <div class="order-bar-actions" style="display:flex; gap:8px;">
                <button class="order-send-btn" id="btn-submit-first" onclick="submitFirstOrder()" style="flex:1; padding:10px 5px; font-size:0.75rem; font-weight:bold; border-radius:6px;">
                    ${currentLang === 'jp' ? '初めての方' : 'First Time'}
                </button>
                <button class="order-send-btn" onclick="submitRepeatOrder()" style="flex:1; padding:10px 5px; font-size:0.75rem; font-weight:bold; border-radius:6px;">
                    ${currentLang === 'jp' ? 'ご注文' : 'Order'}
                </button>
                <button class="order-clear-btn" onclick="clearCart()" style="padding:12px 10px; font-size:0.75rem; border-radius:6px;">
                    ${currentLang === 'jp' ? 'クリア' : 'Clear'}
                </button>
            </div>
        </div>
    `;

    panel.innerHTML = headerHtml + itemsHtml + footerHtml; 

    const newNotes = document.getElementById('cart-notes');
    if (newNotes) {
        newNotes.value = currentNotes;
    }
    
    document.getElementById('cart-count-badge').textContent = items.reduce((s, i) => s + i.qty, 0);
}

    const footerHtml = `
        <div style="padding:15px; background:#f9f9f9; border-top:1px solid #ddd;">
            <div class="order-bar-actions" style="display:flex; gap:8px;">
                <button class="order-send-btn" id="btn-submit-first" onclick="submitFirstOrder()" style="flex:1; padding:10px 5px; font-size:0.75rem; font-weight:bold; border-radius:6px;">
                    ${currentLang === 'jp' ? '初めての方' : 'First Time'}
                </button>
                <button class="order-send-btn" onclick="submitRepeatOrder()" style="flex:1; padding:10px 5px; font-size:0.75rem; font-weight:bold; border-radius:6px;">
                    ${currentLang === 'jp' ? 'ご注文' : 'Order'}
                </button>
                <button class="order-clear-btn" onclick="clearCart()" style="padding:12px 10px; font-size:0.75rem; border-radius:6px;">
                    ${currentLang === 'jp' ? 'クリア' : 'Clear'}
                </button>
            </div>
        </div>
    `;

    panel.innerHTML = headerHtml + itemsHtml + footerHtml; 

    const newNotes = document.getElementById('cart-notes');
    if (newNotes) {
        newNotes.value = currentNotes;
    }
    
    document.getElementById('cart-count-badge').textContent = items.reduce((s, i) => s + i.qty, 0);
}

function clearCart() {
    // 1. データを完全に空にする
    cart = {};
    
    // 2. フィルタ（商品一覧の＋－）とバッジをリセット
    applyFilters();
    const badge = document.getElementById('cart-count-badge');
    if (badge) badge.textContent = '0';
    
    // 3. 最新の空の状態でカートを描き直す（これで古い表示が消える）
    renderCart(); 
    
    // 4. パネルを閉じる
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
        'cat-waiting': t.cat_waiting, 'inquiry-text': t.inquiry,'search-input': t.searchPlaceholder,
        'notice-summary-text': t.noticeTitle,'notice-body-content': t.noticeBody,
        'btn-first-order': t.btnFirstOrder, 'btn-repeat-order': t.btnRepeatOrder,
        'order-clear-btn': t.clearBtn, 'form-first-title': t.formFirstTitle,
        'form-repeat-title': t.formRepeatTitle, 'btn-submit-first': t.btnSubmitFirst,
        'btn-submit-repeat': t.btnSubmitRepeat
    };

    for (let id in mapping) {
    const el = document.getElementById(id);
    if (el) {
        if (id === 'notice-body-content') {
            el.innerHTML = mapping[id];
        } else {
            el.tagName === 'INPUT' ? el.placeholder = mapping[id] : el.textContent = mapping[id];
        }
    }
}

    applyFilters();
    renderCart();
}

// ═══════════════════════════════════════════════════════════
// 7. UI & MODAL CONTROL
// ═══════════════════════════════════════════════════════════
function toggleCartPanel() {
    const panel = document.getElementById('cart-panel');
    if (panel) {
        panel.classList.toggle('show');
    }
}

function closeCartPanel() {
    const panel = document.getElementById('cart-panel');
    if (panel) {
        panel.classList.remove('show');
    }
}

function closeCartPanel() {
    const cartPanel = document.getElementById('cart-panel');
    if (cartPanel) {
        cartPanel.classList.remove('show');   // style.cssの定義に合わせる
        cartPanel.classList.remove('active'); // 念のため両方のクラスに対応
    }
}

function openModal(src) {
    if (src) {
        const modal = document.getElementById('image-modal');
        const modalImg = document.getElementById('modal-img');
        modalImg.src = src;
        modal.style.display = 'flex'; 
        // スクロール禁止（overflow: hidden）の行を削除しました
    }
}

function closeModal() {
    const modal = document.getElementById('image-modal');
    modal.style.display = 'none';
    // スクロール解除の行も不要なので削除しました
}

// モーダル内の画像をクリックした時に、親要素のcloseModalが発火して閉じないようにする（伝播防止）
document.getElementById('modal-img')?.addEventListener('click', (e) => {
    e.stopPropagation();
});

function selectVariantImage(pid, vImg, fImg, btn) {
    const img = document.getElementById(`product-image-${pid}`);
    if (img) img.src = vImg && vImg.trim() !== '' ? vImg : fImg;
    if (btn) {
        btn.closest('.variant-list').querySelectorAll('.variant-select-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
}

function showFirstOrderForm() {
    if (Object.keys(cart).length === 0) { alert('Please select products first.'); return; }
    document.getElementById('first-order-form').style.display = 'block';
    document.getElementById('repeat-order-form').style.display = 'none';
}

function showRepeatOrderForm() {
    if (Object.keys(cart).length === 0) { alert('Please select products first.'); return; }
    document.getElementById('repeat-order-form').style.display = 'block';
    document.getElementById('first-order-form').style.display = 'none';
}

// ═══════════════════════════════════════════════════════════
// 8. ORDER LOGIC (GAS & Telegram 連携)
// ═══════════════════════════════════════════════════════════
async function submitFirstOrder() {
    const storeName = document.getElementById('first-store-name')?.value.trim();
    const contactName = document.getElementById('first-contact-name')?.value.trim();
    const phone = document.getElementById('first-phone')?.value.trim();

    if (!storeName || !contactName || !phone) {
        alert(currentLang === 'jp' ? "すべての項目を入力してください。" : "Please fill in all fields.");
        return;
    }

    const btn = document.querySelector('#btn-submit-first');
    try {
        if (btn) btn.disabled = true;
        await fetch(GAS_URL, {
            method: 'POST',
            mode: 'no-cors', 
            body: JSON.stringify({ 
                action: 'register_user', 
                spreadsheetId: '1DLqtzAX3Hb9_lSRccB6ywB0SGnjUHLbSnHo_Vgu7KCs', // IDを追加
                phone: phone, 
                username: storeName, 
                firstName: contactName 
            })
        });
    } catch (e) { console.error("Registration error:", e); }

    const message = currentLang === 'jp' 
        ? "ご入力ありがとうございます！\n\n最後に、別画面で開くTelegramで「開始 (START)」ボタンを一度だけ押して登録を完了させてください。"
        : "Thank you!\n\nFinally, please click 'START' on Telegram to complete registration.";
    
    if (confirm(message)) {
        localStorage.setItem('temp_cart', JSON.stringify(cart));
        const cleanPhone = phone.replace(/\D/g, "");
        // BOT_USERNAME を SAKANAYAJAPON に固定
        window.open(`https://t.me/SAKANAYAJAPON?start=${cleanPhone}`, '_blank');
        closeCartPanel();
    }
    if (btn) btn.disabled = false;
}

async function submitRepeatOrder() {
    const phone = document.getElementById('repeat-phone')?.value.trim();
    const notes = document.getElementById('cart-notes')?.value.trim();
    const items = Object.values(cart);

    if (!phone) {
        alert(currentLang === 'jp' ? '電話番号を入力してください。' : 'Please enter your phone number.');
        return;
    }
    if (items.length === 0) { alert('Please select products first.'); return; }

    let message = '【New Order / Web注文】\n--------------------------\n';
    items.forEach(item => {
        // [コード] 商品名 × 数量 の形式に統一
        const pName = currentLang === 'jp' ? (item.product_name_jp || item.product_name_en) : (item.product_name_en || item.product_name_jp);
        message += `[${item.code || 'N/A'}] ${pName} × ${item.qty}\n`;
    });
    if (notes) message += `--------------------------\n📝 Notes:\n${notes}\n`;

    try {
        await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'send_order', 
                spreadsheetId: '1DLqtzAX3Hb9_lSRccB6ywB0SGnjUHLbSnHo_Vgu7KCs', // IDを追加
                targetGroupId: '-4710396177', // グループIDを追加
                phone: phone, 
                name: "Web User", 
                product: message 
            })
        });
        alert(currentLang === 'jp' ? '注文を送信しました。' : 'Order sent!');
        clearCart();
    } catch (e) { alert('送信失敗'); }
}

// ═══════════════════════════════════════════════════════════
// 9. INITIALIZE (ページ読み込み時の処理集約)
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    // 1. 商品データ取得と初期言語設定
    await fetchProducts();
    setLang(currentLang);

    // 2. カートの復元 (Telegramから戻ってきた時用)
    setTimeout(() => {
        const savedData = localStorage.getItem('temp_cart');
        if (savedData) {
            try {
                const parsedCart = JSON.parse(savedData);
                Object.assign(cart, parsedCart);
                renderCart();
                localStorage.removeItem('temp_cart');
                console.log("Cart items restored.");
            } catch (e) { console.error("Restore failed:", e); }
        }
    }, 500);
});
