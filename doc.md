# Инструкция по развертыванию Chatwoot в Docker

Данная инструкция описывает процесс установки и запуска платформы поддержки клиентов Chatwoot с использованием Docker и Docker Compose.

## Оглавление

- [Предварительные требования](#предварительные-требования)
- [Базовая установка](#базовая-установка)
- [Управление контейнерами](#управление-контейнерами)
- [Полезные команды](#полезные-команды)
- [Решение проблем](#решение-проблем)
- [Дополнительные настройки](#дополнительные-настройки)

## Предварительные требования

Перед началом установки убедитесь, что у вас установлены:

- Docker (версия 20.10.0 или выше)
- Docker Compose (версия 2.0.0 или выше)
- Git
- Стабильное подключение к интернету

Рекомендуемые системные требования для сервера:
- 2+ ГБ ОЗУ
- 2+ ядра CPU
- 20 ГБ дискового пространства

## Базовая установка

### Шаг 1: Клонирование репозитория

```bash
git clone https://github.com/chatwoot/chatwoot.git
cd chatwoot
```

### Шаг 2: Настройка переменных окружения

```bash
cp .env.example .env
```

Отредактируйте файл `.env`, указав необходимые параметры:

в репе нету, лежит в документации

### Шаг 3: Запуск Docker контейнеров

```bash
docker compose -f docker-compose-dev.yaml up -d
```

Этот процесс может занять от 5 до 15 минут при первом запуске, так как Docker будет загружать базовые образы и собирать контейнеры.

### Шаг 4: Инициализация базы данных

```bash
# Создание базы данных
docker exec -it chatwoot-rails-1 bundle exec rails db:create

# Запуск миграций
docker exec -it chatwoot-rails-1 bundle exec rails db:migrate

# Заполнение базы данных начальными данными
docker exec -it chatwoot-rails-1 bundle exec rails db:seed
```

### Шаг 5: Доступ к веб-интерфейсу

Откройте в браузере: [http://localhost:8000](http://localhost:8000)

Войдите, используя учетные данные по умолчанию:
- Email: john@acme.inc
- Пароль: Password1!

## Управление контейнерами

### Сборка и запуск контейнеров
```bash
# Сборка контейнеров
docker compose -f docker-compose-dev.yaml build

# Сборка и запуск контейнеров одной командой
docker compose -f docker-compose-dev.yaml up --build -d

# Запуск контейнеров без пересборки
docker compose -f docker-compose-dev.yaml up -d
```

### Остановка контейнеров
```bash
docker compose -f docker-compose-dev.yaml down
```

### Остановка контейнеров с удалением томов (удаляет все данные)
```bash
docker compose -f docker-compose-dev.yaml down -v
```

### Проверка статуса контейнеров
```bash
docker compose -f docker-compose-dev.yaml ps
```

## Полезные команды

### Просмотр логов

```bash
# Просмотр логов всех контейнеров
docker compose -f docker-compose-dev.yaml logs

# Просмотр логов Rails (основной сервер)
docker logs -f chatwoot-rails-1

# Просмотр логов Vite (фронтенд)
docker logs -f chatwoot-vite-1

# Просмотр логов Sidekiq (фоновые задачи)
docker logs -f chatwoot-sidekiq-1

# Просмотр логов PostgreSQL
docker logs -f chatwoot-postgres-1

# Просмотр логов Redis
docker logs -f chatwoot-redis-1
```

### Перезапуск отдельных сервисов
```bash
# Перезапуск Rails сервера
docker compose -f docker-compose-dev.yaml restart rails

# Перезапуск Vite (фронтенд)
docker compose -f docker-compose-dev.yaml restart vite

# Перезапуск Sidekiq (обработчик фоновых задач)
docker compose -f docker-compose-dev.yaml restart sidekiq
```

### Доступ к консоли Rails
```bash
docker exec -it chatwoot-rails-1 bundle exec rails c
```

### Доступ к консоли базы данных
```bash
docker exec -it chatwoot-postgres-1 psql -U postgres chatwoot_development
```

### Полная пересборка контейнеров
```bash
docker compose -f docker-compose-dev.yaml down
docker compose -f docker-compose-dev.yaml build --no-cache
docker compose -f docker-compose-dev.yaml up -d
```

### Доступ к тестовому почтовому серверу
Mailhog доступен по адресу: [http://localhost:8025](http://localhost:8025)

## Решение проблем

### Проблемы с подключением к базе данных

```bash
# Удаление и пересоздание тома PostgreSQL
docker compose -f docker-compose-dev.yaml down
docker volume rm chatwoot_postgres
docker compose -f docker-compose-dev.yaml up -d

# Затем повторите инициализацию базы данных (Шаг 4)
```

### Проблемы с установкой пакетов NPM

```bash
# Принудительная установка NPM пакетов
docker exec -it chatwoot-vite-1 pnpm install --force
docker compose -f docker-compose-dev.yaml restart vite
```

### Ошибки компиляции фронтенда

```bash
# Очистка кэша и перезапуск Vite
docker exec -it chatwoot-vite-1 rm -rf /app/tmp/cache
docker exec -it chatwoot-vite-1 pnpm cache clean --force
docker compose -f docker-compose-dev.yaml restart vite
```

### Проблемы с доступом к URL репозиториев Alpine Linux

Если при сборке возникают ошибки доступа к репозиториям Alpine, попробуйте добавить в Dockerfile следующие строки:

```Dockerfile
RUN echo "https://dl-cdn.alpinelinux.org/alpine/v3.19/main/" > /etc/apk/repositories && \
    echo "https://dl-cdn.alpinelinux.org/alpine/v3.19/community" >> /etc/apk/repositories
```

### Проблемы с CORS при доступе к API

Проверьте правильность настройки `FRONTEND_URL` в файле `.env`.

## Дополнительные настройки

### Настройка SMTP для отправки email

Отредактируйте файл `.env`:

```bash
# SMTP конфигурация
SMTP_ADDRESS=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_DOMAIN=smtp.gmail.com
SMTP_AUTHENTICATION=plain
SMTP_ENABLE_STARTTLS_AUTO=true
```

### Настройка каналов общения

После входа в Chatwoot вы можете настроить различные каналы связи:
1. Электронная почта
2. Веб-виджет
3. Facebook Messenger
4. WhatsApp
5. Twitter/X
6. Telegram
7. Line
8. SMS (требуется провайдер, например Twilio)

### Создание дополнительных пользователей

В консоли Rails:

```ruby
account = Account.first

```
# Пример файла .env:

```
# Learn about the various environment variables at
# https://www.chatwoot.com/docs/self-hosted/configuration/environment-variables/#rails-production-variables

# Used to verify the integrity of signed cookies. so ensure a secure value is set
# SECRET_KEY_BASE should be alphanumeric. Avoid special characters or symbols. 
# Use `rake secret` to generate this variable
SECRET_KEY_BASE=replace_with_lengthy_secure_hex

# Replace with the URL you are planning to use for your app
FRONTEND_URL=http://0.0.0.0:8000
# To use a dedicated URL for help center pages
# HELPCENTER_URL=http://0.0.0.0:3000

# If the variable is set, all non-authenticated pages would fallback to the default locale.
# Whenever a new account is created, the default language will be DEFAULT_LOCALE instead of en
# DEFAULT_LOCALE=en

# If you plan to use CDN for your assets, set Asset CDN Host
ASSET_CDN_HOST=

# Force all access to the app over SSL, default is set to false
FORCE_SSL=false

# This lets you control new sign ups on your chatwoot installation
# true : default option, allows sign ups
# false : disables all the end points related to sign ups
# api_only: disables the UI for signup, but you can create sign ups via the account apis
ENABLE_ACCOUNT_SIGNUP=true

# Redis config
# specify the configs via single URL or individual variables
# ref: https://www.iana.org/assignments/uri-schemes/prov/redis
# You can also use the following format for the URL: redis://:password@host:port/db_number
REDIS_URL=redis://redis:6379
# If you are using docker-compose, set this variable's value to be any string,
# which will be the password for the redis service running inside the docker-compose
# to make it secure
REDIS_PASSWORD=redis_password
# Redis Sentinel can be used by passing list of sentinel host and ports e,g. sentinel_host1:port1,sentinel_host2:port2
REDIS_SENTINELS=
# Redis sentinel master name is required when using sentinel, default value is "mymaster".
# You can find list of master using "SENTINEL masters" command
REDIS_SENTINEL_MASTER_NAME=

# By default Chatwoot will pass REDIS_PASSWORD as the password value for sentinels
# Use the following environment variable to customize passwords for sentinels.
# Use empty string if sentinels are configured with out passwords
# REDIS_SENTINEL_PASSWORD=

# Redis premium breakage in heroku fix
# enable the following configuration
# ref: https://github.com/chatwoot/chatwoot/issues/2420
# REDIS_OPENSSL_VERIFY_MODE=none

# Postgres Database config variables
# You can leave POSTGRES_DATABASE blank. The default name of
# the database in the production environment is chatwoot_production
# POSTGRES_DATABASE=
POSTGRES_HOST=postgres
POSTGRES_USERNAME=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=chatwoot_dev
RAILS_ENV=development
# Changes the Postgres query timeout limit. The default is 14 seconds. Modify only when required.
# POSTGRES_STATEMENT_TIMEOUT=14s
RAILS_MAX_THREADS=5

# The email from which all outgoing emails are sent
# could user either  `email@yourdomain.com` or `BrandName <email@yourdomain.com>`
MAILER_SENDER_EMAIL=Chatwoot <no-reply@chatwoot.local>

#SMTP domain key is set up for HELO checking
SMTP_DOMAIN=chatwoot.local
# Set the value to "mailhog" if using docker-compose for development environments,
# Set the value as "localhost" or your SMTP address in other environments
# If SMTP_ADDRESS is empty, Chatwoot would try to use sendmail(postfix)
SMTP_ADDRESS=mailhog
SMTP_PORT=1025
SMTP_USERNAME=
SMTP_PASSWORD=
# plain,login,cram_md5
SMTP_AUTHENTICATION=
SMTP_ENABLE_STARTTLS_AUTO=false
# Can be: 'none', 'peer', 'client_once', 'fail_if_no_peer_cert', see http://api.rubyonrails.org/classes/ActionMailer/Base.html
SMTP_OPENSSL_VERIFY_MODE=peer
# Comment out the following environment variables if required by your SMTP server
# SMTP_TLS=
# SMTP_SSL=
# SMTP_OPEN_TIMEOUT
# SMTP_READ_TIMEOUT

# Mail Incoming
# This is the domain set for the reply emails when conversation continuity is enabled
MAILER_INBOUND_EMAIL_DOMAIN=
# Set this to the appropriate ingress channel with regards to incoming emails
# Possible values are :
# relay for Exim, Postfix, Qmail
# mailgun for Mailgun
# mandrill for Mandrill
# postmark for Postmark
# sendgrid for Sendgrid
RAILS_INBOUND_EMAIL_SERVICE=
# Use one of the following based on the email ingress service
# Ref: https://edgeguides.rubyonrails.org/action_mailbox_basics.html
# Set this to a password of your choice and use it in the Inbound webhook
RAILS_INBOUND_EMAIL_PASSWORD=

MAILGUN_INGRESS_SIGNING_KEY=
MANDRILL_INGRESS_API_KEY=

# Creating Your Inbound Webhook Instructions for Postmark and Sendgrid:
# Inbound webhook URL format:
#    https://actionmailbox:[YOUR_RAILS_INBOUND_EMAIL_PASSWORD]@[YOUR_CHATWOOT_DOMAIN.COM]/rails/action_mailbox/[RAILS_INBOUND_EMAIL_SERVICE]/inbound_emails
# Note: Replace the values inside the brackets; do not include the brackets themselves.
# Example: https://actionmailbox:mYRandomPassword3@chatwoot.example.com/rails/action_mailbox/postmark/inbound_emails
# For Postmark
# Ensure the 'Include raw email content in JSON payload' checkbox is selected in the inbound webhook section.

# Storage
ACTIVE_STORAGE_SERVICE=local

# Amazon S3
# documentation: https://www.chatwoot.com/docs/configuring-s3-bucket-as-cloud-storage
S3_BUCKET_NAME=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=

# Log settings
# Disable if you want to write logs to a file
RAILS_LOG_TO_STDOUT=true
LOG_LEVEL=debug
LOG_SIZE=500
# Configure this environment variable if you want to use lograge instead of rails logger
#LOGRAGE_ENABLED=true

### This environment variables are only required if you are setting up social media channels

# Facebook
# documentation: https://www.chatwoot.com/docs/facebook-setup
FB_VERIFY_TOKEN=
FB_APP_SECRET=
FB_APP_ID=

# https://developers.facebook.com/docs/messenger-platform/instagram/get-started#app-dashboard
IG_VERIFY_TOKEN=

# Twitter
# documentation: https://www.chatwoot.com/docs/twitter-app-setup
TWITTER_APP_ID=
TWITTER_CONSUMER_KEY=
TWITTER_CONSUMER_SECRET=
TWITTER_ENVIRONMENT=

#slack integration
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=

# Google OAuth
GOOGLE_OAUTH_CLIENT_ID=
GOOGLE_OAUTH_CLIENT_SECRET=
GOOGLE_OAUTH_CALLBACK_URL=

### Change this env variable only if you are using a custom build mobile app
## Mobile app env variables
IOS_APP_ID=L7YLMN4634.com.chatwoot.app
ANDROID_BUNDLE_ID=com.chatwoot.app

# https://developers.google.com/android/guides/client-auth (use keytool to print the fingerprint in the first section)
ANDROID_SHA256_CERT_FINGERPRINT=AC:73:8E:DE:EB:56:EA:CC:10:87:02:A7:65:37:7B:38:D4:5D:D4:53:F8:3B:FB:D3:C6:28:64:1D:AA:08:1E:D8

### Smart App Banner
# https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/PromotingAppswithAppBanners/PromotingAppswithAppBanners.html
# You can find your app-id in https://itunesconnect.apple.com
#IOS_APP_IDENTIFIER=1495796682

## Push Notification
## generate a new key value here : https://d3v.one/vapid-key-generator/
# VAPID_PUBLIC_KEY=
# VAPID_PRIVATE_KEY=
#
# for mobile apps
# FCM_SERVER_KEY=

### APM and Error Monitoring configurations
## Elastic APM
## https://www.elastic.co/guide/en/apm/agent/ruby/current/getting-started-rails.html
# ELASTIC_APM_SERVER_URL=
# ELASTIC_APM_SECRET_TOKEN=

## Sentry
# SENTRY_DSN=


## Scout
## https://scoutapm.com/docs/ruby/configuration
# SCOUT_KEY=YOURKEY
# SCOUT_NAME=YOURAPPNAME (Production)
# SCOUT_MONITOR=true

## NewRelic
# https://docs.newrelic.com/docs/agents/ruby-agent/configuration/ruby-agent-configuration/
# NEW_RELIC_LICENSE_KEY=
# Set this to true to allow newrelic apm to send logs.
# This is turned off by default.
# NEW_RELIC_APPLICATION_LOGGING_ENABLED=

## Datadog
## https://github.com/DataDog/dd-trace-rb/blob/master/docs/GettingStarted.md#environment-variables
# DD_TRACE_AGENT_URL=

# MaxMindDB API key to download GeoLite2 City database
# IP_LOOKUP_API_KEY=

## Rack Attack configuration
## To prevent and throttle abusive requests
# ENABLE_RACK_ATTACK=true
# RACK_ATTACK_LIMIT=300
# ENABLE_RACK_ATTACK_WIDGET_API=true

## Running chatwoot as an API only server
## setting this value to true will disable the frontend dashboard endpoints
# CW_API_ONLY_SERVER=false

## Development Only Config
# if you want to use letter_opener for local emails
# LETTER_OPENER=true
# meant to be used in github codespaces
# WEBPACKER_DEV_SERVER_PUBLIC=

# If you want to use official mobile app,
# the notifications would be relayed via a Chatwoot server
ENABLE_PUSH_RELAY_SERVER=true

# Stripe API key
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Set to true if you want to upload files to cloud storage using the signed url
# Make sure to follow https://edgeguides.rubyonrails.org/active_storage_overview.html#cross-origin-resource-sharing-cors-configuration on the cloud storage after setting this to true.
DIRECT_UPLOADS_ENABLED=

#MS OAUTH creds
AZURE_APP_ID=
AZURE_APP_SECRET=

## Advanced configurations
## Change these values to fine tune performance
# control the concurrency setting of sidekiq
# SIDEKIQ_CONCURRENCY=10


# AI powered features
## OpenAI key
# OPENAI_API_KEY=

# Housekeeping/Performance related configurations
# Set to true if you want to remove stale contact inboxes
# contact_inboxes with no conversation older than 90 days will be removed
# REMOVE_STALE_CONTACT_INBOX_JOB_STATUS=false


```