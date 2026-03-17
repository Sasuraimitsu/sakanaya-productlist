// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════
const GAS_URL = 'YOUR_GAS_ENDPOINT_URL_HERE';
const TELEGRAM_ID = 'SAKANAYAJAPON';

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════
let allProducts = [];
let currentCategory = 'ALL';

// ═══════════════════════════════════════════════════════════
// CATEGORY → UNIT FIELDS
//
// スプレッドシートの列名（使用するもの）:
//   pic        : FROZEN / FRESH-WHOLE / SEASONING → 1尾/1個あたり
//   sd_pic     : FRESH-SD → セミドレス1尾
//   back_pic   : FRESH-FILLET → 背身1枚
//   stomach_pic: FRESH-FILLET → 腹身1枚
//   case       : KITCHEN / SAKE → ケース
//   bottle     : SAKE → 1本
//
// 表示ラベル例: "1 pic (1.2kg)" のようにカードに表示
// ═══════════════════════════════════════════════════════════
const CAT_UNIT_FIELDS = {
    'FROZEN':       [{ key: 'pic',         label: 'pic' }],
    'FRESH-WHOLE':  [{ key: 'pic',         label: 'pic' }],
    'FRESH-SD':     [{ key: 'sd_pic',      label: 'sd-pic' }],
    'FRESH-FILLET': [{ key: 'back_pic',    label: 'back-pic' },
                     { key: 'stomach_pic', label: 'stomach-pic' }],
    'SEASONING':    [{ key: 'pic',         label: 'pic' }],
    'KITCHEN':      [{ key: 'case',        label: 'case' },
                     { key: 'pic',         label: 'pic' }],
    'SAKE':         [{ key: 'case',        label: 'case' },
                     { key: 'bottle',      label: 'bottle' }],
};

// ═══════════════════════════════════════════════════════════
// FETCH from GAS
// ═══════════════════════════════════════════════════════════
async function fetchProducts() {
    try {
        const res = await fetch(GAS_URL);
        const data = await res.json();

        // UPDATE DATE
        if (data.updateDate) {
            document.getElementById('update-date').textContent = 'UPDATE: ' + data.updateDate;
        }

        // stock = 0 を除外
        allProducts = (data.products || []).filter(p => {
            if (!p.name || p.name.trim() === '') return false;
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
        const matchesSearch = !searchTerm ||
            (p.name && p.name.toLowerCase().includes(searchTerm)) ||
            (p.code && p.code.toLowerCase().includes(searchTerm)) ||
            (p.comment && p.comment.toLowerCase().includes(searchTerm));
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

    const valid = products.filter(p => p.name && p.name.trim() !== '');
    if (valid.length === 0) {
        container.innerHTML = '<p style="text-align:center;padding:30px;color:#999;">No products found / 該当商品なし</p>';
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
    const cat = (p.category || '').toUpperCase();
    const isSake = cat === 'SAKE';
    const isWeightUnit = (p.unit || '').toLowerCase() === 'kg';

    const safeName = esc(p.name || '');
    const safeCode = esc(p.code || '');
    const imgSrc = (p.image || '').trim();

    // ── 画像エリア ──
    const imgHTML = imgSrc
        ? `<img src="${imgSrc}" alt="${safeName}" onclick="openModal('${imgSrc}')">`
        : `<div style="width:100%;height:100%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:2rem;color:#aaa;">🐟</div>`;

    // ── カテゴリータグ ──
    const country = (p.country || '').toUpperCase();
    const countryBadge = country
        ? `<span class="country-badge ${country}">${country}</span>`
        : '';
    const catTag = `
        <span class="category-tag ${cat}">
            ${esc(p.category || '')}
            ${countryBadge}
        </span>`;

    // ── ストックバッジ ──
    const stockBadge = (!isSake && p.stock)
        ? `<span class="stock-badge">STOCK: ${esc(String(p.stock))} ${isWeightUnit ? 'kg' : 'pc'}</span>`
        : '';

    // ── 価格エリア ──
    let priceHTML = '';
    if (isSake) {
        priceHTML = `
            <p class="price-ask">ASK
                <span class="sake-special-label">⚡ 衝撃の大特価</span>
            </p>`;
    } else {
        const unitLabel = isWeightUnit ? 'kg' : 'pc';
        const unitTypeBadge = isWeightUnit
            ? `<span class="unit-type-badge weight">WEIGHT</span>`
            : `<span class="unit-type-badge qty">QTY</span>`;
        priceHTML = `
            <p class="price">
                $${Number(p.price || 0).toFixed(2)}
                <span class="unit-text">/ ${unitLabel}</span>
                ${unitTypeBadge}
            </p>`;
    }

    // ── 注文単位ラベル（値が入っているフィールドのラベルのみ・数値は非表示） ──
    const unitFields = CAT_UNIT_FIELDS[cat] || [];
    const activeUnitFields = unitFields.filter(
        f => p[f.key] && String(p[f.key]).trim() !== '' && String(p[f.key]).trim() !== '0'
    );

    // ── サイズ ──
    const sizeHTML = (p.size && p.size.trim() !== '' && p.size.toLowerCase() !== 'size')
        ? `<p class="size-detail">Size: ${esc(p.size)}</p>`
        : '';

    // ── コメント ──
    const commentHTML = p.comment
        ? `<div class="comment-box">${esc(p.comment).replace(/\n/g, '<br>')}</div>`
        : '';

    // ── 注文エリア ──
    // activeUnitFields がある場合 → フィールド別に個数入力行（単位ラベルのみ表示、数値なし）
    // ない場合 → unit=kg なら kg入力、unit=pc なら個数入力
    let orderHTML = '';
    if (isSake) {
        orderHTML = `<a class="ask-btn" href="https://t.me/${TELEGRAM_ID}" target="_blank">💬 お問い合わせ / ASK FOR PRICE</a>`;

    } else if (activeUnitFields.length > 0) {
        const rows = activeUnitFields.map((f, fi) => `
            <div class="calc-row" style="margin-bottom:${fi < activeUnitFields.length - 1 ? '6px' : '0'}">
                <div class="qty-wrap">
                    <button class="qty-btn" onclick="changeQty('input_${idx}_${fi}', -1)">−</button>
                    <input type="number" class="qty-input"
                        id="input_${idx}_${fi}" min="0" value="0"
                        data-price="${p.price}"
                        data-unit-label="${f.label}"
                        data-product-name="${safeName}"
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
                            data-product-name="${safeName}"
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
                            data-product-name="${safeName}"
                            oninput="updateTotal()" onchange="updateTotal()">
                        <button class="qty-btn" onclick="changeQty('input_${idx}', 1)">＋</button>
                    </div>
                    <span class="order-unit-label">PC</span>
                </div>
            </div>`;
    }

    return `
    <div class="card" data-category="${cat}" data-name="${safeName}">
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
    const newVal = Math.max(0, (parseInt(inp.value) || 0) + delta);
    inp.value = newVal;
    updateTotal();
}

// ═══════════════════════════════════════════════════════════
// TOTAL CALCULATION
// ═══════════════════════════════════════════════════════════
function updateTotal() {
    let total = 0;
    document.querySelectorAll('.card [data-price]').forEach(inp => {
        const price = parseFloat(inp.getAttribute('data-price')) || 0;
        const qty = parseFloat(inp.value) || 0;
        total += price * qty;
    });
    document.getElementById('total-amount').textContent =
        total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const bar = document.getElementById('total-bar');
    total > 0 ? bar.classList.add('show') : bar.classList.remove('show');
}

// ═══════════════════════════════════════════════════════════
// TELEGRAM ORDER
// ═══════════════════════════════════════════════════════════
function sendOrderTelegram() {
    let message = '【New Order / 注文依頼】\n';
    let hasOrder = false;

    document.querySelectorAll('.card').forEach(card => {
        const name = card.querySelector('h3') ? card.querySelector('h3').innerText : '';
        // 複数inputがある場合（back_pic + stomach_pic など）をすべて収集
        card.querySelectorAll('[data-price]').forEach(inp => {
            const qty = parseFloat(inp.value) || 0;
            if (qty <= 0) return;
            hasOrder = true;
            const unitLabel = inp.getAttribute('data-unit-label') || 'pc';
            const price = parseFloat(inp.getAttribute('data-price')) || 0;
            const sub = (price * qty).toFixed(2);
            message += `- ${name} / × ${qty} ${unitLabel.toUpperCase()} = $${sub}\n`;
        });
    });

    if (!hasOrder) {
        alert('Please select items! / 商品を選択してください。');
        return;
    }
    message += `\nEstimated Total: $${document.getElementById('total-amount').innerText}\n\nPlease confirm availability.`;
    window.open(`https://t.me/${TELEGRAM_ID}?text=${encodeURIComponent(message)}`, '_blank');
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
