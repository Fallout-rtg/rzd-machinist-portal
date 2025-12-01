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
    console.error('Missing environment variables');
    return res.status(500).json({ error: 'Bot configuration missing' });
  }

  const bot = new Telegraf(BOT_TOKEN);

  try {
    console.log('Request method:', req.method);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Body exists:', !!req.body);

    if (req.method === 'POST') {
      const contentType = req.headers['content-type'] || '';

      if (contentType.includes('multipart/form-data')) {
        const busboy = require('busboy');
        const bb = busboy({ headers: req.headers });
        
        let email = '';
        let message = '';
        const files = [];
        const fileBuffers = [];

        bb.on('field', (name, value) => {
          if (name === 'email') email = value;
          if (name === 'message') message = value;
        });

        bb.on('file', (name, file, info) => {
          if (name === 'attachments') {
            const { filename, mimeType } = info;
            const chunks = [];
            
            file.on('data', (chunk) => {
              chunks.push(chunk);
            });

            file.on('end', () => {
              const buffer = Buffer.concat(chunks);
              if (buffer.length > 50 * 1024 * 1024) {
                return;
              }
              files.push({
                filename,
                mimeType,
                size: buffer.length
              });
              fileBuffers.push({
                filename,
                buffer,
                mimeType
              });
            });
          }
        });

        bb.on('close', async () => {
          if (!email || !message) {
            return res.status(400).json({ error: 'Email and message are required' });
          }

          const emailRegex = /^[a-zA-Z0-9._%+-]+@(gmail\.com|yandex\.(ru|com))$/i;
          if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Only Gmail and Yandex emails are allowed' });
          }

          try {
            let messageText = `🚂 *НОВОЕ СООБЩЕНИЕ С САЙТА*\n\n📧 *Email:* \`${email}\`\n💬 *Сообщение:* ${message}\n\n`;

            if (files.length > 0) {
              messageText += `📎 *Прикрепленные файлы (${files.length}):*\n`;
              files.forEach((file, index) => {
                messageText += `${index + 1}. ${file.filename} (${(file.size / 1024 / 1024).toFixed(2)} MB)\n`;
              });
              
              await bot.telegram.sendMessage(OWNER_ID, messageText, { parse_mode: 'Markdown' });

              for (const fileData of fileBuffers) {
                try {
                  if (fileData.buffer.length > 50 * 1024 * 1024) {
                    await bot.telegram.sendMessage(
                      OWNER_ID, 
                      `⚠️ Файл "${fileData.filename}" превышает 50MB и не может быть отправлен`
                    );
                    continue;
                  }

                  if (fileData.mimeType.startsWith('image/')) {
                    await bot.telegram.sendPhoto(
                      OWNER_ID,
                      { source: fileData.buffer },
                      { caption: `📸 ${fileData.filename}` }
                    );
                  } else if (fileData.mimeType.startsWith('video/')) {
                    await bot.telegram.sendVideo(
                      OWNER_ID,
                      { source: fileData.buffer },
                      { caption: `🎥 ${fileData.filename}` }
                    );
                  } else if (fileData.mimeType.includes('pdf')) {
                    await bot.telegram.sendDocument(
                      OWNER_ID,
                      { source: fileData.buffer, filename: fileData.filename },
                      { caption: `📄 ${fileData.filename}` }
                    );
                  } else {
                    await bot.telegram.sendDocument(
                      OWNER_ID,
                      { source: fileData.buffer, filename: fileData.filename },
                      { caption: `📎 ${fileData.filename}` }
                    );
                  }
                  
                  await new Promise(resolve => setTimeout(resolve, 100));
                } catch (fileError) {
                  console.error(`Error sending file ${fileData.filename}:`, fileError);
                  await bot.telegram.sendMessage(
                    OWNER_ID,
                    `❌ Ошибка при отправке файла "${fileData.filename}": ${fileError.message}`
                  );
                }
              }
            } else {
              await bot.telegram.sendMessage(OWNER_ID, messageText, { parse_mode: 'Markdown' });
            }

            res.status(200).json({ success: true, message: 'Message and files sent successfully' });
          } catch (error) {
            console.error('Error processing message:', error);
            res.status(500).json({ error: 'Failed to send message' });
          }
        });

        req.pipe(bb);
        return;
      } 
      
      else if (contentType.includes('application/json') || contentType.includes('application/x-www-form-urlencoded')) {
        try {
          let update;
          
          if (typeof req.body === 'string') {
            update = JSON.parse(req.body);
          } else {
            update = req.body;
          }
          
          console.log('Telegram update received:', JSON.stringify(update, null, 2));
          
          if (update.message) {
            const message = update.message;
            const chatId = message.chat.id;
            const text = message.text || '';
            const userId = message.from.id;
            const userName = message.from.first_name || 'Пользователь';
            const isOwner = userId.toString() === OWNER_ID;

            console.log(`Processing message from user ${userId} (owner: ${isOwner}): ${text}`);

            if (text.startsWith('/start')) {
              if (isOwner) {
                await bot.telegram.sendMessage(
                  chatId,
                  `👋 *Привет, создатель!*\n\nЯ ваш бот для демо-портала машиниста РЖД.\n\n📊 *Статистика:*\n• Бот активен и готов к работе\n• Форма обратной связи подключена\n• Поддержка файлов до 50MB\n• Все сообщения и файлы приходят сюда\n\n⚡ *Команды:*\n/start - Главное меню\n/site - Перейти на сайт`,
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
                await bot.telegram.sendMessage(
                  chatId,
                  `🚂 *Демо-портал машиниста РЖД*\n\n*Добро пожаловать, ${userName}!*\n\n🌐 *О проекте:*\nИнтерактивный портал, посвященный профессии машиниста и истории российских локомотивов.\n\n💡 *Особенности:*\n• 3D-галерея локомотивов\n• Информация о профессии\n• Образовательные учреждения\n• Обратная связь с поддержкой файлов\n\n📝 *Обратная связь:*\n• Поддержка файлов до 50MB\n• Изображения, видео, документы\n• Быстрый ответ`,
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
            } 
            else if (text.startsWith('/site')) {
              await bot.telegram.sendMessage(
                chatId,
                `🌐 *Демо-портал машиниста РЖД*\n\nПерейдите по ссылке ниже, чтобы посетить сайт:`,
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
            else if (text && !text.startsWith('/')) {
              if (isOwner) {
                await bot.telegram.sendMessage(
                  chatId,
                  `👋 Привет! Я бот для демо-портала машиниста.\n\nИспользуйте команды:\n/start - Главное меню\n/site - Перейти на сайт`,
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
                  `💬 Спасибо за ваше сообщение!\n\nДля связи используйте форму обратной связи на сайте. Вы можете прикреплять файлы до 50MB.\n\n*Типы поддерживаемых файлов:*\n• Изображения (JPG, PNG, GIF)\n• Видео (MP4, MOV)\n• Документы (PDF, DOC, TXT)\n• Архивы (ZIP, RAR)`,
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
              }
            }
          }

          res.status(200).json({ success: true });
        } catch (error) {
          console.error('Error processing Telegram update:', error);
          res.status(500).json({ error: 'Failed to process update' });
        }
      }
    }

    if (req.method === 'GET') {
      return res.status(200).json({ 
        status: 'Bot is running', 
        project: 'RZD Machinist Portal',
        website: 'https://rzd-machinist-portal.vercel.app',
        features: 'File upload support up to 50MB'
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
