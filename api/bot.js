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

  // Проверяем наличие необходимых переменных
  if (!BOT_TOKEN || !OWNER_ID) {
    console.error('Missing environment variables:', { 
      hasBotToken: !!BOT_TOKEN, 
      hasOwnerId: !!OWNER_ID 
    });
    return res.status(500).json({ 
      success: false, 
      error: 'Bot configuration missing. Please check environment variables.' 
    });
  }

  try {
    const bot = new Telegraf(BOT_TOKEN);

    // Обработка формы обратной связи с сайта
    if (req.method === 'POST') {
      let body = req.body;
      
      // Если тело запроса - строка, парсим её
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (parseError) {
          console.error('Error parsing JSON:', parseError);
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid JSON format' 
          });
        }
      }

      const { email, message, attachments = [] } = body;

      // Проверяем обязательные поля
      if (!email || !message) {
        return res.status(400).json({ 
          success: false, 
          error: 'Email and message are required fields' 
        });
      }

      // Валидация email
      const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|yandex\.(ru|com))$/i;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Only Gmail and Yandex emails are allowed' 
        });
      }

      // Форматируем список файлов
      const attachmentsText = attachments.length > 0 
        ? `📎 Прикрепленные файлы (${attachments.length}):\n${attachments.map((file, index) => 
            `${index + 1}. ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
          ).join('\n')}`
        : '📎 Файлы не прикреплены';

      // Отправляем сообщение владельцу (без невалидной кнопки mailto)
      await bot.telegram.sendMessage(
        OWNER_ID,
        `🚂 *НОВОЕ СООБЩЕНИЕ С САЙТА*\n\n` +
        `📧 *Email:* \`${email}\`\n` +
        `💬 *Сообщение:* ${message}\n\n` +
        `${attachmentsText}\n\n` +
        `🕒 ${new Date().toLocaleString('ru-RU')}`,
        { 
          parse_mode: 'Markdown'
        }
      );

      return res.status(200).json({ 
        success: true, 
        message: 'Message sent successfully' 
      });
    }

    // Обработка сообщений от Telegram бота
    if (req.body && req.body.message) {
      const { message } = req.body;
      
      // Проверяем наличие необходимых полей в сообщении
      if (!message || !message.chat || !message.from) {
        console.error('Invalid message structure:', message);
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid message format' 
        });
      }

      const chatId = message.chat.id;
      const text = message.text || '';
      const userId = message.from.id;
      const userName = message.from.first_name || 'Пользователь';

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
            `*Добро пожаловать, ${userName}!*\n\n` +
            `🌐 *О проекте:*\n` +
            `Интерактивный портал, посвященный профессии машиниста и истории российских локомотивов.\n\n` +
            `📖 *Основные разделы:*\n` +
            `• 🚊 Галерея локомотивов с 3D-каруселью\n` +
            `• 👨‍🔧 Профессия машиниста\n` +
            `• 🎓 Образовательные учреждения РЖД\n` +
            `• 📜 История железных дорог\n\n` +
            `💡 *Для связи используйте форму обратной связи на сайте*`,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: '🚊 Перейти на сайт',
                      url: 'https://rzd-machinist-portal.vercel.app'
                    }
                  ]
                ]
              }
            }
          );

          // Уведомляем создателя о новом пользователе
          try {
            await bot.telegram.sendMessage(
              OWNER_ID,
              `👤 *Новый пользователь в боте*\n\n` +
              `🆔 ID: \`${userId}\`\n` +
              `👤 Имя: ${userName}\n` +
              `📛 Фамилия: ${message.from.last_name || 'Не указана'}\n` +
              `📱 Username: @${message.from.username || 'Не указан'}\n` +
              `🕒 Время: ${new Date().toLocaleString('ru-RU')}`,
              { parse_mode: 'Markdown' }
            );
          } catch (notificationError) {
            console.error('Error sending notification:', notificationError);
          }
        }
      }

      // Обработка команды /stats (только для создателя)
      else if (text.startsWith('/stats') && isOwner) {
        await bot.telegram.sendMessage(
          chatId,
          `📊 *Статистика бота*\n\n` +
          `🤖 Бот активен\n` +
          `👑 Создатель: ${OWNER_ID}\n` +
          `🕒 Время: ${new Date().toLocaleString('ru-RU')}\n` +
          `🌐 Сайт: rzd-machinist-portal.vercel.app\n\n` +
          `⚡ Бот готов к приему сообщений!`,
          { parse_mode: 'Markdown' }
        );
      }

      // Обработка команды /site
      else if (text.startsWith('/site')) {
        await bot.telegram.sendMessage(
          chatId,
          `🌐 *Демо-портал машиниста РЖД*\n\n` +
          `Перейдите по ссылке ниже, чтобы посетить сайт:`,
          {
            parse_mode: 'Markdown',
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
          try {
            await bot.telegram.sendMessage(
              OWNER_ID,
              `💬 *Сообщение от пользователя*\n\n` +
              `🆔 ID: \`${userId}\`\n` +
              `👤 Имя: ${userName}\n` +
              `📛 Фамилия: ${message.from.last_name || 'Не указана'}\n` +
              `📱 Username: @${message.from.username || 'Не указан'}\n` +
              `💬 Текст: ${text}\n` +
              `🕒 Время: ${new Date().toLocaleString('ru-RU')}`,
              { parse_mode: 'Markdown' }
            );
          } catch (notificationError) {
            console.error('Error sending user message notification:', notificationError);
          }
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
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
};
