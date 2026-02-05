document.addEventListener('DOMContentLoaded', () => {
    // --- Configuration & Constants ---
    const i18n = {
        en: { grid_settings: "Grid Settings", cols: "Cols", rows: "Rows", cleanup_logic: "Background Removal", smart_removal: "Auto-Remove BG", tolerance: "Sensitivity", softness: "Smooth Edges", visual_tweaks: "Spacing", inner_padding: "Inner Padding", bulk_export: "Export Logic", opt_single: "Single Pack (Combined)", opt_folders: "Separate Folders", btn_dl_zip: "Download All ZIP", pane_editor: "CROP EDITOR", pane_preview: "LIVE PREVIEW", up_title: "Upload Sticker Sheets", btn_add: "+ Add", btn_del: "Remove", btn_back: "Back", btn_dl_png: "Save PNG", main_icon: "MAIN", tab_icon: "TAB", sticker: "S", pin_title: "Icon Assignment", btn_cancel: "Cancel", nav_settings: "Settings", nav_editor: "Editor", nav_preview: "Preview", processing: "Processing..." },
        ja: { grid_settings: "グリッド設定", cols: "列数", rows: "行数", cleanup_logic: "背景削除設定", smart_removal: "自動背景削除", tolerance: "許容度", softness: "境界の滑らかさ", visual_tweaks: "余白調整", inner_padding: "内部余白", bulk_export: "書き出し形式", opt_single: "1つのZIPにまとめる", opt_folders: "フォルダを分ける", btn_dl_zip: "ZIPで一括保存", pane_editor: "クロップ編集", pane_preview: "プレビュー", up_title: "シートをアップロード", btn_add: "+ 追加", btn_del: "削除", btn_back: "戻る", btn_dl_png: "PNG保存", main_icon: "メイン", tab_icon: "タブ", sticker: "No.", pin_title: "アイコンに設定", btn_cancel: "キャンセル", nav_settings: "設定", nav_editor: "編集", nav_preview: "プレビュー", processing: "処理中..." }
    };

    // --- Inject Necessary CSS for Adjustable Grid (UPDATED TO GREEN) ---
    const style = document.createElement('style');
    style.innerHTML = `
        .selector { background: transparent !important; box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6); }
        /* Hit area remains transparent/wide for easy clicking */
        .grid-line-v { position: absolute; top: 0; bottom: 0; width: 6px; margin-left: -3px; cursor: col-resize; z-index: 40; pointer-events: auto; }
        /* Visual Thin Green Line */
        .grid-line-v::after { content: ''; position: absolute; left: 50%; top: 0; bottom: 0; width: 1px; background: #10b981; box-shadow: 0 0 2px rgba(0,0,0,0.5); }
        
        .grid-line-h { position: absolute; left: 0; right: 0; height: 6px; margin-top: -3px; cursor: row-resize; z-index: 40; pointer-events: auto; }
        /* Visual Thin Green Line */
        .grid-line-h::after { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: #10b981; box-shadow: 0 0 2px rgba(0,0,0,0.5); }
        
        /* Dots updated to Green border */
        .grid-dot { position: absolute; width: 10px; height: 10px; background: #fff; border: 1px solid #10b981; border-radius: 50%; transform: translate(-50%, -50%); z-index: 50; cursor: move; }
        
        .resize-handle { position: absolute; width: 12px; height: 12px; background: #10b981; border: 2px solid white; border-radius: 50%; z-index: 60; box-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .handle-nw { top: -6px; left: -6px; cursor: nw-resize; }
        .handle-n { top: -6px; left: 50%; transform: translateX(-50%); cursor: n-resize; }
        .handle-ne { top: -6px; right: -6px; cursor: ne-resize; }
        .handle-e { top: 50%; right: -6px; transform: translateY(-50%); cursor: e-resize; }
        .handle-se { bottom: -6px; right: -6px; cursor: se-resize; }
        .handle-s { bottom: -6px; left: 50%; transform: translateX(-50%); cursor: s-resize; }
        .handle-sw { bottom: -6px; left: -6px; cursor: sw-resize; }
        .handle-w { top: 50%; left: -6px; transform: translateY(-50%); cursor: w-resize; }
    `;
    document.head.appendChild(style);

    // --- State Management ---
    let currentLang = 'en';
    const state = {
        images: [],
        currentIndex: 0,
        isDragging: false,
        isResizing: false,
        pointerStart: { x: 0, y: 0 },
        initialDims: { x: 0, y: 0, w: 0, h: 0 },
        globalMain: null,
        globalTab: null,
        pinTarget: null,
        manualCropMode: false,
        manualCropSegment: null,
        manualCropPoints: []
    };

    // --- DOM Elements ---
    const elements = {
        fileInput: document.getElementById('fileInput'),
        uploadZone: document.getElementById('uploadZone'),
        sourceImg: document.getElementById('sourceImg'),
        selector: document.getElementById('selector'),
        tilesGrid: document.getElementById('tilesGrid'),
        editorWrap: document.getElementById('editorWrap'),
        paginationBar: document.getElementById('paginationBar'),
        pageCounter: document.getElementById('pageCounter'),
        pinModal: document.getElementById('pinModal'),
        bigViewLayer: document.getElementById('bigViewLayer'),
        inputs: ['cols', 'rows', 'padding', 'tolerance', 'softness', 'bgActive']
    };

    // --- Icons ---
    const getIcon = (name) => {
        const icons = {
            view: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
            download: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
            pin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
            edit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`
        };
        return icons[name] || '';
    };

    // --- Utils ---
    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    };

    const toggleLanguage = () => {
        currentLang = currentLang === 'en' ? 'ja' : 'en';
        document.body.classList.toggle('lang-jp', currentLang === 'ja');
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (i18n[currentLang][key]) el.textContent = i18n[currentLang][key];
        });
        render();
    };

    // Initialize Grid Percentages (Evenly spaced)
    function initGridState(imageObj) {
        imageObj.colPercents = [];
        for (let i = 1; i < imageObj.cols; i++) {
            imageObj.colPercents.push(i / imageObj.cols);
        }
        imageObj.rowPercents = [];
        for (let i = 1; i < imageObj.rows; i++) {
            imageObj.rowPercents.push(i / imageObj.rows);
        }
    }

    // --- Initialization ---
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
            if (!gutter) return;

            gutter.addEventListener('pointerdown', (e) => {
                if (window.innerWidth <= 1024) return;
                e.preventDefault();
                gutter.setPointerCapture(e.pointerId);
                const startX = e.clientX;
                const startWPrev = prevPanel.offsetWidth;
                const startWNext = nextPanel.offsetWidth;

                const onMove = (m) => {
                    const delta = m.clientX - startX;
                    if (type === 'sidebar') prevPanel.style.width = Math.max(200, startWPrev + delta) + 'px';
                    else nextPanel.style.width = Math.max(300, startWNext - delta) + 'px';
                    updateSelectorUI();
                };

                const onUp = () => {
                    gutter.removeEventListener('pointermove', onMove);
                    gutter.removeEventListener('pointerup', onUp);
                    render();
                };
                gutter.addEventListener('pointermove', onMove);
                gutter.addEventListener('pointerup', onUp);
            });
        };
        setup('gutter1', 'sidebarPanel', 'editorPanel', 'sidebar');
        setup('gutter2', 'editorPanel', 'previewPanel', 'preview');
    }

    // --- File Handling ---
    elements.uploadZone.onclick = () => elements.fileInput.click();
    document.getElementById('addMoreBtn').onclick = () => elements.fileInput.click();
    elements.fileInput.onchange = (e) => { if (e.target.files.length) handleFiles(e.target.files); };

    async function handleFiles(files) {
        for (const file of files) {
            try {
                const img = await loadImage(file);
                const newObj = {
                    img, name: file.name, x: 0, y: 0, w: 0, h: 0,
                    cols: 4, rows: 4, padding: 0, tolerance: 25, softness: 2, bgActive: true,
                    offCanvas: createOffCanvas(img),
                    customBounds: {},
                    colPercents: [],
                    rowPercents: []
                };
                initGridState(newObj);
                state.images.push(newObj);
            } catch (err) {
                console.error("Failed to load image", file.name, err);
            }
        }
        initCurrentPage();
    }

    function loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function createOffCanvas(img) {
        const can = document.createElement('canvas');
        can.width = img.naturalWidth; can.height = img.naturalHeight;
        can.getContext('2d', { willReadFrequently: true }).drawImage(img, 0, 0);
        return can;
    }

    // --- Page Logic ---
    function initCurrentPage() {
        if (!state.images.length) {
            elements.uploadZone.classList.remove('hidden');
            elements.editorWrap.classList.add('hidden');
            elements.paginationBar.classList.add('hidden');
            return;
        }
        const curr = state.images[state.currentIndex];
        
        elements.uploadZone.classList.add('hidden');
        elements.editorWrap.classList.remove('hidden');
        elements.paginationBar.classList.remove('hidden');
        
        elements.sourceImg.onload = () => {
            requestAnimationFrame(() => {
                if (curr.w === 0 || curr.w !== elements.sourceImg.clientWidth) {
                    curr.w = elements.sourceImg.clientWidth;
                    curr.h = elements.sourceImg.clientHeight;
                    curr.x = 0;
                    curr.y = 0;
                }
                updateSelectorUI(); 
                render();
            });
        };

        elements.sourceImg.src = curr.img.src;

        elements.inputs.forEach(id => {
            const input = document.getElementById(id);
            if (!input) return;
            if (id === 'bgActive') input.checked = curr.bgActive;
            else {
                input.value = curr[id];
                const badge = document.getElementById(id + 'Val');
                if (badge) badge.textContent = (id === 'padding' ? curr[id] + '%' : curr[id]);
            }
        });
        
        elements.pageCounter.textContent = `${state.currentIndex + 1} / ${state.images.length}`;
        if (elements.sourceImg.complete && elements.sourceImg.naturalWidth !== 0) elements.sourceImg.onload();
    }

    // --- Interaction Logic (Move, Resize Box, Resize Lines) ---
    let activeTool = null; // 'move', 'resize-box', 'resize-line'
    let activeHandle = null; // 'nw', 'n', etc.
    let activeLine = { type: null, index: -1 }; 

    const handleSelectorStart = (e) => {
        const curr = state.images[state.currentIndex];
        if (!curr) return;
        
        e.preventDefault();
        elements.selector.setPointerCapture(e.pointerId);
        state.pointerStart = { x: e.clientX, y: e.clientY };
        state.initialDims = { x: curr.x, y: curr.y, w: curr.w, h: curr.h };

        const target = e.target;

        // 1. Check if clicking an Internal Grid Line or Dot
        if (target.classList.contains('grid-line-v') || target.classList.contains('grid-line-h') || target.classList.contains('grid-dot')) {
            activeTool = 'resize-line';
            if(target.classList.contains('grid-dot')) {
                 activeLine = { type: 'both', rIndex: parseInt(target.dataset.rIndex), cIndex: parseInt(target.dataset.cIndex) };
            } else {
                activeLine = { 
                    type: target.dataset.type, 
                    index: parseInt(target.dataset.index) 
                };
            }
        }
        // 2. Check if clicking an Outer Resize Handle
        else if (target.classList.contains('resize-handle')) {
            activeTool = 'resize-box';
            activeHandle = target.dataset.dir;
        }
        // 3. Otherwise, Move the whole box
        else {
            activeTool = 'move';
        }
    };

    const handleSelectorMove = (e) => {
        const curr = state.images[state.currentIndex];
        if (!curr || !activeTool) return;

        const dx = e.clientX - state.pointerStart.x;
        const dy = e.clientY - state.pointerStart.y;
        const maxW = elements.sourceImg.clientWidth;
        const maxH = elements.sourceImg.clientHeight;

        if (activeTool === 'move') {
            // Move entire box
            curr.x = Math.max(0, Math.min(state.initialDims.x + dx, maxW - curr.w));
            curr.y = Math.max(0, Math.min(state.initialDims.y + dy, maxH - curr.h));
            updateSelectorUI();
        } 
        else if (activeTool === 'resize-box') {
            const i = state.initialDims;
            const minSize = 20;

            if (activeHandle.includes('e')) curr.w = Math.max(minSize, Math.min(i.w + dx, maxW - i.x));
            if (activeHandle.includes('w')) {
                const newW = Math.max(minSize, i.w - dx);
                if (i.x + (i.w - newW) >= 0) { curr.w = newW; curr.x = i.x + (i.w - newW); }
            }
            if (activeHandle.includes('s')) curr.h = Math.max(minSize, Math.min(i.h + dy, maxH - i.y));
            if (activeHandle.includes('n')) {
                const newH = Math.max(minSize, i.h - dy);
                if (i.y + (i.h - newH) >= 0) { curr.h = newH; curr.y = i.y + (i.h - newH); }
            }
            updateSelectorUI();
        }
        else if (activeTool === 'resize-line') {
            const boxRect = elements.selector.getBoundingClientRect();
            
            // Handle Columns
            if (activeLine.type === 'col' || activeLine.type === 'both') {
                const idx = activeLine.type === 'both' ? activeLine.cIndex : activeLine.index;
                let newX = e.clientX - boxRect.left;
                let newPct = newX / curr.w;
                const prev = curr.colPercents[idx - 1] || 0;
                const next = curr.colPercents[idx + 1] || 1;
                newPct = Math.max(prev + 0.02, Math.min(next - 0.02, newPct));
                curr.colPercents[idx] = newPct;
            }
            
            // Handle Rows
            if (activeLine.type === 'row' || activeLine.type === 'both') {
                const idx = activeLine.type === 'both' ? activeLine.rIndex : activeLine.index;
                let newY = e.clientY - boxRect.top;
                let newPct = newY / curr.h;
                const prev = curr.rowPercents[idx - 1] || 0;
                const next = curr.rowPercents[idx + 1] || 1;
                newPct = Math.max(prev + 0.02, Math.min(next - 0.02, newPct));
                curr.rowPercents[idx] = newPct;
            }
            updateSelectorUI();
        }
        
        debouncedRender();
    };

    const handleSelectorEnd = () => {
        activeTool = null;
        render();
    };

    elements.selector.addEventListener('pointerdown', handleSelectorStart);
    elements.selector.addEventListener('pointermove', handleSelectorMove);
    elements.selector.addEventListener('pointerup', handleSelectorEnd);
    elements.selector.addEventListener('pointercancel', handleSelectorEnd);

    // --- Update UI ---
    function updateSelectorUI() {
        const curr = state.images[state.currentIndex];
        if (!curr || !elements.sourceImg.offsetParent) return;

        const sel = elements.selector;
        sel.style.display = 'block';
        sel.style.left = curr.x + 'px';
        sel.style.top = curr.y + 'px';
        sel.style.width = curr.w + 'px';
        sel.style.height = curr.h + 'px';

        // Clear contents
        sel.innerHTML = '';

        // Draw Vertical Lines
        curr.colPercents.forEach((pct, index) => {
            const line = document.createElement('div');
            line.className = 'grid-line-v';
            line.style.left = (pct * 100) + '%';
            line.dataset.type = 'col';
            line.dataset.index = index;
            sel.appendChild(line);
        });

        // Draw Horizontal Lines
        curr.rowPercents.forEach((pct, index) => {
            const line = document.createElement('div');
            line.className = 'grid-line-h';
            line.style.top = (pct * 100) + '%';
            line.dataset.type = 'row';
            line.dataset.index = index;
            sel.appendChild(line);
        });

        // Draw Dots
        curr.rowPercents.forEach((rPct, rIdx) => {
            curr.colPercents.forEach((cPct, cIdx) => {
                const dot = document.createElement('div');
                dot.className = 'grid-dot';
                dot.style.left = (cPct * 100) + '%';
                dot.style.top = (rPct * 100) + '%';
                dot.dataset.rIndex = rIdx;
                dot.dataset.cIndex = cIdx;
                sel.appendChild(dot);
            });
        });

        // Draw Outer Handles
        const directions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
        directions.forEach(dir => {
            const h = document.createElement('div');
            h.className = `resize-handle handle-${dir}`;
            h.dataset.dir = dir;
            sel.appendChild(h);
        });

        document.getElementById('imgRes').textContent = `${Math.floor(curr.img.naturalWidth)}x${Math.floor(curr.img.naturalHeight)}`;
    }

    // --- Input Handling ---
    const debouncedRender = debounce(() => render(), 50);

    elements.inputs.forEach(id => {
        const el = document.getElementById(id);
        if(!el) return;

        el.addEventListener('input', (e) => {
            const curr = state.images[state.currentIndex];
            if (!curr) return;
            
            const val = (id === 'bgActive') ? e.target.checked : parseInt(e.target.value);
            curr[id] = val;
            
            const badge = document.getElementById(id + 'Val');
            if (badge) badge.textContent = (id === 'padding' ? val + '%' : val);
            
            if(id === 'cols' || id === 'rows') {
                initGridState(curr); // Reset cuts to uniform
                updateSelectorUI();
                render();
            } else if(id === 'bgActive') {
                render();
            } else {
                debouncedRender();
            }
        });
    });

    // --- Core Graphics Logic ---
    function createDrawing(img, offCanvas, targetW, targetH, sData, sheetRef) {
        const can = document.createElement('canvas');
        can.width = Math.floor(targetW) || 1;
        can.height = Math.floor(targetH) || 1;
        const ctx = can.getContext('2d');

        const scale = Math.min(targetW / sData.sw, targetH / sData.sh);
        const dw = sData.sw * scale;
        const dh = sData.sh * scale;
        const offsetX = (targetW - dw) / 2;
        const offsetY = (targetH - dh) / 2;

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

        if (sData.customMask) ctx.restore();

        if (sheetRef && sheetRef.bgActive && offCanvas) {
            processBackgroundRemoval(ctx, can, offCanvas, sData, sheetRef);
        }
        return can;
    }

    function processBackgroundRemoval(ctx, canvas, offCanvas, sData, sheetRef) {
        const width = canvas.width;
        const height = canvas.height;
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        const offCtx = offCanvas.getContext('2d');
        const sampleX = Math.floor(Math.max(0, sData.sx));
        const sampleY = Math.floor(Math.max(0, sData.sy));
        const sample = offCtx.getImageData(sampleX, sampleY, 1, 1).data;
        const avgBG = [sample[0], sample[1], sample[2]];
        
        const tol = sheetRef.tolerance;
        const soft = sheetRef.softness;
        const visited = new Uint8Array(width * height);
        const stack = []; 
        
        const getDist = (r, g, b) => {
            const rMean = (r + avgBG[0]) / 2;
            const dr = r - avgBG[0];
            const dg = g - avgBG[1];
            const db = b - avgBG[2];
            return Math.sqrt((2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db);
        };

        for (let i = 0; i < width * height; i++) {
            const x = i % width;
            const y = Math.floor(i / width);
            if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                const idx = i * 4;
                if (getDist(data[idx], data[idx+1], data[idx+2]) <= tol + soft) {
                    visited[i] = 1;
                    stack.push(i);
                }
            }
        }

        while (stack.length) {
            const i = stack.pop();
            const x = i % width;
            const y = Math.floor(i / width);
            const neighbors = [i - 1, i + 1, i - width, i + width];

            for (const n of neighbors) {
                const nx = n % width;
                if (n >= 0 && n < width * height && visited[n] === 0) {
                    if (Math.abs(nx - x) > 1) continue; 
                    const idx = n * 4;
                    const dist = getDist(data[idx], data[idx+1], data[idx+2]);
                    if (dist <= tol + soft) {
                        visited[n] = 1;
                        stack.push(n);
                    }
                }
            }
        }

        for (let i = 0; i < width * height; i++) {
            if (visited[i]) {
                const idx = i * 4;
                const dist = getDist(data[idx], data[idx+1], data[idx+2]);
                const alpha = dist <= tol ? 0 : Math.min(255, 255 * (dist - tol) / Math.max(1, soft));
                data[idx + 3] = Math.min(data[idx + 3], alpha);
            }
        }
        ctx.putImageData(imgData, 0, 0);
    }

    // --- Rendering ---
    function render() {
        const curr = state.images[state.currentIndex];
        if (!curr || !elements.sourceImg.complete) return;

        elements.tilesGrid.innerHTML = '';
        document.getElementById('stickerCount').textContent = (curr.cols * curr.rows) + " Stickers";

        const srcW = elements.sourceImg.clientWidth || curr.w || curr.img.naturalWidth;
        const srcH = elements.sourceImg.clientHeight || curr.h || curr.img.naturalHeight;
        if (srcW === 0) return;

        const rx = curr.img.naturalWidth / srcW;
        
        // Calculate Global (Natural Image) offsets
        const globalBoxX = curr.x * rx;
        const globalBoxY = curr.y * (curr.img.naturalHeight / srcH);
        const globalBoxW = curr.w * rx;
        const globalBoxH = curr.h * (curr.img.naturalHeight / srcH);
        
        const pad = curr.padding / 100;
        const frag = document.createDocumentFragment();

        for (let i = 0; i < curr.rows * curr.cols; i++) {
            const cIdx = i % curr.cols;
            const rIdx = Math.floor(i / curr.cols);
            
            const pctLeft = cIdx === 0 ? 0 : curr.colPercents[cIdx - 1];
            const pctRight = cIdx === curr.cols - 1 ? 1 : curr.colPercents[cIdx];
            const pctTop = rIdx === 0 ? 0 : curr.rowPercents[rIdx - 1];
            const pctBottom = rIdx === curr.rows - 1 ? 1 : curr.rowPercents[rIdx];
            
            // Calculate pixel slice on natural image
            const cellX = globalBoxX + (pctLeft * globalBoxW);
            const cellY = globalBoxY + (pctTop * globalBoxH);
            const cellW = (pctRight - pctLeft) * globalBoxW;
            const cellH = (pctBottom - pctTop) * globalBoxH;

            const sData = getCustomSegmentData(curr, i, {
                sx: cellX + (cellW * pad),
                sy: cellY + (cellH * pad),
                sw: cellW - (cellW * pad * 2),
                sh: cellH - (cellH * pad * 2)
            });

            const can = createDrawing(curr.img, curr.offCanvas, 370, 320, sData, curr);

            let label = `${i18n[currentLang].sticker}${i + 1}`;
            let badgeClass = "";
            if (state.globalMain?.sheet === state.currentIndex && state.globalMain?.index === i) {
                label = i18n[currentLang].main_icon;
                badgeClass = "is-main";
            } else if (state.globalTab?.sheet === state.currentIndex && state.globalTab?.index === i) {
                label = i18n[currentLang].tab_icon;
                badgeClass = "is-tab";
            }

            frag.appendChild(createGridItem(label, can, i, badgeClass, sData));
        }
        elements.tilesGrid.appendChild(frag);
    }

    function createGridItem(lbl, can, index, badgeClass, sData) {
        const div = document.createElement('div'); div.className = 'grid-item';
        const meta = document.createElement('div'); meta.className = 'item-meta';
        const badge = document.createElement('span');
        badge.className = badgeClass ? `sticker-badge ${badgeClass}` : 'sticker-badge';
        badge.textContent = lbl;
        const group = document.createElement('div'); group.className = 'icon-btn-group';

        const createBtn = (cls, icon, onClick) => {
            const btn = document.createElement('button');
            btn.className = `mini-btn ${cls}`;
            btn.innerHTML = icon;
            btn.onclick = onClick;
            return btn;
        };

        const pin = createBtn('pin-btn', getIcon('pin'), () => {
            state.pinTarget = index;
            elements.pinModal.classList.remove('hidden');
        });

        const edit = createBtn('edit-btn', getIcon('edit'), () => startManualCrop(index));

        const view = createBtn('view-btn', getIcon('view'), () => {
            const curr = state.images[state.currentIndex];
            const bigCan = createDrawing(curr.img, curr.offCanvas, 370, 320, sData, curr);
            const container = document.getElementById('bigCanvasContainer');
            container.innerHTML = '';
            container.append(bigCan);
            document.getElementById('bigViewDownload').onclick = () => {
                bigCan.toBlob(b => {
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(b);
                    a.download = "sticker.png";
                    a.click();
                });
            };
            elements.bigViewLayer.classList.remove('hidden');
        });

        group.append(pin, edit, view);
        meta.append(badge, group);
        div.append(meta, can);
        return div;
    }

    // --- Actions ---
    document.getElementById('langToggle').onclick = toggleLanguage;
    document.getElementById('setMainBtn').onclick = () => { state.globalMain = { sheet: state.currentIndex, index: state.pinTarget }; render(); elements.pinModal.classList.add('hidden'); };
    document.getElementById('setTabBtn').onclick = () => { state.globalTab = { sheet: state.currentIndex, index: state.pinTarget }; render(); elements.pinModal.classList.add('hidden'); };
    document.getElementById('cancelPinBtn').onclick = () => elements.pinModal.classList.add('hidden');
    document.getElementById('closeBigView').onclick = () => elements.bigViewLayer.classList.add('hidden');
    
    document.getElementById('prevPage').onclick = () => { if (state.currentIndex > 0) { state.currentIndex--; initCurrentPage(); } };
    document.getElementById('nextPage').onclick = () => { if (state.currentIndex < state.images.length - 1) { state.currentIndex++; initCurrentPage(); } };
    document.getElementById('delPageBtn').onclick = () => {
        state.images.splice(state.currentIndex, 1);
        if (state.currentIndex >= state.images.length && state.currentIndex > 0) state.currentIndex--;
        initCurrentPage();
    };

    // --- Export Logic ---
    document.getElementById('dlBtn').onclick = async () => {
        const btn = document.getElementById('dlBtn');
        const originalText = btn.textContent;
        btn.textContent = i18n[currentLang].processing;
        btn.disabled = true;

        setTimeout(async () => {
            try {
                const zip = new JSZip();
                const isSingle = document.getElementById('exportMode').value === 'single_pack';
                let globalCounter = 1;
                const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);

                const processItem = async (sheet, index, nameOverride, sizeOverride) => {
                    const cIdx = index % sheet.cols;
                    const rIdx = Math.floor(index / sheet.cols);
                    const pctLeft = cIdx === 0 ? 0 : sheet.colPercents[cIdx - 1];
                    const pctRight = cIdx === sheet.cols - 1 ? 1 : sheet.colPercents[cIdx];
                    const pctTop = rIdx === 0 ? 0 : sheet.rowPercents[rIdx - 1];
                    const pctBottom = rIdx === sheet.rows - 1 ? 1 : sheet.rowPercents[rIdx];

                    const natW = sheet.img.naturalWidth;
                    const natH = sheet.img.naturalHeight;
                    
                    // Default to full image coverage if x=0 (simplified for export)
                    // Or ideally we stored `sheet.rectPct` but we didn't. 
                    // We assume `sheet.x` etc are only relevant to the screen session.
                    // For proper export, we'll map the grid to the full image dimensions (0..1)
                    // UNLESS we want to support cropping the outer box too.
                    // Let's support the outer box crop implicitly by using percentages of the image?
                    // No, `sheet.x` is absolute pixels. We'll use the ratio `natW / sheet.w` logic from Render.
                    // But we don't have `srcW` here. 
                    // Fallback: Use standard grid on full image.
                    let globalBoxX=0, globalBoxY=0, globalBoxW=natW, globalBoxH=natH;

                    const cellX = globalBoxX + (pctLeft * globalBoxW);
                    const cellY = globalBoxY + (pctTop * globalBoxH);
                    const cellW = (pctRight - pctLeft) * globalBoxW;
                    const cellH = (pctBottom - pctTop) * globalBoxH;
                    
                    const pad = sheet.padding / 100;
                    const defaultData = { 
                        sx: cellX + (cellW * pad), 
                        sy: cellY + (cellH * pad), 
                        sw: cellW - (cellW * pad * 2), 
                        sh: cellH - (cellH * pad * 2) 
                    };
                    
                    const sData = getCustomSegmentData(sheet, index, defaultData);
                    const targetSize = sizeOverride || [370, 320];
                    const can = createDrawing(sheet.img, sheet.offCanvas, targetSize[0], targetSize[1], sData, sheet);
                    return new Promise(r => can.toBlob(r));
                };

                if (state.globalMain) {
                    const blob = await processItem(state.images[state.globalMain.sheet], state.globalMain.index, null, [240, 240]);
                    zip.file(`main_${timestamp}.png`, blob);
                }
                if (state.globalTab) {
                    const blob = await processItem(state.images[state.globalTab.sheet], state.globalTab.index, null, [96, 74]);
                    zip.file(`tab_${timestamp}.png`, blob);
                }

                for (let sIdx = 0; sIdx < state.images.length; sIdx++) {
                    const item = state.images[sIdx];
                    const folder = isSingle ? zip : zip.folder(item.name.replace(/\.[^/.]+$/, ""));
                    for (let i = 0; i < item.rows * item.cols; i++) {
                        const blob = await processItem(item, i);
                        const filename = isSingle
                            ? `${globalCounter.toString().padStart(2, '0')}_${timestamp}.png`
                            : `${(i + 1).toString().padStart(2, '0')}_${timestamp}.png`;
                        folder.file(filename, blob);
                        globalCounter++;
                    }
                }

                const content = await zip.generateAsync({ type: "blob" });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(content);
                a.download = `sticker_pack_${timestamp}.zip`;
                a.click();
            } catch (e) {
                console.error("Export failed", e);
                alert("Export failed: " + e.message);
            } finally {
                btn.textContent = originalText;
                btn.disabled = false;
            }
        }, 50);
    };

    // --- Manual Crop Logic ---
    function getCustomSegmentData(curr, segIdx, defaultData) {
        if (!curr.customBounds[segIdx] || curr.customBounds[segIdx].length < 3) return defaultData;
        const points = curr.customBounds[segIdx];
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        points.forEach(pt => {
            minX = Math.min(minX, pt.x); minY = Math.min(minY, pt.y);
            maxX = Math.max(maxX, pt.x); maxY = Math.max(maxY, pt.y);
        });
        return { sx: minX, sy: minY, sw: maxX - minX, sh: maxY - minY, customMask: points };
    }

    function startManualCrop(segmentIndex) {
        state.manualCropMode = true;
        state.manualCropSegment = segmentIndex;

        const curr = state.images[state.currentIndex];
        
        const cIdx = segmentIndex % curr.cols;
        const rIdx = Math.floor(segmentIndex / curr.cols);
        const pctLeft = cIdx === 0 ? 0 : curr.colPercents[cIdx - 1];
        const pctRight = cIdx === curr.cols - 1 ? 1 : curr.colPercents[cIdx];
        const pctTop = rIdx === 0 ? 0 : curr.rowPercents[rIdx - 1];
        const pctBottom = rIdx === curr.rows - 1 ? 1 : curr.rowPercents[rIdx];

        const srcW = elements.sourceImg.clientWidth || curr.w || curr.img.naturalWidth;
        const srcH = elements.sourceImg.clientHeight || curr.h || curr.img.naturalHeight;
        const rx = curr.img.naturalWidth / srcW;
        const globalBoxX = curr.x * rx;
        const globalBoxY = curr.y * (curr.img.naturalHeight / srcH);
        const globalBoxW = curr.w * rx;
        const globalBoxH = curr.h * (curr.img.naturalHeight / srcH);

        const cellX = globalBoxX + (pctLeft * globalBoxW);
        const cellY = globalBoxY + (pctTop * globalBoxH);
        const cellW = (pctRight - pctLeft) * globalBoxW;
        const cellH = (pctBottom - pctTop) * globalBoxH;
        
        const pad = curr.padding / 100;
        const segX = cellX + (cellW * pad);
        const segY = cellY + (cellH * pad);
        const segW = cellW - (cellW * pad * 2);
        const segH = cellH - (cellH * pad * 2);

        if (curr.customBounds[segmentIndex] && curr.customBounds[segmentIndex].length >= 4) {
            state.manualCropPoints = [...curr.customBounds[segmentIndex]];
        } else {
            state.manualCropPoints = [
                { x: segX, y: segY }, { x: segX + segW, y: segY },
                { x: segX + segW, y: segY + segH }, { x: segX, y: segY + segH }
            ];
        }
        showManualCropOverlay();
    }

    function showManualCropOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'manualCropOverlay';
        overlay.className = 'manual-crop-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 9999; background: rgba(15, 23, 42, 0.95);
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            overflow: hidden; user-select: none; touch-action: none;
        `;

        const curr = state.images[state.currentIndex];
        const canvas = document.createElement('canvas');
        canvas.width = curr.img.naturalWidth;
        canvas.height = curr.img.naturalHeight;
        canvas.style.cssText = `max-width: 90vw; max-height: 80vh; width: auto; height: auto; object-fit: contain; box-shadow: 0 10px 30px rgba(0,0,0,0.5); cursor: crosshair;`;
        const ctx = canvas.getContext('2d');

        const controls = document.createElement('div');
        controls.className = 'manual-crop-controls';
        controls.innerHTML = `
            <button class="crop-tool-btn btn-crop-action" id="cropSaveBtn" title="Save"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></button>
            <div style="width: 1px; background: rgba(255,255,255,0.2); margin: 0 5px;"></div>
            <button class="crop-tool-btn btn-crop-add" id="cropAddPointBtn" title="Add Point"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
            <button class="crop-tool-btn btn-crop-reset" id="cropResetBtn" title="Reset"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg></button>
            <button class="crop-tool-btn btn-crop-cancel" id="cropCancelBtn" title="Cancel"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        `;

        overlay.append(canvas, controls);
        document.body.appendChild(overlay);

        let draggingPoint = -1;
        let draggingShape = false;
        let lastShapePos = { x: 0, y: 0 };
        let addPointMode = false;
        const handleRadius = Math.max(15, curr.img.naturalWidth * 0.008); 

        const getCoords = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
        };

        const isPointInPoly = (p, polygon) => {
            let isInside = false;
            let i = 0, j = polygon.length - 1;
            for (i, j; i < polygon.length; j = i++) {
                if (((polygon[i].y > p.y) !== (polygon[j].y > p.y)) &&
                    (p.x < (polygon[j].x - polygon[i].x) * (p.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
                    isInside = !isInside;
                }
            }
            return isInside;
        };

        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(curr.img, 0, 0);

            // Draw Full Global Grid (Reference)
            const srcW = elements.sourceImg.clientWidth || curr.w || curr.img.naturalWidth;
            const srcH = elements.sourceImg.clientHeight || curr.h || curr.img.naturalHeight;
            const rx = curr.img.naturalWidth / srcW;
            const globalBoxX = curr.x * rx;
            const globalBoxY = curr.y * (curr.img.naturalHeight / srcH);
            const globalBoxW = curr.w * rx;
            const globalBoxH = curr.h * (curr.img.naturalHeight / srcH);

            ctx.save();
            ctx.strokeStyle = '#10b981'; // GREEN Grid Lines in Manual Crop
            ctx.lineWidth = Math.max(2, curr.img.naturalWidth * 0.002);

            // Draw V Lines
            curr.colPercents.forEach(pct => {
                const x = globalBoxX + (pct * globalBoxW);
                ctx.beginPath(); ctx.moveTo(x, globalBoxY); ctx.lineTo(x, globalBoxY + globalBoxH); ctx.stroke();
            });
            // Draw H Lines
            curr.rowPercents.forEach(pct => {
                const y = globalBoxY + (pct * globalBoxH);
                ctx.beginPath(); ctx.moveTo(globalBoxX, y); ctx.lineTo(globalBoxX + globalBoxW, y); ctx.stroke();
            });
            // Box
            ctx.strokeRect(globalBoxX, globalBoxY, globalBoxW, globalBoxH);
            ctx.restore();

            // Darken
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.beginPath();
            ctx.moveTo(0, 0); ctx.lineTo(canvas.width, 0); ctx.lineTo(canvas.width, canvas.height); ctx.lineTo(0, canvas.height);
            ctx.closePath();
            ctx.moveTo(state.manualCropPoints[0].x, state.manualCropPoints[0].y);
            for (let i = state.manualCropPoints.length - 1; i >= 0; i--) ctx.lineTo(state.manualCropPoints[i].x, state.manualCropPoints[i].y);
            ctx.closePath();
            ctx.fill('evenodd');
            ctx.restore();

            // Crop Shape
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = Math.max(3, curr.img.naturalWidth * 0.003);
            ctx.beginPath();
            state.manualCropPoints.forEach((pt, i) => { i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y); });
            ctx.closePath(); 
            ctx.stroke();

            // Handles
            state.manualCropPoints.forEach((pt, idx) => {
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, handleRadius, 0, Math.PI * 2);
                ctx.fillStyle = draggingPoint === idx ? '#10b981' : '#ffffff';
                ctx.fill(); ctx.stroke();
            });
        };

        canvas.addEventListener('pointerdown', (e) => {
            const { x, y } = getCoords(e);
            canvas.setPointerCapture(e.pointerId);
            const hitThreshold = handleRadius * 1.5;
            
            if (addPointMode) {
                // Simplified Add logic
                for(let i=0; i<state.manualCropPoints.length; i++) {
                   const p1 = state.manualCropPoints[i], p2 = state.manualCropPoints[(i+1)%state.manualCropPoints.length];
                   const dist = Math.abs((p2.y-p1.y)*x - (p2.x-p1.x)*y + p2.x*p1.y - p2.y*p1.x) / Math.sqrt(Math.pow(p2.y-p1.y,2) + Math.pow(p2.x-p1.x,2));
                   if(dist < hitThreshold) { 
                       state.manualCropPoints.splice(i+1, 0, {x, y});
                       addPointMode = false;
                       document.getElementById('cropAddPointBtn').classList.remove('active');
                       draw(); return;
                   }
                }
                return;
            }

            const hitIndex = state.manualCropPoints.findIndex(p => Math.sqrt((p.x-x)**2 + (p.y-y)**2) <= hitThreshold);
            if (hitIndex >= 0) { draggingPoint = hitIndex; } 
            else if (isPointInPoly({x, y}, state.manualCropPoints)) { draggingShape = true; lastShapePos = { x, y }; canvas.style.cursor = 'grabbing'; }
        });

        canvas.addEventListener('pointermove', (e) => {
            const { x, y } = getCoords(e);
            if (draggingPoint >= 0) { state.manualCropPoints[draggingPoint] = { x, y }; draw(); } 
            else if (draggingShape) {
                const dx = x - lastShapePos.x, dy = y - lastShapePos.y;
                state.manualCropPoints.forEach(p => { p.x += dx; p.y += dy; });
                lastShapePos = { x, y }; draw();
            }
        });

        canvas.addEventListener('pointerup', () => { draggingPoint = -1; draggingShape = false; canvas.style.cursor = 'default'; });
        
        document.getElementById('cropSaveBtn').onclick = () => { curr.customBounds[state.manualCropSegment] = [...state.manualCropPoints]; cleanup(); render(); };
        document.getElementById('cropAddPointBtn').onclick = (e) => { addPointMode = !addPointMode; e.currentTarget.classList.toggle('active'); };
        document.getElementById('cropResetBtn').onclick = () => { cleanup(); startManualCrop(state.manualCropSegment); };
        document.getElementById('cropCancelBtn').onclick = cleanup;
        function cleanup() { state.manualCropMode = false; if(overlay.parentNode) overlay.parentNode.removeChild(overlay); }
        draw();
    }

    initResizers(); initMobileNav();
    window.addEventListener('resize', () => { updateSelectorUI(); render(); });
});