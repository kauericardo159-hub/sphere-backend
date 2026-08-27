// ==========================================================================
// MÓDULO DE EDIÇÃO DE PERFIL - ESTILO PROJECT Z (editarperfil.js)
// Project Z v5.0 | Integrado com status.js (int8), Cropper.js & Molduras
// ==========================================================================

(function () {
  'use strict';

  let formularioComAlteracoes = false;
  let selosAutorizadosUsuario = [];
  let selosSelecionados = [];
  let cropperInstancia = null;

  // Helper para obtenção segura do Supabase Client
  function obterSupabaseEditarPerfil() {
    return window.supabaseClient || window.supabase || window.sb || null;
  }

  // Resolução do Usuário no LocalStorage
  function obterUsuarioLocalEditarPerfil() {
    try {
      const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error("[EditarPerfil] Erro ao carregar usuário do localStorage:", e);
    }
    return null;
  }

  // Sanitizadores de Entrada
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

  // Notification Toast
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

  // Carregamento Assíncrono do Cropper.js
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

  // Proteção contra Perda de Dados Não Salvos
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
    return String(str)
      .split('|')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }

  function processarEntradaFormatada(lista) {
    if (!Array.isArray(lista) || lista.length === 0) return null;
    return lista.join(' | ');
  }

  function calcularSelosPermitidos(usuario) {
    const selos = new Set();

    if (usuario.is_creator || usuario.is_criador) selos.add('Creator');
    if (usuario.is_verified) selos.add('Verificado');
    if (usuario.is_admin || usuario.role === 'admin') selos.add('Admin');

    if (usuario.selos_concedidos) {
      extrairListaItens(usuario.selos_concedidos).forEach(s => selos.add(s));
    }

    if (usuario.verificados) {
      extrairListaItens(usuario.verificados).forEach(s => selos.add(s));
    }

    return Array.from(selos);
  }

  // Recorte Exclusivo para Avatar e Banner
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
        banner: 3 / 1
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
        autoCropArea: 0.9
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
          avatar: { width: 300, height: 300 },
          banner: { width: 1200, height: 400 }
        }[tipo];

        const canvas = cropperInstancia.getCroppedCanvas({
          width: dims.width,
          height: dims.height,
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high'
        });

        const croppedBase64 = canvas.toDataURL('image/webp', 0.88);
        callbackSucesso(croppedBase64);
        fecharCropModal();
      };
    };

    reader.readAsDataURL(file);
  }

  function otimizarImagemGaleria(file, larguraMax, alturaMax, qualidade = 0.85) {
    return new Promise((resolve, reject) => {
      if (file.type === 'image/gif' || file.type === 'image/png') {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > larguraMax) {
              height = Math.round((height * larguraMax) / width);
              width = larguraMax;
            }
          } else {
            if (height > alturaMax) {
              width = Math.round((width * alturaMax) / height);
              height = alturaMax;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL('image/webp', qualidade));
        };
        img.onerror = (err) => reject(err);
        img.src = event.target.result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  function renderizarChipsVerificados() {
    const container = document.getElementById('container-verificados-chips');
    if (!container) return;

    if (selosAutorizadosUsuario.length === 0) {
      container.innerHTML = `<span class="permission-notice"><i class="fa-solid fa-lock"></i> Nenhum selo de verificado atribuído a esta conta.</span>`;
      return;
    }

    container.innerHTML = selosAutorizadosUsuario.map(selo => {
      const estaAtivo = selosSelecionados.includes(selo);
      return `
        <button type="button" class="badge-chip ${estaAtivo ? 'active' : ''}" onclick="window.alternarSeloVerificado('${sanitizarAtributoInput(selo)}')">
          <i class="fa-solid ${estaAtivo ? 'fa-circle-check' : 'fa-circle'}"></i> ${selo}
        </button>
      `;
    }).join('');
  }

  function alternarSeloVerificado(selo) {
    if (!selosAutorizadosUsuario.includes(selo)) {
      mostrarToastEdit("Selo não autorizado para este perfil.", "alerta");
      return;
    }

    if (selosSelecionados.includes(selo)) {
      selosSelecionados = selosSelecionados.filter(s => s !== selo);
    } else {
      selosSelecionados.push(selo);
    }

    marcarAlteracaoPendente();
    renderizarChipsVerificados();
  }

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
    selosSelecionados = extrairListaItens(usuario.verificados);

    const container = document.createElement('div');
    container.id = 'edit-perfil-full-container';
    container.className = 'edit-perfil-full-container';

    container.innerHTML = `
      <div class="edit-perfil-wrapper">
        <div class="edit-perfil-header">
          <h2><i class="fa-solid fa-sliders"></i> Editar Perfil</h2>
          <button type="button" class="btn-fechar-top" onclick="window.solicitarFecharModal()">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>

        <!-- Banner Box -->
        <div class="media-card-box" id="drop-area-banner">
          <div class="media-card-label"><i class="fa-solid fa-image"></i> Banner de Capa</div>
          <div class="source-tabs">
            <button type="button" class="source-tab-btn active" id="tab-banner-url" onclick="window.alternarFonteMedia('banner', 'url')">
              <i class="fa-solid fa-link"></i> Link URL
            </button>
            <button type="button" class="source-tab-btn" id="tab-banner-file" onclick="window.alternarFonteMedia('banner', 'file')">
              <i class="fa-solid fa-folder-open"></i> Galeria
            </button>
          </div>
          <div id="group-banner-url">
            <input type="text" id="edit-banner-url" value="${sanitizarAtributoInput(usuario.banner_url)}" placeholder="https://exemplo.com/banner.gif" />
          </div>
          <div id="group-banner-file" style="display: none;">
            <input type="file" id="file-banner-input" accept="image/*,image/gif" />
          </div>
          <div class="banner-preview-box">
            <img id="preview-banner-img" src="${usuario.banner_url || 'https://via.placeholder.com/600x180/10050c/ff2d55?text=Project+Z'}" class="preview-banner-img" alt="Banner" />
          </div>
          <div class="preview-controls">
            <label><i class="fa-solid fa-magnifying-glass-plus"></i> Zoom Banner:</label>
            <input type="range" id="zoom-banner" min="0.8" max="2.2" step="0.05" value="1" />
          </div>
        </div>

        <!-- Avatar & Moldura Box -->
        <div class="media-card-box" id="drop-area-avatar">
          <div class="media-card-label"><i class="fa-solid fa-user-gear"></i> Avatar & Moldura</div>
          <div class="source-tabs">
            <button type="button" class="source-tab-btn active" id="tab-avatar-url" onclick="window.alternarFonteMedia('avatar', 'url')">
              <i class="fa-solid fa-link"></i> URL Avatar
            </button>
            <button type="button" class="source-tab-btn" id="tab-avatar-file" onclick="window.alternarFonteMedia('avatar', 'file')">
              <i class="fa-solid fa-folder-open"></i> Galeria Avatar
            </button>
          </div>

          <div id="group-avatar-url">
            <input type="text" id="edit-avatar-url" value="${sanitizarAtributoInput(usuario.avatar_url)}" placeholder="URL da foto/GIF" />
          </div>
          <div id="group-avatar-file" style="display: none;">
            <input type="file" id="file-avatar-input" accept="image/*,image/gif" />
          </div>

          <div class="avatar-frame-container">
            <img id="preview-avatar-img" src="${usuario.avatar_url || defaultAvatar}" class="preview-avatar-img" alt="Avatar" />
            <img id="preview-frame-img" src="${usuario.moldura_url || ''}" class="preview-frame-img" alt="Moldura" style="${usuario.moldura_url ? '' : 'display:none;'}" />
          </div>

          <div class="preview-controls">
            <label><i class="fa-solid fa-magnifying-glass-plus"></i> Zoom Avatar:</label>
            <input type="range" id="zoom-avatar" min="0.8" max="2.2" step="0.05" value="1" />
          </div>
        </div>

        <!-- Moldura Section -->
        <div class="media-card-box">
          <div class="media-card-label"><i class="fa-solid fa-circle-notch"></i> Moldura de Perfil (Png/Gif Transparente)</div>
          <div class="source-tabs">
            <button type="button" class="source-tab-btn active" id="tab-moldura-url" onclick="window.alternarFonteMedia('moldura', 'url')">
              <i class="fa-solid fa-link"></i> URL Moldura
            </button>
            <button type="button" class="source-tab-btn" id="tab-moldura-file" onclick="window.alternarFonteMedia('moldura', 'file')">
              <i class="fa-solid fa-folder-open"></i> Galeria
            </button>
          </div>
          <div id="group-moldura-url">
            <input type="text" id="edit-moldura-url" value="${sanitizarAtributoInput(usuario.moldura_url)}" placeholder="https://exemplo.com/frame.png" />
          </div>
          <div id="group-moldura-file" style="display: none;">
            <input type="file" id="file-moldura-input" accept="image/png,image/gif,image/webp" />
          </div>
        </div>

        <!-- Status Principal Integrado -->
        <div class="edit-form-group">
          <label>Status de Presença</label>
          <div class="select-custom-wrapper">
            <select id="edit-status">
              <option value="online" ${usuario.status === 'online' ? 'selected' : ''}>🟢 Online | Disponível</option>
              <option value="ausente" ${usuario.status === 'ausente' ? 'selected' : ''}>🟠 Ausente | Inativo</option>
              <option value="dnd" ${usuario.status === 'dnd' ? 'selected' : ''}>🔴 Não Perturbe | Ocupado</option>
              <option value="offline" ${usuario.status === 'offline' ? 'selected' : ''}>⚪ Offline | Invisível</option>
            </select>
          </div>
        </div>

        <!-- Recado / Status Personalizado -->
        <div class="edit-form-group">
          <label>Recado do Perfil</label>
          <div class="status-custom-row">
            <input type="text" id="edit-status-emoji" class="emoji-picker-input" value="${sanitizarAtributoInput(usuario.status_emoji || '💬')}" maxlength="2" placeholder="💬" />
            <input type="text" id="edit-custom-status" style="flex:1;" value="${sanitizarAtributoInput(usuario.custom_status || '')}" placeholder="O que você está pensando agora?" />
          </div>
        </div>

        <!-- Nome de Exibição -->
        <div class="edit-form-group">
          <label>Nome de Exibição</label>
          <input type="text" id="edit-display-name" value="${sanitizarAtributoInput(usuario.display_name || usuario.nome || '')}" placeholder="Seu apelido público" />
        </div>

        <!-- Username / Handle -->
        <div class="edit-form-group">
          <label>
            Nome de Usuário (@handle)
            ${!checkUsername.permitido ? `<span class="username-notice"><i class="fa-solid fa-lock"></i> Bloqueado por ${checkUsername.diasRestantes} dia(s)</span>` : ''}
          </label>
          <input type="text" id="edit-username" value="${sanitizarAtributoInput(usuario.username || '')}" placeholder="seu_usuario" ${!checkUsername.permitido ? 'disabled' : ''} />
        </div>

        <!-- Verificados / Selos -->
        <div class="edit-form-group">
          <label>
            Selos de Verificado
            <span class="permission-notice"><i class="fa-solid fa-shield-halved"></i> Apenas selos concedidos</span>
          </label>
          <div id="container-verificados-chips" class="badges-chips-wrapper"></div>
        </div>

        <!-- Tags de Perfil -->
        <div class="edit-form-group">
          <label>
            Tags de Perfil
            ${!temPermissaoTags ? '<span class="permission-notice"><i class="fa-solid fa-lock"></i> Indisponível</span>' : ''}
          </label>
          <input type="text" id="edit-tags" value="${sanitizarAtributoInput(usuario.tags || '')}" placeholder="Gamer | Anime | Developer | Music" ${!temPermissaoTags ? 'disabled' : ''} />
        </div>

        <!-- Sobre Mim -->
        <div class="edit-form-group">
          <label>Sobre Mim | Biografia</label>
          <textarea id="edit-sobre" placeholder="Escreva uma breve apresentação...">${sanitizarTextoArea(usuario.sobre)}</textarea>
        </div>

        <!-- Botões de Ação -->
        <div class="edit-btns-row">
          <button type="button" class="btn-cancelar-edit" onclick="window.solicitarFecharModal()">
            <i class="fa-solid fa-xmark"></i> Cancelar
          </button>
          <button type="button" id="btn-salvar-perfil" class="btn-salvar-edit" onclick="window.salvarAlteracoesPerfil()">
            <i class="fa-solid fa-check"></i> Salvar Alterações
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    renderizarChipsVerificados();
    inicializarListenersFormulario();
    configurarDragAndDrop();
  }

  function inicializarListenersFormulario() {
    const container = document.getElementById('edit-perfil-full-container');
    if (!container) return;

    container.querySelectorAll('input, select, textarea').forEach(elem => {
      elem.addEventListener('input', marcarAlteracaoPendente);
      elem.addEventListener('change', marcarAlteracaoPendente);
    });

    document.getElementById('zoom-banner')?.addEventListener('input', (e) => ajustarZoomMedia('banner', e.target.value));
    document.getElementById('zoom-avatar')?.addEventListener('input', (e) => ajustarZoomMedia('avatar', e.target.value));

    document.getElementById('edit-banner-url')?.addEventListener('input', (e) => atualizarPreviewBanner(e.target.value));
    document.getElementById('edit-avatar-url')?.addEventListener('input', (e) => atualizarPreviewAvatar(e.target.value));
    document.getElementById('edit-moldura-url')?.addEventListener('input', (e) => atualizarPreviewMoldura(e.target.value));

    document.getElementById('file-banner-input')?.addEventListener('change', (e) => processarArquivoInput(e.target, 'banner'));
    document.getElementById('file-avatar-input')?.addEventListener('change', (e) => processarArquivoInput(e.target, 'avatar'));
    document.getElementById('file-moldura-input')?.addEventListener('change', (e) => processarArquivoInput(e.target, 'moldura'));
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

  function alternarFonteMedia(tipo, origem) {
    const btnUrl = document.getElementById(`tab-${tipo}-url`);
    const btnFile = document.getElementById(`tab-${tipo}-file`);
    const groupUrl = document.getElementById(`group-${tipo}-url`);
    const groupFile = document.getElementById(`group-${tipo}-file`);

    if (origem === 'url') {
      btnUrl?.classList.add('active');
      btnFile?.classList.remove('active');
      if (groupUrl) groupUrl.style.display = 'block';
      if (groupFile) groupFile.style.display = 'none';
    } else {
      btnFile?.classList.add('active');
      btnUrl?.classList.remove('active');
      if (groupFile) groupFile.style.display = 'block';
      if (groupUrl) groupUrl.style.display = 'none';
    }
  }

  function ajustarZoomMedia(tipo, valor) {
    const targetImg = document.getElementById(`preview-${tipo}-img`);
    if (targetImg) targetImg.style.transform = `scale(${valor})`;
  }

  function atualizarPreviewAvatar(url) {
    const img = document.getElementById('preview-avatar-img');
    if (img && url.trim() !== '') img.src = url;
  }

  function atualizarPreviewBanner(url) {
    const img = document.getElementById('preview-banner-img');
    if (img && url.trim() !== '') img.src = url;
  }

  function atualizarPreviewMoldura(url) {
    const img = document.getElementById('preview-frame-img');
    if (img) {
      if (url.trim() !== '') {
        img.src = url;
        img.style.display = 'block';
      } else {
        img.style.display = 'none';
      }
    }
  }

  async function processarArquivoInput(input, tipo) {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];

    if (file.size > 8 * 1024 * 1024) {
      mostrarToastEdit("A imagem excede o tamanho máximo permitido de 8MB.", "alerta");
      return;
    }

    if (tipo === 'moldura') {
      try {
        const dataUrlMoldura = await otimizarImagemGaleria(file, 400, 400);
        aplicarImagemAoFormulario(dataUrlMoldura, 'moldura');
      } catch (err) {
        mostrarToastEdit("Erro ao carregar moldura.", "erro");
      }
      return;
    }

    if (file.type === 'image/gif') {
      try {
        const dataUrlGif = await otimizarImagemGaleria(file, 800, 800);
        aplicarImagemAoFormulario(dataUrlGif, tipo);
      } catch (err) {
        mostrarToastEdit("Erro ao carregar GIF.", "erro");
      }
      return;
    }

    abrirModalCropImage(file, tipo, (croppedBase64) => {
      aplicarImagemAoFormulario(croppedBase64, tipo);
    });
  }

  function aplicarImagemAoFormulario(dataUrl, tipo) {
    if (tipo === 'avatar') {
      atualizarPreviewAvatar(dataUrl);
      document.getElementById('edit-avatar-url').value = dataUrl;
    } else if (tipo === 'banner') {
      atualizarPreviewBanner(dataUrl);
      document.getElementById('edit-banner-url').value = dataUrl;
    } else if (tipo === 'moldura') {
      atualizarPreviewMoldura(dataUrl);
      document.getElementById('edit-moldura-url').value = dataUrl;
    }

    marcarAlteracaoPendente();
    mostrarToastEdit("Mídia processada e atualizada!", "sucesso");
  }

  function solicitarFecharModal() {
    if (formularioComAlteracoes) {
      if (confirm("Existem alterações não salvas. Deseja realmente descartar?")) {
        fecharModalEditarPerfil();
      }
    } else {
      fecharModalEditarPerfil();
    }
  }

  function fecharModalEditarPerfil(forcar = false) {
    if (!forcar && formularioComAlteracoes) {
      if (!confirm("Descartar alterações pendentes?")) return;
    }

    const container = document.getElementById('edit-perfil-full-container');
    if (container) container.remove();

    const cropModal = document.getElementById('crop-image-modal');
    if (cropModal) cropModal.remove();

    removerBloqueioNavegacao();
  }

  async function salvarAlteracoesPerfil() {
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

    const novoUsername = document.getElementById('edit-username')?.value.trim().toLowerCase();
    if (novoUsername) {
      const regexUsername = /^[a-z0-9_]{3,20}$/;
      if (!regexUsername.test(novoUsername)) {
        mostrarToastEdit("Username inválido! Use de 3 a 20 caracteres (apenas letras, números e _).", "alerta");
        return;
      }
    }

    const btnSalvar = document.getElementById('btn-salvar-perfil');
    if (btnSalvar) {
      btnSalvar.disabled = true;
      btnSalvar.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Salvando...`;
    }

    const novoDisplayName = document.getElementById('edit-display-name')?.value.trim();
    const novoAvatar = document.getElementById('edit-avatar-url')?.value.trim();
    const novoBanner = document.getElementById('edit-banner-url')?.value.trim();
    const novaMoldura = document.getElementById('edit-moldura-url')?.value.trim();
    const novoStatus = document.getElementById('edit-status')?.value || 'online';
    const novoStatusEmoji = document.getElementById('edit-status-emoji')?.value.trim();
    const novoCustomStatus = document.getElementById('edit-custom-status')?.value.trim();
    const novasTagsRaw = document.getElementById('edit-tags')?.value;
    const novoSobre = document.getElementById('edit-sobre')?.value.trim();

    try {
      const selosFiltrados = selosSelecionados.filter(s => selosAutorizadosUsuario.includes(s));

      const payload = {
        display_name: novoDisplayName || null,
        avatar_url: novoAvatar || null,
        banner_url: novoBanner || null,
        moldura_url: novaMoldura || null,
        status: novoStatus,
        status_emoji: novoStatusEmoji || '💬',
        custom_status: novoCustomStatus || null,
        verificados: processarEntradaFormatada(selosFiltrados),
        sobre: novoSobre || null
      };

      if (possuiPermissaoTags(usuario)) {
        payload.tags = processarEntradaFormatada(extrairListaItens(novasTagsRaw));
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
        // Monta o objeto com as alterações mais recentes
        const dadosRetornados = (data && data.length > 0) ? data[0] : payload;
        const usuarioAtualizado = { ...usuario, ...dadosRetornados };

        // Garante a persistência em todas as chaves de storage possíveis
        const jsonAtualizado = JSON.stringify(usuarioAtualizado);
        localStorage.setItem('usuario_logado', jsonAtualizado);
        if (localStorage.getItem('usuario')) localStorage.setItem('usuario', jsonAtualizado);
        if (localStorage.getItem('user')) localStorage.setItem('user', jsonAtualizado);

        // Notifica o motor status.js forçando a nova escolha
        if (typeof window.atualizarStatusServidor === 'function') {
          await window.atualizarStatusServidor(novoStatus, true);
        }

        formularioComAlteracoes = false;
        mostrarToastEdit("Perfil atualizado com sucesso!", "sucesso");
        fecharModalEditarPerfil(true);

        // Atualização reativa das views de interface ativas
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
  window.abrirModalEditarPerfil = abrirModalEditarPerfil;
  window.fecharModalEditarPerfil = fecharModalEditarPerfil;
  window.solicitarFecharModal = solicitarFecharModal;
  window.alternarFonteMedia = alternarFonteMedia;
  window.alternarSeloVerificado = alternarSeloVerificado;
  window.salvarAlteracoesPerfil = salvarAlteracoesPerfil;

})();
