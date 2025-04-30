// RetellAI configuration and service
const RETELL_CONFIG = {
  API_KEY: 'YOUR_RETELL_API_KEY', // Замените на реальный ключ API
  LLM_ID: 'llm_08aab07b59dfe45b3929afb3c44f',
  AGENT_ID: 'agent_792fde598b27cdc13b3eb38915',
  WEBHOOK_URL: 'https://your-webhook-endpoint.com/webhook' // Замените на URL вебхука
};

// Создание сессии звонка
export const createCallSession = async (userData) => {
  try {
    const response = await fetch(RETELL_CONFIG.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        call_inbound: {
          from_number: userData.userId || 'web_user',
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Error creating session: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.call_inbound.dynamic_variables.session_id;
  } catch (error) {
    console.error('Failed to create call session:', error);
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