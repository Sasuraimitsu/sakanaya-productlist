// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════
const GAS_URL = 'https://script.google.com/macros/s/AKfycbxnAPUuZmJHjqoTKoRwkTf1FS7-t9iN2GvY3lxRt8NuaS4le67hoBbY1XTvve7D5z3l/exec';
const TELEGRAM_API_URL = 'https://telegram-bot-729928920450.asia-northeast1.run.app/';
const TELEGRAM_LINK = 'https://t.me/SAKANAYAJAPON';

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════
let currentLang = (navigator.language || navigator.userLanguage || 'en').startsWith('ja') ? 'jp' : 'en';
let currentCategory = 'ALL';
let allProducts = [];
let cart = {};

// ═══════════════════════════════════════════════════════════
// UI TEXT
// ═══════════════════════════════════════════════════════════
const UI_TEXT = {
    jp: {
        firstOrder: "初めての方 / Only First Order",
        repeatOrder: "2回目以降のご注文 / Order",
        searchPlaceholder: '商品名で検索...',
        cat_all: 'すべて',
        cat_frozen: '冷凍',
        cat_fresh_whole: 'ホール',
        cat_fresh_dr: 'セミドレス/ドレス',
        cat_fresh_fillet: 'フィレ',
        cat_oil: '食用油・調味料',
        cat_sake: '酒',
        cat_kitchen: '厨房用品', // 追加
        cat_vege: '野菜',        // 追加
        noticeTitle: '【 お知らせ 】 クリックして詳細を表示',
        noticeBody: `
            <strong>JP:</strong><br>
            ・商品はカテゴリーや名前で絞り込みが可能です。<br>
            ・サイズや部位がある商品は、カード内のボタンから選択してください。<br>
            ・Telegramでご注文後、注文確認シートが送付されますので、内容確認してサインもしくは「Confirmed」とご返信ください。<br>
            ・記載にない輸入商品は <a href="https://t.me/+9MZ3SB5xav42YjZl" target="_blank" class="notice-link">OFFICIAL TELEGRAM</a> でもご案内しております。<br>
            ・最終金額は納品時の重量・数量により確定いたします。`,
        orderBtn: '📲 Telegramで注文する',
        orderBarLabel: '📋 注文内容はこちら',
        orderNote: '※ 最終金額は納品時に確定いたします',
        clearBtn: 'クリア',
        noProducts: '該当商品なし',
        selectItems: '商品を選択してください。',
        stock: 'STOCK',
        size: 'サイズ',
        recommendTitle: '🔥 本日のおすすめ',
        emptyCart: '商品が選択されていません。',
        orderSent: '注文を送信しました。',
        orderFailed: '送信に失敗しました。',
        variantGuideDefault: '種類をお選びください',
        floatingInquiry: '💬 お問い合わせ',
        weightCalc: '重量計算',
        qtyCalc: '数量計算',
        labelNotes: '備考 (アレルギー、配送希望など)',
        notesPlaceholder: 'ご要望があれば入力してください'
    },
    en: {
        firstOrder: "First Time Customer",
        repeatOrder: "Repeat Customer / Order",        
        searchPlaceholder: 'Search product name...',
        cat_all: 'ALL',
        cat_frozen: 'FROZEN',
        cat_fresh_whole: 'WHOLE',
        cat_fresh_dr: 'SEMI DRESS/DRESS',
        cat_fresh_fillet: 'FILLET',
        cat_oil: 'OIL & SEASONING',
        cat_sake: 'SAKE',
        cat_kitchen: 'KITCHEN SUPPLIES', // 追加
        cat_vege: 'VEGETABLES',           // 追加
        noticeTitle: '【 NOTICE 】 Click to view details',
        noticeBody: `
            <strong>EN:</strong><br>
            - You can filter products by category or name.<br>
            - For products with sizes or cuts, please select from the buttons in each card.<br>
            - After ordering via Telegram, you will receive an order sheet. Please sign or reply <strong>"Confirmed"</strong> to complete your order.<br>
            - Imported items not listed are also available on <a href="https://t.me/+9MZ3SB5xav42YjZl" target="_blank" class="notice-link">OFFICIAL TELEGRAM</a>.<br>
            - Final price is confirmed upon delivery.`,
        orderBtn: '📲 Order via Telegram',
        orderBarLabel: '📋 Your Order',
        orderNote: '* Final quantity/weight confirmed upon delivery',
        clearBtn: 'Clear',
        noProducts: 'No products found',
        selectItems: 'Please select items.',
        stock: 'STOCK',
        size: 'Size',
        recommendTitle: "🔥 Today's Recommendation",
        emptyCart: 'No items selected.',
        orderSent: 'Order sent successfully.',
        orderFailed: 'Failed to send order.',
        variantGuideDefault: 'Please select a type',
        floatingInquiry: '💬 Inquiry',
        weightCalc: 'Weight',
        qtyCalc: 'Quantity',
        labelNotes: 'Notes (Allergies, Delivery, etc.)',
        notesPlaceholder: 'Enter any special requests here'
    }
};

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
function esc(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function getProductName(p) { return currentLang === 'jp' ? (p.name_jp || p.name_en || '') : (p.name_en || p.name_jp || ''); }
function getProductComment(p) { return currentLang === 'jp' ? (p.comment_jp || p.comment_en || '') : (p.comment_en || p.comment_jp || ''); }
function getVariantName(v) { return currentLang === 'jp' ? (v.variant_name_jp || v.variant_name_en || '') : (v.variant_name_en || v.variant_name_jp || ''); }
function getCategoryValue(p) { return (p.category_id || p.category || '').trim(); }
function normalizeCategoryClass(c) { return String(c || '').toUpperCase().replace(/[^A-Z0-9\-]/g, '_'); }
function getCountryFlag(c) { 
    const country = String(c || '').toUpperCase();
    if (country === 'JAPAN') return 'images/jp-flag.png';
    if (country === 'CAMBODIA') return 'images/kh-flag.png';
    return '';
}
function toNumber(v, f = 0) { const n = Number(v); return Number.isFinite(n) ? n : f; }
function getRawUnit(v) { return String(v.price_unit || v.order_type || '').trim().toLowerCase(); }
function getUnitLabel(v) {
    const r = getRawUnit(v);
    if (['kg', 'pic', 'pc', 'case', 'bottle'].includes(r)) return r;
    return r || 'unit';
}
function isWeightVariant(v) { return getRawUnit(v) === 'kg'; }
function getCalcLabel(p) { return (p.variants || []).some(v => isWeightVariant(v)) ? UI_TEXT[currentLang].weightCalc : UI_TEXT[currentLang].qtyCalc; }
function getCalcClass(p) { return (p.variants || []).some(v => isWeightVariant(v)) ? 'weight' : 'qty'; }

// ═══════════════════════════════════════════════════════════
// LANGUAGE SWITCH
// ═══════════════════════════════════════════════════════════
function setLang(lang) {
    currentLang = lang;
    const t = UI_TEXT[lang];

    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('lang-' + lang)?.classList.add('active');
    document.getElementById('cat-all').textContent = t.cat_all;
    document.getElementById('cat-frozen').textContent = t.cat_frozen;
    document.getElementById('cat-whole').textContent = t.cat_fresh_whole;
    document.getElementById('cat-dr').textContent = t.cat_fresh_dr;
    document.getElementById('cat-fillet').textContent = t.cat_fresh_fillet;
    document.getElementById('cat-oil').textContent = t.cat_oil;
    document.getElementById('cat-sake').textContent = t.cat_sake;
    document.getElementById('cat-kitchen').textContent = t.cat_kitchen; // 追加
    document.getElementById('cat-vege').textContent = t.cat_vege;       // 追加
    
    if (document.getElementById('search-input')) document.getElementById('search-input').placeholder = t.searchPlaceholder;
    if (document.getElementById('notice-summary-text')) document.getElementById('notice-summary-text').textContent = t.noticeTitle;
    if (document.getElementById('notice-body-content')) document.getElementById('notice-body-content').innerHTML = t.noticeBody;
    if (document.getElementById('order-bar-label')) document.getElementById('order-bar-label').textContent = t.orderBarLabel;
    if (document.getElementById('order-btn-text')) document.getElementById('order-btn-text').textContent = t.orderBtn;
    if (document.getElementById('order-bar-note')) document.getElementById('order-bar-note').textContent = t.orderNote;
    if (document.getElementById('order-clear-btn')) document.getElementById('order-clear-btn').textContent = t.clearBtn;
    if (document.getElementById('recommend-title')) document.getElementById('recommend-title').textContent = t.recommendTitle;
    if (document.getElementById('inquiry-floating-btn')) document.getElementById('inquiry-floating-btn').textContent = t.floatingInquiry;

    // --- ここから追加：注文ボタンとフォームの翻訳 ---
    const btnFirst = document.getElementById('btn-first-order'); // HTMLにidを振る必要があります
    const btnRepeat = document.getElementById('btn-repeat-order');

    if (btnFirst) btnFirst.textContent = t.btnFirstOrder;
    if (btnRepeat) btnRepeat.textContent = t.btnRepeatOrder;

    // フォーム内の店名・名前・電話番号のプレースホルダーも翻訳する場合
    if (document.getElementById('first-store-name')) document.getElementById('first-store-name').placeholder = t.placeholderStore;
    if (document.getElementById('first-contact-name')) document.getElementById('first-contact-name').placeholder = t.placeholderName;
    if (document.getElementById('first-phone')) document.getElementById('first-phone').placeholder = t.placeholderPhone;
    if (document.getElementById('repeat-phone')) document.getElementById('repeat-phone').placeholder = t.placeholderPhone;
    // --- ここまで追加 ---

    applyFilters();
    renderCart();

    const ln = document.getElementById('label-notes');
    const cn = document.getElementById('cart-notes');
    if (ln) ln.textContent = t.labelNotes;
    if (cn) cn.placeholder = t.notesPlaceholder;
}

// ═══════════════════════════════════════════════════════════
// FETCH DATA
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
            const visible = vs.filter(v => toNumber(v.stock, 0) > 0).sort((a, b) => toNumber(a.sort_order, 9999) - toNumber(b.sort_order, 9999));
            return { ...p, variants: visible };
        }).filter(p => (p.name_jp || p.name_en || '').trim() !== '' && p.variants.length > 0)
          .sort((a, b) => toNumber(a.sort_order, 9999) - toNumber(b.sort_order, 9999));
        applyFilters();
    } catch (e) {
        document.getElementById('product-container').innerHTML = `<p style="text-align:center;padding:40px;color:#999;">⚠️ Failed to load products.<br><small>${esc(e.message)}</small></p>`;
    }
}

// ═══════════════════════════════════════════════════════════
// FILTERS & DISPLAY
// ═══════════════════════════════════════════════════════════
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
        const matchesCat = currentCategory === 'ALL' || getCategoryValue(p) === currentCategory;
        const matchesSearch = !search || getProductName(p).toLowerCase().includes(search) || getProductComment(p).toLowerCase().includes(search) || String(p.code || '').toLowerCase().includes(search);
        return matchesCat && matchesSearch;
    });
    displayProducts(filtered);
}

function displayProducts(products) {
    const t = UI_TEXT[currentLang];
    const pc = document.getElementById('product-container');
    const rc = document.getElementById('recommend-container');
    const rs = document.getElementById('recommend-section');
    if (!pc) return;
    const recs = products.filter(p => toNumber(p.recommend_today, 0) === 1);
    const norms = products.filter(p => toNumber(p.recommend_today, 0) !== 1);
    if (rc) rc.innerHTML = recs.map(buildCard).join('');
    if (rs) recs.length > 0 ? rs.classList.remove('hidden') : rs.classList.add('hidden');
    if (norms.length === 0 && recs.length === 0) {
        pc.innerHTML = `<p style="text-align:center;padding:30px;color:#999;">${t.noProducts}</p>`;
        return;
    }
    pc.innerHTML = norms.map(buildCard).join('');
}

function buildCard(p) {
    const t = UI_TEXT[currentLang];
    const pid = esc(p.product_id);
    const cat = getCategoryValue(p);
    const catClass = normalizeCategoryClass(cat);
    const name = esc(getProductName(p));
    const comm = esc(getProductComment(p)).replace(/\n/g, '<br>');
    const code = esc(p.code || '');
    const size = esc(p.size || '');
    const imgMain = (p.image_main || '').trim();
    const flag = getCountryFlag(p.country);
    const totalStock = (p.variants || []).reduce((sum, v) => sum + toNumber(v.stock, 0), 0);
    const imgHTML = imgMain ? `<img id="product-image-${pid}" src="${esc(imgMain)}" alt="${name}" onclick="openModal(this.src)">` : `<div class="img-placeholder">🐟</div>`;
    const recBadge = toNumber(p.recommend_today, 0) === 1 ? `<span class="recommend-badge">RECOMMEND</span>` : '';
    const stockBadge = totalStock > 0 ? `<span class="stock-badge">${t.stock}: ${esc(String(totalStock))} pic</span>` : '';
    const vsHTML = (p.variants || []).map(v => {
        const vid = esc(v.variant_id);
        const qty = cart[v.variant_id]?.qty || 0;
        return `
            <div class="variant-row">
                <button class="variant-select-btn" type="button" onclick="selectVariantImage('${pid}', '${esc(v.image_variant)}', '${esc(imgMain)}', this)">
                    ${esc(getVariantName(v))} / $${toNumber(v.price_usd).toFixed(2)}/${esc(getUnitLabel(v))}
                </button>
                <div class="variant-qty-wrap">
                    <button class="qty-btn" type="button" onclick="changeCartQty('${vid}', -1)">−</button>
                    <span class="variant-qty">${qty}</span>
                    <button class="qty-btn" type="button" onclick="changeCartQty('${vid}', 1)">＋</button>
                </div>
            </div>`;
    }).join('');

    return `
        <div class="card" data-category="${esc(cat)}">
            <div class="img-wrapper">${imgHTML}${recBadge}<span class="category-tag ${catClass}">${esc(cat)}${flag ? `<img class="country-flag" src="${flag}">`:''}</span>${stockBadge}</div>
            <div class="info">
                ${code ? `<span class="code">Code: ${code}</span>`:''}
                <h3>${name}</h3>
                <div class="size-calc-row"><p class="size-detail">${size ? t.size+': '+size : ''}</p><span class="calc-mini ${getCalcClass(p)}">${getCalcLabel(p)}</span></div>
                ${comm ? `<div class="comment-box">${comm}</div>`:''}
                <div class="variant-note">${size || t.variantGuideDefault}</div>
                <div class="variant-list">${vsHTML}</div>
            </div>
        </div>`;
}

// ═══════════════════════════════════════════════════════════
// IMAGE & CART
// ═══════════════════════════════════════════════════════════
function selectVariantImage(pid, vImg, fImg, btn) {
    const img = document.getElementById(`product-image-${pid}`);
    if (img) img.src = (vImg && vImg.trim() !== '') ? vImg : fImg;
    if (btn) {
        btn.closest('.variant-list').querySelectorAll('.variant-select-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }
}

function changeCartQty(vid, delta) {
    let found = null;
    for (const p of allProducts) {
        const v = p.variants.find(x => String(x.variant_id) === String(vid));
        if (v) { found = {p, v}; break; }
    }
    if (!found) return;
    if (!cart[vid] && delta > 0) {
        cart[vid] = {
            variant_id: found.v.variant_id, product_id: found.p.product_id, code: found.p.code || "",
            product_name_jp: found.p.name_jp || '', product_name_en: found.p.name_en || '',
            variant_name_jp: found.v.variant_name_jp || '', variant_name_en: found.v.variant_name_en || '',
            price_usd: toNumber(found.v.price_usd), price_unit_label: getUnitLabel(found.v), qty: 0
        };
    }
    if (cart[vid]) {
        cart[vid].qty += delta;
        if (cart[vid].qty <= 0) delete cart[vid];
        if (delta > 0) document.getElementById('cart-panel')?.classList.add('show');
        applyFilters();
        renderCart();
    }
}

function renderCart() {
    const t = UI_TEXT[currentLang];
    const items = Object.values(cart);
    const el = document.getElementById('cart-items');
    if (!el) return;
    if (items.length === 0) {
        el.innerHTML = `<p class="cart-empty">${t.emptyCart}</p>`;
        if (document.getElementById('cart-count-badge')) document.getElementById('cart-count-badge').textContent = '0';
        return;
    }
    el.innerHTML = items.map(item => `
        <div class="cart-item">
            <div class="cart-item-info"><strong>${esc(currentLang==='jp'?(item.product_name_jp||item.product_name_en):(item.product_name_en||item.product_name_jp))}</strong>
            <span>${esc(currentLang==='jp'?(item.variant_name_jp||item.variant_name_en):(item.variant_name_en||item.variant_name_jp))} $${item.price_usd}/${esc(item.price_unit_label)} × ${item.qty}</span></div>
            <div class="cart-item-actions">
                <button class="qty-btn" onclick="changeCartQty('${item.variant_id}', -1)">−</button>
                <button class="qty-btn" onclick="changeCartQty('${item.variant_id}', 1)">＋</button>
            </div>
        </div>`).join('');
    if (document.getElementById('cart-count-badge')) document.getElementById('cart-count-badge').textContent = items.reduce((s, i) => s + i.qty, 0);
}

// ═══════════════════════════════════════════════════════════
// ORDER & INITIALIZE
// ═══════════════════════════════════════════════════════════
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
    const botUsername = "sakanaya_bot"; // ★ご自身のボット名に書き換えてください
    const message = "初めてのご利用ありがとうございます！\n\n注文を確定するために、別画面で開くTelegramで「開始 (START)」ボタンを一度だけ押してください。\n\nTelegramを別タブで開きますか？";
    
    if (confirm(message)) {
        window.open(`https://t.me/${botUsername}?start=ordered`, '_blank');
    }
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
            body: JSON.stringify({ action: 'send_order', phone: phone, product: message })
        });
        alert('注文を送信しました。DN/IVの作成をお待ちください。');
        clearCart();
        closeCartPanel();
    } catch (e) {
        alert('送信に失敗しました。ネットワークを確認してください。');
    }
}
