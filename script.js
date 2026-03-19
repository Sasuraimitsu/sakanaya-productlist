// ═══════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════
const GAS_URL = 'https://script.google.com/macros/s/AKfycby8HZxdPdpyfBbacrcMMsbtIhOyZ7rR0BE8LWfpOBTYfUXsD9U8PjeoewZkvV4YHsIV/exec';
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
        searchPlaceholder: '商品名で検索...',
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
        qtyCalc: '数量計算'
    },
    en: {
        searchPlaceholder: 'Search product name...',
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
        qtyCalc: 'Quantity'
    }
};

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
function esc(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function getProductName(product) {
    if (currentLang === 'jp') return product.name_jp || product.name_en || '';
    return product.name_en || product.name_jp || '';
}

function getProductComment(product) {
    if (currentLang === 'jp') return product.comment_jp || product.comment_en || '';
    return product.comment_en || product.comment_jp || '';
}

function getVariantName(variant) {
    if (currentLang === 'jp') return variant.variant_name_jp || variant.variant_name_en || '';
    return variant.variant_name_en || variant.variant_name_jp || '';
}

function getCategoryValue(product) {
    return (product.category_id || product.category || '').trim();
}

function normalizeCategoryClass(category) {
    return String(category || '').toUpperCase().replace(/[^A-Z0-9\-]/g, '_');
}

function getCountryFlag(country) {
    const c = String(country || '').toUpperCase();
    if (c === 'JAPAN') return 'images/jp-flag.png';
    if (c === 'CAMBODIA') return 'images/kh-flag.png';
    return '';
}

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function getRawUnit(variant) {
    return String(variant.price_unit || variant.order_type || '').trim().toLowerCase();
}

function getUnitLabel(variant) {
    const raw = getRawUnit(variant);
    if (raw === 'kg') return 'kg';
    if (raw === 'pic') return 'pic';
    if (raw === 'pc') return 'pc';
    if (raw === 'case') return 'case';
    if (raw === 'bottle') return 'bottle';
    return raw || 'unit';
}

function isWeightVariant(variant) {
    return getRawUnit(variant) === 'kg';
}

function getCalcLabel(product) {
    const t = UI_TEXT[currentLang];
    const variants = product.variants || [];
    const hasWeight = variants.some(v => isWeightVariant(v));
    return hasWeight ? t.weightCalc : t.qtyCalc;
}

function getCalcClass(product) {
    const variants = product.variants || [];
    const hasWeight = variants.some(v => isWeightVariant(v));
    return hasWeight ? 'weight' : 'qty';
}

// ═══════════════════════════════════════════════════════════
// LANGUAGE SWITCH
// ═══════════════════════════════════════════════════════════
function setLang(lang) {
    currentLang = lang;
    const t = UI_TEXT[lang];

    document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('lang-' + lang)?.classList.add('active');

    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.placeholder = t.searchPlaceholder;

    const noticeTitle = document.getElementById('notice-summary-text');
    if (noticeTitle) noticeTitle.textContent = t.noticeTitle;

    const noticeBody = document.getElementById('notice-body-content');
    if (noticeBody) noticeBody.innerHTML = t.noticeBody;

    const orderBarLabel = document.getElementById('order-bar-label');
    if (orderBarLabel) orderBarLabel.textContent = t.orderBarLabel;

    const orderBtn = document.getElementById('order-btn-text');
    if (orderBtn) orderBtn.textContent = t.orderBtn;

    const orderNote = document.getElementById('order-bar-note');
    if (orderNote) orderNote.textContent = t.orderNote;

    const clearBtn = document.getElementById('order-clear-btn');
    if (clearBtn) clearBtn.textContent = t.clearBtn;

    const recommendTitle = document.getElementById('recommend-title');
    if (recommendTitle) recommendTitle.textContent = t.recommendTitle;

    const inquiryBtn = document.getElementById('inquiry-floating-btn');
    if (inquiryBtn) inquiryBtn.textContent = t.floatingInquiry;

    applyFilters();
    renderCart();
}

// ═══════════════════════════════════════════════════════════
// FETCH DATA
// GAS側:
// {
//   updateDate: "2026/03/19",
//   products: [
//     {
//       product_id, category_id, country, code, name_jp, name_en,
//       size, comment_jp, comment_en, image_main, sort_order,
//       recommend_today,
//       variants: [
//         {
//           variant_id, product_id, variant_name_jp, variant_name_en,
//           price_usd, stock, image_variant, sort_order,
//           order_type, price_unit
//         }
//       ]
//     }
//   ]
// }
// ═══════════════════════════════════════════════════════════
async function fetchProducts() {
    try {
        const res = await fetch(GAS_URL);
        const data = await res.json();

        if (data.updateDate) {
            const updateDateEl = document.getElementById('update-date');
            if (updateDateEl) updateDateEl.textContent = 'UPDATE: ' + data.updateDate;
        }

        const rawProducts = Array.isArray(data.products) ? data.products : [];

        allProducts = rawProducts
            .map(product => {
                const variants = Array.isArray(product.variants) ? product.variants : [];

                const visibleVariants = variants
                    .filter(v => toNumber(v.stock, 0) > 0)
                    .sort((a, b) => toNumber(a.sort_order, 9999) - toNumber(b.sort_order, 9999));

                return {
                    ...product,
                    variants: visibleVariants
                };
            })
            .filter(product => {
                const hasName = (product.name_jp || product.name_en || '').trim() !== '';
                return hasName && product.variants.length > 0;
            })
            .sort((a, b) => toNumber(a.sort_order, 9999) - toNumber(b.sort_order, 9999));

        applyFilters();
    } catch (e) {
        document.getElementById('product-container').innerHTML = `
            <p style="text-align:center;padding:40px;color:#999;">
                ⚠️ Failed to load products.<br><small>${esc(e.message)}</small>
            </p>`;
    }
}

// ═══════════════════════════════════════════════════════════
// FILTERS
// ═══════════════════════════════════════════════════════════
function filterCategory(cat, btn) {
    currentCategory = cat;

    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
    applyFilters();
}

function applyFilters() {
    const searchTerm = (document.getElementById('search-input')?.value || '').toLowerCase().trim();

    const filtered = allProducts.filter(product => {
        const category = getCategoryValue(product);
        const matchesCat = currentCategory === 'ALL' || category === currentCategory;

        const name = getProductName(product).toLowerCase();
        const comment = getProductComment(product).toLowerCase();
        const code = String(product.code || '').toLowerCase();

        const matchesSearch = !searchTerm ||
            name.includes(searchTerm) ||
            comment.includes(searchTerm) ||
            code.includes(searchTerm);

        return matchesCat && matchesSearch;
    });

    displayProducts(filtered);
}

// ═══════════════════════════════════════════════════════════
// DISPLAY
// ═══════════════════════════════════════════════════════════
function displayProducts(products) {
    const t = UI_TEXT[currentLang];
    const productContainer = document.getElementById('product-container');
    const recommendContainer = document.getElementById('recommend-container');
    const recommendSection = document.getElementById('recommend-section');

    if (!productContainer) return;

    const recommendProducts = products.filter(p => toNumber(p.recommend_today, 0) === 1);
    const normalProducts = products.filter(p => toNumber(p.recommend_today, 0) !== 1);

    if (recommendContainer) {
        recommendContainer.innerHTML = recommendProducts.map(buildCard).join('');
    }

    if (recommendSection) {
        if (recommendProducts.length > 0) {
            recommendSection.classList.remove('hidden');
        } else {
            recommendSection.classList.add('hidden');
        }
    }

    if (normalProducts.length === 0 && recommendProducts.length === 0) {
        productContainer.innerHTML = `<p style="text-align:center;padding:30px;color:#999;">${t.noProducts}</p>`;
        return;
    }

    productContainer.innerHTML = normalProducts.map(buildCard).join('');
}

function buildCard(product) {
    const t = UI_TEXT[currentLang];
    const productId = esc(product.product_id);
    const category = getCategoryValue(product);
    const categoryClass = normalizeCategoryClass(category);
    const productName = esc(getProductName(product));
    const comment = esc(getProductComment(product)).replace(/\n/g, '<br>');
    const code = esc(product.code || '');
    const size = esc(product.size || '');
    const imageMain = (product.image_main || '').trim();
    const countryFlag = getCountryFlag(product.country);
    const flagHtml = countryFlag ? `<img class="country-flag" src="${countryFlag}" alt="${esc(product.country || '')}">` : '';

    const totalStock = (product.variants || []).reduce((sum, v) => sum + toNumber(v.stock, 0), 0);

    const imgHTML = imageMain
        ? `<img id="product-image-${productId}" src="${esc(imageMain)}" alt="${productName}" onclick="openModal(document.getElementById('product-image-${productId}').src)">`
        : `<div class="img-placeholder">🐟</div>`;

    const categoryTag = `
        <span class="category-tag ${categoryClass}">
            ${esc(category)}
            ${flagHtml}
        </span>`;

    const stockBadge = totalStock > 0
        ? `<span class="stock-badge">${t.stock}: ${esc(String(totalStock))} pic</span>`
        : '';

    const recommendBadge = toNumber(product.recommend_today, 0) === 1
        ? `<span class="recommend-badge">RECOMMEND</span>`
        : '';

    const commentHTML = comment ? `<div class="comment-box">${comment}</div>` : '';
    const sizeAndCalcHTML = size
    ? `
        <div class="size-calc-row">
            <p class="size-detail">${t.size}: ${size}</p>
            <span class="calc-mini ${getCalcClass(product)}">${getCalcLabel(product)}</span>
        </div>
      `
    : `
        <div class="size-calc-row">
            <span class="calc-mini ${getCalcClass(product)}">${getCalcLabel(product)}</span>
        </div>
      `;

    const variantGuide = product.size
        ? `<div class="variant-note">${esc(product.size)}</div>`
        : `<div class="variant-note">${t.variantGuideDefault}</div>`;

    const variantsHTML = (product.variants || []).map(variant => {
        const variantId = esc(variant.variant_id);
        const variantName = esc(getVariantName(variant));
        const price = toNumber(variant.price_usd, 0).toFixed(2);
        const qty = cart[variant.variant_id]?.qty || 0;
        const variantImage = (variant.image_variant || '').trim();
        const unitLabel = esc(getUnitLabel(variant));

        return `
            <div class="variant-row">
                <button
                    class="variant-select-btn"
                    type="button"
                    onclick="selectVariantImage('${productId}', '${esc(variantImage)}', '${esc(imageMain)}', this)"
                >
                    ${variantName} / $${price}/${unitLabel}
                </button>

                <div class="variant-qty-wrap">
                    <button class="qty-btn" type="button" onclick="changeCartQty('${variantId}', -1)">−</button>
                    <span class="variant-qty">${qty}</span>
                    <button class="qty-btn" type="button" onclick="changeCartQty('${variantId}', 1)">＋</button>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="card" data-category="${esc(category)}">
            <div class="img-wrapper">
                ${imgHTML}
                ${recommendBadge}
                ${categoryTag}
                ${stockBadge}
            </div>

            <div class="info">
                ${code ? `<span class="code">Code: ${code}</span>` : ''}
                <h3>${productName}</h3>
${sizeAndCalcHTML}
                ${commentHTML}
                ${variantGuide}
                <div class="variant-list">
                    ${variantsHTML}
                </div>
            </div>
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════
// IMAGE SWITCH
// ═══════════════════════════════════════════════════════════
function selectVariantImage(productId, variantImage, fallbackImage, btnEl) {
    const img = document.getElementById(`product-image-${productId}`);
    if (img) {
        img.src = variantImage || fallbackImage || '';
    }

    if (btnEl) {
        const wrap = btnEl.closest('.variant-list');
        if (wrap) {
            wrap.querySelectorAll('.variant-select-btn').forEach(btn => btn.classList.remove('active'));
        }
        btnEl.classList.add('active');
    }
}

// ═══════════════════════════════════════════════════════════
// CART
// ═══════════════════════════════════════════════════════════
function findVariantById(variantId) {
    for (const product of allProducts) {
        const variant = (product.variants || []).find(v => String(v.variant_id) === String(variantId));
        if (variant) return { product, variant };
    }
    return null;
}

function changeCartQty(variantId, delta) {
    const found = findVariantById(variantId);
    if (!found) return;

    const { product, variant } = found;

    if (!cart[variantId] && delta > 0) {
        cart[variantId] = {
            variant_id: variant.variant_id,
            product_id: product.product_id,
            product_name_jp: product.name_jp || '',
            product_name_en: product.name_en || '',
            variant_name_jp: variant.variant_name_jp || '',
            variant_name_en: variant.variant_name_en || '',
            price_usd: toNumber(variant.price_usd, 0),
            price_unit_label: getUnitLabel(variant),
            qty: 0
        };
    }

    if (!cart[variantId]) return;

    cart[variantId].qty += delta;

    if (cart[variantId].qty <= 0) {
        delete cart[variantId];
    }

    applyFilters();
    renderCart();
}

function clearCart() {
    cart = {};
    applyFilters();
    renderCart();
}

function renderCart() {
    const t = UI_TEXT[currentLang];
    const items = Object.values(cart);

    const cartItemsEl = document.getElementById('cart-items');
    const totalBar = document.getElementById('total-bar');

    if (!cartItemsEl || !totalBar) return;

    if (items.length === 0) {
        cartItemsEl.innerHTML = `<p class="cart-empty">${t.emptyCart}</p>`;
        totalBar.classList.remove('show');
        return;
    }

    cartItemsEl.innerHTML = items.map(item => {
        const productName = currentLang === 'jp'
            ? (item.product_name_jp || item.product_name_en)
            : (item.product_name_en || item.product_name_jp);

        const variantName = currentLang === 'jp'
            ? (item.variant_name_jp || item.variant_name_en)
            : (item.variant_name_en || item.variant_name_jp);

        return `
            <div class="cart-item">
                <div class="cart-item-info">
                    <strong>${esc(productName)}</strong>
                    <span>${esc(variantName)} ${item.price_usd}$/${esc(item.price_unit_label)} × ${item.qty}</span>
                </div>
                <div class="cart-item-actions">
                    <button class="qty-btn" type="button" onclick="changeCartQty('${esc(item.variant_id)}', -1)">−</button>
                    <button class="qty-btn" type="button" onclick="changeCartQty('${esc(item.variant_id)}', 1)">＋</button>
                </div>
            </div>
        `;
    }).join('');

    totalBar.classList.add('show');
}

// ═══════════════════════════════════════════════════════════
// TELEGRAM ORDER
// ═══════════════════════════════════════════════════════════
async function sendOrderTelegram() {
    const t = UI_TEXT[currentLang];
    const items = Object.values(cart);

    if (items.length === 0) {
        alert(t.selectItems);
        return;
    }

    let totalQty = 0;
    let message = '【New Order / 注文依頼】\n';

    items.forEach(item => {
        const productName = item.product_name_jp && item.product_name_en && item.product_name_jp !== item.product_name_en
            ? `${item.product_name_jp} / ${item.product_name_en}`
            : item.product_name_jp || item.product_name_en;

        const variantName = item.variant_name_jp && item.variant_name_en && item.variant_name_jp !== item.variant_name_en
            ? `${item.variant_name_jp} / ${item.variant_name_en}`
            : item.variant_name_jp || item.variant_name_en;

        totalQty += item.qty;

        message += `- ${productName} / ${variantName} ${item.price_usd}$/${item.price_unit_label} × ${item.qty}\n`;
    });

    message += `\n---\nTotal Items: ${totalQty}\n`;
    message += '\n※ Final quantity/weight confirmed upon delivery.';

    try {
        const res = await fetch(TELEGRAM_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chatId: '771075691',
                product: message,
                quantity: totalQty,
                name: '注文ユーザー'
            })
        });

        if (!res.ok) {
            throw new Error('Failed to send order');
        }

        alert(t.orderSent);
        clearCart();
    } catch (error) {
        console.error(error);
        alert(t.orderFailed);
    }
}


// ═══════════════════════════════════════════════════════════
// IMAGE MODAL
// ═══════════════════════════════════════════════════════════
function openModal(src) {
    if (!src || String(src).includes('undefined') || String(src).trim() === '') return;
    document.getElementById('modal-img').src = src;
    document.getElementById('image-modal').style.display = 'block';
}

function closeModal() {
    document.getElementById('image-modal').style.display = 'none';
}

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════
async function init() {
    document.getElementById('lang-' + currentLang)?.classList.add('active');
    await fetchProducts();
    setLang(currentLang);
    renderCart();
}

document.addEventListener('DOMContentLoaded', init);
