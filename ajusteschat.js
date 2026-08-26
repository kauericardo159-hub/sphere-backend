// ==========================================================================
// AJUSTES CHAT MODULE (ajusteschat.js) - CANVAS COLOR PICKER & SUPABASE
// Project Z v5.0 | Custom Wallpapers, Realtime Preview & Cloud Sync
// ==========================================================================

(function injetarCssAjustesChat() {
  if (document.getElementById('ajusteschat-css')) return;
  const style = document.createElement('style');
  style.id = 'ajusteschat-css';
  style.textContent = `
    .chat-settings-modal {
      position: fixed; inset: 0; background: rgba(5, 2, 8, 0.92);
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); z-index: 2500;
      display: flex; align-items: center; justify-content: center; padding: 12px;
      animation: fadeInModal 0.22s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes fadeInModal {
      from { opacity: 0; transform: scale(0.96); }
      to { opacity: 1; transform: scale(1); }
    }

    .chat-modal-box {
      background: #140b17; border: 1px solid rgba(255, 45, 85, 0.3);
      border-radius: 20px; width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto;
      padding: 18px; display: flex; flex-direction: column; gap: 14px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.95), 0 0 30px rgba(255, 45, 85, 0.15);
      box-sizing: border-box;
    }

    .chat-modal-box::-webkit-scrollbar {
      width: 6px;
    }
    .chat-modal-box::-webkit-scrollbar-thumb {
      background: rgba(255, 45, 85, 0.3);
      border-radius: 4px;
    }

    /* Header e Botão (X) Circular Otimizado */
    .chat-modal-header {
      font-size: 1.05rem; font-weight: 800; color: #fff;
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 10px;
    }

    .btn-ajustes-close {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #d1c4d6;
      width: 32px; height: 32px; min-width: 32px; max-width: 32px;
      border-radius: 50%; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 0.85rem; transition: all 0.2s ease; padding: 0; flex-shrink: 0;
    }

    .btn-ajustes-close:hover {
      background: var(--chat-accent, #ff2d55);
      color: #ffffff; border-color: var(--chat-accent, #ff2d55);
      transform: scale(1.05);
    }
    
    /* Abas do Painel */
    .chat-settings-tabs {
      display: flex; gap: 6px; background: rgba(0, 0, 0, 0.3);
      padding: 4px; border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .chat-tab-btn {
      flex: 1; padding: 8px 6px; font-size: 0.76rem; font-weight: 700; color: #b3a5b8;
      background: transparent; border: none; border-radius: 10px; cursor: pointer;
      transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 6px;
      white-space: nowrap;
    }

    .chat-tab-btn.active {
      background: rgba(255, 45, 85, 0.25); color: #fff; border: 1px solid var(--chat-accent, #ff2d55);
    }

    .chat-setting-group { display: flex; flex-direction: column; gap: 8px; }
    .chat-setting-group label {
      font-size: 0.8rem; font-weight: 700; color: #e6d8eb;
      display: flex; align-items: center; gap: 6px;
    }

    /* Seletor Customizado por Canvas */
    .custom-color-selector-box {
      background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px; padding: 12px; display: flex; flex-direction: column; gap: 10px;
    }

    .color-target-selector-tabs {
      display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px;
      scrollbar-width: none;
    }
    .color-target-selector-tabs::-webkit-scrollbar { display: none; }

    .color-target-pill {
      padding: 5px 10px; border-radius: 16px; font-size: 0.72rem; font-weight: 700;
      background: rgba(255, 255, 255, 0.05); color: #b3a5b8; border: 1px solid transparent;
      cursor: pointer; white-space: nowrap; transition: all 0.2s; flex-shrink: 0;
    }

    .color-target-pill.active {
      background: rgba(255, 45, 85, 0.2); color: #fff; border-color: var(--chat-accent, #ff2d55);
    }

    /* Canvas Interativo */
    .canvas-picker-container {
      display: flex; flex-direction: column; gap: 8px; align-items: center;
    }

    .color-canvas-map {
      width: 100%; height: 120px; border-radius: 10px; cursor: crosshair;
      border: 1px solid rgba(255, 255, 255, 0.15); touch-action: none;
    }

    .color-hue-slider {
      width: 100%; height: 12px; border-radius: 6px; outline: none; appearance: none;
      background: linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
      cursor: pointer;
    }

    /* Paleta de Cores Rápidas */
    .color-quick-swatches {
      display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px; align-items: center; width: 100%;
    }

    .swatch-circle {
      width: 26px; height: 26px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2);
      cursor: pointer; transition: transform 0.15s ease, border-color 0.15s; margin: auto;
    }
    .swatch-circle:hover { transform: scale(1.15); border-color: #fff; }

    .color-hex-input-row {
      display: flex; align-items: center; gap: 8px; width: 100%;
    }

    .color-hex-input-row input[type="text"] {
      flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
      border-radius: 10px; padding: 6px 10px; color: #fff; font-size: 0.8rem; font-weight: 700;
      outline: none;
    }

    .color-hex-preview-badge {
      width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); flex-shrink: 0;
    }

    /* Presets */
    .chat-presets-grid {
      display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
    }

    .chat-preset-card {
      padding: 8px; border-radius: 12px; font-size: 0.72rem; font-weight: 700; text-align: center;
      cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.12); transition: all 0.15s ease;
      display: flex; flex-direction: column; gap: 2px; align-items: center;
    }
    .chat-preset-card:hover { transform: translateY(-2px); border-color: var(--chat-accent, #ff2d55); }
    .chat-preset-badge { font-size: 0.62rem; opacity: 0.8; }

    /* Live Preview do Balão */
    .chat-bubble-live-preview {
      padding: 14px; border-radius: 16px; background: rgba(0, 0, 0, 0.4);
      border: 1px dashed rgba(255, 45, 85, 0.3); display: flex; flex-direction: column; gap: 8px;
    }

    .preview-bubble-sample {
      align-self: flex-end; padding: 10px 14px; border-radius: 16px; border-bottom-right-radius: 4px;
      font-size: 0.88rem; max-width: 85%; transition: all 0.2s ease; box-sizing: border-box;
      word-break: break-word;
    }
    
    .chat-select-custom {
      width: 100%; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.12);
      color: #fff; padding: 8px 10px; border-radius: 10px; outline: none; font-size: 0.8rem;
    }
    .chat-select-custom option { background: #160d19; color: #fff; }

    /* Balões Salvos */
    .saved-bubbles-list {
      display: flex; flex-direction: column; gap: 6px; max-height: 200px; overflow-y: auto;
    }

    .saved-bubble-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 10px; background: rgba(255,255,255,0.04); border-radius: 10px;
      border: 1px solid rgba(255,255,255,0.08);
    }
    .saved-bubble-item span { font-size: 0.78rem; font-weight: 700; color: #fff; }
    .saved-bubble-actions { display: flex; gap: 4px; }

    .btn-saved-action {
      background: transparent; border: none; color: #b3a5b8; cursor: pointer; padding: 4px; font-size: 0.85rem;
    }
    .btn-saved-action:hover { color: var(--chat-accent, #ff2d55); }

    .chat-btn-action-main {
      background: var(--chat-accent, #ff2d55); color: #ffffff; border: none;
      padding: 10px; border-radius: 12px; font-weight: 700; font-size: 0.82rem;
      cursor: pointer; transition: all 0.2s ease;
    }
    .chat-btn-action-main:hover { background: #e02648; }

    .chat-btn-action-sec {
      background: rgba(255, 255, 255, 0.08); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.15);
      padding: 10px; border-radius: 12px; font-weight: 700; font-size: 0.82rem;
      cursor: pointer; transition: all 0.2s ease;
    }
    .chat-btn-action-sec:hover { background: rgba(255, 255, 255, 0.15); }
  `;
  document.head.appendChild(style);
})();

let abaAtivaAjustes = 'estilo';
let canalCorAtivo = 'bg';
let hueAtualCanvas = 0;
let idBalaoEmEdicao = null;

const paletaCoresPredefinidas = [
  '#ff2d55', '#ff7675', '#6c5ce7', '#a29bfe',
  '#00b894', '#55efc4', '#fdcb6e', '#e17055',
  '#00d2d3', '#1e90ff', '#fd79a8', '#e84393',
  '#ffffff', '#d1c4d6', '#2d3436', '#0f0812'
];

function obterSupabaseAjustes() {
  return window.supabaseClient || window.supabase || window.sb || null;
}

function abrirModalAjustesChat() {
  const antigo = document.getElementById('chat-settings-modal');
  if (antigo) antigo.remove();

  const modal = document.createElement('div');
  modal.id = 'chat-settings-modal';
  modal.className = 'chat-settings-modal';

  const usuarioLogado = typeof window.obterUsuarioLogadoChat === 'function' ? window.obterUsuarioLogadoChat() : null;
  const meId = usuarioLogado ? usuarioLogado.id : 0;

  if (!window.tempChatStyle) {
    let estiloSalvoCloud = {};
    if (usuarioLogado && usuarioLogado.estilo_balao) {
      estiloSalvoCloud = usuarioLogado.estilo_balao;
    }

    window.tempChatStyle = {
      bg: estiloSalvoCloud.bg || localStorage.getItem(`chat_style_bg_${meId}`) || '#ff2d55',
      bg2: estiloSalvoCloud.bg2 || localStorage.getItem(`chat_style_bg2_${meId}`) || '#ff7675',
      text: estiloSalvoCloud.text || localStorage.getItem(`chat_style_text_${meId}`) || '#ffffff',
      border: estiloSalvoCloud.border || localStorage.getItem(`chat_style_border_${meId}`) || '#ff2d55',
      radius: estiloSalvoCloud.radius || localStorage.getItem(`chat_style_radius_${meId}`) || '16px',
      font: estiloSalvoCloud.font || localStorage.getItem(`chat_style_font_${meId}`) || 'inherit'
    };
  }

  modal.innerHTML = `
    <div class="chat-modal-box">
      <div class="chat-modal-header">
        <span><i class="fa-solid fa-wand-magic-sparkles" style="color:#ff2d55;"></i> Estilo & Customização</span>
        <button class="btn-ajustes-close" onclick="fecharModalAjustesChat()" title="Fechar"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="chat-settings-tabs">
        <button class="chat-tab-btn ${abaAtivaAjustes === 'estilo' ? 'active' : ''}" onclick="mudarAbaAjustes('estilo')"><i class="fa-solid fa-paint-roller"></i> Balão & Cores</button>
        <button class="chat-tab-btn ${abaAtivaAjustes === 'salvos' ? 'active' : ''}" onclick="mudarAbaAjustes('salvos')"><i class="fa-solid fa-bookmark"></i> Balões Salvos</button>
        <button class="chat-tab-btn ${abaAtivaAjustes === 'fundo' ? 'active' : ''}" onclick="mudarAbaAjustes('fundo')"><i class="fa-solid fa-image"></i> Papel de Parede</button>
      </div>

      <div class="chat-setting-group">
        <div class="chat-bubble-live-preview">
          <div class="preview-bubble-sample" id="chat-live-bubble-sample">
            Exemplo de texto da sua conversa! ✨
          </div>
        </div>
      </div>

      <div id="tab-content-estilo" style="display: ${abaAtivaAjustes === 'estilo' ? 'flex' : 'none'}; flex-direction: column; gap: 12px;">
        <div class="chat-setting-group">
          <label><i class="fa-solid fa-bolt" style="color:#f1c40f;"></i> Presets de Balões</label>
          <div class="chat-presets-grid">
            <div class="chat-preset-card" style="background: linear-gradient(135deg, #ff2d55, #ff7675); color: #fff;" onclick="aplicarPresetConfig('#ff2d55', '#ff7675', '#ffffff', '#ff7675')">
              <span>Cyber Neon</span><span class="chat-preset-badge">Degradê</span>
            </div>
            <div class="chat-preset-card" style="background: linear-gradient(135deg, #6c5ce7, #a29bfe); color: #fff;" onclick="aplicarPresetConfig('#6c5ce7', '#a29bfe', '#ffffff', '#a29bfe')">
              <span>Purple Wave</span><span class="chat-preset-badge">Degradê</span>
            </div>
            <div class="chat-preset-card" style="background: rgba(255,255,255,0.08); color: #fff; border:1px solid #fff;" onclick="aplicarPresetConfig('rgba(255,255,255,0.08)', 'rgba(255,255,255,0.08)', '#ffffff', 'rgba(255,255,255,0.3)')">
              <span>Glassmorphism</span><span class="chat-preset-badge">Transp.</span>
            </div>
          </div>
        </div>

        <div class="chat-setting-group">
          <label><i class="fa-solid fa-palette" style="color:#ff2d55;"></i> Canvas Color Picker</label>
          
          <div class="custom-color-selector-box">
            <div class="color-target-selector-tabs">
              <button class="color-target-pill ${canalCorAtivo === 'bg' ? 'active' : ''}" onclick="alternarCanalCor('bg')">Cor 1 (Fundo)</button>
              <button class="color-target-pill ${canalCorAtivo === 'bg2' ? 'active' : ''}" onclick="alternarCanalCor('bg2')">Cor 2 (Degradê)</button>
              <button class="color-target-pill ${canalCorAtivo === 'text' ? 'active' : ''}" onclick="alternarCanalCor('text')">Texto</button>
              <button class="color-target-pill ${canalCorAtivo === 'border' ? 'active' : ''}" onclick="alternarCanalCor('border')">Borda / Glow</button>
            </div>

            <div class="canvas-picker-container">
              <canvas id="color-picker-canvas" class="color-canvas-map" width="400" height="120"></canvas>
              <input type="range" min="0" max="360" value="0" class="color-hue-slider" id="hue-range-slider" oninput="atualizarMatizCanvas(this.value)">
            </div>

            <div class="color-quick-swatches">
              ${paletaCoresPredefinidas.map(c => `<div class="swatch-circle" style="background: ${c};" onclick="selecionarCorDoPickerProprio('${c}')"></div>`).join('')}
            </div>

            <div class="color-hex-input-row">
              <div class="color-hex-preview-badge" id="current-hex-badge"></div>
              <input type="text" id="custom-hex-input" placeholder="#FFFFFF" oninput="processarInputHexNativo(this.value)" />
            </div>
          </div>
        </div>

        <div class="chat-setting-group">
          <label><i class="fa-solid fa-shapes" style="color:#00d2d3;"></i> Formato e Fonte</label>
          <div style="display:flex; gap:8px;">
            <select class="chat-select-custom" id="chat-picker-radius" onchange="window.tempChatStyle.radius = this.value; atualizarLivePreviewBalao();">
              <option value="16px" ${window.tempChatStyle.radius === '16px' ? 'selected' : ''}>Arredondado Padrão</option>
              <option value="24px" ${window.tempChatStyle.radius === '24px' ? 'selected' : ''}>Pílula Suave</option>
              <option value="6px" ${window.tempChatStyle.radius === '6px' ? 'selected' : ''}>Quadrado Moderno</option>
              <option value="20px 4px 20px 20px" ${window.tempChatStyle.radius.includes('4px') ? 'selected' : ''}>Estilo Gota</option>
            </select>
            <select class="chat-select-custom" id="chat-picker-font" onchange="window.tempChatStyle.font = this.value; atualizarLivePreviewBalao();">
              <option value="inherit" ${window.tempChatStyle.font === 'inherit' ? 'selected' : ''}>Fonte Padrão</option>
              <option value="'Poppins', sans-serif" ${window.tempChatStyle.font.includes('Poppins') ? 'selected' : ''}>Poppins</option>
              <option value="'Courier New', monospace" ${window.tempChatStyle.font.includes('Courier') ? 'selected' : ''}>Retro Code</option>
            </select>
          </div>
        </div>

        <div style="display:flex; gap:8px; margin-top: 4px;">
          <input type="text" id="input-nome-balaow" class="chat-input-text" placeholder="Nome do estilo (ex: Cyber Rose)" style="flex:1; padding: 8px 12px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); color:#fff; outline:none; font-size:0.8rem;" />
          <button class="chat-btn-action-main" style="padding: 0 14px;" onclick="salvarBalaoNaMinhaLista()"><i class="fa-solid fa-plus"></i> ${idBalaoEmEdicao ? 'Atualizar' : 'Salvar'}</button>
        </div>
      </div>

      <div id="tab-content-salvos" style="display: ${abaAtivaAjustes === 'salvos' ? 'flex' : 'none'}; flex-direction: column; gap: 10px;">
        <label><i class="fa-solid fa-list" style="color:#ff2d55;"></i> Seus Balões Salvos</label>
        <div class="saved-bubbles-list" id="saved-bubbles-container"></div>
      </div>

      <div id="tab-content-fundo" style="display: ${abaAtivaAjustes === 'fundo' ? 'flex' : 'none'}; flex-direction: column; gap: 10px;">
        <label><i class="fa-solid fa-image" style="color:#ff2d55;"></i> Papel de Parede da Conversa</label>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="chat-bg-url-input" class="chat-input-text" placeholder="Cole URL de Imagem ou GIF..." style="flex:1; padding: 8px 12px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); color:#fff; outline:none; font-size:0.8rem;" />
          <button class="chat-btn-action-main" onclick="salvarPapelParedeUrl()">Aplicar URL</button>
        </div>
        <input type="file" id="chat-bg-file-local" accept="image/*" style="display:none;" onchange="carregarPapelParedeGaleria(this)">
        <div style="display: flex; gap: 8px;">
          <button class="chat-btn-action-sec" style="flex:1;" onclick="document.getElementById('chat-bg-file-local').click()"><i class="fa-solid fa-folder-open"></i> Da Galeria</button>
          <button class="chat-btn-action-sec" style="flex:1;" onclick="definirPapelParede('none')"><i class="fa-solid fa-trash"></i> Remover Fundo</button>
        </div>
      </div>

      <div style="display: flex; gap: 8px; margin-top: 6px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 10px;">
        <button class="chat-btn-action-main" style="flex:1;" onclick="salvarEstiloCriado(false)">Aplicar Neste Chat</button>
        <button class="chat-btn-action-sec" style="flex:1;" onclick="salvarEstiloCriado(true)">Aplicar Globalmente</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  inicializarCanvasPicker();
  sincronizarExibicaoColorPickerNativo();
  atualizarLivePreviewBalao();
  renderizarBaloesSalvos();
}

function inicializarCanvasPicker() {
  const canvas = document.getElementById('color-picker-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function renderGradient() {
    ctx.fillStyle = `hsl(${hueAtualCanvas}, 100%, 50%)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let whiteGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    whiteGrad.addColorStop(0, 'rgba(255,255,255,1)');
    whiteGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = whiteGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let blackGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    blackGrad.addColorStop(0, 'rgba(0,0,0,0)');
    blackGrad.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = blackGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  renderGradient();

  function pickColor(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : null);
    const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : null);
    if (clientX === null || clientY === null) return;

    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const imgData = ctx.getImageData(Math.max(0, Math.min(x, canvas.width - 1)), Math.max(0, Math.min(y, canvas.height - 1)), 1, 1).data;
    const hex = `#${((1 << 24) + (imgData[0] << 16) + (imgData[1] << 8) + imgData[2]).toString(16).slice(1)}`;
    
    selecionarCorDoPickerProprio(hex);
  }

  let isDragging = false;
  canvas.addEventListener('mousedown', (e) => { isDragging = true; pickColor(e); });
  canvas.addEventListener('mousemove', (e) => { if (isDragging) pickColor(e); });
  window.addEventListener('mouseup', () => { isDragging = false; });

  canvas.addEventListener('touchstart', (e) => { isDragging = true; pickColor(e); }, { passive: true });
  canvas.addEventListener('touchmove', (e) => { if (isDragging) pickColor(e); }, { passive: true });
  window.addEventListener('touchend', () => { isDragging = false; });
}

function atualizarMatizCanvas(val) {
  hueAtualCanvas = val;
  inicializarCanvasPicker();
}

function alternarCanalCor(canal) {
  canalCorAtivo = canal;
  sincronizarExibicaoColorPickerNativo();
}

function sincronizarExibicaoColorPickerNativo() {
  const hexVal = window.tempChatStyle[canalCorAtivo] || '#ffffff';
  const badge = document.getElementById('current-hex-badge');
  const input = document.getElementById('custom-hex-input');

  if (badge) badge.style.background = hexVal;
  if (input) input.value = hexVal;

  const pills = document.querySelectorAll('.color-target-pill');
  pills.forEach(p => p.classList.remove('active'));
  const btnAtivo = Array.from(pills).find(p => p.getAttribute('onclick') && p.getAttribute('onclick').includes(`'${canalCorAtivo}'`));
  if (btnAtivo) btnAtivo.classList.add('active');
}

function selecionarCorDoPickerProprio(hex) {
  window.tempChatStyle[canalCorAtivo] = hex;
  sincronizarExibicaoColorPickerNativo();
  atualizarLivePreviewBalao();
}

function processarInputHexNativo(val) {
  if (val.startsWith('#') && (val.length === 4 || val.length === 7)) {
    window.tempChatStyle[canalCorAtivo] = val;
    const badge = document.getElementById('current-hex-badge');
    if (badge) badge.style.background = val;
    atualizarLivePreviewBalao();
  }
}

function mudarAbaAjustes(aba) {
  abaAtivaAjustes = aba;
  abrirModalAjustesChat();
}

function fecharModalAjustesChat() {
  const modal = document.getElementById('chat-settings-modal');
  if (modal) modal.remove();
}

function atualizarLivePreviewBalao() {
  const sample = document.getElementById('chat-live-bubble-sample');
  if (!sample || !window.tempChatStyle) return;

  const { bg, bg2, text, border, radius, font } = window.tempChatStyle;

  if (bg && bg2 && bg !== bg2) {
    sample.style.background = `linear-gradient(135deg, ${bg}, ${bg2})`;
  } else {
    sample.style.background = bg || '#ff2d55';
  }

  sample.style.color = text || '#ffffff';
  sample.style.border = border ? `1px solid ${border}` : 'none';
  sample.style.borderRadius = radius || '16px';
  sample.style.fontFamily = font || 'inherit';
  sample.style.boxShadow = border ? `0 0 12px ${border}66` : 'none';
}

function aplicarPresetConfig(bg, bg2, text, border) {
  window.tempChatStyle.bg = bg;
  window.tempChatStyle.bg2 = bg2;
  window.tempChatStyle.text = text;
  window.tempChatStyle.border = border;
  
  sincronizarExibicaoColorPickerNativo();
  atualizarLivePreviewBalao();
}

function salvarBalaoNaMinhaLista() {
  const inputNome = document.getElementById('input-nome-balaow');
  const nome = inputNome ? inputNome.value.trim() : '';
  if (!nome) { alert('Digite um nome para o seu estilo de balão!'); return; }

  let lista = JSON.parse(localStorage.getItem('chat_baloes_salvos_usuario') || '[]');

  if (idBalaoEmEdicao) {
    const idx = lista.findIndex(item => item.id === idBalaoEmEdicao);
    if (idx !== -1) {
      lista[idx] = {
        id: idBalaoEmEdicao,
        nome: nome,
        ...window.tempChatStyle
      };
      alert('Estilo atualizado com sucesso!');
    }
    idBalaoEmEdicao = null;
  } else {
    const estiloObj = {
      id: Date.now(),
      nome: nome,
      ...window.tempChatStyle
    };
    lista.push(estiloObj);
    alert('Estilo de balão salvo com sucesso!');
  }

  localStorage.setItem('chat_baloes_salvos_usuario', JSON.stringify(lista));
  if (inputNome) inputNome.value = '';
  mudarAbaAjustes('salvos');
}

function renderizarBaloesSalvos() {
  const container = document.getElementById('saved-bubbles-container');
  if (!container) return;

  const lista = JSON.parse(localStorage.getItem('chat_baloes_salvos_usuario') || '[]');
  if (lista.length === 0) {
    container.innerHTML = `<p style="font-size:0.78rem; color:#b3a5b8; text-align:center;">Nenhum balão salvo ainda.</p>`;
    return;
  }

  container.innerHTML = lista.map((item, idx) => `
    <div class="saved-bubble-item">
      <span>${item.nome}</span>
      <div class="saved-bubble-actions">
        <button class="btn-saved-action" style="color:#2ed573;" onclick="usarBalaoSalvo(${idx})" title="Usar"><i class="fa-solid fa-check"></i></button>
        <button class="btn-saved-action" style="color:#eccc68;" onclick="editarBalaoSalvo(${idx})" title="Editar"><i class="fa-solid fa-pen"></i></button>
        <button class="btn-saved-action" style="color:#ff4757;" onclick="removerBalaoSalvo(${idx})" title="Excluir"><i class="fa-solid fa-trash"></i></button>
      </div>
    </div>
  `).join('');
}

function usarBalaoSalvo(index) {
  const lista = JSON.parse(localStorage.getItem('chat_baloes_salvos_usuario') || '[]');
  const item = lista[index];
  if (!item) return;

  window.tempChatStyle = {
    bg: item.bg,
    bg2: item.bg2 || item.bg,
    text: item.text,
    border: item.border,
    radius: item.radius || '16px',
    font: item.font || 'inherit'
  };

  mudarAbaAjustes('estilo');
}

function editarBalaoSalvo(index) {
  const lista = JSON.parse(localStorage.getItem('chat_baloes_salvos_usuario') || '[]');
  const item = lista[index];
  if (!item) return;

  idBalaoEmEdicao = item.id;
  window.tempChatStyle = {
    bg: item.bg,
    bg2: item.bg2 || item.bg,
    text: item.text,
    border: item.border,
    radius: item.radius || '16px',
    font: item.font || 'inherit'
  };

  mudarAbaAjustes('estilo');
  setTimeout(() => {
    const inputNome = document.getElementById('input-nome-balaow');
    if (inputNome) inputNome.value = item.nome;
  }, 100);
}

function removerBalaoSalvo(index) {
  let lista = JSON.parse(localStorage.getItem('chat_baloes_salvos_usuario') || '[]');
  lista.splice(index, 1);
  localStorage.setItem('chat_baloes_salvos_usuario', JSON.stringify(lista));
  renderizarBaloesSalvos();
}

async function salvarEstiloCriado(aplicarEmTodos) {
  const usuarioLogado = typeof window.obterUsuarioLogadoChat === 'function' ? window.obterUsuarioLogadoChat() : null;
  const clientSupabase = obterSupabaseAjustes();

  if (!usuarioLogado || !clientSupabase) {
    alert("Usuário não autenticado.");
    return;
  }

  const meId = usuarioLogado.id;
  const { bg, bg2, text, border, radius, font } = window.tempChatStyle;

  const estiloObj = {
    bg: (bg && bg2 && bg !== bg2) ? `linear-gradient(135deg, ${bg}, ${bg2})` : (bg || '#ff2d55'),
    bg_simple: bg,
    bg2_simple: bg2,
    text: text || '#ffffff',
    border: border || '',
    radius: radius || '16px',
    font: font || 'inherit'
  };

  // Salva no LocalStorage
  localStorage.setItem(`chat_style_me_${meId}`, JSON.stringify(estiloObj));

  try {
    const { error } = await clientSupabase
      .from('usuarios')
      .update({ estilo_balao: estiloObj })
      .eq('id', meId);

    if (error) throw error;
    alert("Estilo atualizado e salvo na nuvem com sucesso!");
  } catch (err) {
    console.error("[Ajustes] Erro ao salvar estilo no Supabase:", err);
    alert("Estilo aplicado localmente (falha na sincronização cloud).");
  }

  if (typeof window.aplicarAjustesChatSalvos === 'function') window.aplicarAjustesChatSalvos();
  fecharModalAjustesChat();
}

function definirPapelParede(url) {
  if (!window.chatTargetAtual) return;
  const key = `chat_bg_${window.chatTargetAtual.id}`;
  if (url === 'none') localStorage.removeItem(key);
  else localStorage.setItem(key, url);

  if (typeof window.aplicarAjustesChatSalvos === 'function') window.aplicarAjustesChatSalvos();
  fecharModalAjustesChat();
}

function salvarPapelParedeUrl() {
  const input = document.getElementById('chat-bg-url-input');
  if (input && input.value.trim()) definirPapelParede(input.value.trim());
}

async function carregarPapelParedeGaleria(input) {
  if (!input.files || !input.files[0]) return;

  const file = input.files[0];
  const sb = obterSupabaseAjustes();

  if (sb) {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `wallpaper_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { data, error } = await sb.storage
        .from('wallpapers')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (!error && data) {
        const { data: publicUrlData } = sb.storage.from('wallpapers').getPublicUrl(filePath);
        if (publicUrlData && publicUrlData.publicUrl) {
          definirPapelParede(publicUrlData.publicUrl);
          return;
        }
      }
    } catch (e) {
      console.warn("[Ajustes] Fallback para DataURL no papel de parede:", e);
    }
  }

  // Fallback para DataURL caso não envie para o bucket
  const reader = new FileReader();
  reader.onload = (e) => definirPapelParede(e.target.result);
  reader.readAsDataURL(file);
}

function aplicarAjustesChatSalvos() {
  const chatWindow = document.getElementById('chat-window-box') || document.getElementById('chat-messages-feed');
  if (!chatWindow || !window.chatTargetAtual) return;

  const savedBg = localStorage.getItem(`chat_bg_${window.chatTargetAtual.id}`);
  if (savedBg) {
    chatWindow.style.backgroundImage = `url('${savedBg}')`;
    chatWindow.style.backgroundSize = 'cover';
    chatWindow.style.backgroundPosition = 'center';
  } else {
    chatWindow.style.backgroundImage = 'none';
  }

  if (typeof window.carregarMensagensFeedSilencioso === 'function') {
    window.carregarMensagensFeedSilencioso();
  }
}

// Exportações Globais
window.abrirModalAjustesChat = abrirModalAjustesChat;
window.fecharModalAjustesChat = fecharModalAjustesChat;
window.mudarAbaAjustes = mudarAbaAjustes;
window.alternarCanalCor = alternarCanalCor;
window.selecionarCorDoPickerProprio = selecionarCorDoPickerProprio;
window.processarInputHexNativo = processarInputHexNativo;
window.atualizarMatizCanvas = atualizarMatizCanvas;
window.atualizarLivePreviewBalao = atualizarLivePreviewBalao;
window.aplicarPresetConfig = aplicarPresetConfig;
window.salvarBalaoNaMinhaLista = salvarBalaoNaMinhaLista;
window.usarBalaoSalvo = usarBalaoSalvo;
window.editarBalaoSalvo = editarBalaoSalvo;
window.removerBalaoSalvo = removerBalaoSalvo;
window.salvarEstiloCriado = salvarEstiloCriado;
window.definirPapelParede = definirPapelParede;
window.salvarPapelParedeUrl = salvarPapelParedeUrl;
window.carregarPapelParedeGaleria = carregarPapelParedeGaleria;
window.aplicarAjustesChatSalvos = aplicarAjustesChatSalvos;
