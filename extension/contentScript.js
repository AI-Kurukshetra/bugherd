// Content script: injects right-side slider, element picker, and create-task modal.

(() => {
  if (!["http:", "https:"].includes(window.location.protocol)) return;
  if (window.__BUGHERD_DASHBOARD_EXT__) return;
  window.__BUGHERD_DASHBOARD_EXT__ = true;

  const EXT_VERSION = "0.1.6";
  const SHADOW_HOST_ID = "bh-dashboard-ext-host";
  // Helpful debug signal that the latest script is running.
  console.log(`[BH-EXT] loaded v${EXT_VERSION}`);

  function cssText() {
    return `
${SHADOW_HOST_ID} {}
.bh-ext-root{position:fixed;top:80px;right:18px;z-index:2147483647;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}
.bh-ext-overlay{position:fixed;inset:0;z-index:2147483645;background:rgba(0,0,0,.35);backdrop-filter:blur(1px);display:none}
.bh-ext-overlay.open{display:block}
.bh-ext-rail{width:66px;background:linear-gradient(180deg,#0b3b66,#062a4a);border-radius:16px;padding:10px;box-shadow:0 12px 30px rgba(0,0,0,.25);color:#fff;display:flex;flex-direction:column;align-items:center;gap:10px}
.bh-ext-min{position:fixed;top:50%;right:0;transform:translateY(-50%);z-index:2147483647;display:none}
.bh-ext-min button{height:64px;width:34px;border-radius:16px 0 0 16px;border:1px solid rgba(255,255,255,.18);background:linear-gradient(180deg,#0b3b66,#062a4a);color:#fff;box-shadow:0 12px 30px rgba(0,0,0,.25);cursor:pointer;font-weight:900}
.bh-ext-min button:hover{filter:brightness(1.06)}
.bh-ext-logo{width:38px;height:38px;border-radius:12px;background:#0a0a0a;display:grid;place-items:center;font-weight:800}
.bh-ext-btn{width:46px;height:46px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.08);color:#fff;display:grid;place-items:center;cursor:pointer;transition:.15s}
.bh-ext-btn:hover{background:rgba(255,255,255,.14)}
.bh-ext-btn-primary{background:#2f7df6;border-color:rgba(255,255,255,.2)}
.bh-ext-btn-primary:hover{background:#2467cc}
.bh-ext-badge{position:absolute;right:10px;top:64px;background:#2f7df6;color:#fff;border-radius:999px;padding:2px 6px;font-size:11px;font-weight:700}
.bh-ext-panel{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483646;width:min(420px,calc(100vw - 40px));background:#fff;color:#111;border-radius:16px;box-shadow:0 16px 50px rgba(0,0,0,.35);border:1px solid rgba(0,0,0,.08);overflow:hidden;display:none}
.bh-ext-panel.open{display:block}
.bh-ext-panel-h{padding:12px 14px;border-bottom:1px solid rgba(0,0,0,.06);display:flex;justify-content:space-between;align-items:center}
.bh-ext-panel-h .t{font-weight:700}
.bh-ext-x{cursor:pointer;border:none;background:transparent;font-size:18px;line-height:1}
.bh-ext-panel-b{padding:14px;display:flex;flex-direction:column;gap:10px}
.bh-ext-field label{display:block;font-size:12px;color:#555;margin-bottom:6px}
.bh-ext-field input,.bh-ext-field select,.bh-ext-field textarea{width:100%;border:1px solid rgba(0,0,0,.15);border-radius:10px;padding:10px 10px;font-size:13px;outline:none}
.bh-ext-field textarea{min-height:90px;resize:none}
.bh-ext-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.bh-ext-actions{display:flex;gap:10px;margin-top:4px}
.bh-ext-actions button{flex:1;border:none;border-radius:10px;padding:10px 12px;font-weight:700;cursor:pointer}
.bh-ext-actions .sec{background:#eef2f6}
.bh-ext-actions .pri{background:#2f7df6;color:#fff}
.bh-ext-err{background:#fff2f2;border:1px solid #ffd3d3;color:#a40000;border-radius:10px;padding:8px 10px;font-size:12px}
.bh-ext-note{font-size:12px;color:#666}
.bh-ext-muted{color:#7a7a7a}

/* modal */
.bh-ext-modal{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483646;width:min(920px,calc(100vw - 80px));max-height:calc(100vh - 80px);background:#fff;border-radius:16px;border:1px solid rgba(0,0,0,.08);box-shadow:0 16px 50px rgba(0,0,0,.35);display:none;overflow:hidden}
.bh-ext-modal.open{display:block}
.bh-ext-modal-h{padding:14px 16px;border-bottom:1px solid rgba(0,0,0,.06);display:flex;align-items:center;justify-content:space-between;gap:10px}
.bh-ext-modal-title{display:flex;align-items:center;gap:10px;font-weight:800;letter-spacing:.2px}
.bh-ext-gridicon{width:18px;height:18px;opacity:.55}
.bh-ext-modal-b{display:grid;grid-template-columns:1fr 320px;max-height:calc(100vh - 140px)}
.bh-ext-left{padding:16px;overflow:auto}
.bh-ext-right{padding:16px;background:#f7f7f8;border-left:1px solid rgba(0,0,0,.06);overflow:auto}
.bh-ext-desc{width:100%;min-height:220px;border:1px solid rgba(0,0,0,.12);border-radius:10px;padding:10px 10px;font-size:13px;outline:none;resize:none}
.bh-ext-count{margin-top:8px;font-size:12px;color:#777}
.bh-ext-shotwrap{margin-top:10px}
.bh-ext-shotbar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:8px;font-size:12px;color:#555}
.bh-ext-shotthumb{width:100%;max-height:140px;object-fit:contain;background:#0b0b0b;border-radius:12px;border:1px solid rgba(0,0,0,.08);display:none}
.bh-ext-shotmeta{display:flex;align-items:center;gap:8px}
.bh-ext-dot{width:10px;height:10px;border-radius:50%;background:#2f7df6;box-shadow:0 0 0 4px rgba(47,125,246,.15)}
.bh-ext-annotate{border:1px solid rgba(0,0,0,.12);background:#fff;border-radius:10px;padding:6px 10px;font-weight:700;cursor:pointer}
.bh-ext-annotate:hover{background:#f3f4f6}
.bh-ext-annotate[disabled]{opacity:.6;cursor:not-allowed}

/* scrollbars */
.bh-ext-left::-webkit-scrollbar,.bh-ext-right::-webkit-scrollbar{width:10px}
.bh-ext-left::-webkit-scrollbar-thumb,.bh-ext-right::-webkit-scrollbar-thumb{background:rgba(0,0,0,.18);border-radius:999px;border:3px solid transparent;background-clip:content-box}
.bh-ext-left::-webkit-scrollbar-thumb:hover,.bh-ext-right::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.28);border:3px solid transparent;background-clip:content-box}

/* cropper */
.bh-ext-crop{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483646;width:min(980px,calc(100vw - 60px));background:#fff;border-radius:16px;border:1px solid rgba(0,0,0,.08);box-shadow:0 16px 50px rgba(0,0,0,.35);display:none;overflow:hidden}
.bh-ext-crop.open{display:block}
.bh-ext-crop-h{padding:12px 14px;border-bottom:1px solid rgba(0,0,0,.06);display:flex;align-items:center;justify-content:space-between}
.bh-ext-crop-h .t{font-weight:800}
.bh-ext-crop-b{padding:14px}
.bh-ext-crop-stage{position:relative;background:#0b0b0b;border-radius:12px;overflow:hidden;display:grid;place-items:center}
.bh-ext-crop-stage img{display:block;max-width:100%;height:auto;user-select:none;-webkit-user-drag:none}
.bh-ext-sel{position:absolute;border:2px solid #2f7df6;background:rgba(47,125,246,.12);border-radius:8px;box-shadow:0 0 0 9999px rgba(0,0,0,.35)}
.bh-ext-handle{position:absolute;width:10px;height:10px;background:#fff;border:2px solid #2f7df6;border-radius:3px}
.bh-ext-h-nw{left:-6px;top:-6px;cursor:nwse-resize}
.bh-ext-h-ne{right:-6px;top:-6px;cursor:nesw-resize}
.bh-ext-h-sw{left:-6px;bottom:-6px;cursor:nesw-resize}
.bh-ext-h-se{right:-6px;bottom:-6px;cursor:nwse-resize}
.bh-ext-crop-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:12px}
.bh-ext-crop-actions button{border:none;border-radius:10px;padding:10px 12px;font-weight:800;cursor:pointer}
.bh-ext-crop-actions .sec{background:#eef2f6}
.bh-ext-crop-actions .pri{background:#2f7df6;color:#fff}
.bh-ext-crop-actions .pri:hover{background:#2467cc}

/* assignee chips */
.bh-ext-chipbox{display:flex;flex-wrap:wrap;gap:6px;align-items:center;border:1px solid rgba(0,0,0,.15);border-radius:10px;background:#fff;padding:6px}
.bh-ext-chip{display:inline-flex;align-items:center;gap:6px;background:#eef2f6;border-radius:999px;padding:5px 10px;font-size:12px}
.bh-ext-chipx{border:none;background:transparent;cursor:pointer;font-size:14px;line-height:1;color:#666}
.bh-ext-chipx:hover{color:#111}
.bh-ext-chipinput{border:none;outline:none;font-size:13px;padding:6px;flex:1;min-width:120px}

/* checkbox */
.bh-ext-check{display:flex;align-items:center;gap:8px;font-size:13px;color:#444}
.bh-ext-check input{width:14px;height:14px}

/* create button */
.bh-ext-createbtn{margin-top:10px;width:100%;border:none;border-radius:10px;padding:12px 12px;font-weight:800;background:#bcd0f6;color:#fff;cursor:not-allowed}
.bh-ext-createbtn.enabled{background:#2f7df6;cursor:pointer}
.bh-ext-createbtn.enabled:hover{background:#2467cc}

/* picker overlay */
.bh-ext-picker-mask{position:fixed;inset:0;z-index:2147483646;cursor:crosshair}
.bh-ext-highlight{position:fixed;z-index:2147483646;border:2px solid #2f7df6;background:rgba(47,125,246,.12);pointer-events:none;border-radius:6px}
`;
  }

  function createShadowRoot() {
    let host = document.getElementById(SHADOW_HOST_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = SHADOW_HOST_ID;
      document.documentElement.appendChild(host);
    }
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = cssText();
    shadow.appendChild(style);
    const root = document.createElement("div");
    root.className = "bh-ext-root";
    shadow.appendChild(root);
    return { host, shadow, root };
  }

  function chromeMsg(message) {
    return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
  }

  function findButtonFromEvent(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    for (const node of path) {
      if (node && node.tagName === "BUTTON") return node;
      if (node && node.closest) {
        const btn = node.closest("button");
        if (btn) return btn;
      }
    }
    // Fallback
    const t = event.target;
    if (t && t.closest) return t.closest("button");
    return null;
  }

  function showPanelError(msg) {
    togglePanel(true);
    const slot = qs(panel, '[data-slot="autherr"]');
    if (slot) setErr(slot, msg);
  }

  const { root } = createShadowRoot();

  // UI skeleton
  const overlay = document.createElement("div");
  overlay.className = "bh-ext-overlay";

  const rail = document.createElement("div");
  rail.className = "bh-ext-rail";
  rail.innerHTML = `
    <div class="bh-ext-logo" title="BugHerd Dashboard extension">BH</div>
    <div class="bh-ext-note" style="opacity:.75;font-size:11px;line-height:1;margin-top:-6px">v${EXT_VERSION}</div>
    <div style="position:relative">
      <button class="bh-ext-btn bh-ext-btn-primary" data-act="create" title="Create task">+</button>
    </div>
    <button class="bh-ext-btn" data-act="panel" title="Account / Settings">⚙</button>
    <button class="bh-ext-btn" data-act="hide" title="Close">×</button>
  `;

  const panel = document.createElement("div");
  panel.className = "bh-ext-panel";
  panel.innerHTML = `
    <div class="bh-ext-panel-h">
      <div class="t">BugHerd Dashboard</div>
      <button class="bh-ext-x" data-act="close">×</button>
    </div>
    <div class="bh-ext-panel-b">
      <div class="bh-ext-note">Sign in to sync tasks to your dashboard.</div>
      <div class="bh-ext-note" data-slot="who" style="display:none"></div>
      <div class="bh-ext-field">
        <label>Email</label>
        <input type="email" data-f="email" placeholder="you@company.com" />
      </div>
      <div class="bh-ext-field">
        <label>Password</label>
        <input type="password" data-f="password" placeholder="••••••••" />
      </div>
      <div class="bh-ext-actions">
        <button class="sec" data-act="signout" style="display:none">Sign out</button>
        <button class="pri" data-act="signin">Sign in</button>
      </div>
      <div class="bh-ext-err" data-slot="autherr" style="display:none"></div>
    </div>
  `;

  // Create task modal (in-page)
  const taskModal = document.createElement("div");
  taskModal.className = "bh-ext-modal";
  taskModal.innerHTML = `
    <div class="bh-ext-modal-h">
      <div class="bh-ext-modal-title">
        <svg class="bh-ext-gridicon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="6" cy="6" r="1.6"></circle>
          <circle cx="12" cy="6" r="1.6"></circle>
          <circle cx="18" cy="6" r="1.6"></circle>
          <circle cx="6" cy="12" r="1.6"></circle>
          <circle cx="12" cy="12" r="1.6"></circle>
          <circle cx="18" cy="12" r="1.6"></circle>
          <circle cx="6" cy="18" r="1.6"></circle>
          <circle cx="12" cy="18" r="1.6"></circle>
          <circle cx="18" cy="18" r="1.6"></circle>
        </svg>
        <span>BACANCY FIRST PROJECT</span>
      </div>
      <button class="bh-ext-x" data-act="tclose" aria-label="Close">×</button>
    </div>

    <div class="bh-ext-modal-b">
      <div class="bh-ext-left">
        <div class="bh-ext-err" data-slot="taskerr" style="display:none"></div>
        <textarea class="bh-ext-desc" data-f="description" placeholder="Add description" maxlength="2000"></textarea>
        <div class="bh-ext-count"><span data-f="count">0</span> / 2000</div>

        <div class="bh-ext-shotwrap">
          <img class="bh-ext-shotthumb" data-f="shot" />
          <div class="bh-ext-shotbar">
            <div class="bh-ext-shotmeta">
              <span class="bh-ext-dot"></span>
              <span data-f="shotlabel">Screenshot captured</span>
            </div>
            <button class="bh-ext-annotate" type="button" data-act="crop" disabled>Crop</button>
          </div>
          <div class="bh-ext-note bh-ext-muted" data-f="shotnote" style="display:none">Will attach a screenshot of the clicked element.</div>
        </div>
      </div>

      <div class="bh-ext-right">
        <div class="bh-ext-field">
          <label>Assignee(s)</label>
          <div class="bh-ext-chipbox" data-f="assigneebox">
            <input class="bh-ext-chipinput" data-f="assignee_input" placeholder="Assignee(s)" />
          </div>
        </div>

        <div class="bh-ext-field">
          <label>Severity</label>
          <select data-f="severity">
            <option value="critical">Critical</option>
            <option value="important">Important</option>
            <option value="normal" selected>Normal</option>
            <option value="minor">Minor</option>
          </select>
        </div>

        <div class="bh-ext-field">
          <label>Status</label>
          <select data-f="column"></select>
        </div>

        <div class="bh-ext-field">
          <label>Tag(s)</label>
          <input data-f="tags" placeholder="Tag(s)" />
        </div>

        <label class="bh-ext-check">
          <input type="checkbox" data-f="keep" checked />
          Keep these settings
        </label>

        <button class="bh-ext-createbtn" data-act="tcreate" type="button">Create task</button>
      </div>
    </div>
  `;

  root.appendChild(overlay);
  root.appendChild(rail);
  root.appendChild(panel);
  root.appendChild(taskModal);

  const cropper = document.createElement("div");
  cropper.className = "bh-ext-crop";
  cropper.innerHTML = `
    <div class="bh-ext-crop-h">
      <div class="t">Crop screenshot</div>
      <button class="bh-ext-x" data-act="cclose" aria-label="Close">×</button>
    </div>
    <div class="bh-ext-crop-b">
      <div class="bh-ext-note">Drag to move. Use corners to resize. Press Esc to cancel.</div>
      <div class="bh-ext-crop-stage" data-f="cstage" style="margin-top:10px">
        <img data-f="cimg" alt="Screenshot to crop" />
        <div class="bh-ext-sel" data-f="csel" style="display:none">
          <div class="bh-ext-handle bh-ext-h-nw" data-h="nw"></div>
          <div class="bh-ext-handle bh-ext-h-ne" data-h="ne"></div>
          <div class="bh-ext-handle bh-ext-h-sw" data-h="sw"></div>
          <div class="bh-ext-handle bh-ext-h-se" data-h="se"></div>
        </div>
      </div>
      <div class="bh-ext-crop-actions">
        <button class="sec" type="button" data-act="ccancel">Cancel</button>
        <button class="pri" type="button" data-act="capply">Apply crop</button>
      </div>
    </div>
  `;
  root.appendChild(cropper);

  const minimized = document.createElement("div");
  minimized.className = "bh-ext-min";
  minimized.innerHTML = `<button type="button" data-act="show" aria-label="Open BugHerd sidebar">›</button>`;
  root.appendChild(minimized);

  let isHidden = false;
  function setHidden(next) {
    isHidden = next;
    if (isHidden) {
      // close everything and stop picker
      cleanupPicker();
      togglePanel(false);
      openTaskModal(false);
      rail.style.display = "none";
      panel.style.display = "none";
      taskModal.style.display = "none";
      minimized.style.display = "block";
    } else {
      rail.style.display = "";
      panel.style.display = "";
      taskModal.style.display = "";
      minimized.style.display = "none";
    }
  }

  function qs(container, sel) {
    return container.querySelector(sel);
  }
  function setErr(slotEl, msg) {
    if (!msg) {
      slotEl.style.display = "none";
      slotEl.textContent = "";
      return;
    }
    slotEl.style.display = "block";
    slotEl.textContent = msg;
  }

  async function refreshAuthUI() {
    const res = await chromeMsg({ type: "AUTH_STATUS" }).catch(() => null);
    const signedIn = !!res?.signedIn;
    const signinBtn = qs(panel, '[data-act="signin"]');
    const signoutBtn = qs(panel, '[data-act="signout"]');
    const email = qs(panel, '[data-f="email"]');
    const password = qs(panel, '[data-f="password"]');
    if (signinBtn) signinBtn.style.display = signedIn ? "none" : "block";
    if (signoutBtn) signoutBtn.style.display = signedIn ? "block" : "none";
    if (email) email.disabled = signedIn;
    if (password) password.disabled = signedIn;

    const who = qs(panel, '[data-slot="who"]');
    if (who) {
      if (signedIn && res?.user?.email) {
        who.style.display = "block";
        who.textContent = `Signed in as ${res.user.email}`;
      } else {
        who.style.display = "none";
        who.textContent = "";
      }
    }
  }

  function updateOverlay() {
    const shouldOpen =
      panel.classList.contains("open") ||
      taskModal.classList.contains("open") ||
      cropper.classList.contains("open");
    overlay.classList.toggle("open", shouldOpen);
  }

  function togglePanel(open) {
    panel.classList.toggle("open", open);
    updateOverlay();
  }

  function openTaskModal(open) {
    taskModal.classList.toggle("open", open);
    updateOverlay();
  }

  let pickedMeta = null;

  // cropper state
  let cropState = null; // { dataUrl, imgW, imgH, scale, sel: {x,y,w,h} in display px, onApply: fn }

  function openCropper({ dataUrl, initialRectImage, onApply }) {
    const imgEl = qs(cropper, '[data-f="cimg"]');
    const stage = qs(cropper, '[data-f="cstage"]');
    const selEl = qs(cropper, '[data-f="csel"]');

    cropper.classList.add("open");
    updateOverlay();

    imgEl.onload = () => {
      const imgW = imgEl.naturalWidth;
      const imgH = imgEl.naturalHeight;
      // constrain display size
      const maxW = Math.min(920, window.innerWidth - 120);
      const maxH = Math.min(560, window.innerHeight - 220);
      const scale = Math.min(maxW / imgW, maxH / imgH, 1);
      const dispW = Math.floor(imgW * scale);
      const dispH = Math.floor(imgH * scale);

      imgEl.style.width = `${dispW}px`;
      imgEl.style.height = `${dispH}px`;
      stage.style.width = `${dispW}px`;
      stage.style.height = `${dispH}px`;

      // initial selection in display coords
      const ir =
        initialRectImage ??
        // default: centered selection
        { x: imgW * 0.15, y: imgH * 0.15, w: imgW * 0.7, h: imgH * 0.7 };
      const x = Math.max(0, Math.min(dispW - 40, Math.floor(ir.x * scale)));
      const y = Math.max(0, Math.min(dispH - 40, Math.floor(ir.y * scale)));
      const w = Math.max(40, Math.min(dispW - x, Math.floor(ir.w * scale)));
      const h = Math.max(40, Math.min(dispH - y, Math.floor(ir.h * scale)));

      cropState = {
        dataUrl,
        imgW,
        imgH,
        scale,
        sel: { x, y, w, h },
        onApply,
      };

      selEl.style.display = "block";
      renderSelection();
    };
    imgEl.src = dataUrl;
  }

  function closeCropper() {
    cropper.classList.remove("open");
    updateOverlay();
    cropState = null;
  }

  function renderSelection() {
    if (!cropState) return;
    const selEl = qs(cropper, '[data-f="csel"]');
    const { x, y, w, h } = cropState.sel;
    selEl.style.left = `${x}px`;
    selEl.style.top = `${y}px`;
    selEl.style.width = `${w}px`;
    selEl.style.height = `${h}px`;
  }

  async function applyCrop() {
    if (!cropState) return;
    const { dataUrl, imgW, imgH, scale, sel, onApply } = cropState;
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    const sx = Math.max(0, Math.floor(sel.x / scale));
    const sy = Math.max(0, Math.floor(sel.y / scale));
    const sw = Math.min(imgW - sx, Math.floor(sel.w / scale));
    const sh = Math.min(imgH - sy, Math.floor(sel.h / scale));
    const canvas = document.createElement("canvas");
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
    const cropped = canvas.toDataURL("image/png");
    onApply(cropped);
    closeCropper();
  }

  function cleanupPicker() {
    // Element-pick mode was removed in favor of capture->crop flow.
  }

  async function loadColumnsIntoSelect() {
    const sel = qs(taskModal, '[data-f="column"]');
    sel.innerHTML = "";
    const res = await chromeMsg({ type: "GET_COLUMNS" });
    if (!res?.ok) throw new Error(res?.error || "Failed to load columns");
    (res.columns || []).forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });
    if (!sel.value && sel.options.length) sel.value = sel.options[0].value;
  }

  async function openCreateTaskFlow() {
    const auth = await chromeMsg({ type: "AUTH_STATUS" });
    if (!auth?.signedIn) {
      showPanelError("Please sign in first.");
      return;
    }

    // Initialize meta even before picking an element.
    if (!pickedMeta) {
      pickedMeta = {
        page_url: location.href,
        page_title: document.title,
        selector: null,
        screenshotDataUrl: null,
      };
    }

    setErr(qs(taskModal, '[data-slot="taskerr"]'), null);
    qs(taskModal, '[data-f="description"]').value = "";
    qs(taskModal, '[data-f="tags"]').value = "";

    try {
      await loadColumnsIntoSelect();
    } catch (e) {
      // Still open the modal, but show a clear error.
      setErr(
        qs(taskModal, '[data-slot="taskerr"]'),
        e instanceof Error ? e.message : "Failed to load columns",
      );
    }

    const shotImg = qs(taskModal, '[data-f="shot"]');
    const shotNote = qs(taskModal, '[data-f="shotnote"]');
    const shotLabel = qs(taskModal, '[data-f="shotlabel"]');
    const cropBtn = qs(taskModal, '[data-act="crop"]');
    if (pickedMeta?.screenshotDataUrl) {
      shotImg.src = pickedMeta.screenshotDataUrl;
      shotImg.style.display = "block";
      shotNote.style.display = "none";
      shotLabel.textContent = "Screenshot captured";
      if (cropBtn) cropBtn.disabled = false;
    } else {
      shotImg.style.display = "none";
      shotNote.style.display = "block";
      shotLabel.textContent = "No screenshot";
      if (cropBtn) cropBtn.disabled = true;
    }

    // Load defaults if "keep settings" is enabled
    const defaults = await chrome.storage.local.get(["bh_task_defaults"]).catch(() => ({}));
    const d = defaults?.bh_task_defaults;
    if (d?.keep) {
      if (d.severity) qs(taskModal, '[data-f="severity"]').value = d.severity;
      if (d.column_id) qs(taskModal, '[data-f="column"]').value = d.column_id;
      if (d.tags) qs(taskModal, '[data-f="tags"]').value = d.tags;
      qs(taskModal, '[data-f="keep"]').checked = true;
      setAssignees(Array.isArray(d.assignees) ? d.assignees : []);
    } else {
      qs(taskModal, '[data-f="keep"]').checked = true;
      setAssignees([]);
    }

    updateCountAndButton();
    openTaskModal(true);
  }

  // wire panel buttons
  rail.addEventListener("click", async (e) => {
    const btn = findButtonFromEvent(e);
    if (!btn) return;
    const act = btn.getAttribute("data-act");
    if (act === "hide") {
      setHidden(true);
      return;
    }
    if (act === "panel") {
      togglePanel(!panel.classList.contains("open"));
      try {
        await refreshAuthUI();
      } catch {
        // ignore
      }
    } else if (act === "create") {
      // One click: capture active screen -> crop -> open create task modal.
      try {
        const auth = await chromeMsg({ type: "AUTH_STATUS" });
        if (!auth?.signedIn) {
          showPanelError("Please sign in first.");
          return;
        }

        const cap = await chromeMsg({ type: "CAPTURE_TAB" });
        if (!cap?.ok) {
          showPanelError(cap?.error || "Capture failed");
          return;
        }

        const fullDataUrl = cap.dataUrl;
        pickedMeta = {
          page_url: location.href,
          page_title: document.title,
          selector: null,
          screenshotDataUrl: null,
          fullScreenshotDataUrl: fullDataUrl,
          initialRectImage: null,
        };

        openCropper({
          dataUrl: fullDataUrl,
          initialRectImage: null,
          onApply: async (croppedDataUrl) => {
            pickedMeta.screenshotDataUrl = croppedDataUrl;
            await openCreateTaskFlow();
          },
        });
      } catch (err) {
        showPanelError(err instanceof Error ? err.message : "Extension error");
      }
    }
  });

  minimized.addEventListener("click", (e) => {
    const btn = findButtonFromEvent(e);
    if (!btn) return;
    if (btn.getAttribute("data-act") === "show") {
      setHidden(false);
    }
  });

  panel.addEventListener("click", async (e) => {
    const btn = findButtonFromEvent(e);
    if (!btn) return;
    const act = btn.getAttribute("data-act");
    if (act === "close") togglePanel(false);
    if (act === "signin") {
      const emailEl = qs(panel, '[data-f="email"]');
      const passEl = qs(panel, '[data-f="password"]');
      const email = (emailEl?.value || "").trim();
      const password = passEl?.value || "";
      setErr(qs(panel, '[data-slot="autherr"]'), null);
      const res = await chromeMsg({ type: "AUTH_SIGNIN", email, password });
      if (!res?.ok) {
        setErr(qs(panel, '[data-slot="autherr"]'), res?.error || "Sign in failed");
      } else {
        await refreshAuthUI();
        togglePanel(false);
      }
    }
    if (act === "signout") {
      await chromeMsg({ type: "AUTH_SIGNOUT" });
      await refreshAuthUI();
    }
  });

  overlay.addEventListener("click", () => {
    // Close any open popup/modal.
    cleanupPicker();
    togglePanel(false);
    openTaskModal(false);
    closeCropper();
    pickedMeta = null;
  });

  // cropper events
  cropper.addEventListener("click", (e) => {
    const btn = findButtonFromEvent(e);
    if (!btn) return;
    const act = btn.getAttribute("data-act");
    if (act === "cclose" || act === "ccancel") {
      closeCropper();
    }
    if (act === "capply") {
      void applyCrop();
    }
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && cropper.classList.contains("open")) {
      closeCropper();
    }
  });

  // crop selection interactions
  (() => {
    const selEl = qs(cropper, '[data-f="csel"]');
    const stageEl = qs(cropper, '[data-f="cstage"]');
    let mode = null; // 'move' | 'nw' | 'ne' | 'sw' | 'se'
    let start = null;

    function clampSel(s) {
      const wMax = stageEl.clientWidth;
      const hMax = stageEl.clientHeight;
      const min = 30;
      let x = Math.max(0, Math.min(wMax - min, s.x));
      let y = Math.max(0, Math.min(hMax - min, s.y));
      let w = Math.max(min, Math.min(wMax - x, s.w));
      let h = Math.max(min, Math.min(hMax - y, s.h));
      return { x, y, w, h };
    }

    function onPointerDown(ev) {
      if (!cropState) return;
      const target = ev.target;
      const handle = target?.getAttribute?.("data-h");
      mode = handle || "move";
      start = {
        px: ev.clientX,
        py: ev.clientY,
        sel: { ...cropState.sel },
      };
      ev.preventDefault();
      selEl.setPointerCapture(ev.pointerId);
    }

    function onPointerMove(ev) {
      if (!cropState || !mode || !start) return;
      const dx = ev.clientX - start.px;
      const dy = ev.clientY - start.py;
      let next = { ...start.sel };
      if (mode === "move") {
        next.x += dx;
        next.y += dy;
      } else if (mode === "nw") {
        next.x += dx;
        next.y += dy;
        next.w -= dx;
        next.h -= dy;
      } else if (mode === "ne") {
        next.y += dy;
        next.w += dx;
        next.h -= dy;
      } else if (mode === "sw") {
        next.x += dx;
        next.w -= dx;
        next.h += dy;
      } else if (mode === "se") {
        next.w += dx;
        next.h += dy;
      }
      cropState.sel = clampSel(next);
      renderSelection();
    }

    function onPointerUp(ev) {
      if (!mode) return;
      mode = null;
      start = null;
      try {
        selEl.releasePointerCapture(ev.pointerId);
      } catch {
        // ignore
      }
    }

    selEl.addEventListener("pointerdown", onPointerDown);
    selEl.addEventListener("pointermove", onPointerMove);
    selEl.addEventListener("pointerup", onPointerUp);
    selEl.addEventListener("pointercancel", onPointerUp);

    // Allow drawing a new selection on the background.
    stageEl.addEventListener("pointerdown", (ev) => {
      if (!cropState) return;
      if (ev.target && (ev.target === selEl || ev.target.closest?.('[data-f="csel"]'))) return;
      const rect = stageEl.getBoundingClientRect();
      const x0 = Math.max(0, Math.min(stageEl.clientWidth - 1, ev.clientX - rect.left));
      const y0 = Math.max(0, Math.min(stageEl.clientHeight - 1, ev.clientY - rect.top));
      mode = "draw";
      start = { px: x0, py: y0, sel: { ...cropState.sel } };
      cropState.sel = clampSel({ x: x0, y: y0, w: 40, h: 40 });
      renderSelection();
      stageEl.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    });

    stageEl.addEventListener("pointermove", (ev) => {
      if (!cropState || mode !== "draw" || !start) return;
      const rect = stageEl.getBoundingClientRect();
      const x1 = Math.max(0, Math.min(stageEl.clientWidth - 1, ev.clientX - rect.left));
      const y1 = Math.max(0, Math.min(stageEl.clientHeight - 1, ev.clientY - rect.top));
      const x = Math.min(start.px, x1);
      const y = Math.min(start.py, y1);
      const w = Math.abs(x1 - start.px);
      const h = Math.abs(y1 - start.py);
      cropState.sel = clampSel({ x, y, w, h });
      renderSelection();
    });

    function endDraw(pointerId) {
      if (mode !== "draw") return;
      mode = null;
      start = null;
      try {
        stageEl.releasePointerCapture(pointerId);
      } catch {
        // ignore
      }
    }

    stageEl.addEventListener("pointerup", (ev) => endDraw(ev.pointerId));
    stageEl.addEventListener("pointercancel", (ev) => endDraw(ev.pointerId));
  })();

  // assignee chips state
  let assignees = [];
  function renderAssignees() {
    const box = qs(taskModal, '[data-f="assigneebox"]');
    const input = qs(taskModal, '[data-f="assignee_input"]');
    // remove existing chips (keep input)
    [...box.querySelectorAll(".bh-ext-chip")].forEach((n) => n.remove());
    assignees.forEach((name, idx) => {
      const chip = document.createElement("span");
      chip.className = "bh-ext-chip";
      chip.innerHTML = `<span></span><button class="bh-ext-chipx" type="button" aria-label="Remove">×</button>`;
      chip.querySelector("span").textContent = name;
      chip.querySelector("button").addEventListener("click", () => {
        assignees = assignees.filter((_, i) => i !== idx);
        renderAssignees();
      });
      box.insertBefore(chip, input);
    });
  }
  function setAssignees(next) {
    assignees = [...new Set(next.map((s) => String(s).trim()).filter(Boolean))].slice(0, 5);
    renderAssignees();
  }
  function addAssignee(raw) {
    const name = String(raw || "").trim();
    if (!name) return;
    if (assignees.some((a) => a.toLowerCase() === name.toLowerCase())) return;
    assignees = [...assignees, name].slice(0, 5);
    renderAssignees();
  }

  function updateCountAndButton() {
    const desc = qs(taskModal, '[data-f="description"]').value || "";
    qs(taskModal, '[data-f="count"]').textContent = String(desc.length);
    const btn = qs(taskModal, '[data-act="tcreate"]');
    const enabled = desc.trim().length > 0;
    btn.classList.toggle("enabled", enabled);
  }

  qs(taskModal, '[data-f="description"]').addEventListener("input", updateCountAndButton);
  qs(taskModal, '[data-f="assignee_input"]').addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const input = e.currentTarget;
      addAssignee(input.value);
      input.value = "";
    } else if (e.key === "Backspace" && !e.currentTarget.value && assignees.length) {
      assignees = assignees.slice(0, -1);
      renderAssignees();
    }
  });

  taskModal.addEventListener("click", async (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const act = btn.getAttribute("data-act");
    if (act === "tclose" || act === "tcancel") {
      openTaskModal(false);
      pickedMeta = null;
    }
    if (act === "crop") {
      if (!pickedMeta?.fullScreenshotDataUrl) return;
      openCropper({
        dataUrl: pickedMeta.fullScreenshotDataUrl,
        initialRectImage: pickedMeta.initialRectImage,
        onApply: (croppedDataUrl) => {
          pickedMeta.screenshotDataUrl = croppedDataUrl;
          const shotImg = qs(taskModal, '[data-f="shot"]');
          const shotNote = qs(taskModal, '[data-f="shotnote"]');
          const shotLabel = qs(taskModal, '[data-f="shotlabel"]');
          shotImg.src = croppedDataUrl;
          shotImg.style.display = "block";
          shotNote.style.display = "none";
          shotLabel.textContent = "Screenshot captured";
        },
      });
    }
    if (act === "tcreate") {
      const description = qs(taskModal, '[data-f="description"]').value.trim();
      // Include any uncommitted assignee input (user may not press Enter).
      const draftAssignee = (qs(taskModal, '[data-f="assignee_input"]')?.value || "").trim();
      const submitAssignees = draftAssignee
        ? [...assignees, draftAssignee].filter(Boolean)
        : [...assignees];
      const assignee = submitAssignees.join(", ");
      const severity = qs(taskModal, '[data-f="severity"]').value;
      const column_id = qs(taskModal, '[data-f="column"]').value;
      const tagsRaw = qs(taskModal, '[data-f="tags"]').value.trim();
      const tags = tagsRaw
        ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 10)
        : [];
      const keep = !!qs(taskModal, '[data-f="keep"]').checked;

      if (!description) {
        setErr(qs(taskModal, '[data-slot="taskerr"]'), "Description is required.");
        return;
      }

      setErr(qs(taskModal, '[data-slot="taskerr"]'), null);
      const res = await chromeMsg({
        type: "CREATE_TASK_WITH_SCREENSHOT",
        description,
        assignee,
        severity,
        column_id,
        tags,
        page_url: pickedMeta?.page_url,
        page_title: pickedMeta?.page_title,
        selector: pickedMeta?.selector,
        screenshotDataUrl: pickedMeta?.screenshotDataUrl,
      });

      if (!res?.ok) {
        setErr(qs(taskModal, '[data-slot="taskerr"]'), res?.error || "Failed to create task");
        return;
      }
      if (res?.warning) {
        // Non-blocking; task was created but screenshot failed.
        console.warn("[BH-EXT] warning:", res.warning);
      }

      if (keep) {
        await chrome.storage.local.set({
          bh_task_defaults: {
            keep: true,
            assignees: submitAssignees,
            severity,
            column_id,
            tags: tagsRaw,
          },
        });
      } else {
        await chrome.storage.local.remove(["bh_task_defaults"]);
      }

      openTaskModal(false);
      pickedMeta = null;
    }
  });

  // initial auth state
  refreshAuthUI().catch(() => {});
})();

