// ==========================================================================
// SERVICE WORKER CORE (sw.js) - SPHERE v5.2 PRO
// Push Engine, Smart Client Focus, Notification Actions & Media Preview
// ==========================================================================

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// 1. TRATAMENTO DE PUSH INCOMING
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    data = { body: event.data.text() };
  }

  const title = data.title || 'Sphere';
  const tagGroup = data.tag || (data.sender_id ? `chat_${data.sender_id}` : 'sphere_notif');

  const options = {
    body: data.body || 'Você tem uma nova notificação!',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    image: data.image || null, // Permite exibições de fotos enviadas em tela cheia na notificação do SO
    tag: tagGroup,
    renotify: true, // Substitui a notificação anterior do mesmo grupo e toca o som novamente
    vibrate: [120, 60, 120],
    data: {
      url: data.url || '/#chat',
      sender_id: data.sender_id || null
    },
    actions: [
      { action: 'open_chat', title: '💬 Responder', icon: '/icon-192.png' },
      { action: 'dismiss', title: 'Fechar' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 2. INTERAÇÃO E CLIQUE NA NOTIFICAÇÃO
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // Se o usuário clicou no botão de fechar direto na barra
  if (event.action === 'dismiss') return;

  const targetUrl = new URL(event.notification.data.url || '/#chat', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // 1. Procura se existe alguma aba do app já aberta
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        
        // Se a aba estiver aberta (mesmo que em outra página do site), foca nela e navega
        if ('focus' in client) {
          return client.focus().then((focusedClient) => {
            if (focusedClient && 'navigate' in focusedClient) {
              return focusedClient.navigate(targetUrl);
            }
          });
        }
      }

      // 2. Se nenhuma aba estiver aberta no navegador, abre uma nova janela
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
