<script>
import { mapActions, mapGetters } from 'vuex';
import { getContrastingTextColor } from '@chatwoot/utils';
import CustomButton from 'shared/components/Button.vue';
import FooterReplyTo from 'widget/components/FooterReplyTo.vue';
import ChatInputWrap from 'widget/components/ChatInputWrap.vue';
import RetellCallInterface from 'widget/components/RetellCallInterface.vue';
import { BUS_EVENTS } from 'shared/constants/busEvents';
import { sendEmailTranscript } from 'widget/api/conversation';
import routerMixin from 'widget/mixins/routerMixin';
import { IFrameHelper } from '../helpers/utils';
import { CHATWOOT_ON_START_CONVERSATION } from '../constants/sdkEvents';
import { emitter } from 'shared/helpers/mitt';
import { createCallSession, initializeRetellCall } from '../services/retellAI';

export default {
  components: {
    ChatInputWrap,
    CustomButton,
    FooterReplyTo,
    RetellCallInterface,
  },
  mixins: [routerMixin],
  data() {
    return {
      inReplyTo: null,
      showCallInterface: false,
      callStatus: 'idle', // idle, connecting, connected, error
      errorMessage: '',
      sessionId: null,
      retellCall: null
    };
  },
  computed: {
    ...mapGetters({
      conversationAttributes: 'conversationAttributes/getConversationParams',
      widgetColor: 'appConfig/getWidgetColor',
      conversationSize: 'conversation/getConversationSize',
      currentUser: 'contacts/getCurrentUser',
      isWidgetStyleFlat: 'appConfig/isWidgetStyleFlat',
      features: 'appConfig/getFeatures',
    }),
    textColor() {
      return getContrastingTextColor(this.widgetColor);
    },
    hideReplyBox() {
      const { allowMessagesAfterResolved } = window.chatwootWebChannel;
      const { status } = this.conversationAttributes;
      return !allowMessagesAfterResolved && status === 'resolved';
    },
    showEmailTranscriptButton() {
      return this.hasEmail;
    },
    hasEmail() {
      return this.currentUser && this.currentUser.has_email;
    },
    hasReplyTo() {
      return (
        this.inReplyTo && (this.inReplyTo.content || this.inReplyTo.attachments)
      );
    },
    showCallButton() {
      return true;
    },
  },
  mounted() {
    emitter.on(BUS_EVENTS.TOGGLE_REPLY_TO_MESSAGE, this.toggleReplyTo);
  },
  methods: {
    ...mapActions('conversation', [
      'sendMessage',
      'sendAttachment',
      'clearConversations',
    ]),
    ...mapActions('conversationAttributes', [
      'getAttributes',
      'clearConversationAttributes',
    ]),
    async handleSendMessage(content) {
      await this.sendMessage({
        content,
        replyTo: this.inReplyTo ? this.inReplyTo.id : null,
      });
      // reset replyTo message after sending
      this.inReplyTo = null;
      // Update conversation attributes on new conversation
      if (this.conversationSize === 0) {
        this.getAttributes();
      }
    },
    async handleSendAttachment(attachment) {
      await this.sendAttachment({
        attachment,
        replyTo: this.inReplyTo ? this.inReplyTo.id : null,
      });
      this.inReplyTo = null;
    },
    startNewConversation() {
      this.clearConversations();
      this.clearConversationAttributes();
      this.replaceRoute('prechat-form');
      IFrameHelper.sendMessage({
        event: 'onEvent',
        eventIdentifier: CHATWOOT_ON_START_CONVERSATION,
        data: { hasConversation: true },
      });
    },
    toggleReplyTo(message) {
      this.inReplyTo = message;
    },
    async sendTranscript() {
      if (this.hasEmail) {
        try {
          await sendEmailTranscript();
          emitter.emit(BUS_EVENTS.SHOW_ALERT, {
            message: this.$t('EMAIL_TRANSCRIPT.SEND_EMAIL_SUCCESS'),
            type: 'success',
          });
        } catch (error) {
          emitter.$emit(BUS_EVENTS.SHOW_ALERT, {
            message: this.$t('EMAIL_TRANSCRIPT.SEND_EMAIL_ERROR'),
          });
        }
      }
    },
    onCallButtonClick() {
      this.showCallInterface = !this.showCallInterface;
      
      // Если интерфейс закрывается, логируем это
      if (!this.showCallInterface) {
        console.log('Call interface closed');
      }
    },
    handleCallEnded() {
      console.log('Call ended');
      // Здесь в будущем можно будет добавить интеграцию с историей разговоров
    },
    
    handleCallError(error) {
      console.error('Call error:', error);
      // Можно отобразить сообщение об ошибке пользователю
    },
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
              onConnected: () => { this.callStatus = 'connected'; },
              onDisconnected: this.handleCallDisconnected
            }
          );
          
          // Запускаем звонок
          this.retellCall.start();
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
    
    handleCallDisconnected() {
      this.callStatus = 'idle';
      this.retellCall = null;
      this.$emit('call-ended');
    }
  },
};
</script>

<template>
  <footer
    v-if="!hideReplyBox"
    class="relative z-50 mb-1"
    :class="{
      'rounded-lg': !isWidgetStyleFlat,
      'pt-2.5 shadow-[0px_-20px_20px_1px_rgba(0,_0,_0,_0.05)] dark:shadow-[0px_-20px_20px_1px_rgba(0,_0,_0,_0.15)] rounded-t-none':
        hasReplyTo,
    }"
  >
    <FooterReplyTo
      v-if="hasReplyTo"
      :in-reply-to="inReplyTo"
      @dismiss="inReplyTo = null"
    />
    <div v-if="showCallButton" class="chat-actions">
      <button
        class="call-button"
        @click="onCallButtonClick"
      >
        <span class="icon-phone" />
        {{ showCallInterface ? $t('CALL_BUTTON.HIDE') : $t('CALL_BUTTON.LABEL') }}
      </button>
    </div>
    <ChatInputWrap
      class="shadow-sm"
      :on-send-message="handleSendMessage"
      :on-send-attachment="handleSendAttachment"
    />
  </footer>
  <div v-else>
    <CustomButton
      class="font-medium"
      block
      :bg-color="widgetColor"
      :text-color="textColor"
      @click="startNewConversation"
    >
      {{ $t('START_NEW_CONVERSATION') }}
    </CustomButton>
    <CustomButton
      v-if="showEmailTranscriptButton"
      type="clear"
      class="font-normal"
      @click="sendTranscript"
    >
      {{ $t('EMAIL_TRANSCRIPT.BUTTON_TEXT') }}
    </CustomButton>
    <button
      v-if="showCallButton"
      class="call-button"
      @click="onCallButtonClick"
    >
      <span class="icon-phone" />
      {{ $t('CALL_BUTTON.LABEL') }}
    </button>
  </div>
  
  <!-- Добавляем интерфейс звонка -->
  <div v-if="showCallInterface" class="call-interface-wrapper">
    <RetellCallInterface 
      :user-id="$store.state.conversation.currentConversation?.user?.id"
      :conversation-id="$store.state.conversation.currentConversationId"
      @call-ended="handleCallEnded"
      @call-error="handleCallError"
    />
  </div>
</template>

<style scoped>
.call-button {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8px;
  padding: 6px 12px;
  border-radius: 4px;
  background-color: var(--w-400);
  color: var(--white);
  cursor: pointer;
}
.call-button .icon-phone {
  margin-right: 4px;
}
.chat-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 8px;
  padding: 0 8px;
}

.call-interface-wrapper {
  width: 100%;
  margin-bottom: 16px;
  border-radius: 8px;
  overflow: hidden;
}
</style>
