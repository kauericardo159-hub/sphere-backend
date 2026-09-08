// ==========================================================================
// MÓDULO DE CONFIGURAÇÃO DE NOTIFICAÇÕES (confignot.js) - SPHERE v5.2 PRO
// ==========================================================================

(function (global) {
  'use strict';

  const STORAGE_NOTIF_PREFS = 'sphere_notif_preferencias';

  function obterPreferenciasNotificacao() {
    try {
      const raw = localStorage.getItem(STORAGE_NOTIF_PREFS);
      return raw ? JSON.parse(raw) : {
        sons: true,
        vibracao: true,
        push_externo: true,
        toast_mensagens: true,
        toast_amizades: true
      };
    } catch (e) {
      return { sons: true, vibracao: true, push_externo: true, toast_mensagens: true, toast_amizades: true };
    }
  }

  function salvarPreferenciasNotificacao(novasPrefs) {
    try {
      localStorage.setItem(STORAGE_NOTIF_PREFS, JSON.stringify(novasPrefs));
      if (typeof global.mostrarToastConfig === 'function') {
        global.mostrarToastConfig("Preferências de notificação salvas!", "sucesso");
      }
    } catch (e) {
      console.error('[ConfigNot] Erro ao salvar preferências:', e);
    }
  }

  function alternarOpcaoNotificacao(chave) {
    const prefs = obterPreferenciasNotificacao();
    prefs[chave] = !prefs[chave];
    salvarPreferenciasNotificacao(prefs);

    if (chave === 'push_externo' && prefs[chave]) {
      if (typeof global.solicitarPermissaoManual === 'function') {
        global.solicitarPermissaoManual();
      }
    }
  }

  function renderizarSecaoNotificacoes() {
    const prefs = obterPreferenciasNotificacao();

    return `
      <div class="config-section">
        <div class="config-section-title">
          <i class="fa-solid fa-bell"></i> Notificações & Alertas
        </div>
        
        <div class="config-toggle-row" onclick="window.alternarOpcaoNotificacao('sons')">
          <div class="config-toggle-info">
            <span>Efeitos Sonoros</span>
            <small>Tocar som ao receber mensagens e interações.</small>
          </div>
          <input type="checkbox" ${prefs.sons ? 'checked' : ''} readonly>
        </div>

        <div class="config-toggle-row" onclick="window.alternarOpcaoNotificacao('vibracao')">
          <div class="config-toggle-info">
            <span>Feedback Tátil (Vibração)</span>
            <small>Vibrar o dispositivo móvel em avisos e gestos.</small>
          </div>
          <input type="checkbox" ${prefs.vibracao ? 'checked' : ''} readonly>
        </div>

        <div class="config-toggle-row" onclick="window.alternarOpcaoNotificacao('push_externo')">
          <div class="config-toggle-info">
            <span>Notificações Push no Navegador</span>
            <small>Receber alertas do sistema quando o app estiver em segundo plano.</small>
          </div>
          <input type="checkbox" ${prefs.push_externo ? 'checked' : ''} readonly>
        </div>

        <div class="config-toggle-row" onclick="window.alternarOpcaoNotificacao('toast_mensagens')">
          <div class="config-toggle-info">
            <span>Balão In-App (Mensagens)</span>
            <small>Exibir notificação flutuante no topo para novas conversas.</small>
          </div>
          <input type="checkbox" ${prefs.toast_mensagens ? 'checked' : ''} readonly>
        </div>
      </div>
    `;
  }

  // Exportações
  global.obterPreferenciasNotificacao = obterPreferenciasNotificacao;
  global.salvarPreferenciasNotificacao = salvarPreferenciasNotificacao;
  global.alternarOpcaoNotificacao = alternarOpcaoNotificacao;
  global.renderizarSecaoNotificacoes = renderizarSecaoNotificacoes;

})(typeof window !== 'undefined' ? window : this);
