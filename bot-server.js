/**
 * ==========================================================================
 * ROBÔ AUTOMÁTICO KEEP-ALIVE 24/7 & MONITOR DE SERVIDOR RENDER (bot-server.js)
 * SPHERE PRO v5.2 - Sincronização Inteligente com Supabase e Backoff
 * ==========================================================================
 */

const { createClient } = require('@supabase/supabase-js');

// Configurações do Supabase e Servidor Backend
const SUPABASE_URL = "https://phvnxlogznbplynwflch.supabase.co";
const SUPABASE_KEY = "sb_publishable_CvzU52jm8tRyWBE0g4UvKg_J_nVMIAQ";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const CONFIG = {
  SERVER_URL: 'https://sphere-hf7p.onrender.com/status',
  INTERVALO_PADRAO_MS: 3 * 60 * 1000,  // Ping a cada 3 minutos
  INTERVALO_RETRY_MS: 30 * 1000,       // Ping rápido a cada 30s se o servidor estiver acordando
  TIMEOUT_MS: 12000,                  // Timeout de 12 segundos
  MAX_FALHAS_ALERT: 5
};

let contagemPings = 0;
let falhasConsecutivas = 0;
let botAtivoNoBanco = true;
let modoManutencao = false;

function logFormatado(mensagem, tipo = 'INFO') {
  const dataHora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const prefixos = {
    INFO: 'ℹ️ [INFO]',
    SUCCESS: '✅ [SUCESSO]',
    WARN: '⚠️ [AVISO]',
    ERROR: '❌ [ERRO]',
    PAUSED: '⏸️ [PAUSADO]'
  };

  console.log(`[${dataHora}] ${prefixos[tipo] || '[BOT]'} ${mensagem}`);
}

/**
 * Consulta o Supabase para verificar se o robô foi desativado pelo Criador no Painel Web
 */
async function checarPermissaoExecucao() {
  try {
    const { data: configs, error } = await supabase
      .from('configuracoes_sistema')
      .select('chave, valor');

    if (error || !configs) return;

    configs.forEach(cfg => {
      if (cfg.chave === 'render_bot_active') {
        botAtivoNoBanco = (cfg.valor === 'true' || cfg.valor === true);
      }
      if (cfg.chave === 'modo_manutencao') {
        modoManutencao = (cfg.valor === 'true' || cfg.valor === true);
      }
    });
  } catch (err) {
    // Mantém o estado atual caso haja oscilação de rede
  }
}

/**
 * Registra eventos importantes no banco para exibição no console do Painel Web
 */
async function registrarLogNoBanco(mensagem, tipo = 'info') {
  try {
    await supabase.from('servidor_logs').insert([{
      mensagem: `[ROBÔ-CLI] ${mensagem}`,
      tipo: tipo,
      operador_username: 'BotKeepAlive247'
    }]);
  } catch (e) {
    // Ignora falhas de gravação secundárias
  }
}

/**
 * Executa o ping de verificação de vida no servidor Render
 */
async function executarPingDeManutencao() {
  await checarPermissaoExecucao();

  if (!botAtivoNoBanco) {
    logFormatado("Robô desativado pelo Criador no painel do Supabase. Ignorando ping.", 'PAUSED');
    return CONFIG.INTERVALO_PADRAO_MS;
  }

  if (modoManutencao) {
    logFormatado("Servidor em modo de manutenção. Robô em espera passiva.", 'WARN');
    return CONFIG.INTERVALO_PADRAO_MS;
  }

  contagemPings++;
  const tempoInicio = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.TIMEOUT_MS);

  logFormatado(`Disparando Ping #${contagemPings} -> ${CONFIG.SERVER_URL}...`, 'INFO');

  try {
    const resposta = await fetch(CONFIG.SERVER_URL, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'Sphere-KeepAlive-Bot/5.2' }
    });

    clearTimeout(timeoutId);
    const latencia = Date.now() - tempoInicio;

    if (resposta.ok) {
      if (falhasConsecutivas > 0) {
        logFormatado(`🎉 Servidor recuperado após ${falhasConsecutivas} falha(s)!`, 'SUCCESS');
        await registrarLogNoBanco(`Servidor recuperado e respondendo normalmente em ${latencia}ms.`, 'success');
      }

      falhasConsecutivas = 0;
      logFormatado(`Servidor Ativo e Respondendo (${resposta.status} OK) - ${latencia}ms`, 'SUCCESS');
      return CONFIG.INTERVALO_PADRAO_MS;
    } else {
      falhasConsecutivas++;
      logFormatado(`Resposta inesperada da API: Status ${resposta.status}`, 'WARN');
      return CONFIG.INTERVALO_RETRY_MS;
    }

  } catch (erro) {
    clearTimeout(timeoutId);
    falhasConsecutivas++;

    if (erro.name === 'AbortError') {
      logFormatado(`Timeout de ${CONFIG.TIMEOUT_MS / 1000}s atingido. O Render pode estar iniciando do zero (Cold Start)...`, 'WARN');
    } else {
      logFormatado(`Falha de conexão com a hospedagem: ${erro.message} (Tentativa consecutiva: ${falhasConsecutivas})`, 'ERROR');
    }

    if (falhasConsecutivas === CONFIG.MAX_FALHAS_ALERT) {
      await registrarLogNoBanco(`⚠️ Alerta: O servidor Render não responde há ${CONFIG.MAX_FALHAS_ALERT} tentativas consecutivas.`, 'warning');
    }

    return CONFIG.INTERVALO_RETRY_MS;
  }
}

/**
 * Loop dinâmico com ajuste automático de tempo (Self-Scheduling Loop)
 */
async function iniciarLoopComAgendamentoDinamico() {
  logFormatado("🤖 Robô Keep-Alive 24/7 (v5.2) Inicializado com sucesso!", 'SUCCESS');
  await registrarLogNoBanco("Robô de Monitoramento e Keep-Alive 24/7 ligado.", "info");

  const executarProximaRodada = async () => {
    const proximoIntervalo = await executarPingDeManutencao();
    setTimeout(executarProximaRodada, proximoIntervalo);
  };

  executarProximaRodada();
}

// Tratamento para encerramento gracioso do robô
process.on('SIGINT', async () => {
  logFormatado("Encerrando Robô Keep-Alive...", 'WARN');
  await registrarLogNoBanco("Robô Keep-Alive desligado no terminal.", "warning");
  process.exit(0);
});

// Inicializar
iniciarLoopComAgendamentoDinamico();
