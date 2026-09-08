// ==========================================================================
// MÓDULO DE SEGURANÇA: E-MAIL & SENHA (email-senha.js) - SPHERE v5.2 PRO
// ==========================================================================

(function (global) {
  'use strict';

  function obterSupabase() {
    return global.supabaseClient || global.supabase || global.sb || null;
  }

  function obterUsuarioLocal() {
    try {
      const raw = localStorage.getItem('usuario_logado') || localStorage.getItem('usuario') || localStorage.getItem('user');
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function sanitizar(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // Mascaramento de e-mail ex: "u***r@gmail.com"
  function mascararEmail(email) {
    if (!email || !email.includes('@')) return 'Nenhum e-mail cadastrado';
    const partes = email.split('@');
    const usuario = partes[0];
    const dominio = partes[1];
    if (usuario.length <= 2) return `${usuario[0]}***@${dominio}`;
    return `${usuario[0]}***${usuario[usuario.length - 1]}@${dominio}`;
  }

  // Alterna visualização do e-mail completo / mascarado
  function alternarVisibilidadeEmail() {
    const elText = document.getElementById('config-email-display-text');
    const btnIcon = document.getElementById('btn-toggle-email-eye');
    if (!elText || !btnIcon) return;

    const estaRevelado = elText.dataset.revelado === 'true';
    const emailReal = elText.dataset.emailReal || '';

    if (estaRevelado) {
      elText.innerText = mascararEmail(emailReal);
      elText.dataset.revelado = 'false';
      btnIcon.className = 'fa-solid fa-eye';
    } else {
      elText.innerText = emailReal || 'Nenhum e-mail cadastrado';
      elText.dataset.revelado = 'true';
      btnIcon.className = 'fa-solid fa-eye-slash';
    }
  }

  // Troca ou Adiciona E-mail
  async function solicitarTrocaEmail() {
    const novoEmail = document.getElementById('config-novo-email-input')?.value.trim();
    const usuario = obterUsuarioLocal();
    const sb = obterSupabase();

    if (!novoEmail || !novoEmail.includes('@')) {
      if (typeof global.mostrarToastConfig === 'function') global.mostrarToastConfig("Informe um e-mail válido.", "erro");
      return;
    }

    if (usuario.email && usuario.email.toLowerCase() === novoEmail.toLowerCase()) {
      if (typeof global.mostrarToastConfig === 'function') global.mostrarToastConfig("Este já é o seu e-mail atual.", "erro");
      return;
    }

    if (!sb) {
      if (typeof global.mostrarToastConfig === 'function') global.mostrarToastConfig("Erro de conexão com o banco de dados.", "erro");
      return;
    }

    try {
      const emailAntigo = usuario.email;

      // Chama a alteração do Supabase Auth (Envia e-mail de confirmação)
      const { error } = await sb.auth.updateUser({ email: novoEmail });

      if (error) {
        if (typeof global.mostrarToastConfig === 'function') global.mostrarToastConfig("Erro ao solicitar troca: " + error.message, "erro");
        return;
      }

      if (emailAntigo) {
        if (typeof global.mostrarToastConfig === 'function') {
          global.mostrarToastConfig("Um e-mail de confirmação foi enviado para o seu endereço principal e para o novo endereço!", "sucesso", 5000);
        }
      } else {
        if (typeof global.mostrarToastConfig === 'function') {
          global.mostrarToastConfig("E-mail adicionado! Verifique a caixa de entrada para confirmar o endereço.", "sucesso", 5000);
        }
      }

      // Atualiza localmente o e-mail pendente
      usuario.email_pendente = novoEmail;
      localStorage.setItem('usuario_logado', JSON.stringify(usuario));

    } catch (e) {
      console.error(e);
      if (typeof global.mostrarToastConfig === 'function') global.mostrarToastConfig("Falha na requisição.", "erro");
    }
  }

  // Alteração de Senha Segura
  async function alterarSenha() {
    const atual = document.getElementById('config-senha-atual')?.value;
    const nova = document.getElementById('config-senha-nova')?.value;
    const confirmar = document.getElementById('config-senha-confirmar')?.value;

    const usuario = obterUsuarioLocal();
    const sb = obterSupabase();

    if (!atual || !nova || !confirmar) {
      if (typeof global.mostrarToastConfig === 'function') global.mostrarToastConfig("Preencha todos os campos de senha.", "erro");
      return;
    }

    if (nova.length < 6) {
      if (typeof global.mostrarToastConfig === 'function') global.mostrarToastConfig("A nova senha deve ter no mínimo 6 caracteres.", "erro");
      return;
    }

    if (nova !== confirmar) {
      if (typeof global.mostrarToastConfig === 'function') global.mostrarToastConfig("A nova senha e a confirmação não coincidem.", "erro");
      return;
    }

    if (!sb) return;

    // Valida se a senha atual no banco confere
    const { data: val, error: errVal } = await sb.from('usuarios').select('id, senha').eq('id', usuario.id).eq('senha', atual).maybeSingle();

    if (errVal || !val) {
      if (typeof global.mostrarToastConfig === 'function') global.mostrarToastConfig("Senha atual incorreta.", "erro");
      return;
    }

    // Atualiza a senha na tabela customizada e no Supabase Auth
    const { error: errUp } = await sb.from('usuarios').update({ senha: nova, requer_relog: true }).eq('id', usuario.id);
    await sb.auth.updateUser({ password: nova });

    if (errUp) {
      if (typeof global.mostrarToastConfig === 'function') global.mostrarToastConfig("Erro ao atualizar senha: " + errUp.message, "erro");
    } else {
      usuario.senha = nova;
      localStorage.setItem('usuario_logado', JSON.stringify(usuario));

      if (typeof global.mostrarToastConfig === 'function') {
        global.mostrarToastConfig("Senha alterada! Como a senha mudou, faça login novamente.", "sucesso", 3000);
      }

      setTimeout(() => {
        if (typeof global.confirmarSairSessao === 'function') global.confirmarSairSessao();
      }, 2000);
    }
  }

  // Esqueceu a Senha (Recuperação por E-mail)
  async function solicitarRecuperacaoSenha() {
    const usuario = obterUsuarioLocal();
    const sb = obterSupabase();

    const emailAlvo = usuario?.email || prompt("Informe o seu e-mail cadastrado:");

    if (!emailAlvo || !emailAlvo.includes('@')) {
      if (typeof global.mostrarToastConfig === 'function') global.mostrarToastConfig("E-mail de recuperação inválido.", "erro");
      return;
    }

    if (!sb) return;

    const { error } = await sb.auth.resetPasswordForEmail(emailAlvo, {
      redirectTo: `${window.location.origin}/reset-password.html`
    });

    if (error) {
      if (typeof global.mostrarToastConfig === 'function') global.mostrarToastConfig("Erro ao enviar e-mail: " + error.message, "erro");
    } else {
      if (typeof global.mostrarToastConfig === 'function') {
        global.mostrarToastConfig("E-mail de redefinição enviado com sucesso! Verifique sua caixa de entrada.", "sucesso", 4000);
      }
    }
  }

  function cancelarAlteracaoSenha() {
    if (document.getElementById('config-senha-atual')) document.getElementById('config-senha-atual').value = '';
    if (document.getElementById('config-senha-nova')) document.getElementById('config-senha-nova').value = '';
    if (document.getElementById('config-senha-confirmar')) document.getElementById('config-senha-confirmar').value = '';
  }

  // Exportações
  global.mascararEmail = mascararEmail;
  global.alternarVisibilidadeEmail = alternarVisibilidadeEmail;
  global.solicitarTrocaEmail = solicitarTrocaEmail;
  global.alterarSenha = alterarSenha;
  global.solicitarRecuperacaoSenha = solicitarRecuperacaoSenha;
  global.cancelarAlteracaoSenha = cancelarAlteracaoSenha;

})(typeof window !== 'undefined' ? window : this);
