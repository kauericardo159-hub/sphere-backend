// ==========================================================================
// MÓDULO DE AJUSTES E CUSTOMIZAÇÃO DO CHAT (ajusteschat.js)
// Sphere v5.2 | Canvas Color Engine, 32px Button System & Cloud Wallpapers
// ==========================================================================

(function injetarCssAjustesChat() {
  if (document.getElementById('ajusteschat-css-v52')) return;
  const style = document.createElement('style');
  style.id = 'ajusteschat-css-v52';
  style.textContent = `
    .chat-settings-modal {
      position: fixed; inset: 0; background: rgba(6, 2, 9, 0.93);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); z-index: 2500;
      display: flex; align-items: center; justify-content: center; padding: 14px;
      animation: fadeInChatModal 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes fadeInChatModal {
      from { opacity: 0; transform: scale(0.96) translateY(8px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .chat-modal-box {
      background: linear-gradient(160deg, #180b1b 0%, #100613 100%);
      border: 1px solid rgba(255, 45, 85, 0.35);
      border-radius: 24px; width: 100%; max-width: 560px; max-height: 92vh; overflow-y: auto;
      padding: 22px; display: flex; flex-direction: column; gap: 16px;
      box-shadow: 0 25px 65px rgba(0,0,0,0.95), 0 0 35px rgba(255, 45, 85, 0.2);
      box-sizing: border-box; color: #ffffff;
    }

    .chat-modal-box::-webkit-scrollbar { width: 6px; }
    .chat-modal-box::-webkit-scrollbar-thumb {
      background: rgba(255, 45, 85, 0.4); border-radius: 4px;
    }

    /* Header */
    .chat-modal-header {
      font-size: 1.15rem; font-weight: 900; color: #fff;
      display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08); padding-bottom: 12px;
    }

    .chat-modal-header span {
      display: flex; align-items: center; gap: 10px;
      background: linear-gradient(135deg, #ffffff 0%, #ff2d55 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }

    /* Botão Fechar de 32px */
    .btn-ajustes-close {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.1); color: #d1c4d6;
      width: 32px !important; height: 32px !important;
      min-width: 32px !important; max-width: 32px !important;
      border-radius: 50% !important; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 0.85rem; transition: all 0.2s ease; padding: 0; flex-shrink: 0;
    }

    .btn-ajustes-close:hover {
      background: #ff2d55; color: #ffffff; border-color: #ff2d55;
      transform: rotate(90deg) scale(1.08); box-shadow: 0 0 12px rgba(255, 45, 85, 0.5);
    }
    
    /* Navigation Tabs */
    .chat-settings-tabs {
      display: flex; gap: 6px; background: rgba(0, 0, 0, 0.4);
      padding: 5px; border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .chat-tab-btn {
      flex: 1; height: 32px; padding: 0 8px; font-size: 0.75rem; font-weight: 800; color: #a897b0;
      background: transparent; border: 1px solid transparent; border-radius: 10px; cursor: pointer;
      transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 6px;
      white-space: nowrap; text-transform: uppercase; letter-spacing: 0.4px;
    }

    .chat-tab-btn:hover:not(.active) { color: #fff; background: rgba(255, 255, 255, 0.04); }

    .chat-tab-btn.active {
      background: linear-gradient(135deg, #ff2d55, #d81b43); color: #fff;
      border-color: rgba(255, 45, 85, 0.5); box-shadow: 0 4px 15px rgba(255, 45, 85, 0.35);
    }

    .chat-setting-group { display: flex; flex-direction: column; gap: 8px; }
    .chat-setting-group label {
      font-size: 0.8rem; font-weight: 800; color: #d6c5dc;
      display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.5px;
    }

    /* Selector Box */
    .custom-color-selector-box {
      background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px; padding: 14px; display: flex; flex-direction: column; gap: 12px;
    }

    .color-target-selector-tabs {
      display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none;
    }
    .color-target-selector-tabs::-webkit-scrollbar { display: none; }

    .color-target-pill {
      height: 32px; padding: 0 12px; border-radius: 16px; font-size: 0.75rem; font-weight: 800;
      background: rgba(255, 255, 255, 0.05); color: #b3a5b8; border: 1px solid rgba(255,255,255,0.08);
      cursor: pointer; white-space: nowrap; transition: all 0.2s; flex-shrink: 0;
      display: inline-flex; align-items: center; justify-content: center;
    }

    .color-target-pill.active {
      background: #ff2d55; color: #fff; border-color: #ff2d55;
      box-shadow: 0 0 12px rgba(255, 45, 85, 0.4);
    }

    /* Canvas Map & Controls */
    .canvas-picker-container { display: flex; flex-direction: column; gap: 10px; align-items: center; }

    .color-canvas-map {
      width: 100%; height: 120px; border-radius: 12px; cursor: crosshair;
      border: 1px solid rgba(255, 255, 255, 0.15); touch-action: none;
      box-shadow: inset 0 0 10px rgba(0,0,0,0.8);
    }

    .color-hue-slider {
      width: 100%; height: 10px; border-radius: 6px; outline: none; appearance: none;
      background: linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
      cursor: pointer;
    }

    .color-quick-swatches {
      display: grid; grid-template-columns: repeat(8, 1fr); gap: 8px; align-items: center; width: 100%;
    }

    .swatch-circle {
      width: 28px; height: 28px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.2);
      cursor: pointer; transition: all 0.2s ease; margin: auto;
    }
    .swatch-circle:hover { transform: scale(1.2); border-color: #fff; box-shadow: 0 0 10px rgba(255,255,255,0.5); }

    .color-hex-input-row { display: flex; align-items: center; gap: 10px; width: 100%; }

    .color-hex-input-row input[type="text"] {
      flex: 1; height: 32px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
      border-radius: 10px; padding: 0 12px; color: #fff; font-size: 0.85rem; font-weight: 800;
      outline: none; text-transform: uppercase; box-sizing: border-box;
    }

    .color-hex-preview-badge {
      width: 32px; height: 32px; border-radius: 8px; border: 1.5px solid rgba(255,255,255,0.2);
      flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.5);
    }

    /* Presets Grid */
    .chat-presets-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }

    .chat-preset-card {
      padding: 10px; border-radius: 14px; font-size: 0.75rem; font-weight: 800; text-align: center;
      cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.12); transition: all 0.2s ease;
      display: flex; flex-direction: column; gap: 4px; align-items: center; justify-content: center;
    }
    .chat-preset-card:hover { transform: translateY(-3px); border-color: #ff2d55; box-shadow: 0 6px 15px rgba(0,0,0,0.6); }
    .chat-preset-badge { font-size: 0.65rem; opacity: 0.85; text-transform: uppercase; }

    /* Live Preview */
    .chat-bubble-live-preview {
      padding: 16px; border-radius: 18px; background: rgba(0, 0, 0, 0.45);
      border: 1px dashed rgba(255, 45, 85, 0.4); display: flex; flex-direction: column; gap: 8px;
    }

    .preview-bubble-sample {
      align-self: flex-end; padding: 12px 16px; border-radius: 18px; border-bottom-right-radius: 4px;
      font-size: 0.9rem; font-weight: 600; max-width: 85%; transition: all 0.25s ease; box-sizing: border-box;
      word-break: break-word; box-shadow: 0 4px 15px rgba(0,0,0,0.4);
    }

    .chat-select-custom {
      width: 100%; height: 32px; background: rgba(8, 3, 11, 0.65); border: 1px solid rgba(255, 255, 255, 0.12);
      color: #fff; padding: 0 10px; border-radius: 10px; outline: none; font-size: 0.8rem; font-weight: 700;
      box-sizing: border-box;
    }
    .chat-select-custom option { background: #180b1b; color: #fff; padding: 8px; }

    /* Saved Bubbles */
    .saved-bubbles-list {
      display: flex; flex-direction: column; gap: 8px; max-height: 220px; overflow-y: auto;
    }

    .saved-bubble-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 12px; background: rgba(255,255,255,0.04); border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.08); transition: all 0.2s ease;
    }
    .saved-bubble-item:hover { background: rgba(255,255,255,0.08); border-color: rgba(255,45,85,0.3); }
    .saved-bubble-item span { font-size: 0.82rem; font-weight: 800; color: #fff; }
    .saved-bubble-actions { display: flex; gap: 6px; }

    /* Botões de Ação para Salvos de 32px */
    .btn-saved-action {
      width: 32px !important; height: 32px !important;
      min-width: 32px !important; max-width: 32px !important;
      border-radius: 50% !important; background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255, 255, 255, 0.1); color: #b3a5b8; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 0.82rem; transition: all 0.2s ease; padding: 0;
    }
    .btn-saved-action:hover { background: #ff2d55; color: #fff; border-color: #ff2d55; transform: scale(1.08); }
    .btn-saved-action.danger:hover { background: #ff4757; color: #fff; border-color: #ff4757; }

    /* Botões de Ação Principais e Secundários em 32px de Altura */
    .chat-btn-action-main {
      height: 32px !important; background: linear-gradient(135deg, #ff2d55 0%, #d81b43 100%);
      color: #ffffff; border: none; padding: 0 16px; border-radius: 16px; font-weight: 800;
      font-size: 0.78rem; cursor: pointer; transition: all 0.2s ease; text-transform: uppercase;
      letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(255, 45, 85, 0.35);
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    }
    .chat-btn-action-main:hover {
      background: linear-gradient(135deg, #ff4369 0%, #ff2d55 100%); transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(255, 45, 85, 0.5);
    }

    .chat-btn-action-sec {
      height: 32px !important; background: rgba(255, 255, 255, 0.06); color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.12); padding: 0 16px; border-radius: 16px;
      font-weight: 800; font-size: 0.78rem; cursor: pointer; transition: all 0.2s ease;
      text-transform: uppercase; letter-spacing: 0.5px;
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
    }
    .chat-btn-action-sec:hover { background: rgba(255, 255, 255, 0.12); transform: translateY(-1px); }

    /* Wallpaper Upload Box */
    .wallpaper-upload-box {
      background: rgba(0, 0, 0, 0.35); border: 2px dashed rgba(255, 45, 85, 0.35);
      border-radius: 18px; padding: 18px; text-align: center; display: flex;
      flex-direction: column; align-items: center; gap: 10px; cursor: pointer;
      transition: all 0.25s ease;
    }
    .wallpaper-upload-box:hover {
      border-color: #ff2d55; background: rgba(255, 45, 85, 0.05); transform: translateY(-2px);
    }
    .wallpaper-upload-box i { font-size: 1.8rem; color: #ff2d55; }
    .wallpaper-upload-title { font-size: 0.85rem; font-weight: 800; color: #fff; }
    .wallpaper-upload-desc { font-size: 0.72rem; color: #a897b0; }

    @media (max-width: 480px) {
      .chat-modal-box { padding: 16px; border-radius: 20px; gap: 14px; }
      .chat-presets-grid { grid-template-columns: repeat(2, 1fr); }
      .chat-settings-tabs { padding: 4px; }
      .chat-tab-btn { height: 32px; font-size: 0.7rem; }
    }
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

function acionarVibracaoTatilAjustes(ms = 12) {
  if (typeof window !== 'undefined' && window.navigator && typeof window.navigator.vibrate === 'function') {
    try { window.navigator.vibrate(ms); } catch (e) {}
  }
}

function obterSupabaseAjustes() {
  return window.supabaseClient || window.supabase || window.sb || null;
}

function obterUsuarioLogadoAjustes() {
  try {
    const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("[AjustesChat] Erro ao obter usuário do storage:", e);
  }
  return null;
}

function abrirModalAjustesChat() {
  acionarVibracaoTatilAjustes(15);
  const antigo = document.getElementById('chat-settings-modal');
  if (antigo) antigo.remove();

  const modal = document.createElement('div');
  modal.id = 'chat-settings-modal';
  modal.className = 'chat-settings-modal';

  const usuarioLogado = obterUsuarioLogadoAjustes();
  const meId = usuarioLogado ? usuarioLogado.id : 0;

  if (!window.tempChatStyle) {
    let estiloSalvoCloud = {};
    if (usuarioLogado && usuarioLogado.estilo_balao) {
      estiloSalvoCloud = typeof usuarioLogado.estilo_balao === 'string'
        ? JSON.parse(usuarioLogado.estilo_balao)
        : usuarioLogado.estilo_balao;
    }

    const bgLocal = localStorage.getItem(`chat_style_bg_${meId}`);
    const bg2Local = localStorage.getItem(`chat_style_bg2_${meId}`);

    window.tempChatStyle = {
      bg: estiloSalvoCloud.bg_simple || estiloSalvoCloud.bg || bgLocal || '#ff2d55',
      bg2: estiloSalvoCloud.bg2_simple || estiloSalvoCloud.bg2 || bg2Local || '#ff7675',
      text: estiloSalvoCloud.text || localStorage.getItem(`chat_style_text_${meId}`) || '#ffffff',
      border: estiloSalvoCloud.border || localStorage.getItem(`chat_style_border_${meId}`) || '#ff2d55',
      radius: estiloSalvoCloud.radius || localStorage.getItem(`chat_style_radius_${meId}`) || '16px',
      font: estiloSalvoCloud.font || localStorage.getItem(`chat_style_font_${meId}`) || 'inherit'
    };
  }

  modal.innerHTML = `
    <div class="chat-modal-box">
      <div class="chat-modal-header">
        <span><i class="fa-solid fa-wand-magic-sparkles" style="color:#ff2d55;"></i> Personalizar Chat</span>
        <button class="btn-ajustes-close" onclick="fecharModalAjustesChat()" title="Fechar"><i class="fa-solid fa-xmark"></i></button>
      </div>

      <div class="chat-settings-tabs">
        <button class="chat-tab-btn ${abaAtivaAjustes === 'estilo' ? 'active' : ''}" onclick="mudarAbaAjustes('estilo')"><i class="fa-solid fa-paint-roller"></i> Balão & Cores</button>
        <button class="chat-tab-btn ${abaAtivaAjustes === 'salvos' ? 'active' : ''}" onclick="mudarAbaAjustes('salvos')"><i class="fa-solid fa-bookmark"></i> Estilos Salvos</button>
        <button class="chat-tab-btn ${abaAtivaAjustes === 'fundo' ? 'active' : ''}" onclick="mudarAbaAjustes('fundo')"><i class="fa-solid fa-image"></i> Papel de Parede</button>
      </div>

      <div class="chat-setting-group">
        <div class="chat-bubble-live-preview">
          <div class="preview-bubble-sample" id="chat-live-bubble-sample">
            Visualização em tempo real do seu balão! ✨
          </div>
        </div>
      </div>

      <div id="tab-content-estilo" style="display: ${abaAtivaAjustes === 'estilo' ? 'flex' : 'none'}; flex-direction: column; gap: 14px;">
        <div class="chat-setting-group">
          <label><i class="fa-solid fa-bolt" style="color:#f1c40f;"></i> Presets Prontos</label>
          <div class="chat-presets-grid">
            <div class="chat-preset-card" style="background: linear-gradient(135deg, #ff2d55, #ff7675); color: #fff;" onclick="aplicarPresetConfig('#ff2d55', '#ff7675', '#ffffff', '#ff7675')">
              <span>Cyber Rose</span><span class="chat-preset-badge">Degradê</span>
            </div>
            <div class="chat-preset-card" style="background: linear-gradient(135deg, #6c5ce7, #a29bfe); color: #fff;" onclick="aplicarPresetConfig('#6c5ce7', '#a29bfe', '#ffffff', '#a29bfe')">
              <span>Purple Wave</span><span class="chat-preset-badge">Degradê</span>
            </div>
            <div class="chat-preset-card" style="background: rgba(255,255,255,0.08); color: #fff; border:1px solid rgba(255,255,255,0.3);" onclick="aplicarPresetConfig('rgba(255,255,255,0.08)', 'rgba(255,255,255,0.08)', '#ffffff', 'rgba(255,255,255,0.3)')">
              <span>Glass Neon</span><span class="chat-preset-badge">Transparente</span>
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
          <div style="display:flex; gap:10px;">
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

        <div style="display:flex; gap:10px; margin-top: 4px;">
          <input type="text" id="input-nome-balaow" placeholder="Nome do estilo (ex: Cyber Rose)" style="flex:1; height: 32px; padding: 0 12px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); color:#fff; outline:none; font-size:0.8rem; font-weight:700; box-sizing:border-box;" />
          <button class="chat-btn-action-main" onclick="salvarBalaoNaMinhaLista()"><i class="fa-solid fa-bookmark"></i> ${idBalaoEmEdicao ? 'Atualizar' : 'Salvar'}</button>
        </div>
      </div>

      <div id="tab-content-salvos" style="display: ${abaAtivaAjustes === 'salvos' ? 'flex' : 'none'}; flex-direction: column; gap: 12px;">
        <label><i class="fa-solid fa-list" style="color:#ff2d55;"></i> Seus Balões Personalizados</label>
        <div class="saved-bubbles-list" id="saved-bubbles-container"></div>
      </div>

      <div id="tab-content-fundo" style="display: ${abaAtivaAjustes === 'fundo' ? 'flex' : 'none'}; flex-direction: column; gap: 14px;">
        <label><i class="fa-solid fa-image" style="color:#ff2d55;"></i> Papel de Parede da Conversa Ativa</label>
        
        <input type="file" id="chat-bg-file-local" accept="image/*,image/gif" style="display:none;" onchange="processarUploadSeguroWallpaper(this)">
        
        <div class="wallpaper-upload-box" onclick="document.getElementById('chat-bg-file-local').click()">
          <i class="fa-solid fa-cloud-arrow-up"></i>
          <div class="wallpaper-upload-title">Enviar Imagem ou GIF da Galeria</div>
          <div class="wallpaper-upload-desc">Os arquivos são otimizados e mantidos com segurança na sua nuvem.</div>
        </div>

        <button class="chat-btn-action-sec" style="width: 100%;" onclick="removerPapelParedeAtual()"><i class="fa-solid fa-trash"></i> Remover Papel de Parede Ativo</button>
      </div>

      <div style="display: flex; gap: 10px; margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px;">
        <button class="chat-btn-action-main" style="flex:1;" onclick="salvarEstiloBalãoSupabase()"><i class="fa-solid fa-check"></i> Aplicar e Salvar Balão</button>
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

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = Math.max(0, Math.min((clientX - rect.left) * scaleX, canvas.width - 1));
    const y = Math.max(0, Math.min((clientY - rect.top) * scaleY, canvas.height - 1));

    const imgData = ctx.getImageData(x, y, 1, 1).data;
    const hex = `#${((1 << 24) + (imgData[0] << 16) + (imgData[1] << 8) + imgData[2]).toString(16).slice(1)}`;

    selecionarCorDoPickerProprio(hex);
  }

  let isDragging = false;
  canvas.onmousedown = (e) => { isDragging = true; pickColor(e); };
  canvas.onmousemove = (e) => { if (isDragging) pickColor(e); };
  window.onmouseup = () => { isDragging = false; };

  canvas.ontouchstart = (e) => { isDragging = true; pickColor(e); };
  canvas.ontouchmove = (e) => { if (isDragging) pickColor(e); };
  window.ontouchend = () => { isDragging = false; };
}

function atualizarMatizCanvas(val) {
  hueAtualCanvas = val;
  inicializarCanvasPicker();
}

function alternarCanalCor(canal) {
  acionarVibracaoTatilAjustes(10);
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
  acionarVibracaoTatilAjustes(10);
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
  acionarVibracaoTatilAjustes(12);
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
      lista[idx] = { id: idBalaoEmEdicao, nome: nome, ...window.tempChatStyle };
    }
    idBalaoEmEdicao = null;
  } else {
    lista.push({ id: Date.now(), nome: nome, ...window.tempChatStyle });
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
    container.innerHTML = `<p style="font-size:0.8rem; color:#b3a5b8; text-align:center; padding: 10px;">Nenhum estilo salvo ainda.</p>`;
    return;
  }

  container.innerHTML = lista.map((item, idx) => `
    <div class="saved-bubble-item">
      <span>${item.nome}</span>
      <div class="saved-bubble-actions">
        <button class="btn-saved-action" onclick="usarBalaoSalvo(${idx})" title="Usar"><i class="fa-solid fa-check"></i></button>
        <button class="btn-saved-action" onclick="editarBalaoSalvo(${idx})" title="Editar"><i class="fa-solid fa-pen"></i></button>
        <button class="btn-saved-action danger" onclick="removerBalaoSalvo(${idx})" title="Excluir"><i class="fa-solid fa-trash"></i></button>
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

async function salvarEstiloBalãoSupabase() {
  const usuarioLogado = obterUsuarioLogadoAjustes();
  const sb = obterSupabaseAjustes();

  if (!usuarioLogado || !usuarioLogado.id) {
    alert("Sessão não encontrada. Faça login para salvar.");
    return;
  }

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

  usuarioLogado.estilo_balao = estiloObj;
  localStorage.setItem('usuario_logado', JSON.stringify(usuarioLogado));
  localStorage.setItem(`chat_style_me_${usuarioLogado.id}`, JSON.stringify(estiloObj));

  if (sb) {
    try {
      await sb
        .from('usuarios')
        .update({ estilo_balao: estiloObj })
        .eq('id', Number(usuarioLogado.id));
    } catch (err) {
      console.error("[AjustesChat] Erro ao sincronizar estilo no Supabase:", err);
    }
  }

  if (window.chatTargetAtual && typeof window.carregarMensagensFeedSilencioso === 'function') {
    window.carregarMensagensFeedSilencioso(Number(window.chatTargetAtual.id));
  }

  fecharModalAjustesChat();
}

async function processarUploadSeguroWallpaper(input) {
  if (!input.files || !input.files[0]) return;

  const file = input.files[0];
  const sb = obterSupabaseAjustes();
  const usuarioLogado = obterUsuarioLogadoAjustes();

  let wallpaperUrl = '';

  if (sb && usuarioLogado) {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `wallpapers/user_${usuarioLogado.id}_${Date.now()}.${fileExt}`;

      const { data, error } = await sb.storage
        .from('wallpapers')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (!error && data) {
        const { data: publicUrlData } = sb.storage.from('wallpapers').getPublicUrl(filePath);
        if (publicUrlData && publicUrlData.publicUrl) {
          wallpaperUrl = publicUrlData.publicUrl;
        }
      }
    } catch (e) {
      console.warn("[AjustesChat] Storage indisponível, gerando DataURL local:", e);
    }
  }

  if (!wallpaperUrl) {
    wallpaperUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  aplicarPapelParedeChat(wallpaperUrl);
}

function aplicarPapelParedeChat(url) {
  const targetId = window.chatTargetAtual ? window.chatTargetAtual.id : 'global';
  const usuarioLogado = obterUsuarioLogadoAjustes();
  const meId = usuarioLogado ? usuarioLogado.id : '0';

  const storageKey = `chat_bg_${meId}_target_${targetId}`;

  if (!url || url === 'none') {
    localStorage.removeItem(storageKey);
  } else {
    localStorage.setItem(storageKey, url);
  }

  aplicarAjustesChatSalvos();
  fecharModalAjustesChat();
}

function removerPapelParedeAtual() {
  aplicarPapelParedeChat('none');
}

function aplicarAjustesChatSalvos() {
  const chatWindow = document.getElementById('chat-window-box') || document.querySelector('.chat-window');
  if (!chatWindow) return;

  const usuarioLogado = obterUsuarioLogadoAjustes();
  const meId = usuarioLogado ? usuarioLogado.id : '0';
  const targetId = window.chatTargetAtual ? window.chatTargetAtual.id : 'global';

  const savedBg = localStorage.getItem(`chat_bg_${meId}_target_${targetId}`);
  if (savedBg) {
    chatWindow.style.backgroundImage = `url('${savedBg}')`;
    chatWindow.style.backgroundSize = 'cover';
    chatWindow.style.backgroundPosition = 'center';
  } else {
    chatWindow.style.backgroundImage = 'none';
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
window.salvarEstiloBalãoSupabase = salvarEstiloBalãoSupabase;
window.processarUploadSeguroWallpaper = processarUploadSeguroWallpaper;
window.removerPapelParedeAtual = removerPapelParedeAtual;
window.aplicarAjustesChatSalvos = aplicarAjustesChatSalvos;
