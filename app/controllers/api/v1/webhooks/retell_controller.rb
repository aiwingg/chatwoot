class Api::V1::Webhooks::RetellController < ApplicationController
  skip_before_action :verify_authenticity_token
  
  def create
    # Логируем входящий запрос
    Rails.logger.info("Retell webhook received: #{params.inspect}")
    
    # Возвращаем ID сессии
    render json: { 
      call_inbound: { 
        dynamic_variables: { 
          session_id: SecureRandom.uuid 
        } 
      } 
    }
  end
end
