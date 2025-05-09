<template>
  <div class="retell-call-container">
    <div v-if="callStatus === 'idle'" class="call-init">
      <button class="call-button start-call" @click="startCall">
        <span class="icon-phone"></span>
        {{ $t('CALL_BUTTON.START') }}
      </button>
    </div>
    
    <div v-if="callStatus === 'connecting'" class="call-connecting">
      <div class="loading-spinner"></div>
      <p>{{ $t('CALL_STATUS.CONNECTING') }}</p>
    </div>
    
    <div v-if="callStatus === 'connected'" class="call-active">
      <div ref="callContainer" class="call-interface"></div>
      <button class="call-button end-call" @click="endCall">
        <span class="icon-phone-hangup"></span>
        {{ $t('CALL_BUTTON.END') }}
      </button>
    </div>
    
    <div v-if="callStatus === 'error'" class="call-error">
      <p>{{ errorMessage }}</p>
      <button class="retry-button" @click="startCall">
        {{ $t('CALL_BUTTON.RETRY') }}
      </button>
    </div>
  </div>
</template>

<script>
import { createCallSession, initializeRetellCall, ensureRetellSDKLoaded } from '../services/retellAI';

export default {
  name: 'RetellCallInterface',
  props: {
    userId: {
      type: String,
      default: null
    },
    conversationId: {
      type: String,
      default: null
    }
  },
  data() {
    return {
      callStatus: 'idle', // idle, connecting, connected, error
      errorMessage: '',
      sessionId: null,
      retellCall: null
    };
  },
  mounted() {
    // Предзагрузка SDK Retell при монтировании компонента
    ensureRetellSDKLoaded().catch(error => {
      console.error('Не удалось загрузить RetellAI SDK:', error);
      this.handleError('Не удалось загрузить SDK для звонков');
    });
  },
  beforeUnmount() {
    this.endCall();
  },
  methods: {
    async startCall() {
      try {
        // Сначала убедимся, что SDK загружен
        await ensureRetellSDKLoaded();
        
        this.callStatus = 'connecting';
        
        // Создаем сессию через вебхук с правильными параметрами
        this.sessionId = await createCallSession({
          userId: this.userId,
          conversationId: this.conversationId
        });
        
        // Проверяем, что sessionId получен
        if (!this.sessionId) {
          throw new Error('Не удалось получить идентификатор сессии');
        }
        
        this.$nextTick(() => {
          if (!this.$refs.callContainer) {
            throw new Error('Контейнер для звонка не найден');
          }
          
          this.retellCall = initializeRetellCall(
            this.sessionId,
            this.$refs.callContainer,
            {
              onConnected: () => {
                this.callStatus = 'connected';
              },
              onDisconnected: () => {
                this.callStatus = 'idle';
                this.retellCall = null;
              },
              onError: (error) => {
                this.handleError(error.message || 'Произошла ошибка во время звонка');
              }
            }
          );
          
          if (this.retellCall) {
            // Используем connect() вместо start()
            this.retellCall.connect();
          } else {
            throw new Error('Не удалось инициализировать звонок');
          }
        });
      } catch (error) {
        this.handleError(error.message || 'Не удалось начать звонок');
      }
    },
    
    endCall() {
      if (this.retellCall) {
        this.retellCall.disconnect();
        this.retellCall = null;
      }
      this.callStatus = 'idle';
    },
    
    handleError(message) {
      this.errorMessage = message;
      this.callStatus = 'error';
      if (this.retellCall) {
        this.retellCall.disconnect();
        this.retellCall = null;
      }
    }
  }
};
</script>

<style scoped>
.retell-call-container {
  width: 100%;
  height: 300px;
  border-radius: 8px;
  background-color: var(--w-100);
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.call-interface {
  width: 100%;
  height: 220px;
  margin-bottom: 16px;
}

.call-button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.start-call {
  background-color: var(--w-400);
  color: white;
}

.end-call {
  background-color: #dc3545;
  color: white;
}

.retry-button {
  background-color: var(--w-300);
  color: white;
  padding: 8px 16px;
  border-radius: 4px;
  margin-top: 16px;
  cursor: pointer;
}

.icon-phone, .icon-phone-hangup {
  margin-right: 8px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 3px solid rgba(0, 0, 0, 0.1);
  border-top-color: var(--w-400);
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.call-error {
  color: #dc3545;
  text-align: center;
}
</style>