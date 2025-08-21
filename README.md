# Тестовое задание: Реализация свапов в сетях Solana, Aptos и Base

**Solana**: обмен USDT на SOL иcпользуя Jupiter
**Aptos**: обмен USDT на APT используя LiquidSwap
**Base**: обмен USDT на ETH используя V3

#### Установка и запуск

**Клонируйте репозиторий и перейдите в директорию проекта:**

`git clone git@github.com:ntbcmnv/test-biamino.git`

`cd test-biamino`

`cd api`

**Установите зависимости:**
`npm install`

**Создайте файл .env в корневой директории и добавьте приватные ключи (шаблон в .env.template)**

_Форматы приватных ключей:_

Solana: массив чисел или base58-строка
Aptos: hex-строка (с префиксом 0x или без) или массив чисел
Base: hex-строка (64 символа, с префиксом 0x или без)

**Запустите сервер в режиме разработки:**
`npm run dev`

**Или соберите проект и запустите (сервер запустится на порту 8000):**

`npm run build`

`npm start`

#### **Методы API**

##### Solana

**POST /solana/**
(Обмен USDT -> SOL/SOL -> USDT через Jupiter)

**Тело запроса:**
    `{
        "direction": "usdtToSol" // или "solToUsdt",
        "amount": 1
    }`

**Ответ:**
    `{
        "success": true,
        "txid": "транзакционный хеш",
        "explorer": "ссылка на обозреватель транзакций"
    }`

**GET /solana/balance/:mintAddress**
(Получение баланса токена по его адресу)

**Параметры:**
mintAddress: адрес токена (Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB для USDT)

##### Aptos

**POST /aptos**
(Обмен USDT -> APT/APT -> USDT через LiquidSwap)

**Тело запроса:**
    `{
        "direction": "usdtToApt" // или "aptToUsdt",
        "amount": 1
    }`

_Ответ аналогичен Solana._

**GET /aptos/balance/:coinType**
(Получение баланса токена по его типу)

**Параметры:**
coinType: тип токена (0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b::coin::COIN для USDT)

##### Base

**POST /base**
(Обмен USDT -> ETH/ ETH -> USDT через Uniswap V3)

**Тело запроса:**
    `{
        "direction": "usdtToEth" // или "ethToUsdt"
        "amount": "1" // количество USDT для обмена (опционально, по умолчанию 1)
    }`

_Ответ аналогичный._

**GET /base/balance/:token**
(Получение баланса токена)

**Параметры:**
`token: "usdt" или "eth"`

#### Примеры использования

**Проверить баланс USDT в Solana:**
`curl http://localhost:8000/solana/balance/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`

**Обменять 1 USDT на SOL:**
`curl -X POST http://localhost:8000/solana
-H "Content-Type: application/json"
-d '{"direction": "usdtToSol", "amount": "1"}'`

**Проверить баланс ETH в Base:**
`curl http://localhost:8000/base/balance/eth`

**Обменять 1 USDT на ETH в Base:**
`curl -X POST http://localhost:8000/base/swap \
-H "Content-Type: application/json" \
-d '{"direction": "usdtToEth", "amount": "1"}'`

#### Особенности реализации

**Solana**
* Используется Jupiter Aggregator API для получения котировок и построения транзакций
* Автоматическая обработка создания токен-аккаунтов
* Поддержка как base58, так и массива чисел для приватных ключей

**Aptos**
* Прямой вызов контракта LiquidSwap через Aptos SDK
* Автоматическая обработка комиссий в APT
* Поддержка различных форматов приватных ключей

**Base**
* Прямой вызов контракта Uniswap V3 Router
* Автоматическая проверка и установка аппрува для USDT
* Обработка комиссий в ETH


### _Важно_

Перед выполнением свапов убедитесь, что на кошельках достаточно средств для оплаты комиссий
В коде предусмотрены проверки балансов и обработка ошибок

**Рекомендуемые минимальные балансы для комиссий:**
* Solana: 0.01 SOL
* Aptos: 0.01 APT
* Base: 0.0005 ETH
