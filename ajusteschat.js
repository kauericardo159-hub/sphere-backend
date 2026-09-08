// ==========================================================================
// MÓDULO DE AJUSTES E CUSTOMIZAÇÃO DO CHAT (ajusteschat.js)
// Sphere v5.2 PRO | Cloud Wallpapers Sync, Canvas Color Engine & Dynamic Shapes
// ==========================================================================

(function (global) {
  'use strict';

  let abaAtivaAjustes = 'estilo';
  let canalCorAtivo = 'bg';
  let hueAtualCanvas = 0;
  let idBalaoEmEdicao = null;
  let cropperInstanciaWallpaper = null;

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
    return global.supabaseClient || global.supabase || global.sb || null;
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

  /**
   * Trata o espelhamento de formatos asimétricos (Gota e Chat Clássico)
   * Se for 'me' (minha mensagem), as pontas do balão apontam para a direita.
   * Se for 'other' (mensagem do contato), apontam para a esquerda.
   */
  function obterRadiusEspelhado(radiusStr, eMeu = true) {
    if (!radiusStr) return '16px';
    const r = String(radiusStr).trim();

    // Estilo Gota
    if (r.includes('4px')) {
      return eMeu ? '20px 4px 20px 20px' : '4px 20px 20px 20px';
    }
    // Estilo Chat Clássico
    if (r.includes('2px')) {
      return eMeu ? '18px 18px 2px 18px' : '18px 18px 18px 2px';
    }

    return r;
  }

  async function carregarCropperJSWallpaper() {
    if (window.Cropper) return true;
    return new Promise((resolve) => {
      if (!document.getElementById('cropper-css')) {
        const css = document.createElement('link');
        css.id = 'cropper-css';
        css.rel = 'stylesheet';
        css.href = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.css';
        document.head.appendChild(css);
      }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/cropperjs/1.5.13/cropper.min.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.head.appendChild(script);
    });
  }

  async function sincronizarUsuarioComSupabase() {
    const local = obterUsuarioLogadoAjustes();
    const sb = obterSupabaseAjustes();
    if (!local || !local.id || !sb) return local;

    try {
      const { data, error } = await sb
        .from('usuarios')
        .select('wallpapers_chat, estilo_balao')
        .eq('id', Number(local.id))
        .maybeSingle();

      if (!error && data) {
        local.wallpapers_chat = data.wallpapers_chat || {};
        local.estilo_balao = data.estilo_balao || {};
        localStorage.setItem('usuario_logado', JSON.stringify(local));
      }
    } catch (e) {
      console.warn("[AjustesChat] Erro ao sincronizar dados remotos do usuário:", e);
    }
    return local;
  }

  async function abrirModalAjustesChat() {
    acionarVibracaoTatilAjustes(15);
    const antigo = document.getElementById('chat-settings-modal');
    if (antigo) antigo.remove();

    const usuarioLogado = await sincronizarUsuarioComSupabase();
    const meId = usuarioLogado ? usuarioLogado.id : 0;

    const modal = document.createElement('div');
    modal.id = 'chat-settings-modal';
    modal.className = 'chat-settings-modal';

    let estiloSalvoCloud = {};
    if (usuarioLogado && usuarioLogado.estilo_balao) {
      estiloSalvoCloud = typeof usuarioLogado.estilo_balao === 'string'
        ? JSON.parse(usuarioLogado.estilo_balao)
        : usuarioLogado.estilo_balao;
    }

    const localSaved = localStorage.getItem(`chat_style_me_${meId}`);
    const estiloLocalObj = localSaved ? JSON.parse(localSaved) : {};

    global.tempChatStyle = {
      bg: estiloSalvoCloud.bg_simple || estiloLocalObj.bg_simple || estiloSalvoCloud.bg || '#ff2d55',
      bg2: estiloSalvoCloud.bg2_simple || estiloLocalObj.bg2_simple || estiloSalvoCloud.bg2 || '#ff7675',
      text: estiloSalvoCloud.text || estiloLocalObj.text || '#ffffff',
      border: estiloSalvoCloud.border || estiloLocalObj.border || '#ff2d55',
      border_style: estiloSalvoCloud.border_style || estiloLocalObj.border_style || 'solid',
      radius: estiloSalvoCloud.radius || estiloLocalObj.radius || '16px',
      font: estiloSalvoCloud.font || estiloLocalObj.font || 'inherit'
    };

    const targetId = global.chatTargetAtual ? String(global.chatTargetAtual.id) : 'global';
    let wallpapersMap = {};
    if (usuarioLogado && usuarioLogado.wallpapers_chat) {
      wallpapersMap = typeof usuarioLogado.wallpapers_chat === 'string'
        ? JSON.parse(usuarioLogado.wallpapers_chat)
        : usuarioLogado.wallpapers_chat;
    }

    const configWallpaperAtual = wallpapersMap[targetId] || wallpapersMap['global'] || { url: 'none', opacity: 0.4 };
    
    global.tempWallpaperState = {
      url: typeof configWallpaperAtual === 'object' ? configWallpaperAtual.url : configWallpaperAtual,
      opacity: typeof configWallpaperAtual === 'object' ? (configWallpaperAtual.opacity ?? 0.4) : 0.4
    };

    const urlWallpaperAtual = global.tempWallpaperState.url;
    const opacityWallpaperAtual = global.tempWallpaperState.opacity;

    modal.innerHTML = `
      <div class="chat-modal-box">
        <div class="chat-modal-header">
          <span><i class="fa-solid fa-wand-magic-sparkles" style="color:#ff2d55;"></i> Personalizar Chat</span>
          <button class="btn-ajustes-close" onclick="window.fecharModalAjustesChat()" title="Fechar"><i class="fa-solid fa-xmark"></i></button>
        </div>

        <div class="chat-settings-tabs">
          <button class="chat-tab-btn ${abaAtivaAjustes === 'estilo' ? 'active' : ''}" onclick="window.mudarAbaAjustes('estilo')"><i class="fa-solid fa-paint-roller"></i> Balão & Cores</button>
          <button class="chat-tab-btn ${abaAtivaAjustes === 'salvos' ? 'active' : ''}" onclick="window.mudarAbaAjustes('salvos')"><i class="fa-solid fa-bookmark"></i> Estilos Salvos</button>
          <button class="chat-tab-btn ${abaAtivaAjustes === 'fundo' ? 'active' : ''}" onclick="window.mudarAbaAjustes('fundo')"><i class="fa-solid fa-image"></i> Papel de Parede</button>
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
              <div class="chat-preset-card" style="background: linear-gradient(135deg, #ff2d55, #ff7675); color: #fff;" onclick="window.aplicarPresetConfig('#ff2d55', '#ff7675', '#ffffff', '#ff7675', 'solid')">
                <span>Cyber Rose</span><span class="chat-preset-badge">Degradê</span>
              </div>
              <div class="chat-preset-card" style="background: linear-gradient(135deg, #6c5ce7, #a29bfe); color: #fff;" onclick="window.aplicarPresetConfig('#6c5ce7', '#a29bfe', '#ffffff', '#a29bfe', 'solid')">
                <span>Purple Wave</span><span class="chat-preset-badge">Degradê</span>
              </div>
              <div class="chat-preset-card" style="background: rgba(255,255,255,0.08); color: #fff; border:1px solid rgba(255,255,255,0.3);" onclick="window.aplicarPresetConfig('rgba(255,255,255,0.08)', 'rgba(255,255,255,0.08)', '#ffffff', 'rgba(255,255,255,0.3)', 'dashed')">
                <span>Glass Neon</span><span class="chat-preset-badge">Transparente</span>
              </div>
            </div>
          </div>

          <div class="chat-setting-group">
            <label><i class="fa-solid fa-palette" style="color:#ff2d55;"></i> Canvas Color Picker</label>
            
            <div class="custom-color-selector-box">
              <div class="color-target-selector-tabs">
                <button class="color-target-pill ${canalCorAtivo === 'bg' ? 'active' : ''}" onclick="window.alternarCanalCor('bg')">Cor 1 (Fundo)</button>
                <button class="color-target-pill ${canalCorAtivo === 'bg2' ? 'active' : ''}" onclick="window.alternarCanalCor('bg2')">Cor 2 (Degradê)</button>
                <button class="color-target-pill ${canalCorAtivo === 'text' ? 'active' : ''}" onclick="window.alternarCanalCor('text')">Texto</button>
                <button class="color-target-pill ${canalCorAtivo === 'border' ? 'active' : ''}" onclick="window.alternarCanalCor('border')">Borda / Glow</button>
              </div>

              <div class="canvas-picker-container">
                <canvas id="color-picker-canvas" class="color-canvas-map" width="400" height="120"></canvas>
                <input type="range" min="0" max="360" value="0" class="color-hue-slider" id="hue-range-slider" oninput="window.atualizarMatizCanvas(this.value)">
              </div>

              <div class="color-quick-swatches">
                ${paletaCoresPredefinidas.map(c => `<div class="swatch-circle" style="background: ${c};" onclick="window.selecionarCorDoPickerProprio('${c}')"></div>`).join('')}
              </div>

              <div class="color-hex-input-row">
                <div class="color-hex-preview-badge" id="current-hex-badge"></div>
                <input type="text" id="custom-hex-input" placeholder="#FFFFFF" oninput="window.processarInputHexNativo(this.value)" />
              </div>
            </div>
          </div>

          <div class="chat-setting-group">
            <label><i class="fa-solid fa-shapes" style="color:#00d2d3;"></i> Formato, Borda e Fonte</label>
            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:8px;">
              <select class="chat-select-custom" id="chat-picker-radius" onchange="window.tempChatStyle.radius = this.value; window.atualizarLivePreviewBalao();">
                <option value="16px" ${global.tempChatStyle.radius === '16px' ? 'selected' : ''}>Arredondado Padrão</option>
                <option value="24px" ${global.tempChatStyle.radius === '24px' ? 'selected' : ''}>Pílula Suave</option>
                <option value="6px" ${global.tempChatStyle.radius === '6px' ? 'selected' : ''}>Quadrado Moderno</option>
                <option value="20px 4px 20px 20px" ${global.tempChatStyle.radius.includes('4px') ? 'selected' : ''}>Estilo Gota</option>
                <option value="18px 18px 2px 18px" ${global.tempChatStyle.radius.includes('2px') ? 'selected' : ''}>Chat Clássico</option>
              </select>

              <select class="chat-select-custom" id="chat-picker-border-style" onchange="window.tempChatStyle.border_style = this.value; window.atualizarLivePreviewBalao();">
                <option value="solid" ${global.tempChatStyle.border_style === 'solid' ? 'selected' : ''}>Borda Sólida</option>
                <option value="dashed" ${global.tempChatStyle.border_style === 'dashed' ? 'selected' : ''}>Tracejada</option>
                <option value="dotted" ${global.tempChatStyle.border_style === 'dotted' ? 'selected' : ''}>Pontilhada</option>
                <option value="double" ${global.tempChatStyle.border_style === 'double' ? 'selected' : ''}>Dupla</option>
                <option value="glow" ${global.tempChatStyle.border_style === 'glow' ? 'selected' : ''}>Apenas Glow (Brilho)</option>
              </select>

              <select class="chat-select-custom" id="chat-picker-font" onchange="window.tempChatStyle.font = this.value; window.atualizarLivePreviewBalao();">
                <option value="inherit" ${global.tempChatStyle.font === 'inherit' ? 'selected' : ''}>Fonte Padrão</option>
                <option value="'Poppins', sans-serif" ${global.tempChatStyle.font.includes('Poppins') ? 'selected' : ''}>Poppins</option>
                <option value="'Inter', sans-serif" ${global.tempChatStyle.font.includes('Inter') ? 'selected' : ''}>Inter Clean</option>
                <option value="'Outfit', sans-serif" ${global.tempChatStyle.font.includes('Outfit') ? 'selected' : ''}>Outfit Modern</option>
                <option value="'Courier New', monospace" ${global.tempChatStyle.font.includes('Courier') ? 'selected' : ''}>Retro Code</option>
              </select>
            </div>
          </div>

          <div style="display:flex; gap:10px; margin-top: 4px;">
            <input type="text" id="input-nome-balaow" placeholder="Nome do estilo (ex: Cyber Rose)" style="flex:1; height: 32px; padding: 0 12px; border-radius: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); color:#fff; outline:none; font-size:0.8rem; font-weight:700; box-sizing:border-box;" />
            <button class="chat-btn-action-main" onclick="window.salvarBalaoNaMinhaLista()"><i class="fa-solid fa-bookmark"></i> ${idBalaoEmEdicao ? 'Atualizar' : 'Salvar Preset'}</button>
          </div>
        </div>

        <div id="tab-content-salvos" style="display: ${abaAtivaAjustes === 'salvos' ? 'flex' : 'none'}; flex-direction: column; gap: 12px;">
          <label><i class="fa-solid fa-list" style="color:#ff2d55;"></i> Seus Balões Personalizados</label>
          <div class="saved-bubbles-list" id="saved-bubbles-container"></div>
        </div>

        <div id="tab-content-fundo" style="display: ${abaAtivaAjustes === 'fundo' ? 'flex' : 'none'}; flex-direction: column; gap: 14px;">
          <label><i class="fa-solid fa-image" style="color:#ff2d55;"></i> Papel de Parede da Conversa Ativa</label>
          
          <input type="file" id="chat-bg-file-local" accept="image/*,image/gif" style="display:none;" onchange="window.processarUploadSeguroWallpaper(this)">
          
          <div class="wallpaper-upload-box" onclick="document.getElementById('chat-bg-file-local').click()">
            <i class="fa-solid fa-cloud-arrow-up"></i>
            <div class="wallpaper-upload-title">Enviar Imagem ou GIF com Recorte</div>
            <div class="wallpaper-upload-desc">Ajuste e recorte sua foto para salvar direto no Supabase.</div>
          </div>

          <div class="wallpaper-preview-card-box">
            <div class="wallpaper-preview-frame" id="wallpaper-preview-frame" style="background-image: ${urlWallpaperAtual && urlWallpaperAtual !== 'none' ? `url('${urlWallpaperAtual}')` : 'none'};">
              <div class="wallpaper-overlay-mask" id="wallpaper-overlay-mask" style="background: rgba(0,0,0,${opacityWallpaperAtual});"></div>
              <span>Pré-visualização do Fundo</span>
            </div>
            
            <div class="wallpaper-control-slider-group">
              <label><i class="fa-solid fa-circle-half-stroke"></i> Escuridão / Opacidade:</label>
              <input type="range" min="0" max="0.9" step="0.05" value="${opacityWallpaperAtual}" id="wallpaper-opacity-slider" oninput="window.atualizarOpacidadePreviewWallpaper(this.value)">
            </div>
          </div>

          <button class="chat-btn-action-sec" style="width: 100%;" onclick="window.removerPapelParedeAtual()"><i class="fa-solid fa-trash"></i> Remover Papel de Parede Ativo</button>
        </div>

        <div style="display: flex; gap: 10px; margin-top: 8px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 14px;">
          <button class="chat-btn-action-main" style="flex:1;" onclick="window.salvarEstiloEWallpaperGeral()"><i class="fa-solid fa-check"></i> Aplicar e Salvar</button>
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
    const hexVal = global.tempChatStyle[canalCorAtivo] || '#ffffff';
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
    global.tempChatStyle[canalCorAtivo] = hex;
    sincronizarExibicaoColorPickerNativo();
    atualizarLivePreviewBalao();
  }

  function processarInputHexNativo(val) {
    if (val.startsWith('#') && (val.length === 4 || val.length === 7)) {
      global.tempChatStyle[canalCorAtivo] = val;
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
    if (!sample || !global.tempChatStyle) return;

    const { bg, bg2, text, border, border_style, radius, font } = global.tempChatStyle;

    if (bg && bg2 && bg !== bg2) {
      sample.style.background = `linear-gradient(135deg, ${bg}, ${bg2})`;
    } else {
      sample.style.background = bg || '#ff2d55';
    }

    sample.style.color = text || '#ffffff';
    sample.style.borderRadius = obterRadiusEspelhado(radius, true);
    sample.style.fontFamily = font || 'inherit';

    if (border_style === 'glow') {
      sample.style.border = 'none';
      sample.style.boxShadow = `0 0 16px ${border || '#ff2d55'}`;
    } else if (border) {
      sample.style.border = `1.5px ${border_style || 'solid'} ${border}`;
      sample.style.boxShadow = `0 0 10px ${border}55`;
    } else {
      sample.style.border = 'none';
      sample.style.boxShadow = 'none';
    }
  }

  function aplicarPresetConfig(bg, bg2, text, border, borderStyle = 'solid') {
    acionarVibracaoTatilAjustes(12);
    global.tempChatStyle.bg = bg;
    global.tempChatStyle.bg2 = bg2;
    global.tempChatStyle.text = text;
    global.tempChatStyle.border = border;
    global.tempChatStyle.border_style = borderStyle;

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
        lista[idx] = { id: idBalaoEmEdicao, nome: nome, ...global.tempChatStyle };
      }
      idBalaoEmEdicao = null;
    } else {
      lista.push({ id: Date.now(), nome: nome, ...global.tempChatStyle });
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
          <button class="btn-saved-action" onclick="window.usarBalaoSalvo(${idx})" title="Usar"><i class="fa-solid fa-check"></i></button>
          <button class="btn-saved-action" onclick="window.editarBalaoSalvo(${idx})" title="Editar"><i class="fa-solid fa-pen"></i></button>
          <button class="btn-saved-action danger" onclick="window.removerBalaoSalvo(${idx})" title="Excluir"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `).join('');
  }

  function usarBalaoSalvo(index) {
    const lista = JSON.parse(localStorage.getItem('chat_baloes_salvos_usuario') || '[]');
    const item = lista[index];
    if (!item) return;

    global.tempChatStyle = {
      bg: item.bg,
      bg2: item.bg2 || item.bg,
      text: item.text,
      border: item.border,
      border_style: item.border_style || 'solid',
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
    global.tempChatStyle = {
      bg: item.bg,
      bg2: item.bg2 || item.bg,
      text: item.text,
      border: item.border,
      border_style: item.border_style || 'solid',
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

  async function salvarEstiloEWallpaperGeral() {
    let usuarioLogado = obterUsuarioLogadoAjustes();
    const sb = obterSupabaseAjustes();

    if (!usuarioLogado || !usuarioLogado.id) {
      alert("Sessão não encontrada. Faça login para salvar.");
      return;
    }

    const { bg, bg2, text, border, border_style, radius, font } = global.tempChatStyle;

    const estiloObj = {
      bg: (bg && bg2 && bg !== bg2) ? `linear-gradient(135deg, ${bg}, ${bg2})` : (bg || '#ff2d55'),
      bg_simple: bg,
      bg2_simple: bg2,
      text: text || '#ffffff',
      border: border || '',
      border_style: border_style || 'solid',
      radius: radius || '16px',
      font: font || 'inherit'
    };

    const targetId = global.chatTargetAtual ? String(global.chatTargetAtual.id) : 'global';
    let wallpapersMap = {};
    if (usuarioLogado.wallpapers_chat) {
      wallpapersMap = typeof usuarioLogado.wallpapers_chat === 'string'
        ? JSON.parse(usuarioLogado.wallpapers_chat)
        : { ...usuarioLogado.wallpapers_chat };
    }

    if (global.tempWallpaperState) {
      if (!global.tempWallpaperState.url || global.tempWallpaperState.url === 'none') {
        delete wallpapersMap[targetId];
      } else {
        wallpapersMap[targetId] = { 
          url: global.tempWallpaperState.url, 
          opacity: global.tempWallpaperState.opacity 
        };
      }
    }

    if (sb) {
      try {
        const { data, error } = await sb
          .from('usuarios')
          .update({ 
            estilo_balao: estiloObj,
            wallpapers_chat: wallpapersMap 
          })
          .eq('id', Number(usuarioLogado.id))
          .select('estilo_balao, wallpapers_chat')
          .single();

        if (error) {
          console.error("[AjustesChat] Erro ao sincronizar configurações no Supabase:", error);
        } else if (data) {
          usuarioLogado.estilo_balao = data.estilo_balao;
          usuarioLogado.wallpapers_chat = data.wallpapers_chat;
        }
      } catch (err) {
        console.error("[AjustesChat] Exceção ao atualizar registro:", err);
      }
    }

    usuarioLogado.wallpapers_chat = wallpapersMap;
    usuarioLogado.estilo_balao = estiloObj;

    localStorage.setItem('usuario_logado', JSON.stringify(usuarioLogado));
    localStorage.setItem(`chat_style_me_${usuarioLogado.id}`, JSON.stringify(estiloObj));

    aplicarAjustesChatSalvos();

    if (global.chatTargetAtual && typeof global.carregarMensagensFeedSilencioso === 'function') {
      global.carregarMensagensFeedSilencioso(Number(global.chatTargetAtual.id));
    }

    fecharModalAjustesChat();
  }

  async function abrirModalCropWallpaper(file, callbackSucesso) {
    const liberado = await carregarCropperJSWallpaper();
    if (!liberado) {
      alert("Falha ao carregar a ferramenta de recorte.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const srcOriginal = e.target.result;

      const modalCrop = document.createElement('div');
      modalCrop.id = 'crop-wallpaper-modal';
      modalCrop.className = 'crop-modal-overlay';

      modalCrop.innerHTML = `
        <div class="crop-modal-wrapper">
          <div class="crop-modal-header">
            <h3><i class="fa-solid fa-crop-simple"></i> Recortar Papel de Parede</h3>
            <button type="button" class="btn-fechar-top" id="btn-cancel-crop-wall"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="crop-img-container">
            <img id="img-to-crop-wall" src="${srcOriginal}" alt="Recorte Wallpaper" />
          </div>
          <div class="crop-modal-actions">
            <button type="button" class="chat-btn-action-sec" id="btn-discard-crop-wall"><i class="fa-solid fa-xmark"></i> Cancelar</button>
            <button type="button" class="chat-btn-action-main" id="btn-apply-crop-wall"><i class="fa-solid fa-check"></i> Aplicar Recorte</button>
          </div>
        </div>
      `;

      document.body.appendChild(modalCrop);

      const imageElem = document.getElementById('img-to-crop-wall');
      cropperInstanciaWallpaper = new window.Cropper(imageElem, {
        aspectRatio: 9 / 16,
        viewMode: 1,
        background: false,
        autoCropArea: 0.95
      });

      const fecharCropModal = () => {
        if (cropperInstanciaWallpaper) {
          cropperInstanciaWallpaper.destroy();
          cropperInstanciaWallpaper = null;
        }
        modalCrop.remove();
      };

      document.getElementById('btn-cancel-crop-wall').onclick = fecharCropModal;
      document.getElementById('btn-discard-crop-wall').onclick = fecharCropModal;

      document.getElementById('btn-apply-crop-wall').onclick = () => {
        const canvas = cropperInstanciaWallpaper.getCroppedCanvas({
          width: 1080,
          height: 1920,
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high'
        });

        canvas.toBlob((blob) => {
          if (blob) {
            const fileCropped = new File([blob], `wallpaper_${Date.now()}.webp`, { type: 'image/webp' });
            callbackSucesso(fileCropped);
          }
          fecharCropModal();
        }, 'image/webp', 0.88);
      };
    };

    reader.readAsDataURL(file);
  }

  async function processarUploadSeguroWallpaper(input) {
    if (!input.files || !input.files[0]) return;

    const file = input.files[0];
    const usuarioLogado = obterUsuarioLogadoAjustes();

    if (!usuarioLogado || !usuarioLogado.id) {
      alert("Sessão não encontrada para salvar o papel de parede.");
      return;
    }

    if (file.type === 'image/gif') {
      await enviarEGravarWallpaperCloud(file);
      return;
    }

    abrirModalCropWallpaper(file, async (fileCropped) => {
      await enviarEGravarWallpaperCloud(fileCropped);
    });
  }

  async function enviarEGravarWallpaperCloud(fileToUpload) {
    const sb = obterSupabaseAjustes();
    const usuarioLogado = obterUsuarioLogadoAjustes();
    let wallpaperUrl = '';

    if (!usuarioLogado || !usuarioLogado.id) {
      alert("Sessão não encontrada para salvar o papel de parede.");
      return;
    }

    if (sb) {
      try {
        const fileExt = fileToUpload.name ? fileToUpload.name.split('.').pop() : 'webp';
        const filePath = `wallpapers/user_${usuarioLogado.id}_${Date.now()}.${fileExt}`;

        const { data, error } = await sb.storage
          .from('chat-media')
          .upload(filePath, fileToUpload, { cacheControl: '3600', upsert: true });

        if (error) {
          console.error("[AjustesChat] Erro Storage Supabase:", error.message || error);
        } else if (data) {
          const { data: publicUrlData } = sb.storage.from('chat-media').getPublicUrl(filePath);
          if (publicUrlData && publicUrlData.publicUrl) {
            wallpaperUrl = publicUrlData.publicUrl;
          }
        }
      } catch (e) {
        console.warn("[AjustesChat] Exceção durante upload de mídia:", e);
      }
    }

    if (!wallpaperUrl) {
      alert("Não foi possível enviar a imagem para o servidor. Verifique o bucket 'chat-media'.");
      return;
    }

    global.tempWallpaperState.url = wallpaperUrl;
    const previewFrame = document.getElementById('wallpaper-preview-frame');
    if (previewFrame) {
      previewFrame.style.backgroundImage = `url('${wallpaperUrl}')`;
    }
  }

  function atualizarOpacidadePreviewWallpaper(val) {
    const mask = document.getElementById('wallpaper-overlay-mask');
    if (mask) mask.style.background = `rgba(0, 0, 0, ${val})`;

    if (global.tempWallpaperState) {
      global.tempWallpaperState.opacity = parseFloat(val);
    }
  }

  function removerPapelParedeAtual() {
    global.tempWallpaperState = { url: 'none', opacity: 0.4 };
    const previewFrame = document.getElementById('wallpaper-preview-frame');
    if (previewFrame) {
      previewFrame.style.backgroundImage = 'none';
    }
  }

  // APLICAÇÃO DEFINITIVA NO CONTAINER PRINCIPAL (.chat-window) COM SUPORTE A ESPELHAMENTO
  async function aplicarAjustesChatSalvos() {
    const chatWindow = document.querySelector('.chat-window');
    if (!chatWindow) return;

    let usuarioLogado = obterUsuarioLogadoAjustes();
    const targetId = global.chatTargetAtual ? String(global.chatTargetAtual.id) : 'global';

    let wallpapersMap = {};
    let estiloObj = {};

    if (usuarioLogado) {
      if (usuarioLogado.wallpapers_chat) {
        wallpapersMap = typeof usuarioLogado.wallpapers_chat === 'string'
          ? JSON.parse(usuarioLogado.wallpapers_chat)
          : usuarioLogado.wallpapers_chat;
      }
      if (usuarioLogado.estilo_balao) {
        estiloObj = typeof usuarioLogado.estilo_balao === 'string'
          ? JSON.parse(usuarioLogado.estilo_balao)
          : usuarioLogado.estilo_balao;
      }
    }

    const item = wallpapersMap[targetId] || wallpapersMap['global'];
    const url = typeof item === 'object' ? item.url : item;
    const opacity = typeof item === 'object' ? (item.opacity ?? 0.4) : 0.4;

    let maskOverlay = document.getElementById('chat-window-wallpaper-mask');
    if (!maskOverlay) {
      maskOverlay = document.createElement('div');
      maskOverlay.id = 'chat-window-wallpaper-mask';
      maskOverlay.style.cssText = 'position:absolute; inset:0; z-index:1; pointer-events:none; transition:background 0.15s ease;';
      chatWindow.prepend(maskOverlay);
    }

    if (url && url !== 'none') {
      chatWindow.style.backgroundImage = `url('${url}')`;
      chatWindow.style.backgroundSize = 'cover';
      chatWindow.style.backgroundPosition = 'center';
      maskOverlay.style.background = `rgba(0, 0, 0, ${opacity})`;
      maskOverlay.style.display = 'block';
    } else {
      chatWindow.style.backgroundImage = 'none';
      maskOverlay.style.display = 'none';
    }

    let styleTag = document.getElementById('chat-custom-balloon-style');
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = 'chat-custom-balloon-style';
      document.head.appendChild(styleTag);
    }

    if (estiloObj && Object.keys(estiloObj).length > 0) {
      const bgStyle = estiloObj.bg || 'var(--chat-me-bubble-color)';
      const textStyle = estiloObj.text || '#ffffff';
      const borderStyleType = estiloObj.border_style || 'solid';
      const borderCol = estiloObj.border || '';
      const fontVal = estiloObj.font || 'inherit';

      // Calcula os raios espelhados para remetente e destinatário
      const radiusMeu = obterRadiusEspelhado(estiloObj.radius, true);
      const radiusOutro = obterRadiusEspelhado(estiloObj.radius, false);

      let borderExtraMeu = '';
      if (borderStyleType === 'glow') {
        borderExtraMeu = `border: none !important; box-shadow: 0 0 16px ${borderCol || '#ff2d55'} !important;`;
      } else if (borderCol) {
        borderExtraMeu = `border: 1.5px ${borderStyleType} ${borderCol} !important; box-shadow: 0 0 10px ${borderCol}55 !important;`;
      } else {
        borderExtraMeu = `border: none !important; box-shadow: none !important;`;
      }

      styleTag.textContent = `
        /* Anula overlays padrões para revelar o papel de parede */
        .chat-window::before { display: none !important; }

        /* Estilização forçada dos balões do usuário (Direita) */
        .chat-messages-feed .chat-msg-row.me .chat-msg-bubble { 
          background: ${bgStyle} !important; 
          color: ${textStyle} !important; 
          border-radius: ${radiusMeu} !important; 
          font-family: ${fontVal} !important;
          ${borderExtraMeu}
        }

        /* Espelhamento dos formatos assimétricos para o contato (Esquerda) */
        .chat-messages-feed .chat-msg-row:not(.me) .chat-msg-bubble {
          border-radius: ${radiusOutro} !important;
        }
      `;
    }
  }

  // Exportações Globais
  global.abrirModalAjustesChat = abrirModalAjustesChat;
  global.fecharModalAjustesChat = fecharModalAjustesChat;
  global.mudarAbaAjustes = mudarAbaAjustes;
  global.alternarCanalCor = alternarCanalCor;
  global.selecionarCorDoPickerProprio = selecionarCorDoPickerProprio;
  global.processarInputHexNativo = processarInputHexNativo;
  global.atualizarMatizCanvas = atualizarMatizCanvas;
  global.atualizarLivePreviewBalao = atualizarLivePreviewBalao;
  global.aplicarPresetConfig = aplicarPresetConfig;
  global.salvarBalaoNaMinhaLista = salvarBalaoNaMinhaLista;
  global.usarBalaoSalvo = usarBalaoSalvo;
  global.editarBalaoSalvo = editarBalaoSalvo;
  global.removerBalaoSalvo = removerBalaoSalvo;
  global.salvarEstiloBalaoSupabase = salvarEstiloEWallpaperGeral;
  global.salvarEstiloEWallpaperGeral = salvarEstiloEWallpaperGeral;
  global.processarUploadSeguroWallpaper = processarUploadSeguroWallpaper;
  global.atualizarOpacidadePreviewWallpaper = atualizarOpacidadePreviewWallpaper;
  global.removerPapelParedeAtual = removerPapelParedeAtual;
  global.aplicarAjustesChatSalvos = aplicarAjustesChatSalvos;
  global.sincronizarUsuarioComSupabase = sincronizarUsuarioComSupabase;
  global.obterRadiusEspelhado = obterRadiusEspelhado;

})(typeof window !== 'undefined' ? window : this);
