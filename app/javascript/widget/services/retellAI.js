// RetellAI configuration and service
const RETELL_CONFIG = {
  API_KEY: window.chatwootConfig?.retellApiKey || '',
  LLM_ID: 'llm_08aab07b59dfe45b3929afb3c44f',
  AGENT_ID: 'agent_792fde598b27cdc13b3eb38915',
  WEBHOOK_URL: window.chatwootConfig?.retellWebhookUrl || ''
};

// Функция для проверки загрузки SDK Retell
export const ensureRetellSDKLoaded = () => {
  return new Promise((resolve, reject) => {
    if (window.Retell) {
      resolve(window.Retell);
      return;
    }

    // Проверка, был ли скрипт уже добавлен
    const existingScript = document.querySelector('script[src*="retell"]');
    if (existingScript) {
      // Если скрипт уже добавлен, но объект Retell еще не доступен,
      // ждем его инициализации
      const checkRetell = setInterval(() => {
        if (window.Retell) {
          clearInterval(checkRetell);
          resolve(window.Retell);
        }
      }, 100);

      // Устанавливаем таймаут на случай, если скрипт не инициализируется
      setTimeout(() => {
        clearInterval(checkRetell);
        reject(new Error('RetellAI SDK загрузился, но не инициализировался'));
      }, 10000);
      return;
    }

    // Добавляем скрипт, если его нет
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/@retell-ai/sdk@latest/dist/retell.bundle.js';
    script.async = true;
    script.onload = () => {
      const checkRetell = setInterval(() => {
        if (window.Retell) {
          clearInterval(checkRetell);
          resolve(window.Retell);
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkRetell);
        reject(new Error('RetellAI SDK загрузился, но не инициализировался'));
      }, 5000);
    };
    script.onerror = () => reject(new Error('Не удалось загрузить RetellAI SDK'));
    document.body.appendChild(script);
  });
};

// Создание сессии звонка
export const createCallSession = async (userData = {}) => {
  try {
    // Проверка конфигурации
    if (!RETELL_CONFIG.API_KEY) {
      console.error('RetellAI API_KEY не настроен');
      throw new Error('RetellAI API_KEY не настроен');
    }

    if (!RETELL_CONFIG.WEBHOOK_URL) {
      console.error('RetellAI WEBHOOK_URL не настроен');
      throw new Error('RetellAI WEBHOOK_URL не настроен');
    }

    // Ensure Retell SDK is loaded
    await ensureRetellSDKLoaded();

    console.log('Создание сессии звонка с данными:', userData);
    
    const response = await fetch(RETELL_CONFIG.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        call_inbound: {
          from_number: userData.userId || 'web_user',
          conversation_id: userData.conversationId
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Ошибка создания сессии: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Сессия звонка создана успешно:', data);
    return data.call_inbound.dynamic_variables.session_id;
  } catch (error) {
    console.error('Не удалось создать сессию звонка:', error);
    throw error;
  }
};

// Инициализация Retell SDK и начало звонка
export const initializeRetellCall = (sessionId, containerElement, callbacks = {}) => {
  if (!window.Retell) {
    console.error('RetellAI SDK not loaded');
    return null;
  }
  
  try {
    const retell = new window.Retell.Call({
      apiKey: RETELL_CONFIG.API_KEY,
      llmId: RETELL_CONFIG.LLM_ID,
      agentId: RETELL_CONFIG.AGENT_ID,
      sessionId: sessionId,
      container: containerElement,
      onError: callbacks.onError || ((err) => console.error('RetellAI call error:', err)),
      onConnecting: callbacks.onConnecting || (() => console.log('RetellAI call connecting...')),
      onConnected: callbacks.onConnected || (() => console.log('RetellAI call connected')),
      onDisconnected: callbacks.onDisconnected || (() => console.log('RetellAI call disconnected')),
    });
    
    return retell;
  } catch (error) {
    console.error('Failed to initialize RetellAI call:', error);
    if (callbacks.onError) {
      callbacks.onError(error);
    }
    return null;
  }
}; 