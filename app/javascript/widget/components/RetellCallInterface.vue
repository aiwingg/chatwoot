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
import { createCallSession, initializeRetellCall } from '../services/retellAI';

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
  methods: {
    async startCall() {
      try {
        this.callStatus = 'connecting';
        
        // Создаем сессию через вебхук
        this.sessionId = await createCallSession({
          userId: this.userId
        });
        
        // После получения sessionId инициализируем звонок
        this.$nextTick(() => {
          this.retellCall = initializeRetellCall(
            this.sessionId,
            this.$refs.callContainer,
            {
              onError: this.handleCallError,
              onConnected: () => { 
                this.callStatus = 'connected';
                console.log('Call connected successfully');
              },
              onDisconnected: this.handleCallDisconnected
            }
          );
          
          // Запускаем звонок
          if (this.retellCall) {
            this.retellCall.start();
          } else {
            throw new Error('Failed to initialize call');
          }
        });
      } catch (error) {
        this.handleCallError(error);
      }
    },
    
    endCall() {
      if (this.retellCall) {
        this.retellCall.stop();
        this.retellCall = null;
      }
      this.callStatus = 'idle';
      this.$emit('call-ended');
    },
    
    handleCallError(error) {
      console.error('Call error:', error);
      this.errorMessage = error.message || 'An error occurred with the call';
      this.callStatus = 'error';
      this.$emit('call-error', error);
    },
    
    handleCallDisconnected() {
      this.callStatus = 'idle';
      this.retellCall = null;
      this.$emit('call-ended');
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