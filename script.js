let allProducts = [];
let currentCategory = 'ALL';

// CSVの読み込み
Papa.parse("products.csv", {
    download: true,
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: function(h) { return h.trim(); },
    complete: function(results) {
        allProducts = results.data;
        displayProducts(allProducts);
    }
});

// カテゴリー選択
function filterCategory(cat, btn) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = cat;
    
    // カテゴリー選択時にページの一番上に戻す
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    applyFilters();
}

// 検索とフィルターの実行
function applyFilters() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    
    const filtered = allProducts.filter(p => {
        const matchesCategory = (currentCategory === 'ALL' || p.category === currentCategory);
        const matchesSearch = (p.name && p.name.toLowerCase().includes(searchTerm));
        return matchesCategory && matchesSearch;
    });

    displayProducts(filtered);
}

// 商品一覧の表示
function displayProducts(products) {
    const container = document.getElementById('product-container');
    container.innerHTML = '';
    
    // 有効なデータのみに絞り込む（空白対策）
    const validProducts = products.filter(p => p.name && p.name.trim() !== "" && p.code);

    if (validProducts.length === 0) {
        container.innerHTML = '<p style="text-align:center; padding: 20px;">No products found / 該当商品なし</p>';
        return;
    }

    validProducts.forEach((p) => {
        let safeName = p.name.replace(/</g, "<").replace(/>/g, ">");
        
        // コメントのフォーマット
        let rawComment = p.comment || '';
        let formattedComment = rawComment.replace(/。/g, '。<br><span class="en-comment">') + '</span>';

        // 日本フラグ判定 (JAPAN_FROZENも追加)
        // displayProducts 関数内
const cat = (p.category || "").toUpperCase(); // 全て大文字に変換して比較
const isJapanese = (cat === 'JAPAN_FARMED' || cat === 'JAPAN_FROZEN' || cat === 'SAKE' || cat === 'SEASONING');
        const displayUnit = (p.unit || 'pic').replace('pc', 'pic');

        let unitOptions = '';
        if (p.is_fixed === "0") {
            if(parseFloat(p.w_pc) > 0) unitOptions += `<option value="${p.w_pc}">1 pic (${p.w_pc}kg)</option>`;
            if(parseFloat(p.w_fillet) > 0) unitOptions += `<option value="${p.w_fillet}">1 fillet:pack (${p.w_fillet}kg)</option>`;
            if(parseFloat(p.w_back) > 0) unitOptions += `<option value="${p.w_back}">Back side (${p.w_back}kg)</option>`;
            if(parseFloat(p.w_stomach) > 0) unitOptions += `<option value="${p.w_stomach}">Stomach side (${p.w_stomach}kg)</option>`;
        } else {
            unitOptions = `<option value="1">1 ${displayUnit}</option>`;
        }

        const card = `
            <div class="card">
                <div class="img-wrapper">
                    <img src="${p.image ? p.image.trim() : ''}" alt="${safeName}" onclick="openModal(this.src)" style="cursor: pointer;">
                    <span class="category-tag ${p.category}">
                        <img src="images/${isJapanese ? 'jp-flag.png' : 'kh-flag.png'}" 
                             style="width: 20px; border: 1px solid #ddd; margin-right: 6px; vertical-align: middle;">
                        ${p.category ? p.category.replace(/_/g, ' ') : ''}
                    </span>
                </div>
                <div class="info">
                    <span class="code">Code: ${p.code}</span>
                    <h3>${safeName}</h3>
                    <div class="comment-box">${formattedComment}</div>
                    <div class="price-size-area">
                        <p class="price" style="text-decoration: none !important;">$${Number(p.price).toLocaleString()} <span class="unit-text">/ ${displayUnit}</span></p>
                        ${(p.size && p.size.trim() !== '' && p.size.toLowerCase() !== 'size') ? `<p class="size-detail">Size: ${p.size}</p>` : ''}
                        <div class="calc-container">
                            <div class="calc-row">
                                <select class="unit-select" onchange="updateTotal()">
                                    ${unitOptions}
                                </select>
                                <span class="times">×</span>
                                <input type="number" class="qty-input" min="0" value="0" 
                                       data-price="${p.price}" 
                                       onchange="updateTotal()" oninput="updateTotal()">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}

// 合計金額の計算
function updateTotal() {
    let total = 0;
    document.querySelectorAll('.card').forEach(card => {
        const select = card.querySelector('.unit-select');
        const input = card.querySelector('.qty-input');
        if (select && input) {
            const weight = parseFloat(select.value) || 0;
            const price = parseFloat(input.getAttribute('data-price')) || 0;
            const qty = parseFloat(input.value) || 0;
            total += price * weight * qty;
        }
    });
    document.getElementById('total-amount').innerText = total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
    const bar = document.getElementById('total-bar');
    total > 0 ? bar.classList.add('show') : bar.classList.remove('show');
}

// Telegramへ注文送信
function sendOrderTelegram() {
    let message = "【New Order / 注文依頼】\n";
    let hasOrder = false;
    document.querySelectorAll('.card').forEach(card => {
        const qtyInput = card.querySelector('.qty-input');
        const qty = parseInt(qtyInput.value) || 0;
        if (qty > 0) {
            hasOrder = true;
            const name = card.querySelector('h3').innerText;
            const select = card.querySelector('.unit-select');
            const unitText = select.options[select.selectedIndex].text;
            message += `- ${name} / ${unitText} × ${qty}\n`;
        }
    });

    if (!hasOrder) { alert("Please select items! / 商品を選択してください。"); return; }
    message += `\nEstimated Total: $${document.getElementById('total-amount').innerText}\n\nPlease confirm availability.`;
    window.open(`https://t.me/SAKANAYAJAPON_SUPPORT?text=${encodeURIComponent(message)}`, '_blank');
}

// 画像拡大モーダル
function openModal(src) {
    if(!src || src.includes('undefined')) return;
    const modal = document.getElementById("image-modal");
    const modalImg = document.getElementById("modal-img");
    modal.style.display = "block";
    modalImg.src = src;
}

function closeModal() {
    document.getElementById("image-modal").style.display = "none";
}
