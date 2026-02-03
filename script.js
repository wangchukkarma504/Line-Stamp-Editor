const i18n = {
    en: { grid_settings: "Grid Settings", cols: "Cols", rows: "Rows", cleanup_logic: "Background Removal", smart_removal: "Auto-Remove BG", tolerance: "Sensitivity", softness: "Smooth Edges", visual_tweaks: "Spacing", inner_padding: "Inner Padding", bulk_export: "Export Logic", opt_single: "Single Pack (Combined)", opt_folders: "Separate Folders", btn_dl_zip: "Download All ZIP", pane_editor: "CROP EDITOR", pane_preview: "LIVE PREVIEW", up_title: "Upload Sticker Sheets", btn_add: "+ Add", btn_del: "Remove", btn_back: "Back", btn_dl_png: "Save PNG", main_icon: "MAIN", tab_icon: "TAB", sticker: "S", pin_title: "Icon Assignment", btn_cancel: "Cancel", nav_settings: "Settings", nav_editor: "Editor", nav_preview: "Preview" },
    ja: { grid_settings: "グリッド設定", cols: "列数", rows: "行数", cleanup_logic: "背景削除設定", smart_removal: "自動背景削除", tolerance: "許容度", softness: "境界の滑らかさ", visual_tweaks: "余白調整", inner_padding: "内部余白", bulk_export: "書き出し形式", opt_single: "1つのZIPにまとめる", opt_folders: "フォルダを分ける", btn_dl_zip: "ZIPで一括保存", pane_editor: "クロップ編集", pane_preview: "プレビュー", up_title: "シートをアップロード", btn_add: "+ 追加", btn_del: "削除", btn_back: "戻る", btn_dl_png: "PNG保存", main_icon: "メイン", tab_icon: "タブ", sticker: "No.", pin_title: "アイコンに設定", btn_cancel: "キャンセル", nav_settings: "設定", nav_editor: "編集", nav_preview: "プレビュー" }
};

let currentLang = 'en';
let state = { images: [], currentIndex: 0, isDragging: false, isResizing: false, mx: 0, my: 0, globalMain: null, globalTab: null, pinTarget: null, manualCropMode: false, manualCropSegment: null, manualCropPoints: [], manualCropDrawing: false };

function initMobileNav() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            document.body.className = `${document.body.classList.contains('lang-jp') ? 'lang-jp' : ''} mobile-tab-${item.dataset.tab}`;
            navItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            requestAnimationFrame(() => { updateSelectorUI(); render(); });
        });
    });
}

function initResizers() {
    const setup = (gutterId, prevPanelId, nextPanelId, type) => {
        const gutter = document.getElementById(gutterId);
        const prevPanel = document.getElementById(prevPanelId);
        const nextPanel = document.getElementById(nextPanelId);
        if(!gutter) return;
        gutter.addEventListener('mousedown', (e) => {
            if (window.innerWidth <= 1024) return;
            e.preventDefault();
            const startX = e.clientX;
            const startWPrev = prevPanel.offsetWidth;
            const startWNext = nextPanel.offsetWidth;
            const onMove = (m) => {
                const delta = m.clientX - startX;
                if (type === 'sidebar') prevPanel.style.width = (startWPrev + delta) + 'px';
                else nextPanel.style.width = (startWNext - delta) + 'px';
                updateSelectorUI();
            };
            const onUp = () => { document.removeEventListener('mousemove', onMove); render(); };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        });
    };
    setup('gutter1', 'sidebarPanel', 'editorPanel', 'sidebar');
    setup('gutter2', 'editorPanel', 'previewPanel', 'preview');
}

const getIcon = (name) => {
    const icons = {
        view: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
        download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
        pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
        edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`
    };
    return icons[name];
};

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'ja' : 'en';
    document.body.classList.toggle('lang-jp', currentLang === 'ja');
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18n[currentLang][key]) el.textContent = i18n[currentLang][key];
    });
    render();
}

document.getElementById('langToggle').onclick = toggleLanguage;
const fileInput = document.getElementById('fileInput');
const uploadZone = document.getElementById('uploadZone');
const sourceImg = document.getElementById('sourceImg');
const selector = document.getElementById('selector');
const tilesGrid = document.getElementById('tilesGrid');

uploadZone.onclick = () => fileInput.click();
document.getElementById('addMoreBtn').onclick = () => fileInput.click();
fileInput.onchange = (e) => { if (e.target.files.length) handleFiles(e.target.files); };

async function handleFiles(files) {
    for (const file of files) {
        const img = await loadImage(file);
        state.images.push({
            img, name: file.name, x: 0, y: 0, w: 0, h: 0, 
            cols: 4, rows: 4, padding: 0, tolerance: 25, softness: 2, bgActive: true,
            offCanvas: createOffCanvas(img),
            customBounds: {} // stores custom boundaries for each segment: {segmentIndex: [points]}
        });
    }
    initCurrentPage();
}

function loadImage(file) {
    return new Promise(r => {
        const reader = new FileReader();
        reader.onload = e => { const img = new Image(); img.onload = () => r(img); img.src = e.target.result; };
        reader.readAsDataURL(file);
    });
}

function createOffCanvas(img) {
    const can = document.createElement('canvas');
    can.width = img.naturalWidth; can.height = img.naturalHeight;
    can.getContext('2d', {willReadFrequently: true}).drawImage(img, 0, 0);
    return can;
}

function initCurrentPage() {
    if (!state.images.length) { uploadZone.classList.remove('hidden'); document.getElementById('editorWrap').classList.add('hidden'); document.getElementById('paginationBar').classList.add('hidden'); return; }
    const curr = state.images[state.currentIndex];
    uploadZone.classList.add('hidden');
    document.getElementById('editorWrap').classList.remove('hidden');
    document.getElementById('paginationBar').classList.remove('hidden');
    sourceImg.src = curr.img.src;
    ['cols', 'rows', 'padding', 'tolerance', 'softness'].forEach(id => {
        const input = document.getElementById(id);
        input.value = curr[id];
        const badge = document.getElementById(id+'Val');
        if(badge) badge.textContent = (id==='padding'?curr[id]+'%':curr[id]);
    });
    document.getElementById('bgActive').checked = curr.bgActive;
    sourceImg.onload = () => {
        if(curr.w === 0) {
            curr.w = sourceImg.clientWidth;
            curr.h = sourceImg.clientHeight;
            curr.x = 0;
            curr.y = 0;
        }
        // Remove selector boundary after upload
        selector.style.display = 'none';
        document.getElementById('pageCounter').textContent = `${state.currentIndex + 1} / ${state.images.length}`;
        render();
    };
}

const handleStart = (e) => {
    const pos = e.touches ? e.touches[0] : e;
    if(e.target.id !== 'resizer') { state.isDragging = true; state.mx = pos.clientX - parseFloat(selector.style.left || 0); state.my = pos.clientY - parseFloat(selector.style.top || 0); }
    else { state.isResizing = true; state.mx = pos.clientX; state.my = pos.clientY; state.mw = parseFloat(selector.style.width); state.mh = parseFloat(selector.style.height); }
};
selector.addEventListener('mousedown', handleStart);
selector.addEventListener('touchstart', handleStart);

const handleMove = (e) => {
    const curr = state.images[state.currentIndex];
    if(!curr || (!state.isDragging && !state.isResizing)) return;
    const pos = e.touches ? e.touches[0] : e;
    if(state.isDragging) { curr.x = Math.max(0, Math.min(pos.clientX - state.mx, sourceImg.clientWidth - curr.w)); curr.y = Math.max(0, Math.min(pos.clientY - state.my, sourceImg.clientHeight - curr.h)); }
    else if(state.isResizing) { curr.w = Math.max(40, Math.min(state.mw + (pos.clientX - state.mx), sourceImg.clientWidth - curr.x)); curr.h = Math.max(40, Math.min(state.mh + (pos.clientY - state.my), sourceImg.clientHeight - curr.y)); }
    updateSelectorUI(); render(); if (e.cancelable) e.preventDefault();
};
window.addEventListener('mousemove', handleMove);
window.addEventListener('touchmove', handleMove, {passive:false});
window.addEventListener('mouseup', () => { state.isDragging = false; state.isResizing = false; });
window.addEventListener('touchend', () => { state.isDragging = false; state.isResizing = false; });

function updateSelectorUI() {
    const curr = state.images[state.currentIndex];
    if(!curr || !sourceImg.complete || sourceImg.clientWidth === 0) return;
    selector.style.left = curr.x + 'px'; selector.style.top = curr.y + 'px';
    selector.style.width = curr.w + 'px'; selector.style.height = curr.h + 'px';
    document.getElementById('imgRes').textContent = `${Math.floor(curr.img.naturalWidth)}x${Math.floor(curr.img.naturalHeight)}`;
}

['cols', 'rows', 'padding', 'tolerance', 'softness', 'bgActive'].forEach(id => {
    document.getElementById(id).addEventListener('input', (e) => {
        const curr = state.images[state.currentIndex]; if(!curr) return;
        const val = (id==='bgActive')?e.target.checked:parseInt(e.target.value);
        curr[id] = val;
        if(document.getElementById(id+'Val')) document.getElementById(id+'Val').textContent = (id==='padding'?val+'%':val);
        render();
    });
});

function createDrawing(img, offCanvas, targetW, targetH, sData, tx, ty, sheetRef) {
    const canW = Math.floor(targetW) || 1;
    const canH = Math.floor(targetH) || 1;
    const can = document.createElement('canvas'); 
    can.width = canW; 
    can.height = canH;
    const ctx = can.getContext('2d');
    const scale = Math.min(targetW / sData.sw, targetH / sData.sh);
    const dw = sData.sw * scale, dh = sData.sh * scale;
    const offsetX = (targetW - dw) / 2;
    const offsetY = (targetH - dh) / 2;
    
    // Apply custom mask if available
    if (sData.customMask) {
        ctx.save();
        ctx.beginPath();
        const points = sData.customMask.map(pt => ({
            x: (pt.x - sData.sx) * scale + offsetX,
            y: (pt.y - sData.sy) * scale + offsetY
        }));
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.clip();
    }
    
    ctx.drawImage(img, sData.sx, sData.sy, sData.sw, sData.sh, offsetX, offsetY, dw, dh);
    
    if (sData.customMask) {
        ctx.restore();
    }
    
    if(sheetRef && sheetRef.bgActive && offCanvas && offCanvas.width > 0 && offCanvas.height > 0) {
        const imgData = ctx.getImageData(0, 0, canW, canH);
        const d = imgData.data;
        const offW = Math.floor(offCanvas.width);
        const offH = Math.floor(offCanvas.height);
        const sx = Math.floor(Math.max(0, Math.min(tx || 0, offW - 1))) | 0;
        const sy = Math.floor(Math.max(0, Math.min(ty || 0, offH - 1))) | 0;
        const sample = offCanvas.getContext('2d').getImageData(sx, sy, 1, 1).data;
        const avgBG = [sample[0], sample[1], sample[2]];
        const tol = sheetRef.tolerance, soft = sheetRef.softness;
        const mask = new Uint8Array(can.width * can.height);
        const stack = [];
        const getDist = (i) => {
            const rMean = (d[i] + avgBG[0]) / 2;
            const dr = d[i] - avgBG[0], dg = d[i+1] - avgBG[1], db = d[i+2] - avgBG[2];
            return Math.sqrt((2 + rMean/256)*dr*dr + 4*dg*dg + (2 + (255-rMean)/256)*db*db);
        };
        for (let i = 0; i < d.length; i += 4) {
            const idx = i/4, x = idx % can.width, y = Math.floor(idx/can.width);
            if ((x===0||x===can.width-1||y===0||y===can.height-1) && getDist(i) <= tol + soft) { mask[idx]=1; stack.push(x,y); }
        }
        while(stack.length) {
            const py=stack.pop(), px=stack.pop();
            [[px-1,py],[px+1,py],[px,py-1],[px,py+1]].forEach(([nx,ny]) => {
                const ni = ny*can.width+nx;
                if(nx>=0&&nx<can.width&&ny>=0&&ny<can.height && mask[ni]===0 && getDist(ni*4) <= tol+soft) { mask[ni]=1; stack.push(nx,ny); }
            });
        }
        for(let i=0; i<d.length; i+=4) if(mask[i/4]) {
            const dist = getDist(i);
            d[i+3] = dist <= tol ? 0 : Math.min(d[i+3], 255 * (dist-tol)/Math.max(1, soft));
        }
        ctx.putImageData(imgData, 0, 0);
    }
    return can;
}

function render() {
    const curr = state.images[state.currentIndex];
    if(!curr || !sourceImg.complete) return;
    
    // Use stored dimensions or natural dimensions when sourceImg is hidden (mobile view)
    const srcW = sourceImg.clientWidth || curr.w || curr.img.naturalWidth;
    const srcH = sourceImg.clientHeight || curr.h || curr.img.naturalHeight;
    if(srcW === 0 || srcH === 0) return;
    
    const rx = curr.img.naturalWidth / srcW, ry = curr.img.naturalHeight / srcH;
    const cw = (curr.w*rx)/curr.cols, ch = (curr.h*ry)/curr.rows, tx0 = curr.x*rx, ty0 = curr.y*ry, pad = curr.padding/100;
    
    tilesGrid.innerHTML = '';
    document.getElementById('stickerCount').textContent = (curr.cols * curr.rows) + " Stickers";

    for (let i = 0; i < curr.rows * curr.cols; i++) {
        const tx = tx0+(i%curr.cols)*cw, ty = ty0+Math.floor(i/curr.cols)*ch;
        const defaultData = { sx: tx+(cw*pad), sy: ty+(ch*pad), sw: cw-(cw*pad*2), sh: ch-(ch*pad*2) };
        const sData = getCustomSegmentData(curr, i, defaultData);
        const can = createDrawing(curr.img, curr.offCanvas, 370, 320, sData, tx, ty, curr);
        
        let label = `${i18n[currentLang].sticker}${i+1}`, badgeClass = "";
        if (state.globalMain?.sheet === state.currentIndex && state.globalMain?.index === i) { 
            label = i18n[currentLang].main_icon; 
            badgeClass = "is-main";
        }
        else if (state.globalTab?.sheet === state.currentIndex && state.globalTab?.index === i) { 
            label = i18n[currentLang].tab_icon; 
            badgeClass = "is-tab";
        }
        
        tilesGrid.appendChild(createGridItem(label, can, i, badgeClass, sData, tx, ty));
    }
}

function createGridItem(lbl, can, index, badgeClass, sData, tx, ty) {
    const div = document.createElement('div'); div.className = 'grid-item';
    const meta = document.createElement('div'); meta.className = 'item-meta';
    const badge = document.createElement('span'); 
    badge.className = badgeClass ? `sticker-badge ${badgeClass}` : 'sticker-badge'; 
    badge.textContent = lbl;
    const group = document.createElement('div'); group.className = 'icon-btn-group';
    
    const pin = document.createElement('button'); pin.className = 'mini-btn pin-btn'; pin.innerHTML = getIcon('pin');
    pin.onclick = () => { state.pinTarget = index; document.getElementById('pinModal').classList.remove('hidden'); };

    const edit = document.createElement('button'); edit.className = 'mini-btn edit-btn'; edit.innerHTML = getIcon('edit');
    edit.onclick = () => startManualCrop(index);

    const view = document.createElement('button'); view.className = 'mini-btn view-btn'; view.innerHTML = getIcon('view');
    view.onclick = () => {
        const curr = state.images[state.currentIndex];
        const bigCan = createDrawing(curr.img, curr.offCanvas, 370, 320, sData, tx, ty, curr);
        document.getElementById('bigCanvasContainer').innerHTML = ''; document.getElementById('bigCanvasContainer').append(bigCan);
        document.getElementById('bigViewDownload').onclick = () => { bigCan.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = "sticker.png"; a.click(); }); };
        document.getElementById('bigViewLayer').classList.remove('hidden');
    };
    
    group.append(pin, edit, view); meta.append(badge, group); div.append(meta, can); return div;
}

document.getElementById('setMainBtn').onclick = () => { 
    state.globalMain = {sheet: state.currentIndex, index: state.pinTarget}; 
    render(); 
    document.getElementById('pinModal').classList.add('hidden'); 
};
document.getElementById('setTabBtn').onclick = () => { 
    state.globalTab = {sheet: state.currentIndex, index: state.pinTarget}; 
    render(); 
    document.getElementById('pinModal').classList.add('hidden'); 
};
document.getElementById('cancelPinBtn').onclick = () => { document.getElementById('pinModal').classList.add('hidden'); };

document.getElementById('closeBigView').onclick = () => document.getElementById('bigViewLayer').classList.add('hidden');
document.getElementById('prevPage').onclick = () => { if(state.currentIndex > 0) { state.currentIndex--; initCurrentPage(); } };
document.getElementById('nextPage').onclick = () => { if(state.currentIndex < state.images.length - 1) { state.currentIndex++; initCurrentPage(); } };
document.getElementById('delPageBtn').onclick = () => { state.images.splice(state.currentIndex, 1); if (state.currentIndex >= state.images.length && state.currentIndex > 0) state.currentIndex--; initCurrentPage(); };

document.getElementById('dlBtn').onclick = async () => {
    const zip = new JSZip(); const isSingle = document.getElementById('exportMode').value === 'single_pack'; let globalCounter = 1;
    const processGlobal = async (target, name, size) => {
        const sheet = state.images[target.sheet];
        // Use natural dimensions to avoid issues when sourceImg is hidden
        const natW = sheet.img.naturalWidth, natH = sheet.img.naturalHeight;
        const cw = natW/sheet.cols, ch = natH/sheet.rows;
        const tx = (target.index%sheet.cols)*cw, ty = Math.floor(target.index/sheet.cols)*ch, pad = sheet.padding/100;
        const sData = { sx: tx+(cw*pad), sy: ty+(ch*pad), sw: cw-(cw*pad*2), sh: ch-(ch*pad*2) };
        zip.file(name, await new Promise(r => createDrawing(sheet.img, sheet.offCanvas, size[0], size[1], sData, tx, ty, sheet).toBlob(r)));
    };
    if (state.globalMain) await processGlobal(state.globalMain, "main.png", [240, 240]);
    if (state.globalTab) await processGlobal(state.globalTab, "tab.png", [96, 74]);
    for (let sIdx = 0; sIdx < state.images.length; sIdx++) {
        const item = state.images[sIdx]; const folder = isSingle ? zip : zip.folder(item.name.replace(/\.[^/.]+$/, ""));
        // Use natural dimensions to avoid issues when sourceImg is hidden
        const natW = item.img.naturalWidth, natH = item.img.naturalHeight;
        const cw = natW/item.cols, ch = natH/item.rows, pad = item.padding/100;
        for(let i=0; i<item.rows*item.cols; i++) {
            const tx = (i%item.cols)*cw, ty = Math.floor(i/item.cols)*ch;
            const sData = { sx: tx+(cw*pad), sy: ty+(ch*pad), sw: cw-(cw*pad*2), sh: ch-(ch*pad*2) };
            const filename = isSingle ? `${globalCounter.toString().padStart(2,'0')}.png` : `${(i+1).toString().padStart(2,'0')}.png`;
            folder.file(filename, await new Promise(r => createDrawing(item.img, item.offCanvas, 370, 320, sData, tx, ty, item).toBlob(r)));
            globalCounter++;
        }
    }
    zip.generateAsync({type:"blob"}).then(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = "sticker_pack.zip"; a.click(); });
};

// Manual Crop Functions
function startManualCrop(segmentIndex) {
    state.manualCropMode = true;
    state.manualCropSegment = segmentIndex;
    
    const curr = state.images[state.currentIndex];
    const natW = curr.img.naturalWidth;
    const natH = curr.img.naturalHeight;
    const cw = natW / curr.cols;
    const ch = natH / curr.rows;
    const col = segmentIndex % curr.cols;
    const row = Math.floor(segmentIndex / curr.cols);
    const pad = curr.padding / 100;
    
    // Default segment bounds
    const segX = col * cw + (cw * pad);
    const segY = row * ch + (ch * pad);
    const segW = cw - (cw * pad * 2);
    const segH = ch - (ch * pad * 2);
    
    // If custom bounds exist, use them, otherwise create rectangle from segment
    if (curr.customBounds[segmentIndex] && curr.customBounds[segmentIndex].length >= 4) {
        state.manualCropPoints = [...curr.customBounds[segmentIndex]];
    } else {
        // Create 4-corner rectangle as starting point
        state.manualCropPoints = [
            { x: segX, y: segY },
            { x: segX + segW, y: segY },
            { x: segX + segW, y: segY + segH },
            { x: segX, y: segY + segH }
        ];
    }
    
    showManualCropOverlay();
}

function showManualCropOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'manualCropOverlay';
    overlay.className = 'manual-crop-overlay';
    
    const curr = state.images[state.currentIndex];
    const segIdx = state.manualCropSegment;
    
    const canvas = document.createElement('canvas');
    canvas.width = curr.img.naturalWidth;
    canvas.height = curr.img.naturalHeight;
    canvas.className = 'manual-crop-canvas';
    canvas.id = 'cropCanvas';
    
    const ctx = canvas.getContext('2d');
    
    const controls = document.createElement('div');
    controls.className = 'manual-crop-controls';
    controls.innerHTML = `
        <button class="crop-tool-btn btn-crop-action" id="cropSaveBtn" title="Save">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
        <button class="crop-tool-btn btn-crop-add" id="cropAddPointBtn" title="Add Point">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <button class="crop-tool-btn btn-crop-reset" id="cropResetBtn" title="Reset">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
        </button>
        <button class="crop-tool-btn btn-crop-cancel" id="cropCancelBtn" title="Cancel">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
    `;
    
    overlay.appendChild(canvas);
    overlay.appendChild(controls);
    document.body.appendChild(overlay);
    
    let draggingPoint = -1;
    let addPointMode = false;
    const handleRadius = 12;
    
    function getCanvasCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }
    
    function findPointAt(x, y) {
        const rect = canvas.getBoundingClientRect();
        const scale = canvas.width / rect.width;
        const hitRadius = handleRadius * scale * 1.5;
        
        for (let i = 0; i < state.manualCropPoints.length; i++) {
            const pt = state.manualCropPoints[i];
            const dist = Math.sqrt((pt.x - x) ** 2 + (pt.y - y) ** 2);
            if (dist <= hitRadius) return i;
        }
        return -1;
    }
    
    function findEdgeAt(x, y) {
        const rect = canvas.getBoundingClientRect();
        const scale = canvas.width / rect.width;
        const hitDist = 15 * scale;
        
        for (let i = 0; i < state.manualCropPoints.length; i++) {
            const p1 = state.manualCropPoints[i];
            const p2 = state.manualCropPoints[(i + 1) % state.manualCropPoints.length];
            
            // Distance from point to line segment
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            if (len === 0) continue;
            
            const t = Math.max(0, Math.min(1, ((x - p1.x) * dx + (y - p1.y) * dy) / (len * len)));
            const projX = p1.x + t * dx;
            const projY = p1.y + t * dy;
            const dist = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);
            
            if (dist <= hitDist) return { edge: i, x: projX, y: projY };
        }
        return null;
    }
    
    function drawCrop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(curr.img, 0, 0);
        
        // Create dark overlay with transparent hole for the crop area
        ctx.save();
        
        // Draw darkened overlay on the entire canvas
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        // Outer rectangle (full canvas)
        ctx.moveTo(0, 0);
        ctx.lineTo(canvas.width, 0);
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.closePath();
        
        // Inner hole (crop area) - drawn counter-clockwise to create a hole
        ctx.moveTo(state.manualCropPoints[0].x, state.manualCropPoints[0].y);
        for (let i = state.manualCropPoints.length - 1; i >= 0; i--) {
            ctx.lineTo(state.manualCropPoints[i].x, state.manualCropPoints[i].y);
        }
        ctx.closePath();
        
        ctx.fill('evenodd');
        ctx.restore();
        
        // Draw border
        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.moveTo(state.manualCropPoints[0].x, state.manualCropPoints[0].y);
        for (let i = 1; i < state.manualCropPoints.length; i++) {
            ctx.lineTo(state.manualCropPoints[i].x, state.manualCropPoints[i].y);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Draw corner handles
        state.manualCropPoints.forEach((pt, idx) => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, handleRadius, 0, Math.PI * 2);
            ctx.fillStyle = draggingPoint === idx ? '#10b981' : '#ffffff';
            ctx.fill();
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            // Number label
            ctx.fillStyle = draggingPoint === idx ? '#fff' : '#10b981';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((idx + 1).toString(), pt.x, pt.y);
        });
        
        // Show add point mode indicator
        if (addPointMode) {
            ctx.fillStyle = 'rgba(139, 92, 246, 0.3)';
            ctx.fillRect(0, 0, canvas.width, 40);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Click on an edge to add a new point', canvas.width / 2, 22);
        }
    }
    
    canvas.onmousedown = (e) => {
        const { x, y } = getCanvasCoords(e);
        
        if (addPointMode) {
            const edge = findEdgeAt(x, y);
            if (edge) {
                // Insert new point on edge
                state.manualCropPoints.splice(edge.edge + 1, 0, { x: edge.x, y: edge.y });
                addPointMode = false;
                document.getElementById('cropAddPointBtn').classList.remove('active');
                drawCrop();
            }
            return;
        }
        
        const pointIdx = findPointAt(x, y);
        if (pointIdx >= 0) {
            draggingPoint = pointIdx;
            canvas.style.cursor = 'grabbing';
        }
    };
    
    canvas.onmousemove = (e) => {
        const { x, y } = getCanvasCoords(e);
        
        if (draggingPoint >= 0) {
            state.manualCropPoints[draggingPoint] = { x, y };
            drawCrop();
        } else {
            // Update cursor
            const overPoint = findPointAt(x, y);
            if (overPoint >= 0) {
                canvas.style.cursor = 'grab';
            } else if (addPointMode && findEdgeAt(x, y)) {
                canvas.style.cursor = 'crosshair';
            } else {
                canvas.style.cursor = addPointMode ? 'crosshair' : 'default';
            }
        }
    };
    
    canvas.onmouseup = () => {
        draggingPoint = -1;
        canvas.style.cursor = 'default';
    };
    
    canvas.onmouseleave = () => {
        draggingPoint = -1;
    };
    
    // Touch support
    canvas.ontouchstart = (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const { x, y } = getCanvasCoords(touch);
        const pointIdx = findPointAt(x, y);
        if (pointIdx >= 0) draggingPoint = pointIdx;
    };
    
    canvas.ontouchmove = (e) => {
        e.preventDefault();
        if (draggingPoint >= 0) {
            const touch = e.touches[0];
            const { x, y } = getCanvasCoords(touch);
            state.manualCropPoints[draggingPoint] = { x, y };
            drawCrop();
        }
    };
    
    canvas.ontouchend = () => { draggingPoint = -1; };
    
    document.getElementById('cropSaveBtn').onclick = () => {
        curr.customBounds[segIdx] = [...state.manualCropPoints];
        closeManualCrop();
        render();
    };
    
    document.getElementById('cropAddPointBtn').onclick = () => {
        addPointMode = !addPointMode;
        document.getElementById('cropAddPointBtn').classList.toggle('active', addPointMode);
        canvas.style.cursor = addPointMode ? 'crosshair' : 'default';
        drawCrop();
    };
    
    document.getElementById('cropResetBtn').onclick = () => {
        // Reset to original segment rectangle
        const natW = curr.img.naturalWidth;
        const natH = curr.img.naturalHeight;
        const cw = natW / curr.cols;
        const ch = natH / curr.rows;
        const col = segIdx % curr.cols;
        const row = Math.floor(segIdx / curr.cols);
        const pad = curr.padding / 100;
        const segX = col * cw + (cw * pad);
        const segY = row * ch + (ch * pad);
        const segW = cw - (cw * pad * 2);
        const segH = ch - (ch * pad * 2);
        
        state.manualCropPoints = [
            { x: segX, y: segY },
            { x: segX + segW, y: segY },
            { x: segX + segW, y: segY + segH },
            { x: segX, y: segY + segH }
        ];
        addPointMode = false;
        document.getElementById('cropAddPointBtn').classList.remove('active');
        drawCrop();
    };
    
    document.getElementById('cropCancelBtn').onclick = closeManualCrop;
    
    drawCrop();
}

function drawCropOverlay(ctx, img, closed = false, cursor = null) {
    // Legacy function - kept for compatibility
}

function closeManualCrop() {
    state.manualCropMode = false;
    state.manualCropSegment = null;
    state.manualCropPoints = [];
    state.manualCropDrawing = false;
    
    const overlay = document.getElementById('manualCropOverlay');
    if (overlay) overlay.remove();
}

function getCustomSegmentData(curr, segIdx, defaultData) {
    if (!curr.customBounds[segIdx] || curr.customBounds[segIdx].length < 3) {
        return defaultData;
    }
    
    const points = curr.customBounds[segIdx];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    points.forEach(pt => {
        minX = Math.min(minX, pt.x);
        minY = Math.min(minY, pt.y);
        maxX = Math.max(maxX, pt.x);
        maxY = Math.max(maxY, pt.y);
    });
    
    return {
        sx: minX,
        sy: minY,
        sw: maxX - minX,
        sh: maxY - minY,
        customMask: points
    };
}

initResizers(); initMobileNav();
window.onresize = () => { updateSelectorUI(); render(); };