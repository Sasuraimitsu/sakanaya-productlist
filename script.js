// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwpHTrnOgUWMHb8cZ7sQlGXNKSz0Pvz5nu9zVP2Eh3Nju1t1T9g5xZrheQZAjTX6qOE/exec';
const TELEGRAM_BOT = 'sakanaya_bot';

// ═══════════════════════════════════════════════════════════
// LANGUAGE STATE
// ブラウザ言語が日本語なら'jp'、それ以外は'en'をデフォルトに
// ═══════════════════════════════════════════════════════════
let currentLang = (navigator.language || navigator.userLanguage || 'en').startsWith('ja') ? 'jp' : 'en';

// UI テキスト定義
const UI_TEXT = {
    jp: {
        searchPlaceholder: '商品名で検索...',
        noticeTitle: '【 お知らせ 】 クリックして詳細を表示',
        noticeBody: `
            <strong>JP:</strong><br>
            ・商品はカテゴリーや名前で絞り込みが可能です。<br>
            ・記載にない輸入商品は <a href="https://t.me/+9MZ3SB5xav42YjZl" target="_blank" class="notice-link">OFFICIAL TELEGRAM</a> でもご案内しております。<br>
            ・Telegramでご注文後、注文確認シートが送付されますので、内容確認してサインもしくは「Confirmed」とご返信ください。<br>
            ・<strong>重量計算</strong>商品は請求時に実重量で計算いたします。<strong>数量計算</strong>商品は注文数で計算いたします。`,
        orderBtn: '📲 Telegramで注文する',
        orderBarLabel: '📋 注文内容はこちら',
        orderBarUnit: '点',
        orderNote: '※ 最終金額は納品時に確定いたします',
        noProducts: '該当商品なし',
        selectItems: '商品を選択してください。',
        askBtn: '💬 お問い合わせ',
        weight: '重量計算',
        qty: '数量計算',
        stock: 'STOCK',
        size: 'サイズ',
    },
    en: {
        searchPlaceholder: 'Search product name...',
        noticeTitle: '【 NOTICE 】 Click to view details',
        noticeBody: `
            <strong>EN:</strong><br>
            - You can filter products by category or name.<br>
            - Imported items not listed are also available on <a href="https://t.me/+9MZ3SB5xav42YjZl" target="_blank" class="notice-link">OFFICIAL TELEGRAM</a>.<br>
            - After ordering via Telegram, you will receive an order sheet. Please sign or reply <strong>"Confirmed"</strong> to complete your order.<br>
            - <strong>Weight-calc</strong> items are invoiced by actual weight upon delivery. <strong>Qty-calc</strong> items are invoiced by ordered quantity.`,
        orderBtn: '📲 Order via Telegram',
        orderBarLabel: '📋 Your Order',
        orderBarUnit: ' item(s)',
        orderNote: '* Final price confirmed upon delivery',
        noProducts: 'No products found',
        selectItems: 'Please select items.',
        askBtn: '💬 ASK FOR PRICE',
        weight: 'WEIGHT CALC',
        qty: 'QTY CALC',
        stock: 'STOCK',
        size: 'Size',
    }
};

// ═══════════════════════════════════════════════════════════
// CATEGORY → UNIT FIELDS
// ═══════════════════════════════════════════════════════════
const CAT_UNIT_FIELDS = {
    // スプレッドシート列名: wo/sd_pic, dr_pic, back_pic, stomach_pic
    'FROZEN':         [{ key: 'wo/sd_pic', label: 'wo' }],
    'FRESH-WHOLE/SD': [{ key: 'wo/sd_pic', label: 'wo' },
                       { key: 'dr_pic',    label: 'dr' }],
    'FRESH-FILLET':   [{ key: 'back_pic',    label: 'back-pic' },
                       { key: 'stomach_pic', label: 'stomach-pic' }],
    'OIL&SEASONING':  [{ key: 'wo/sd_pic', label: 'pic' }],
    'KITCHEN':        [{ key: 'case',      label: 'case' },
                       { key: 'wo/sd_pic', label: 'pic' }],
    'SAKE':           [{ key: 'case',      label: 'case' },
                       { key: 'bottle',    label: 'bottle' }],
};

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════
let allProducts = [];
let currentCategory = 'ALL';

// ═══════════════════════════════════════════════════════════
// LANGUAGE SWITCH
// ═══════════════════════════════════════════════════════════
function setLang(lang) {
    currentLang = lang;
    const t = UI_TEXT[lang];

    // ボタンのactive切り替え
    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('lang-' + lang).classList.add('active');

    // 検索プレースホルダー
    document.getElementById('search-input').placeholder = t.searchPlaceholder;

    // NOTICEタイトルとボディ
    document.getElementById('notice-summary-text').textContent = t.noticeTitle;
    document.getElementById('notice-body-content').innerHTML = t.noticeBody;

    // カートバー
    document.getElementById('order-bar-label').textContent = t.orderBarLabel;
    document.getElementById('order-btn-text').textContent = t.orderBtn;
    document.getElementById('order-bar-note').textContent = t.orderNote;
    updateTotal();

    // 商品カードを再描画
    applyFilters();
}

// ═══════════════════════════════════════════════════════════
// FETCH from GAS
// ═══════════════════════════════════════════════════════════
async function fetchProducts() {
    try {
        const res = await fetch(GAS_URL);
        const data = await res.json();

        if (data.updateDate) {
            document.getElementById('update-date').textContent = 'UPDATE: ' + data.updateDate;
        }

        // stock=0 を除外、name_jp か name_en どちらかがあればOK
        allProducts = (data.products || []).filter(p => {
            const hasName = (p.name_jp || p.name_en || p.name || '').trim() !== '';
            if (!hasName) return false;
            const s = Number(p.stock);
            return isNaN(s) || s > 0;
        });

        displayProducts(allProducts);
    } catch (e) {
        document.getElementById('product-container').innerHTML =
            `<p style="text-align:center;padding:40px;color:#999;">
                ⚠️ Failed to load products.<br><small>${e.message}</small>
            </p>`;
    }
}

// ═══════════════════════════════════════════════════════════
// 言語に応じた商品名・コメントを取得
// ═══════════════════════════════════════════════════════════
function getName(p) {
    if (currentLang === 'jp') return p.name_jp || p.name_en || p.name || '';
    return p.name_en || p.name_jp || p.name || '';
}
function getComment(p) {
    if (currentLang === 'jp') return p.comment_jp || p.comment_en || p.comment || '';
    return p.comment_en || p.comment_jp || p.comment || '';
}

// ═══════════════════════════════════════════════════════════
// CATEGORY FILTER
// ═══════════════════════════════════════════════════════════
function filterCategory(cat, btn) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = cat;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    applyFilters();
}

// ═══════════════════════════════════════════════════════════
// SEARCH + FILTER
// ═══════════════════════════════════════════════════════════
function applyFilters() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    const filtered = allProducts.filter(p => {
        const matchesCat = (currentCategory === 'ALL' || p.category === currentCategory);
        const name = getName(p).toLowerCase();
        const comment = getComment(p).toLowerCase();
        const matchesSearch = !searchTerm ||
            name.includes(searchTerm) ||
            (p.code && p.code.toLowerCase().includes(searchTerm)) ||
            comment.includes(searchTerm);
        return matchesCat && matchesSearch;
    });
    displayProducts(filtered);
}

// ═══════════════════════════════════════════════════════════
// DISPLAY PRODUCTS
// ═══════════════════════════════════════════════════════════
function displayProducts(products) {
    const container = document.getElementById('product-container');
    container.innerHTML = '';
    const t = UI_TEXT[currentLang];

    const valid = products.filter(p => (p.name_jp || p.name_en || p.name || '').trim() !== '');
    if (valid.length === 0) {
        container.innerHTML = `<p style="text-align:center;padding:30px;color:#999;">${t.noProducts}</p>`;
        return;
    }
    valid.forEach((p, idx) => {
        container.innerHTML += buildCard(p, idx);
    });
}

// ═══════════════════════════════════════════════════════════
// BUILD CARD HTML
// ═══════════════════════════════════════════════════════════
function buildCard(p, idx) {
    const t = UI_TEXT[currentLang];
    const cat = (p.category || '').toUpperCase();
    const isSake = cat === 'SAKE';
    const isWeightUnit = (p.unit || '').toLowerCase() === 'kg';

    const displayName = getName(p);
    const displayComment = getComment(p);
    const safeName = esc(displayName);
    const safeNameJp = esc(p.name_jp || p.name || '');
    const safeNameEn = esc(p.name_en || p.name || '');
    const safeCode = esc(p.code || '');
    const imgSrc = (p.image || '').trim();

    // ── 画像 ──
    const imgHTML = imgSrc
        ? `<img src="${imgSrc}" alt="${safeName}" onclick="openModal('${imgSrc}')">`
        : `<div style="width:100%;height:100%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:2rem;color:#aaa;">🐟</div>`;

    // ── カテゴリータグ ──
    const country = (p.country || '').toUpperCase();
    const flagSrc = country === 'JAPAN' ? 'images/jp-flag.png' : country === 'CAMBODIA' ? 'images/kh-flag.png' : '';
    const countryBadge = flagSrc ? `<img class="country-flag" src="${flagSrc}" alt="${country}">` : '';
    const catClass = cat.replace(/[^A-Z0-9\-]/g, '_');
    const catTag = `<span class="category-tag ${catClass}">${esc(p.category || '')}${countryBadge}</span>`;

    // ── ストックバッジ ──
    const stockBadge = (!isSake && p.stock && Number(p.stock) > 0)
        ? `<span class="stock-badge">${t.stock}: ${esc(String(p.stock))} pic</span>`
        : '';

    // ── 価格 ──
    let priceHTML = '';
    if (isSake) {
        priceHTML = `<p class="price-ask">ASK <span class="sake-special-label">⚡ 衝撃の大特価</span></p>`;
    } else {
        const unitLabel = isWeightUnit ? 'kg' : 'pc';
        const unitTypeBadge = isWeightUnit
            ? `<span class="unit-type-badge weight">${t.weight}</span>`
            : `<span class="unit-type-badge qty">${t.qty}</span>`;
        priceHTML = `
            <p class="price">
                $${Number(p.price || 0).toFixed(2)}
                <span class="unit-text">/ ${unitLabel}</span>
                ${unitTypeBadge}
            </p>`;
    }

    // ── 単位フィールド ──
    const unitFields = CAT_UNIT_FIELDS[cat] || [];
    const activeUnitFields = unitFields.filter(
        f => p[f.key] && String(p[f.key]).trim() !== '' && String(p[f.key]).trim() !== '0'
    );

    // ── サイズ ──
    const sizeHTML = (p.size && p.size.trim() !== '' && p.size.toLowerCase() !== 'size')
        ? `<p class="size-detail">${t.size}: ${esc(p.size)}</p>`
        : '';

    // ── コメント ──
    const commentHTML = displayComment
        ? `<div class="comment-box">${esc(displayComment).replace(/\n/g, '<br>')}</div>`
        : '';

    // ── 注文エリア ──
    let orderHTML = '';
    if (isSake) {
        orderHTML = `<a class="ask-btn" href="https://t.me/${TELEGRAM_BOT}" target="_blank">${t.askBtn}</a>`;
    } else if (activeUnitFields.length > 0) {
        const rows = activeUnitFields.map((f, fi) => `
            <div class="calc-row" style="margin-bottom:${fi < activeUnitFields.length - 1 ? '6px' : '0'}">
                <div class="qty-wrap">
                    <button class="qty-btn" onclick="changeQty('input_${idx}_${fi}', -1)">−</button>
                    <input type="number" class="qty-input"
                        id="input_${idx}_${fi}" min="0" value="0"
                        data-price="${p.price}"
                        data-unit-label="${f.label}"
                        data-name-jp="${safeNameJp}"
                        data-name-en="${safeNameEn}"
                        oninput="updateTotal()" onchange="updateTotal()">
                    <button class="qty-btn" onclick="changeQty('input_${idx}_${fi}', 1)">＋</button>
                </div>
                <span class="order-unit-label">${f.label.toUpperCase()}</span>
            </div>`).join('');
        orderHTML = `<div class="calc-container">${rows}</div>`;
    } else if (isWeightUnit) {
        orderHTML = `
            <div class="calc-container">
                <div class="calc-row">
                    <div class="weight-input-wrap">
                        <input type="number" class="weight-input"
                            id="input_${idx}" min="0.1" step="0.1" value="0"
                            data-price="${p.price}"
                            data-unit-label="kg"
                            data-name-jp="${safeNameJp}"
                            data-name-en="${safeNameEn}"
                            oninput="updateTotal()" onchange="updateTotal()">
                        <span class="weight-unit-label">kg</span>
                    </div>
                </div>
            </div>`;
    } else {
        orderHTML = `
            <div class="calc-container">
                <div class="calc-row">
                    <div class="qty-wrap">
                        <button class="qty-btn" onclick="changeQty('input_${idx}', -1)">−</button>
                        <input type="number" class="qty-input"
                            id="input_${idx}" min="0" value="0"
                            data-price="${p.price}"
                            data-unit-label="pc"
                            data-name-jp="${safeNameJp}"
                            data-name-en="${safeNameEn}"
                            oninput="updateTotal()" onchange="updateTotal()">
                        <button class="qty-btn" onclick="changeQty('input_${idx}', 1)">＋</button>
                    </div>
                    <span class="order-unit-label">PC</span>
                </div>
            </div>`;
    }

    return `
    <div class="card" data-category="${cat}">
        <div class="img-wrapper">
            ${imgHTML}
            ${catTag}
            ${stockBadge}
        </div>
        <div class="info">
            ${safeCode ? `<span class="code">Code: ${safeCode}</span>` : ''}
            <h3>${safeName}</h3>
            ${sizeHTML}
            ${commentHTML}
            <div class="price-size-area">
                ${priceHTML}
                ${orderHTML}
            </div>
        </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════
// QTY BUTTON
// ═══════════════════════════════════════════════════════════
function changeQty(id, delta) {
    const inp = document.getElementById(id);
    if (!inp) return;
    inp.value = Math.max(0, (parseInt(inp.value) || 0) + delta);
    updateTotal();
}

// ═══════════════════════════════════════════════════════════
// ITEM COUNT
// ═══════════════════════════════════════════════════════════
function updateTotal() {
    const t = UI_TEXT[currentLang];
    let itemCount = 0;
    document.querySelectorAll('.card [data-price]').forEach(inp => {
        if ((parseFloat(inp.value) || 0) > 0) itemCount++;
    });
    document.getElementById('total-amount').textContent = itemCount + t.orderBarUnit;
    const bar = document.getElementById('total-bar');
    itemCount > 0 ? bar.classList.add('show') : bar.classList.remove('show');
}

// ═══════════════════════════════════════════════════════════
// TELEGRAM ORDER（注文メッセージは日英両方）
// ═══════════════════════════════════════════════════════════
function sendOrderTelegram() {
    let message = '【New Order / 注文依頼】\n';
    let hasOrder = false;
    let itemCount = 0;

    document.querySelectorAll('.card').forEach(card => {
        card.querySelectorAll('[data-price]').forEach(inp => {
            const qty = parseFloat(inp.value) || 0;
            if (qty <= 0) return;
            hasOrder = true;
            itemCount++;
            const nameJp = inp.getAttribute('data-name-jp') || '';
            const nameEn = inp.getAttribute('data-name-en') || '';
            // 日英両方を併記
            const nameLine = nameJp && nameEn && nameJp !== nameEn
                ? `${nameJp} / ${nameEn}`
                : nameJp || nameEn;
            const unitLabel = inp.getAttribute('data-unit-label') || 'pc';
            const price = parseFloat(inp.getAttribute('data-price')) || 0;
            // 変更後
     message += `- ${nameLine} / × ${qty} ${unitLabel.toUpperCase()}\n`;
        });
    });

    if (!hasOrder) {
        alert(UI_TEXT[currentLang].selectItems);
        return;
    }
    message += `\n---\n注文商品数 / Items: ${itemCount}\n\n※ 最終金額は納品時の重量・数量により確定いたします。\n* Final price confirmed upon delivery.`;
    window.open(`https://t.me/${TELEGRAM_BOT}?text=${encodeURIComponent(message)}`, '_blank');
}

// ═══════════════════════════════════════════════════════════
// IMAGE MODAL
// ═══════════════════════════════════════════════════════════
function openModal(src) {
    if (!src || src.includes('undefined') || src.trim() === '') return;
    document.getElementById('modal-img').src = src;
    document.getElementById('image-modal').style.display = 'block';
}
function closeModal() {
    document.getElementById('image-modal').style.display = 'none';
}

// ═══════════════════════════════════════════════════════════
// ESCAPE HELPER
// ═══════════════════════════════════════════════════════════
function esc(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════
fetchProducts();
// 初期言語を適用（ボタンのactive状態のみ、テキストはfetchProducts後に設定）
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('lang-' + currentLang).classList.add('active');
    setLang(currentLang);
});
