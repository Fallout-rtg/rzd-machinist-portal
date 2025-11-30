const { Telegraf } = require('telegraf');

module.exports = async (req, res) => {
  // Устанавливаем CORS заголовки
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Обрабатываем preflight запрос
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  const OWNER_ID = process.env.OWNER_ID;

  if (!BOT_TOKEN || !OWNER_ID) {
    return res.status(500).json({ error: 'Bot configuration missing' });
  }

  const bot = new Telegraf(BOT_TOKEN);

  try {
    // Обработка формы обратной связи с сайта
    if (req.method === 'POST' && req.body.email && req.body.message) {
      const { email, message, attachments = [] } = req.body;

      // Валидация email
      const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|yandex\.(ru|com))$/i;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Only Gmail and Yandex emails are allowed' });
      }

      // Форматируем список файлов
      const attachmentsText = attachments.length > 0 
        ? `📎 Прикрепленные файлы (${attachments.length}):\n${attachments.map((file, index) => 
            `${index + 1}. ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
          ).join('\n')}`
        : '📎 Файлы не прикреплены';

      // Отправляем сообщение владельцу
      await bot.telegram.sendMessage(
        OWNER_ID,
        `🚂 *НОВОЕ СООБЩЕНИЕ С САЙТА*\n\n` +
        `📧 *Email:* \`${email}\`\n` +
        `💬 *Сообщение:* ${message}\n\n` +
        `${attachmentsText}\n\n` +
        `🕒 ${new Date().toLocaleString('ru-RU')}`,
        { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              {
                text: '📧 Ответить на email',
                url: `mailto:${email}?subject=Ответ с портала машиниста`
              }
            ]]
          }
        }
      );

      return res.status(200).json({ success: true, message: 'Message sent successfully' });
    }

    // Обработка сообщений от Telegram бота
    if (req.body && req.body.message) {
      const { message } = req.body;
      const chatId = message.chat.id;
      const text = message.text || '';
      const userId = message.from.id;

      // Проверяем, является ли пользователь создателем
      const isOwner = userId.toString() === OWNER_ID;

      // Обработка команды /start
      if (text.startsWith('/start')) {
        if (isOwner) {
          await bot.telegram.sendMessage(
            chatId,
            `👋 *Привет, создатель!*\n\n` +
            `Я ваш бот для демо-портала машиниста РЖД.\n\n` +
            `📊 *Статистика:*\n` +
            `• Бот активен и готов к работе\n` +
            `• Форма обратной связи подключена\n` +
            `• Все сообщения будут приходить сюда\n\n` +
            `⚡ *Команды:*\n` +
            `/stats - Статистика бота\n` +
            `/site - Перейти на сайт`,
            { 
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[
                  {
                    text: '🚊 Перейти на сайт',
                    url: 'https://rzd-machinist-portal.vercel.app'
                  },
                  {
                    text: '📊 Панель управления',
                    url: 'https://vercel.com/dashboard'
                  }
                ]]
              }
            }
          );
        } else {
          // Сообщение для обычных пользователей
          await bot.telegram.sendMessage(
            chatId,
            `🚂 *Демо-портал машиниста РЖД*\n\n` +
            `*Добро пожаловать в мир железных дорог!*\n\n` +
            `🌐 *О проекте:*\n` +
            `Интерактивный портал, посвященный профессии машиниста и истории российских локомотивов.\n\n` +
            `📖 *Основные разделы:*\n` +
            `• 🚊 Галерея локомотивов с 3D-каруселью\n` +
            `• 👨‍🔧 Профессия машиниста: особенности и требования\n` +
            `• 🎓 Образовательные учреждения РЖД\n` +
            `• 📜 История железных дорог России\n\n` +
            `💡 *Технологии:*\n` +
            `• Современный адаптивный дизайн\n` +
            `• 3D-анимации и плавные переходы\n` +
            `• Интерактивная обратная связь\n` +
            `• Интеграция с Telegram\n\n` +
            `🔗 *Ссылки:*\n` +
            `[​](https://rzd-machinist-portal.vercel.app)`, // Невидимый символ для красивого превью
            {
              parse_mode: 'Markdown',
              disable_web_page_preview: false,
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '🚊 Перейти на сайт',
                      url: 'https://rzd-machinist-portal.vercel.app'
                    }
                  ],
                  [
                    {
                      text: '📱 Главная страница',
                      url: 'https://rzd-machinist-portal.vercel.app#intro'
                    },
                    {
                      text: '🚂 Локомотивы',
                      url: 'https://rzd-machinist-portal.vercel.app#locomotives'
                    }
                  ],
                  [
                    {
                      text: '👨‍🔧 Профессия',
                      url: 'https://rzd-machinist-portal.vercel.app#crew-life'
                    },
                    {
                      text: '🎓 Обучение',
                      url: 'https://rzd-machinist-portal.vercel.app#education'
                    }
                  ]
                ]
              }
            }
          );

          // Отправляем уведомление создателю о новом пользователе
          await bot.telegram.sendMessage(
            OWNER_ID,
            `👤 *Новый пользователь в боте*\n\n` +
            `🆔 ID: ${userId}\n` +
            `👤 Имя: ${message.from.first_name || 'Не указано'}\n` +
            `📛 Фамилия: ${message.from.last_name || 'Не указана'}\n` +
            `📱 Username: @${message.from.username || 'Не указан'}\n` +
            `🕒 Время: ${new Date().toLocaleString('ru-RU')}`,
            { parse_mode: 'Markdown' }
          );
        }
      }

      // Обработка команды /stats (только для создателя)
      else if (text.startsWith('/stats') && isOwner) {
        await bot.telegram.sendMessage(
          chatId,
          `📊 *Статистика бота*\n\n` +
          `🤖 Бот активен\n` +
          `👑 Создатель: ${OWNER_ID}\n` +
          `🕒 Время работы: ${new Date().toLocaleString('ru-RU')}\n` +
          `🌐 Сайт: https://rzd-machinist-portal.vercel.app\n\n` +
          `⚡ Бот готов к приему сообщений с формы обратной связи!`,
          { parse_mode: 'Markdown' }
        );
      }

      // Обработка команды /site
      else if (text.startsWith('/site')) {
        await bot.telegram.sendMessage(
          chatId,
          `🌐 *Демо-портал машиниста РЖД*\n\n` +
          `Перейдите по ссылке ниже, чтобы посетить сайт:\n\n` +
          `[​](https://rzd-machinist-portal.vercel.app)`,
          {
            parse_mode: 'Markdown',
            disable_web_page_preview: false,
            reply_markup: {
              inline_keyboard: [[
                {
                  text: '🚊 Перейти на сайт',
                  url: 'https://rzd-machinist-portal.vercel.app'
                }
              ]]
            }
          }
        );
      }

      // Обработка обычных сообщений (не команд)
      else if (text && !text.startsWith('/')) {
        if (isOwner) {
          await bot.telegram.sendMessage(
            chatId,
            `👋 Привет! Я бот для демо-портала машиниста.\n\n` +
            `Используйте команды:\n` +
            `/start - Главное меню\n` +
            `/stats - Статистика\n` +
            `/site - Перейти на сайт`,
            {
              reply_markup: {
                inline_keyboard: [[
                  {
                    text: '🚊 Перейти на сайт',
                    url: 'https://rzd-machinist-portal.vercel.app'
                  }
                ]]
              }
            }
          );
        } else {
          await bot.telegram.sendMessage(
            chatId,
            `💬 Спасибо за ваше сообщение!\n\n` +
            `Для связи используйте форму обратной связи на сайте.\n\n` +
            `*Основная информация о проекте:*\n` +
            `Это демо-портал, посвященный профессии машиниста и истории железных дорог России.`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [[
                  {
                    text: '📝 Форма обратной связи',
                    url: 'https://rzd-machinist-portal.vercel.app'
                  }
                ]]
              }
            }
          );

          // Уведомляем создателя о сообщении от пользователя
          await bot.telegram.sendMessage(
            OWNER_ID,
            `💬 *Сообщение от пользователя*\n\n` +
            `🆔 ID: ${userId}\n` +
            `👤 Имя: ${message.from.first_name || 'Не указано'}\n` +
            `📛 Фамилия: ${message.from.last_name || 'Не указана'}\n` +
            `📱 Username: @${message.from.username || 'Не указан'}\n` +
            `💬 Текст: ${text}\n` +
            `🕒 Время: ${new Date().toLocaleString('ru-RU')}`,
            { parse_mode: 'Markdown' }
          );
        }
      }
    }

    // Ответ для GET запросов (проверка работоспособности)
    if (req.method === 'GET') {
      return res.status(200).json({ 
        status: 'Bot is running', 
        project: 'RZD Machinist Portal',
        website: 'https://rzd-machinist-portal.vercel.app'
      });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Bot error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
