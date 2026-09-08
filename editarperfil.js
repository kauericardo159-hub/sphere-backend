// ==========================================================================
// MÓDULO DE EDIÇÃO DE PERFIL - PROJECT Z / SPHERE V5.2 PRO (editarperfil.js)
// Upload Cloud Storage, Realtime Tags Analytics, Canvas Color & Mini Previews
// ==========================================================================

(function (global) {
  'use strict';

  let abaAtiva = 'preview';
  let formularioComAlteracoes = false;
  let selosAutorizadosUsuario = [];
  let selosSelecionados = [];
  let cropperInstancia = null;
  let canalCorAtivoPerfil = 'bg';
  let hueAtualCanvasPerfil = 0;

  const paletaCoresPredefinidas = [
    '#ff2d55', '#ff7675', '#6c5ce7', '#a29bfe',
    '#00b894', '#55efc4', '#fdcb6e', '#e17055',
    '#00d2d3', '#1e90ff', '#fd79a8', '#e84393',
    '#ffffff', '#d1c4d6', '#2d3436', '#0f0812'
  ];

  function acionarVibracao(ms = 12) {
    if (typeof window !== 'undefined' && window.navigator && typeof window.navigator.vibrate === 'function') {
      try { window.navigator.vibrate(ms); } catch (e) {}
    }
  }

  function obterSupabaseEditarPerfil() {
    return global.supabaseClient || global.supabase || global.sb || null;
  }

  function obterUsuarioLocalEditarPerfil() {
    try {
      const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error("[EditarPerfil] Erro ao carregar usuário do localStorage:", e);
      return null;
    }
  }

  function sanitizarAtributoInput(str) {
    if (!str) return '';
    return String(str).replace(/"/g, '&quot;');
  }

  function sanitizarTextoArea(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function calcularIdadeFormatada(dataNascimento) {
    if (!dataNascimento) return 'Não informada';
    const nascimento = new Date(dataNascimento);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--;
    }
    return isNaN(idade) || idade < 0 ? 'Não informada' : `${idade} anos`;
  }

  function mostrarToastEdit(mensagem, tipo = 'info', tempo = 3500) {
    const antigo = document.getElementById('edit-toast-msg');
    if (antigo) antigo.remove();

    const icones = {
      info: 'fa-circle-info',
      sucesso: 'fa-circle-check',
      alerta: 'fa-triangle-exclamation',
      erro: 'fa-circle-xmark'
    };

    const toast = document.createElement('div');
    toast.id = 'edit-toast-msg';
    toast.className = `edit-toast-message edit-toast-${tipo}`;
    toast.innerHTML = `<i class="fa-solid ${icones[tipo] || icones.info}"></i> <span>${mensagem}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast && document.body.contains(toast)) {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
      }
    }, tempo);
  }

  // Upload Cloud com tratamento de Bucket (AVATARES e avatares)
  async function enviarMidiaParaStorage(file, subpasta) {
    const sb = obterSupabaseEditarPerfil();
    const usuario = obterUsuarioLocalEditarPerfil();
    if (!sb) {
      throw new Error("Sessão ou cliente Supabase indisponível.");
    }

    const userId = (usuario && usuario.id) ? usuario.id : 'anon';
    const fileExt = file.name ? file.name.split('.').pop().toLowerCase() : 'webp';
    const fileName = `${subpasta}_${Date.now()}.${fileExt}`;
    const filePath = `user_${userId}/${fileName}`;

    let targetBucket = 'AVATARES';
    
    let { data, error } = await sb.storage
      .from(targetBucket)
      .upload(filePath, file, { 
        cacheControl: '3600', 
        upsert: true,
        contentType: file.type || 'image/webp'
      });

    if (error && error.message && error.message.includes('not found')) {
      targetBucket = 'avatares';
      const retry = await sb.storage
        .from(targetBucket)
        .upload(filePath, file, { 
          cacheControl: '3600', 
          upsert: true,
          contentType: file.type || 'image/webp'
        });
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("[Storage Upload Error]:", error);
      throw error;
    }

    const { data: publicUrlData } = sb.storage.from(targetBucket).getPublicUrl(filePath);
    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error("Erro ao gerar URL pública da mídia.");
    }

    return publicUrlData.publicUrl;
  }

  async function carregarCropperJS() {
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

  function confirmarSaidaPagina(e) {
    if (formularioComAlteracoes) {
      const msg = "Você possui alterações não salvas! Deseja realmente sair?";
      e.preventDefault();
      e.returnValue = msg;
      return msg;
    }
  }

  function registrarBloqueioNavegacao() {
    window.addEventListener('beforeunload', confirmarSaidaPagina);
  }

  function removerBloqueioNavegacao() {
    window.removeEventListener('beforeunload', confirmarSaidaPagina);
    formularioComAlteracoes = false;
  }

  function marcarAlteracaoPendente() {
    formularioComAlteracoes = true;
  }

  function podeAlterarUsername(dataUltimaTroca) {
    if (!dataUltimaTroca) return { permitido: true, diasRestantes: 0 };
    const ultima = new Date(dataUltimaTroca);
    const agora = new Date();
    const diffDias = Math.floor((agora - ultima) / (1000 * 60 * 60 * 24));

    if (diffDias >= 7) {
      return { permitido: true, diasRestantes: 0 };
    }
    return { permitido: false, diasRestantes: 7 - diffDias };
  }

  function possuiPermissaoTags(usuario) {
    return Boolean(
      usuario.is_creator ||
      usuario.is_criador ||
      usuario.is_verified ||
      (usuario.tags && String(usuario.tags).trim().length > 0)
    );
  }

  function extrairListaItens(str) {
    if (!str) return [];
    if (Array.isArray(str)) return str;
    return String(str)
      .split(/[,|]/)
      .map(item => item.trim().toLowerCase())
      .filter(item => item.length > 0);
  }

  function processarEntradaFormatada(lista) {
    if (!Array.isArray(lista) || lista.length === 0) return null;
    return lista.join(',');
  }

  function calcularSelosPermitidos(usuario) {
    const selos = new Set();
    const sistema = window.SISTEMA_BADGES || {};

    if ((usuario.is_creator || usuario.is_criador) && sistema.creator) selos.add('creator');
    if (usuario.is_verified && sistema.verified) selos.add('verified');
    if ((usuario.is_mod || usuario.is_moderator) && sistema.mod) selos.add('mod');
    if ((usuario.is_dev || usuario.is_developer) && sistema.dev) selos.add('dev');
    if (usuario.is_vip && sistema.vip) selos.add('vip');
    if (usuario.is_booster && sistema.booster) selos.add('booster');

    if (usuario.selos_concedidos) {
      extrairListaItens(usuario.selos_concedidos).forEach(s => {
        if (sistema[s]) selos.add(s);
      });
    }

    if (usuario.verificados) {
      extrairListaItens(usuario.verificados).forEach(s => {
        if (sistema[s]) selos.add(s);
      });
    }

    return Array.from(selos);
  }

  async function abrirModalCropImage(file, tipo, callbackSucesso) {
    const liberado = await carregarCropperJS();
    if (!liberado) {
      mostrarToastEdit("Falha ao carregar a biblioteca de recorte.", "erro");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const srcOriginal = e.target.result;

      const modalCrop = document.createElement('div');
      modalCrop.id = 'crop-image-modal';
      modalCrop.className = 'crop-modal-overlay';

      const ratios = {
        avatar: 1,
        banner: 3 / 1,
        wallpaper: 9 / 16
      };

      modalCrop.innerHTML = `
        <div class="crop-modal-wrapper">
          <div class="crop-modal-header">
            <h3><i class="fa-solid fa-crop-simple"></i> Recortar Imagem (${tipo.toUpperCase()})</h3>
            <button type="button" class="btn-fechar-top" id="btn-cancel-crop"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="crop-img-container">
            <img id="img-to-crop" src="${srcOriginal}" alt="Recorte" />
          </div>
          <div class="crop-modal-actions">
            <button type="button" class="btn-cancelar-edit" id="btn-discard-crop"><i class="fa-solid fa-xmark"></i> Cancelar</button>
            <button type="button" class="btn-salvar-edit" id="btn-apply-crop"><i class="fa-solid fa-check"></i> Aplicar Corte</button>
          </div>
        </div>
      `;

      document.body.appendChild(modalCrop);

      const imageElem = document.getElementById('img-to-crop');
      cropperInstancia = new window.Cropper(imageElem, {
        aspectRatio: ratios[tipo] || 1,
        viewMode: 1,
        background: false,
        autoCropArea: 0.95
      });

      const fecharCropModal = () => {
        if (cropperInstancia) {
          cropperInstancia.destroy();
          cropperInstancia = null;
        }
        modalCrop.remove();
      };

      document.getElementById('btn-cancel-crop').onclick = fecharCropModal;
      document.getElementById('btn-discard-crop').onclick = fecharCropModal;

      document.getElementById('btn-apply-crop').onclick = () => {
        const dims = {
          avatar: { width: 400, height: 400 },
          banner: { width: 1200, height: 400 },
          wallpaper: { width: 1080, height: 1920 }
        }[tipo] || { width: 600, height: 600 };

        const canvas = cropperInstancia.getCroppedCanvas({
          width: dims.width,
          height: dims.height,
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high'
        });

        canvas.toBlob((blob) => {
          if (blob) {
            const fileCropped = new File([blob], `${tipo}_${Date.now()}.webp`, { type: 'image/webp' });
            callbackSucesso(fileCropped);
          }
          fecharCropModal();
        }, 'image/webp', 0.88);
      };
    };

    reader.readAsDataURL(file);
  }

  function renderizarChipsVerificados() {
    const container = document.getElementById('container-verificados-chips');
    const previewContainer = document.getElementById('container-verificados-preview');
    if (!container) return;

    const sistema = window.SISTEMA_BADGES || {};

    if (selosAutorizadosUsuario.length === 0) {
      container.innerHTML = `<span class="permission-notice"><i class="fa-solid fa-lock"></i> Nenhum selo de verificado atribuído a esta conta.</span>`;
      if (previewContainer) previewContainer.innerHTML = '';
      return;
    }

    container.innerHTML = selosAutorizadosUsuario.map(chaveSelo => {
      const badgeConfig = sistema[chaveSelo] || { nome: chaveSelo, icone: 'fa-certificate' };
      const estaAtivo = selosSelecionados.includes(chaveSelo);

      return `
        <button type="button" class="badge-chip ${estaAtivo ? 'active' : ''}" onclick="window.alternarSeloVerificado('${sanitizarAtributoInput(chaveSelo)}')">
          <i class="${badgeConfig.icone}" style="color: ${global.estadoPerfilTemp ? global.estadoPerfilTemp.cor_verificados : '#ff2d55'}"></i> ${badgeConfig.nome}
        </button>
      `;
    }).join('');

    if (previewContainer && typeof window.obterHtmlBadgesUsuario === 'function') {
      previewContainer.innerHTML = window.obterHtmlBadgesUsuario({
        verificados: selosAutorizadosUsuario,
        verificados_exibir: selosSelecionados
      });
    }
  }

  function alternarSeloVerificado(chaveSelo) {
    if (!selosAutorizadosUsuario.includes(chaveSelo)) {
      mostrarToastEdit("Selo não autorizado para este perfil.", "alerta");
      return;
    }

    if (selosSelecionados.includes(chaveSelo)) {
      selosSelecionados = selosSelecionados.filter(s => s !== chaveSelo);
    } else {
      selosSelecionados.push(chaveSelo);
    }

    if (global.estadoPerfilTemp) {
      global.estadoPerfilTemp.verificados_exibir = [...selosSelecionados];
    }

    marcarAlteracaoPendente();
    renderizarChipsVerificados();
    renderizarPreviewDinamico();
  }

  // Abertura do Modal de Edição
  function abrirModalEditarPerfil() {
    const usuario = obterUsuarioLocalEditarPerfil();
    if (!usuario) {
      mostrarToastEdit("Sessão não encontrada. Por favor, faça login.", "erro");
      return;
    }

    fecharModalEditarPerfil(true);
    registrarBloqueioNavegacao();

    const checkUsername = podeAlterarUsername(usuario.username_updated_at);
    const temPermissaoTags = possuiPermissaoTags(usuario);
    const defaultAvatar = `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(usuario.username || 'user')}`;

    selosAutorizadosUsuario = calcularSelosPermitidos(usuario);
    const selosSalvosExibir = usuario.verificados_exibir || usuario.verificados_selecionados || usuario.verificados;
    selosSelecionados = extrairListaItens(selosSalvosExibir);

    global.estadoPerfilTemp = {
      display_name: usuario.display_name || usuario.nome || '',
      username: usuario.username || '',
      data_nascimento: usuario.data_nascimento || '',
      pronome: usuario.pronome || '',
      genero: usuario.genero || '',
      sobre: usuario.sobre || '',
      status: usuario.status || 'online',
      status_emoji: usuario.status_emoji || '',
      custom_status: usuario.custom_status || '',
      status_tempo: 'sempre',
      banner_url: usuario.banner_url || '',
      avatar_url: usuario.avatar_url || '',
      moldura_url: usuario.moldura_url || '',
      wallpaper_url: usuario.wallpaper_url || '',
      tags: usuario.tags ? usuario.tags.split('|').map(t => t.trim()).filter(Boolean) : [],
      verificados_exibir: [...selosSelecionados],
      cor_bg1: usuario.cor_bg1 || usuario.cor_tema || '#ff2d55',
      cor_bg2: usuario.cor_bg2 || usuario.cor_tema || '#ff7675',
      cor_verificados: usuario.cor_verificados || '#ff2d55'
    };

    const container = document.createElement('div');
    container.id = 'edit-perfil-full-container';
    container.className = 'edit-perfil-full-container';

    container.innerHTML = `
      <div class="edit-perfil-wrapper" style="--user-theme-color: ${global.estadoPerfilTemp.cor_bg1}">
        <div class="edit-perfil-header">
          <h2><i class="fa-solid fa-sliders"></i> Painel de Edição do Perfil</h2>
          <button type="button" class="btn-fechar-top" onclick="window.solicitarFecharModal()">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div class="edit-perfil-tabs-bar">
          <button type="button" class="tab-btn active" id="tab-btn-preview" onclick="window.mudarAbaPerfil('preview')"><i class="fa-solid fa-eye"></i> Pré-visualização</button>
          <button type="button" class="tab-btn" id="tab-btn-info" onclick="window.mudarAbaPerfil('info')"><i class="fa-solid fa-id-card"></i> Informações</button>
          <button type="button" class="tab-btn" id="tab-btn-status" onclick="window.mudarAbaPerfil('status')"><i class="fa-solid fa-circle-dot"></i> Status</button>
          <button type="button" class="tab-btn" id="tab-btn-fotos" onclick="window.mudarAbaPerfil('fotos')"><i class="fa-solid fa-image"></i> Fotos & Mídias</button>
          <button type="button" class="tab-btn" id="tab-btn-tags" onclick="window.mudarAbaPerfil('tags')"><i class="fa-solid fa-tags"></i> Tags & Verificados</button>
          <button type="button" class="tab-btn" id="tab-btn-cores" onclick="window.mudarAbaPerfil('cores')"><i class="fa-solid fa-palette"></i> Cores do Perfil</button>
        </div>

        <div class="edit-perfil-content-body">

          <div id="edit-sec-preview" class="edit-section-tab">
            <div class="profile-card-preview-wrapper" id="profile-preview-card" style="background-image: url('${global.estadoPerfilTemp.wallpaper_url}');">
              <div class="profile-preview-banner" id="prev-banner-box" style="background-image: url('${global.estadoPerfilTemp.banner_url || 'https://via.placeholder.com/600x180/10050c/ff2d55?text=Sphere'}');"></div>
              
              <div class="profile-preview-header">
                <div class="profile-preview-avatar-box">
                  <img src="${global.estadoPerfilTemp.avatar_url || defaultAvatar}" class="preview-avatar" id="prev-avatar-img">
                  <img src="${global.estadoPerfilTemp.moldura_url || ''}" class="preview-moldura" id="prev-moldura-img" style="${global.estadoPerfilTemp.moldura_url ? '' : 'display:none;'}">
                  <span class="preview-status-indicator ${global.estadoPerfilTemp.status}" id="prev-status-dot"></span>
                </div>
                
                <div class="profile-preview-main-info">
                  <h3 id="prev-display-name">${sanitizarAtributoInput(global.estadoPerfilTemp.display_name || 'Seu Nome')}</h3>
                  <span class="preview-username" id="prev-username">@${sanitizarAtributoInput(global.estadoPerfilTemp.username || 'usuario')}</span>
                  
                  <div class="preview-badge-row" id="prev-badge-row"></div>
                </div>
              </div>

              <div class="profile-preview-details">
                <div class="preview-status-bubble" id="prev-status-bubble">
                  ${global.estadoPerfilTemp.status_emoji ? `<span class="emoji">${global.estadoPerfilTemp.status_emoji}</span>` : ''}
                  <span class="text">${sanitizarAtributoInput(global.estadoPerfilTemp.custom_status || '')}</span>
                </div>

                <div class="preview-meta-grid">
                  <span><i class="fa-solid fa-cake-candles"></i> <strong id="prev-idade">${calcularIdadeFormatada(global.estadoPerfilTemp.data_nascimento)}</strong></span>
                  <span><i class="fa-solid fa-venus-mars"></i> <strong id="prev-genero">${sanitizarAtributoInput(global.estadoPerfilTemp.genero || 'Gênero não informado')}</strong> (${sanitizarAtributoInput(global.estadoPerfilTemp.pronome || 'Pronomes')})</span>
                </div>

                <p class="preview-bio" id="prev-sobre">${sanitizarTextoArea(global.estadoPerfilTemp.sobre || 'Sua biografia aparecerá aqui...')}</p>

                <div class="preview-tags-container" id="prev-tags-container"></div>
              </div>
            </div>
          </div>

          <div id="edit-sec-info" class="edit-section-tab" style="display:none;">
            <div class="edit-form-group">
              <label>Nome de Exibição</label>
              <input type="text" id="edit-display-name" value="${sanitizarAtributoInput(global.estadoPerfilTemp.display_name)}" placeholder="Seu apelido público" oninput="window.atualizarTempPerfil('display_name', this.value)" />
            </div>

            <div class="edit-form-group">
              <label>
                Nome de Usuário (@handle)
                ${!checkUsername.permitido ? `<span class="username-notice"><i class="fa-solid fa-lock"></i> Bloqueado por ${checkUsername.diasRestantes} dia(s)</span>` : ''}
              </label>
              <input type="text" id="edit-username" value="${sanitizarAtributoInput(global.estadoPerfilTemp.username)}" placeholder="seu_usuario" ${!checkUsername.permitido ? 'disabled' : ''} oninput="window.atualizarTempPerfil('username', this.value)" />
            </div>

            <div class="edit-form-group">
              <label>Data de Nascimento (Idade calculada automaticamente)</label>
              <input type="date" id="edit-data-nascimento" value="${global.estadoPerfilTemp.data_nascimento}" onchange="window.atualizarTempPerfil('data_nascimento', this.value)" />
            </div>

            <div class="form-row-double">
              <div class="edit-form-group">
                <label>Pronomes</label>
                <input type="text" id="edit-pronome" placeholder="Ex: Ele/Dele, Ela/Dela" value="${sanitizarAtributoInput(global.estadoPerfilTemp.pronome)}" oninput="window.atualizarTempPerfil('pronome', this.value)" />
              </div>
              <div class="edit-form-group">
                <label>Gênero</label>
                <input type="text" id="edit-genero" placeholder="Ex: Masculino, Feminino, Não-Binário" value="${sanitizarAtributoInput(global.estadoPerfilTemp.genero)}" oninput="window.atualizarTempPerfil('genero', this.value)" />
              </div>
            </div>

            <div class="edit-form-group">
              <label>Sobre Mim | Biografia</label>
              <textarea id="edit-sobre" placeholder="Escreva uma breve apresentação..." oninput="window.atualizarTempPerfil('sobre', this.value)">${sanitizarTextoArea(global.estadoPerfilTemp.sobre)}</textarea>
            </div>
          </div>

          <div id="edit-sec-status" class="edit-section-tab" style="display:none;">
            <div class="edit-form-group">
              <label>Recado do Perfil (Emoji opcional + Texto opcional)</label>
              <div class="status-custom-row">
                <input type="text" id="edit-status-emoji" class="emoji-picker-input" value="${sanitizarAtributoInput(global.estadoPerfilTemp.status_emoji)}" maxlength="2" placeholder="💬" oninput="window.atualizarTempPerfil('status_emoji', this.value)" />
                <input type="text" id="edit-custom-status" style="flex:1;" value="${sanitizarAtributoInput(global.estadoPerfilTemp.custom_status)}" placeholder="O que você está pensando agora?" oninput="window.atualizarTempPerfil('custom_status', this.value)" />
              </div>
            </div>

            <div class="edit-form-group">
              <label>Duração do Recado</label>
              <div class="select-custom-wrapper">
                <select id="edit-status-tempo" onchange="window.atualizarTempPerfil('status_tempo', this.value)">
                  <option value="sempre" ${global.estadoPerfilTemp.status_tempo === 'sempre' ? 'selected' : ''}>Sempre visível</option>
                  <option value="30m" ${global.estadoPerfilTemp.status_tempo === '30m' ? 'selected' : ''}>30 Minutos</option>
                  <option value="1h" ${global.estadoPerfilTemp.status_tempo === '1h' ? 'selected' : ''}>1 Hora</option>
                  <option value="5h" ${global.estadoPerfilTemp.status_tempo === '5h' ? 'selected' : ''}>5 Horas</option>
                  <option value="24h" ${global.estadoPerfilTemp.status_tempo === '24h' ? 'selected' : ''}>24 Horas</option>
                </select>
              </div>
            </div>

            <div class="edit-form-group">
              <label>Status de Presença</label>
              <div class="presence-selector-grid">
                <button type="button" class="btn-presence online ${global.estadoPerfilTemp.status === 'online' ? 'selected' : ''}" onclick="window.selecionarEstadoPresenca('online')">🟢 Online</button>
                <button type="button" class="btn-presence ausente ${global.estadoPerfilTemp.status === 'ausente' ? 'selected' : ''}" onclick="window.selecionarEstadoPresenca('ausente')">🟠 Ausente</button>
                <button type="button" class="btn-presence ocupado ${global.estadoPerfilTemp.status === 'dnd' ? 'selected' : ''}" onclick="window.selecionarEstadoPresenca('dnd')">🔴 Ocupado</button>
                <button type="button" class="btn-presence offline ${global.estadoPerfilTemp.status === 'offline' ? 'selected' : ''}" onclick="window.selecionarEstadoPresenca('offline')">⚪ Offline</button>
              </div>
            </div>
          </div>

          <div id="edit-sec-fotos" class="edit-section-tab" style="display:none;">
            <div class="media-card-box" id="drop-area-banner">
              <div class="media-card-label"><i class="fa-solid fa-image"></i> Banner de Capa</div>
              
              <div class="mini-media-preview-box banner-preview">
                <img id="mini-prev-banner" src="${global.estadoPerfilTemp.banner_url || 'https://via.placeholder.com/600x180/10050c/ff2d55?text=Sem+Banner'}" alt="Preview Banner">
              </div>

              <input type="file" id="file-banner-input" accept="image/*,image/gif" style="display:none;" onchange="window.processarArquivoInput(this, 'banner')" />
              <button type="button" class="btn-upload-styled" onclick="document.getElementById('file-banner-input').click()">
                <i class="fa-solid fa-cloud-arrow-up"></i> Selecionar/Trocar Banner
              </button>
              
              <div class="preview-controls">
                <label><i class="fa-solid fa-magnifying-glass-plus"></i> Zoom Banner:</label>
                <input type="range" id="zoom-banner" min="0.8" max="2.2" step="0.05" value="1" oninput="window.ajustarZoomMedia('banner', this.value)" />
              </div>
            </div>

            <div class="media-card-box" id="drop-area-avatar">
              <div class="media-card-label"><i class="fa-solid fa-user-gear"></i> Foto de Avatar & Moldura</div>
              
              <div class="mini-avatar-frame-preview-box">
                <img id="mini-prev-avatar" src="${global.estadoPerfilTemp.avatar_url || defaultAvatar}" alt="Preview Avatar">
                <img id="mini-prev-moldura" src="${global.estadoPerfilTemp.moldura_url || ''}" alt="Preview Moldura" style="${global.estadoPerfilTemp.moldura_url ? '' : 'display:none;'}">
              </div>

              <div class="double-upload-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                <div>
                  <input type="file" id="file-avatar-input" accept="image/*,image/gif" style="display:none;" onchange="window.processarArquivoInput(this, 'avatar')" />
                  <button type="button" class="btn-upload-styled" onclick="document.getElementById('file-avatar-input').click()">
                    <i class="fa-solid fa-camera"></i> Trocar Avatar
                  </button>
                </div>
                <div>
                  <input type="file" id="file-moldura-input" accept="image/png,image/gif,image/webp" style="display:none;" onchange="window.processarArquivoInput(this, 'moldura')" />
                  <button type="button" class="btn-upload-styled" onclick="document.getElementById('file-moldura-input').click()">
                    <i class="fa-solid fa-wand-magic-sparkles"></i> Trocar Moldura
                  </button>
                </div>
              </div>

              <div class="preview-controls">
                <label><i class="fa-solid fa-magnifying-glass-plus"></i> Zoom Avatar:</label>
                <input type="range" id="zoom-avatar" min="0.8" max="2.2" step="0.05" value="1" oninput="window.ajustarZoomMedia('avatar', this.value)" />
              </div>
            </div>

            <div class="media-card-box">
              <div class="media-card-label"><i class="fa-solid fa-mountain-sun"></i> Wallpaper de Fundo do Perfil</div>
              
              <div class="mini-media-preview-box wallpaper-preview">
                <img id="mini-prev-wallpaper" src="${global.estadoPerfilTemp.wallpaper_url || 'https://via.placeholder.com/600x300/10050c/ff2d55?text=Sem+Wallpaper'}" alt="Preview Wallpaper">
              </div>

              <input type="file" id="file-wallpaper-input" accept="image/*,image/gif" style="display:none;" onchange="window.processarArquivoInput(this, 'wallpaper')" />
              <button type="button" class="btn-upload-styled" onclick="document.getElementById('file-wallpaper-input').click()">
                <i class="fa-solid fa-file-image"></i> Selecionar/Trocar Wallpaper
              </button>
            </div>
          </div>

          <div id="edit-sec-tags" class="edit-section-tab" style="display:none;">
            <div class="edit-form-group">
              <label>
                Tags de Perfil
                ${!temPermissaoTags ? '<span class="permission-notice"><i class="fa-solid fa-lock"></i> Indisponível</span>' : ''}
              </label>
              <div class="tag-builder-row">
                <input type="text" id="input-new-tag" placeholder="Digite uma tag (ex: furry, roblox)..." ${!temPermissaoTags ? 'disabled' : ''} oninput="window.filtrarAutocompleteTagsRealtime(this.value)" />
                <button type="button" class="btn-add-tag" ${!temPermissaoTags ? 'disabled' : ''} onclick="window.adicionarTagPerfil()"><i class="fa-solid fa-plus"></i></button>
              </div>
              <div class="tags-autocomplete-list" id="tags-autocomplete-container"></div>
              <div class="tags-active-list" id="tags-active-container"></div>
            </div>

            <div class="edit-form-group">
              <label>
                Selos de Verificado
                <span class="permission-notice"><i class="fa-solid fa-shield-halved"></i> Escolha quais selos exibir</span>
              </label>
              <div id="container-verificados-chips" class="badges-chips-wrapper"></div>
              <div style="margin-top: 8px; display: flex; align-items: center; gap: 8px;">
                <small style="color: #aaa;">Pré-visualização no Perfil:</small>
                <div id="container-verificados-preview"></div>
              </div>
            </div>
          </div>

          <div id="edit-sec-cores" class="edit-section-tab" style="display:none;">
            <div class="edit-form-group">
              <label><i class="fa-solid fa-palette" style="color:#ff2d55;"></i> Personalização de Cores do Perfil</label>
              
              <div class="custom-color-selector-box">
                <div class="color-target-selector-tabs">
                  <button type="button" class="color-target-pill ${canalCorAtivoPerfil === 'bg' ? 'active' : ''}" onclick="window.alternarCanalCorPerfil('bg')">Cor 1 (Tema)</button>
                  <button type="button" class="color-target-pill ${canalCorAtivoPerfil === 'bg2' ? 'active' : ''}" onclick="window.alternarCanalCorPerfil('bg2')">Cor 2 (Degradê)</button>
                  <button type="button" class="color-target-pill ${canalCorAtivoPerfil === 'verificados' ? 'active' : ''}" onclick="window.alternarCanalCorPerfil('verificados')">Verificados</button>
                </div>

                <div class="canvas-picker-container">
                  <canvas id="color-picker-canvas-perfil" class="color-canvas-map" width="400" height="120"></canvas>
                  <input type="range" min="0" max="360" value="0" class="color-hue-slider" id="hue-range-slider-perfil" oninput="window.atualizarMatizCanvasPerfil(this.value)">
                </div>

                <div class="color-quick-swatches">
                  ${paletaCoresPredefinidas.map(c => `<div class="swatch-circle" style="background: ${c};" onclick="window.selecionarCorDoPickerProprioPerfil('${c}')"></div>`).join('')}
                </div>

                <div class="color-hex-input-row">
                  <div class="color-hex-preview-badge" id="current-hex-badge-perfil"></div>
                  <input type="text" id="custom-hex-input-perfil" placeholder="#FFFFFF" oninput="window.processarInputHexNativoPerfil(this.value)" />
                </div>
              </div>
            </div>
          </div>

        </div>

        <div class="edit-btns-row">
          <button type="button" class="btn-cancelar-edit" onclick="window.solicitarFecharModal()">
            <i class="fa-solid fa-xmark"></i> Cancelar
          </button>
          <button type="button" id="btn-salvar-perfil" class="btn-salvar-edit" onclick="window.salvarPerfilCompleto()">
            <i class="fa-solid fa-check"></i> Salvar Alterações
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    renderizarChipsVerificados();
    renderizarTagsAtivas();
    renderizarPreviewDinamico();
    inicializarListenersFormulario();
    configurarDragAndDrop();
  }

  function mudarAbaPerfil(aba) {
    acionarVibracao(10);
    abaAtiva = aba;
    document.querySelectorAll('.edit-perfil-tabs-bar .tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.edit-section-tab').forEach(sec => sec.style.display = 'none');

    const btnAtivo = document.getElementById(`tab-btn-${aba}`);
    if (btnAtivo) btnAtivo.classList.add('active');

    const secAtiva = document.getElementById(`edit-sec-${aba}`);
    if (secAtiva) secAtiva.style.display = 'block';

    if (aba === 'preview') renderizarPreviewDinamico();
    if (aba === 'cores') {
      inicializarCanvasPickerPerfil();
      sincronizarExibicaoColorPickerPerfil();
    }
  }

  function atualizarTempPerfil(chave, valor) {
    marcarAlteracaoPendente();
    if (!global.estadoPerfilTemp) return;

    global.estadoPerfilTemp[chave] = valor;

    const wrapper = document.querySelector('.edit-perfil-wrapper');
    if (wrapper && (chave === 'cor_bg1' || chave === 'cor_bg2')) {
      const bg1 = global.estadoPerfilTemp.cor_bg1 || '#ff2d55';
      const bg2 = global.estadoPerfilTemp.cor_bg2 || bg1;
      const gradient = bg1 !== bg2 ? `linear-gradient(135deg, ${bg1}, ${bg2})` : bg1;
      wrapper.style.setProperty('--user-theme-color', bg1);
      wrapper.style.setProperty('--user-theme-gradient', gradient);
    }

    // Atualiza sincronizadamente os mini-previews dos cards de fotos
    sincronizarMiniPreviewsMidia(chave, valor);
    renderizarPreviewDinamico();
  }

  // Atualização dos mini-previews na aba de fotos
  function sincronizarMiniPreviewsMidia(chave, valor) {
    if (chave === 'banner_url') {
      const miniBanner = document.getElementById('mini-prev-banner');
      if (miniBanner) miniBanner.src = valor;
    } else if (chave === 'avatar_url') {
      const miniAvatar = document.getElementById('mini-prev-avatar');
      if (miniAvatar) miniAvatar.src = valor;
    } else if (chave === 'moldura_url') {
      const miniMoldura = document.getElementById('mini-prev-moldura');
      if (miniMoldura) {
        if (valor) {
          miniMoldura.src = valor;
          miniMoldura.style.display = 'block';
        } else {
          miniMoldura.style.display = 'none';
        }
      }
    } else if (chave === 'wallpaper_url') {
      const miniWallpaper = document.getElementById('mini-prev-wallpaper');
      if (miniWallpaper) miniWallpaper.src = valor;
    }
  }

  function selecionarEstadoPresenca(status) {
    acionarVibracao(10);
    marcarAlteracaoPendente();
    global.estadoPerfilTemp.status = status;

    document.querySelectorAll('.presence-selector-grid .btn-presence').forEach(btn => btn.classList.remove('selected'));
    const btnSelected = document.querySelector(`.presence-selector-grid .btn-presence.${status}`);
    if (btnSelected) btnSelected.classList.add('selected');

    renderizarPreviewDinamico();
  }

  function renderizarPreviewDinamico() {
    const st = global.estadoPerfilTemp;
    if (!st) return;

    const prevCard = document.getElementById('profile-preview-card');
    if (prevCard && st.wallpaper_url) {
      prevCard.style.backgroundImage = `url('${st.wallpaper_url}')`;
    }

    const prevBannerBox = document.getElementById('prev-banner-box');
    if (prevBannerBox) {
      prevBannerBox.style.backgroundImage = `url('${st.banner_url || 'https://via.placeholder.com/600x180/10050c/ff2d55?text=Sphere'}')`;
    }

    const prevAvatar = document.getElementById('prev-avatar-img');
    if (prevAvatar) {
      prevAvatar.src = st.avatar_url || `https://ui-avatars.com/api/?background=ff2d55&color=fff&name=${encodeURIComponent(st.username || 'user')}`;
    }

    const prevMoldura = document.getElementById('prev-moldura-img');
    if (prevMoldura) {
      if (st.moldura_url) {
        prevMoldura.src = st.moldura_url;
        prevMoldura.style.display = 'block';
      } else {
        prevMoldura.style.display = 'none';
      }
    }

    const prevStatusDot = document.getElementById('prev-status-dot');
    if (prevStatusDot) {
      prevStatusDot.className = `preview-status-indicator ${st.status}`;
    }

    const prevName = document.getElementById('prev-display-name');
    if (prevName) prevName.innerText = st.display_name || 'Seu Nome';

    const prevUser = document.getElementById('prev-username');
    if (prevUser) prevUser.innerText = `@${st.username || 'usuario'}`;

    const prevIdade = document.getElementById('prev-idade');
    if (prevIdade) prevIdade.innerText = calcularIdadeFormatada(st.data_nascimento);

    const prevGenero = document.getElementById('prev-genero');
    if (prevGenero) prevGenero.innerText = st.genero || 'Gênero não informado';

    const prevSobre = document.getElementById('prev-sobre');
    if (prevSobre) prevSobre.innerText = st.sobre || 'Sua biografia aparecerá aqui...';

    const prevBubble = document.getElementById('prev-status-bubble');
    if (prevBubble) {
      if (!st.status_emoji && !st.custom_status) {
        prevBubble.style.display = 'none';
      } else {
        prevBubble.style.display = 'inline-flex';
        prevBubble.innerHTML = `${st.status_emoji ? `<span class="emoji">${st.status_emoji}</span>` : ''} <span class="text">${st.custom_status || ''}</span>`;
      }
    }

    const prevTags = document.getElementById('prev-tags-container');
    if (prevTags) {
      const bg1 = st.cor_bg1 || '#ff2d55';
      const bg2 = st.cor_bg2 || bg1;
      const bgStyle = bg1 !== bg2 ? `linear-gradient(135deg, ${bg1}, ${bg2})` : bg1;
      prevTags.innerHTML = st.tags.map(t => `<span class="profile-tag-pill" style="background: ${bgStyle}; color: #fff;">${t}</span>`).join('');
    }

    const prevBadges = document.getElementById('prev-badge-row');
    if (prevBadges && typeof window.obterHtmlBadgesUsuario === 'function') {
      prevBadges.innerHTML = window.obterHtmlBadgesUsuario({
        verificados: st.verificados_exibir,
        verificados_exibir: st.verificados_exibir
      });
      prevBadges.querySelectorAll('i, svg').forEach(elem => {
        elem.style.color = st.cor_verificados;
      });
    }
  }

  async function filtrarAutocompleteTagsRealtime(valor) {
    const container = document.getElementById('tags-autocomplete-container');
    if (!container) return;

    const query = valor.trim().toLowerCase();
    if (!query) {
      container.innerHTML = '';
      return;
    }

    const sb = obterSupabaseEditarPerfil();
    if (!sb) return;

    try {
      const { data, error } = await sb
        .from('usuarios')
        .select('tags')
        .not('tags', 'is', null);

      if (error) throw error;

      const contagem = {};
      data.forEach(row => {
        if (row.tags) {
          const arr = row.tags.split('|').map(t => t.trim().toLowerCase()).filter(Boolean);
          arr.forEach(tag => {
            const tagFormatada = tag.startsWith('#') ? tag : `#${tag}`;
            contagem[tagFormatada] = (contagem[tagFormatada] || 0) + 1;
          });
        }
      });

      const queryFormatada = query.startsWith('#') ? query : `#${query}`;
      const resultados = Object.keys(contagem)
        .filter(tag => tag.includes(queryFormatada))
        .map(tag => ({ label: tag, usadores: contagem[tag] }))
        .sort((a, b) => b.usadores - a.usadores);

      if (resultados.length === 0) {
        container.innerHTML = `
          <div class="autocomplete-item" onclick="window.selecionarTagSugerida('${queryFormatada}')">
            <span>${queryFormatada}</span>
            <small>Criar nova tag (0 usadores)</small>
          </div>`;
        return;
      }

      container.innerHTML = resultados.map(t => `
        <div class="autocomplete-item" onclick="window.selecionarTagSugerida('${t.label}')">
          <span>${t.label}</span>
          <small>${t.usadores} usadores</small>
        </div>
      `).join('');

    } catch (err) {
      console.warn("[EditarPerfil] Erro ao buscar contagem de tags:", err);
    }
  }

  function selecionarTagSugerida(tagLabel) {
    if (!global.estadoPerfilTemp.tags.includes(tagLabel)) {
      global.estadoPerfilTemp.tags.push(tagLabel);
      marcarAlteracaoPendente();
      renderizarTagsAtivas();
      renderizarPreviewDinamico();
    }
    const input = document.getElementById('input-new-tag');
    if (input) input.value = '';
    const container = document.getElementById('tags-autocomplete-container');
    if (container) container.innerHTML = '';
  }

  function adicionarTagPerfil() {
    const input = document.getElementById('input-new-tag');
    if (!input) return;
    const val = input.value.trim();
    if (val) selecionarTagSugerida(val.startsWith('#') ? val : `#${val}`);
  }

  function removerTagPerfil(index) {
    global.estadoPerfilTemp.tags.splice(index, 1);
    marcarAlteracaoPendente();
    renderizarTagsAtivas();
    renderizarPreviewDinamico();
  }

  function renderizarTagsAtivas() {
    const container = document.getElementById('tags-active-container');
    if (!container || !global.estadoPerfilTemp) return;

    container.innerHTML = global.estadoPerfilTemp.tags.map((t, idx) => `
      <span class="active-tag-chip">
        ${t} <button type="button" onclick="window.removerTagPerfil(${idx})">&times;</button>
      </span>
    `).join('');
  }

  function inicializarCanvasPickerPerfil() {
    const canvas = document.getElementById('color-picker-canvas-perfil');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function renderGradient() {
      ctx.fillStyle = `hsl(${hueAtualCanvasPerfil}, 100%, 50%)`;
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

      selecionarCorDoPickerProprioPerfil(hex);
    }

    let isDragging = false;
    canvas.onmousedown = (e) => { isDragging = true; pickColor(e); };
    canvas.onmousemove = (e) => { if (isDragging) pickColor(e); };
    window.onmouseup = () => { isDragging = false; };

    canvas.ontouchstart = (e) => { isDragging = true; pickColor(e); };
    canvas.ontouchmove = (e) => { if (isDragging) pickColor(e); };
    window.ontouchend = () => { isDragging = false; };
  }

  function atualizarMatizCanvasPerfil(val) {
    hueAtualCanvasPerfil = val;
    inicializarCanvasPickerPerfil();
  }

  function alternarCanalCorPerfil(canal) {
    acionarVibracao(10);
    canalCorAtivoPerfil = canal;
    sincronizarExibicaoColorPickerPerfil();
  }

  function sincronizarExibicaoColorPickerPerfil() {
    if (!global.estadoPerfilTemp) return;
    const chave = canalCorAtivoPerfil === 'bg' ? 'cor_bg1' : canalCorAtivoPerfil === 'bg2' ? 'cor_bg2' : 'cor_verificados';
    const hexVal = global.estadoPerfilTemp[chave] || '#ffffff';

    const badge = document.getElementById('current-hex-badge-perfil');
    const input = document.getElementById('custom-hex-input-perfil');

    if (badge) badge.style.background = hexVal;
    if (input) input.value = hexVal;

    const pills = document.querySelectorAll('#edit-sec-cores .color-target-pill');
    pills.forEach(p => p.classList.remove('active'));
    const btnAtivo = Array.from(pills).find(p => p.getAttribute('onclick') && p.getAttribute('onclick').includes(`'${canalCorAtivoPerfil}'`));
    if (btnAtivo) btnAtivo.classList.add('active');
  }

  function selecionarCorDoPickerProprioPerfil(hex) {
    if (!global.estadoPerfilTemp) return;
    const chave = canalCorAtivoPerfil === 'bg' ? 'cor_bg1' : canalCorAtivoPerfil === 'bg2' ? 'cor_bg2' : 'cor_verificados';
    atualizarTempPerfil(chave, hex);
    sincronizarExibicaoColorPickerPerfil();
  }

  function processarInputHexNativoPerfil(val) {
    if (val.startsWith('#') && (val.length === 4 || val.length === 7)) {
      selecionarCorDoPickerProprioPerfil(val);
    }
  }

  function inicializarListenersFormulario() {
    const container = document.getElementById('edit-perfil-full-container');
    if (!container) return;

    container.querySelectorAll('input, select, textarea').forEach(elem => {
      elem.addEventListener('input', marcarAlteracaoPendente);
      elem.addEventListener('change', marcarAlteracaoPendente);
    });

    document.addEventListener('keydown', escTeclasHandler);
  }

  function escTeclasHandler(e) {
    if (e.key === 'Escape') {
      const modalCrop = document.getElementById('crop-image-modal');
      if (!modalCrop) {
        solicitarFecharModal();
      }
    }
  }

  function configurarDragAndDrop() {
    const mapeamentoAreas = [
      { id: 'drop-area-avatar', tipo: 'avatar' },
      { id: 'drop-area-banner', tipo: 'banner' }
    ];

    mapeamentoAreas.forEach(({ id, tipo }) => {
      const area = document.getElementById(id);
      if (!area) return;

      ['dragenter', 'dragover'].forEach(eventName => {
        area.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          area.classList.add('drag-highlight');
        }, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        area.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          area.classList.remove('drag-highlight');
        }, false);
      });

      area.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files && files[0]) {
          const fakeInput = { files: [files[0]] };
          processarArquivoInput(fakeInput, tipo);
        }
      });
    });
  }

  function ajustarZoomMedia(tipo, valor) {
    const targetImg = document.getElementById(`prev-${tipo}-img`);
    if (targetImg) targetImg.style.transform = `scale(${valor})`;

    const miniTarget = document.getElementById(`mini-prev-${tipo}`);
    if (miniTarget) miniTarget.style.transform = `scale(${valor})`;
  }

  // Upload e atualização dos previews de arquivo selecionado
  async function processarArquivoInput(input, tipo) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];

    if (file.size > 15 * 1024 * 1024) {
      mostrarToastEdit("A imagem excede o tamanho máximo permitido de 15MB.", "alerta");
      input.value = '';
      return;
    }

    try {
      if (tipo === 'moldura' || file.type === 'image/gif') {
        mostrarToastEdit("Enviando mídia para o servidor...", "info");
        const urlCloud = await enviarMidiaParaStorage(file, tipo);
        atualizarTempPerfil(`${tipo}_url`, urlCloud);
        mostrarToastEdit("Mídia atualizada com sucesso!", "sucesso");
      } else {
        abrirModalCropImage(file, tipo, async (croppedFile) => {
          try {
            mostrarToastEdit("Enviando imagem recortada...", "info");
            const urlCloud = await enviarMidiaParaStorage(croppedFile, tipo);
            atualizarTempPerfil(`${tipo}_url`, urlCloud);
            mostrarToastEdit("Imagem atualizada com sucesso!", "sucesso");
          } catch (cropErr) {
            console.error(cropErr);
            mostrarToastEdit("Falha ao enviar imagem recortada.", "erro");
          }
        });
      }
    } catch (err) {
      console.error(err);
      mostrarToastEdit("Erro ao fazer upload da imagem. Tente novamente.", "erro");
    } finally {
      input.value = '';
    }
  }

  function solicitarFecharModal() {
    if (formularioComAlteracoes) {
      if (confirm("Existem alterações não salvas. Deseja realmente descartar?")) {
        fecharModalEditarPerfil(true);
      }
    } else {
      fecharModalEditarPerfil(true);
    }
  }

  function fecharModalEditarPerfil(forcar = false) {
    if (!forcar && formularioComAlteracoes) {
      if (!confirm("Descartar alterações pendentes?")) return;
    }

    document.removeEventListener('keydown', escTeclasHandler);

    const container = document.getElementById('edit-perfil-full-container');
    if (container) container.remove();

    const cropModal = document.getElementById('crop-image-modal');
    if (cropModal) cropModal.remove();

    removerBloqueioNavegacao();
  }

  async function salvarPerfilCompleto() {
    const usuario = obterUsuarioLocalEditarPerfil();
    if (!usuario || usuario.id === undefined) {
      mostrarToastEdit("Sessão expirada. Faça login novamente.", "erro");
      return;
    }

    const sb = obterSupabaseEditarPerfil();
    if (!sb) {
      mostrarToastEdit("Erro de conexão com o banco de dados.", "erro");
      return;
    }

    const st = global.estadoPerfilTemp;
    if (!st) return;

    const novoUsername = st.username.trim().toLowerCase();
    if (novoUsername) {
      const regexUsername = /^[a-z0-9_]{3,20}$/;
      if (!regexUsername.test(novoUsername)) {
        mostrarToastEdit("Username inválido! Use de 3 a 20 caracteres (letras, números e _).", "alerta");
        return;
      }
    }

    const btnSalvar = document.getElementById('btn-salvar-perfil');
    if (btnSalvar) {
      btnSalvar.disabled = true;
      btnSalvar.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Salvando...`;
    }

    let statusExpiraEm = null;
    if (st.status_tempo && st.status_tempo !== 'sempre') {
      const tempoMsMap = {
        '30m': 30 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '5h': 5 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000
      };
      if (tempoMsMap[st.status_tempo]) {
        statusExpiraEm = new Date(Date.now() + tempoMsMap[st.status_tempo]).toISOString();
      }
    }

    try {
      const strSelosExibir = processarEntradaFormatada(st.verificados_exibir);

      const payload = {
        display_name: st.display_name.trim() || null,
        data_nascimento: st.data_nascimento || null,
        pronome: st.pronome.trim() || null,
        genero: st.genero.trim() || null,
        sobre: st.sobre.trim() || null,
        status: st.status,
        status_emoji: st.status_emoji.trim() || null,
        custom_status: st.custom_status.trim() || null,
        status_expira_em: statusExpiraEm,
        avatar_url: st.avatar_url || null,
        banner_url: st.banner_url || null,
        moldura_url: st.moldura_url || null,
        wallpaper_url: st.wallpaper_url || null,
        verificados_exibir: strSelosExibir,
        cor_bg1: st.cor_bg1,
        cor_bg2: st.cor_bg2,
        cor_tema: st.cor_bg1,
        cor_verificados: st.cor_verificados
      };

      if (possuiPermissaoTags(usuario)) {
        payload.tags = st.tags.length > 0 ? st.tags.join(' | ') : null;
      }

      if (novoUsername && novoUsername !== usuario.username) {
        payload.username = novoUsername;
        payload.username_updated_at = new Date().toISOString();
      }

      const { data, error } = await sb
        .from('usuarios')
        .update(payload)
        .eq('id', Number(usuario.id))
        .select();

      if (error) {
        if (error.code === '23505') {
          mostrarToastEdit("O nome de usuário já está em uso por outra conta.", "erro");
        } else {
          mostrarToastEdit("Erro ao salvar: " + error.message, "erro");
        }
      } else {
        const dadosRetornados = (data && data.length > 0) ? data[0] : payload;
        const usuarioAtualizado = { ...usuario, ...dadosRetornados };

        const jsonAtualizado = JSON.stringify(usuarioAtualizado);
        localStorage.setItem('usuario_logado', jsonAtualizado);
        if (localStorage.getItem('usuario')) localStorage.setItem('usuario', jsonAtualizado);
        if (localStorage.getItem('user')) localStorage.setItem('user', jsonAtualizado);

        if (typeof window.atualizarStatusServidor === 'function') {
          await window.atualizarStatusServidor(st.status, true);
        }

        formularioComAlteracoes = false;
        mostrarToastEdit("Perfil atualizado com sucesso!", "sucesso");
        fecharModalEditarPerfil(true);

        if (typeof window.abrirPerfil === 'function') {
          window.abrirPerfil(usuarioAtualizado);
        } else if (typeof window.renderHomeCard === 'function') {
          window.renderHomeCard(usuarioAtualizado);
        }
      }
    } catch (err) {
      console.error(err);
      mostrarToastEdit("Falha crítica ao atualizar informações.", "erro");
    } finally {
      if (btnSalvar) {
        btnSalvar.disabled = false;
        btnSalvar.innerHTML = `<i class="fa-solid fa-check"></i> Salvar Alterações`;
      }
    }
  }

  // Exportações Globais
  global.abrirModalEditarPerfil = abrirModalEditarPerfil;
  global.fecharModalEditarPerfil = fecharModalEditarPerfil;
  global.solicitarFecharModal = solicitarFecharModal;
  global.mudarAbaPerfil = mudarAbaPerfil;
  global.atualizarTempPerfil = atualizarTempPerfil;
  global.selecionarEstadoPresenca = selecionarEstadoPresenca;
  global.filtrarAutocompleteTagsRealtime = filtrarAutocompleteTagsRealtime;
  global.selecionarTagSugerida = selecionarTagSugerida;
  global.adicionarTagPerfil = adicionarTagPerfil;
  global.removerTagPerfil = removerTagPerfil;
  global.ajustarZoomMedia = ajustarZoomMedia;
  global.processarArquivoInput = processarArquivoInput;
  global.alternarSeloVerificado = alternarSeloVerificado;
  global.alternarCanalCorPerfil = alternarCanalCorPerfil;
  global.atualizarMatizCanvasPerfil = atualizarMatizCanvasPerfil;
  global.selecionarCorDoPickerProprioPerfil = selecionarCorDoPickerProprioPerfil;
  global.processarInputHexNativoPerfil = processarInputHexNativoPerfil;
  global.salvarAlteracoesPerfil = salvarPerfilCompleto;
  global.salvarPerfilCompleto = salvarPerfilCompleto;

})(typeof window !== 'undefined' ? window : this);
