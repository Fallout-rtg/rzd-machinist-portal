const { Telegraf } = require('telegraf');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  const OWNER_ID = process.env.OWNER_ID;

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

    if (req.method === 'POST') {
      let body = req.body;

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

      if (!email || !message) {
        return res.status(400).json({
          success: false,
          error: 'Email and message are required fields'
        });
      }

      const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|yandex\.(ru|com))$/i;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Only Gmail and Yandex emails are allowed'
        });
      }

      const attachmentsText = attachments.length > 0
        ? `📎 Прикрепленные файлы (${attachments.length}):\n${attachments.map((file, index) =>
            `${index + 1}. ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
          ).join('\n')}`
        : '📎 Файлы не прикреплены';

      const baseMessage = `🚂 *НОВОЕ СООБЩЕНИЕ С САЙТА*\n\n` +
        `📧 *Email:* \`${email}\`\n` +
        `💬 *Сообщение:* ${message}\n\n` +
        `${attachmentsText}\n\n` +
        `🕒 ${new Date().toLocaleString('ru-RU')}`;

      await bot.telegram.sendMessage(OWNER_ID, baseMessage, {
        parse_mode: 'Markdown'
      });
      
      for (const attachment of attachments) {
        if (attachment.data && attachment.name) {
          try {
            const fileBuffer = Buffer.from(attachment.data, 'base64');
            await bot.telegram.sendDocument(
              OWNER_ID,
              { source: fileBuffer, filename: attachment.name },
              {
                caption: `📎 *Файл от пользователя*\\n\\n` +
                         `📧 Email: \`${email}\``,
                parse_mode: 'Markdown'
              }
            );
          } catch (fileSendError) {
            console.error('Error sending file to Telegram:', fileSendError);
            await bot.telegram.sendMessage(
              OWNER_ID,
              `⚠️ *ОШИБКА ОТПРАВКИ ФАЙЛА*\n\n` +
              `Файл: ${attachment.name}\n` +
              `Ошибка: ${fileSendError.message || 'Неизвестно'}`,
              { parse_mode: 'Markdown' }
            );
          }
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Message sent successfully'
      });
    }

    if (req.body && req.body.message) {
      const { message } = req.body;

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

      const isOwner = userId.toString() === OWNER_ID;

      if (text.startsWith('/start')) {
        const welcomeMessage = isOwner
          ? `👋 *Привет, создатель!*\n\nЯ ваш бот для демо-портала машиниста РЖД.\n\n📊 *Статистика:*\n• Бот активен и готов к работе\n• Форма обратной связи подключена\n• Все сообщения будут приходить сюда\n\n⚡ *Команды:*\n/stats - Статистика бота\n/site - Перейти на сайт`
          : `🚂 *Демо-портал машиниста РЖД*\n\n*Добро пожаловать, ${userName}!*\n\n🌐 *О проекте:*\nИнтерактивный портал, посвященный профессии машиниста и истории российских локомотивов.\n\n📖 *Основные разделы:*\n• 🚊 Галерея локомотивов с 3D-каруселью\n• 👨‍🔧 Профессия машиниста\n• 🎓 Образовательные учреждения РЖД\n• 📜 История железных дорог\n\n💡 *Для связи используйте форму обратной связи на сайте*`;

        const replyMarkup = {
          inline_keyboard: [[
            {
              text: '🚊 Перейти на сайт',
              url: 'https://rzd-machinist-portal.vercel.app'
            }
          ]]
        };

        await bot.telegram.sendMessage(chatId, welcomeMessage, {
          parse_mode: 'Markdown',
          reply_markup: replyMarkup
        });

        if (!isOwner) {
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
      } else if (text.startsWith('/stats') && isOwner) {
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
      } else if (text.startsWith('/site')) {
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
      } else if (text && !text.startsWith('/')) {
        const responseMessage = isOwner
          ? `👋 Привет! Я бот для демо-портала машиниста.\n\nИспользуйте команды:\n/start - Главное меню\n/stats - Статистика\n/site - Перейти на сайт`
          : `💬 Спасибо за ваше сообщение!\n\nДля связи используйте форму обратной связи на сайте.\n\n*Основная информация о проекте:*\nЭто демо-портал, посвященный профессии машиниста и истории железных дорог России.`;

        const replyMarkup = isOwner
          ? {
            inline_keyboard: [[
              { text: '🚊 Перейти на сайт', url: 'https://rzd-machinist-portal.vercel.app' }
            ]]
          }
          : {
            inline_keyboard: [[
              { text: '📝 Форма обратной связи', url: 'https://rzd-machinist-portal.vercel.app' }
            ]]
          };

        await bot.telegram.sendMessage(chatId, responseMessage, {
          parse_mode: 'Markdown',
          reply_markup: replyMarkup
        });

        if (!isOwner) {
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
