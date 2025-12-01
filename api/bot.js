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
  const SITE_URL = 'https://rzd-machinist-portal.vercel.app';

  if (!BOT_TOKEN || !OWNER_ID) {
    console.error('Missing environment variables');
    return res.status(500).json({ error: 'Bot configuration missing' });
  }

  const bot = new Telegraf(BOT_TOKEN);

  const LOCOMOTIVES = [
    {
      id: 'chs2',
      name: 'ЧС2',
      type: 'Электровоз',
      year: 1958,
      power: '5100 кВт',
      speed: '160 км/ч',
      weight: '126 тонн',
      length: '20.62 м',
      manufacturer: 'Škoda (Чехословакия)',
      description: 'Легенда пассажирских перевозок СССР, прозванный "Чебурашкой". Первый советский серийный шестиосный пассажирский электровоз. Разработан в Чехословакии на заводе Škoda. Использовался на главных направлениях советских железных дорог.',
      photoUrl: `${SITE_URL}/images/locomotives/chs2.jpg`
    },
    {
      id: 'vl80s',
      name: 'ВЛ80С',
      type: 'Электровоз',
      year: 1961,
      power: '6520 кВт',
      speed: '110 км/ч',
      weight: '192 тонны',
      length: '32.4 м',
      manufacturer: 'НЭВЗ (СССР/Россия)',
      description: 'Самый массовый грузовой локомотив переменного тока, трудяга советских и российских железных дорог. Буква "С" означает возможность работы по системе многих единиц.',
      photoUrl: `${SITE_URL}/images/locomotives/vl80s.jpg`
    },
    {
      id: '2te25km',
      name: '2ТЭ25КМ',
      type: 'Тепловоз',
      year: 2014,
      power: '3670 кВт',
      speed: '120 км/ч',
      weight: '2 × 150 тонн',
      length: '2 × 22.12 м',
      manufacturer: 'Брянский машиностроительный завод',
      description: 'Современный мощный грузовой тепловоз, получивший прозвище "Витязь". Представляет собой двухсекционный локомотив с дизель-генераторной установкой.',
      photoUrl: `${SITE_URL}/images/locomotives/2te25km.jpg`
    },
    {
      id: 'ep20',
      name: 'ЭП20',
      type: 'Электровоз',
      year: 2011,
      power: '7200 кВт',
      speed: '200 км/ч',
      weight: '120 тонн',
      length: '21.5 м',
      manufacturer: 'НЭВЗ / Alstom',
      description: 'Первый российский двухсистемный пассажирский электровоз, способный развивать скорость до 200 км/ч. Используется на скоростных маршрутах Москва — Адлер, Москва — Санкт-Петербург.',
      photoUrl: `${SITE_URL}/images/locomotives/ep20.jpg`
    }
  ];

  const feedbackQueue = [];

  async function sendFeedbackToOwner(email, message, files, userAgent) {
    try {
      const isMobile = /mobile|android|iphone|ipad/i.test(userAgent || '');
      const deviceType = isMobile ? '📱 Мобильное устройство' : '💻 Компьютер';
      
      let messageText = `🚂 *НОВОЕ СООБЩЕНИЕ С САЙТА*\n\n`;
      messageText += `📧 *Email:* \`${email}\`\n`;
      messageText += `📱 *Устройство:* ${deviceType}\n`;
      messageText += `💬 *Сообщение:*\n${message}\n\n`;

      if (files.length > 0) {
        messageText += `📎 *Прикрепленные файлы (${files.length}):*\n`;
        files.forEach((file, index) => {
          const sizeMB = (file.size / 1024 / 1024).toFixed(2);
          messageText += `${index + 1}. ${file.filename} (${sizeMB} MB)\n`;
        });
        
        await bot.telegram.sendMessage(OWNER_ID, messageText, { 
          parse_mode: 'Markdown',
          disable_web_page_preview: true 
        });

        for (const fileData of files) {
          try {
            await new Promise(resolve => setTimeout(resolve, 500));

            const cleanFilename = fileData.filename.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\s+/g, '_').toLowerCase();
            
            if (fileData.buffer.length === 0) continue;

            if (fileData.mimeType.startsWith('image/')) {
              await bot.telegram.sendPhoto(
                OWNER_ID,
                { source: fileData.buffer },
                { 
                  caption: `📸 ${cleanFilename}`,
                  disable_notification: true 
                }
              );
            } else if (fileData.mimeType.startsWith('video/')) {
              await bot.telegram.sendVideo(
                OWNER_ID,
                { source: fileData.buffer },
                { 
                  caption: `🎥 ${cleanFilename}`,
                  disable_notification: true 
                }
              );
            } else if (fileData.mimeType.includes('pdf')) {
              await bot.telegram.sendDocument(
                OWNER_ID,
                { source: fileData.buffer, filename: cleanFilename },
                { 
                  caption: `📄 ${cleanFilename}`,
                  disable_notification: true 
                }
              );
            } else {
              await bot.telegram.sendDocument(
                OWNER_ID,
                { source: fileData.buffer, filename: cleanFilename },
                { 
                  caption: `📎 ${cleanFilename}`,
                  disable_notification: true 
                }
              );
            }
            
          } catch (fileError) {
            console.error(`Error sending file ${fileData.filename}:`, fileError.message);
            await bot.telegram.sendMessage(
              OWNER_ID,
              `❌ Ошибка при отправке файла "${fileData.filename}": Файл не может быть отправлен через бота`
            );
          }
        }
      } else {
        await bot.telegram.sendMessage(OWNER_ID, messageText, { 
          parse_mode: 'Markdown',
          disable_web_page_preview: true 
        });
      }

      return true;
    } catch (error) {
      console.error('Error sending feedback to owner:', error);
      return false;
    }
  }

  function formatLocomotiveInfo(loco) {
    return `🚂 *${loco.name}*\n\n` +
           `📊 *Тип:* ${loco.type}\n` +
           `📅 *Год выпуска:* ${loco.year}\n` +
           `⚡ *Мощность:* ${loco.power}\n` +
           `💨 *Макс. скорость:* ${loco.speed}\n` +
           `⚖️ *Вес:* ${loco.weight}\n` +
           `📏 *Длина:* ${loco.length}\n` +
           `🏭 *Производитель:* ${loco.manufacturer}\n\n` +
           `📝 *Описание:*\n${loco.description}`;
  }

  try {
    if (req.method === 'POST') {
      const contentType = req.headers['content-type'] || '';

      if (contentType.includes('multipart/form-data')) {
        const busboy = require('busboy');
        const bb = busboy({ 
          headers: req.headers,
          limits: {
            fileSize: 50 * 1024 * 1024,
            files: 10
          }
        });
        
        let email = '';
        let message = '';
        let userAgent = '';
        const files = [];
        const fileBuffers = [];

        bb.on('field', (name, value) => {
          if (name === 'email') email = value;
          if (name === 'message') message = value;
          if (name === 'userAgent') userAgent = value;
        });

        bb.on('file', (name, file, info) => {
          if (name === 'attachments') {
            const { filename, mimeType } = info;
            const chunks = [];
            
            file.on('data', (chunk) => {
              chunks.push(chunk);
            });

            file.on('limit', () => {
              console.log(`File ${filename} превысил лимит размера`);
            });

            file.on('end', () => {
              if (chunks.length === 0) return;
              
              const buffer = Buffer.concat(chunks);
              files.push({
                filename: filename || 'unnamed_file',
                mimeType: mimeType || 'application/octet-stream',
                size: buffer.length
              });
              fileBuffers.push({
                filename: filename || 'unnamed_file',
                buffer,
                mimeType: mimeType || 'application/octet-stream'
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
            const success = await sendFeedbackToOwner(email, message, fileBuffers, userAgent);
            
            if (success) {
              feedbackQueue.push({
                email,
                message,
                files: files.length,
                timestamp: new Date().toISOString()
              });
              
              if (feedbackQueue.length > 100) {
                feedbackQueue.shift();
              }
              
              res.status(200).json({ 
                success: true, 
                message: 'Message and files sent successfully',
                filesCount: files.length
              });
            } else {
              res.status(500).json({ error: 'Failed to send message to owner' });
            }
            
          } catch (error) {
            console.error('Error processing message:', error);
            
            let errorMessage = 'Failed to send message';
            if (error.response) {
              errorMessage = `Telegram API error: ${error.response.description || error.message}`;
            }
            
            res.status(500).json({ 
              error: errorMessage,
              details: error.message 
            });
          }
        });

        req.pipe(bb);
        return;
      } 
      
      else if (contentType.includes('application/json') || contentType.includes('application/x-www-form-urlencoded')) {
        let update;
        
        if (typeof req.body === 'string') {
          update = JSON.parse(req.body);
        } else {
          update = req.body;
        }
        
        if (update.message) {
          const message = update.message;
          const chatId = message.chat.id;
          const text = message.text || '';
          const userId = message.from.id;
          const userName = message.from.first_name || 'Пользователь';
          const isOwner = userId.toString() === OWNER_ID;

          if (text.startsWith('/start')) {
            if (isOwner) {
              await bot.telegram.sendMessage(
                chatId,
                `👋 *Привет, создатель!*\n\nЯ ваш бот для демо-портала машиниста РЖД.\n\n📊 *Статистика за последнее время:*\n• Обратных связей: ${feedbackQueue.length}\n• Последнее: ${feedbackQueue.length > 0 ? new Date(feedbackQueue[feedbackQueue.length-1].timestamp).toLocaleString('ru-RU') : 'нет данных'}\n\nВыберите действие:`,
                { 
                  parse_mode: 'Markdown',
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: '🌐 Перейти на сайт', url: SITE_URL }],
                      [{ text: '🚂 Показать локомотивы', callback_data: 'locomotives' }]
                    ]
                  }
                }
              );
            } else {
              await bot.telegram.sendMessage(
                chatId,
                `🚂 *Демо-портал машиниста РЖД*\n\n*Добро пожаловать, ${userName}!*\n\nЯ помогу вам узнать больше о локомотивах и профессии машиниста.\n\nВыберите действие:`,
                {
                  parse_mode: 'Markdown',
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: '🌐 Перейти на сайт', url: SITE_URL }],
                      [{ text: '🚂 Показать локомотивы', callback_data: 'locomotives' }]
                    ]
                  }
                }
              );
            }
          } 
          else if (text.startsWith('/locomotives') || text.toLowerCase().includes('локомотив')) {
            await bot.telegram.sendMessage(
              chatId,
              `🚂 *Локомотивы РЖД*\n\n` +
              `*Выберите локомотив для получения подробной информации:*\n\n` +
              `⚡ *Доступно в боте:*\n` +
              `• ЧС2 - легендарный "Чебурашка"\n` +
              `• ВЛ80С - трудяга грузовых перевозок\n` +
              `• 2ТЭ25КМ - современный "Витязь"\n` +
              `• ЭП20 - скоростной двухсистемный\n\n` +
              `🌐 *На сайте доступно ещё больше моделей!*`,
              {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [
                      { text: 'ЧС2', callback_data: 'loco_chs2' },
                      { text: 'ВЛ80С', callback_data: 'loco_vl80s' }
                    ],
                    [
                      { text: '2ТЭ25КМ', callback_data: 'loco_2te25km' },
                      { text: 'ЭП20', callback_data: 'loco_ep20' }
                    ],
                    [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
                  ]
                }
              }
            );
          }
          else if (text.startsWith('/help')) {
            await bot.telegram.sendMessage(
              chatId,
              `🆘 *Помощь*\n\n*Доступные команды:*\n/start - Главное меню\n/locomotives - Информация о локомотивах\n/help - Эта справка\n\n*Для администратора:*\n/stats - Статистика бота`,
              {
                parse_mode: 'Markdown'
              }
            );
          }
          else if (text.startsWith('/stats') && isOwner) {
            const stats = {
              totalFeedback: feedbackQueue.length,
              last24h: feedbackQueue.filter(f => 
                new Date(f.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
              ).length,
              lastWeek: feedbackQueue.filter(f => 
                new Date(f.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
              ).length,
              withFiles: feedbackQueue.filter(f => f.files > 0).length
            };
            
            await bot.telegram.sendMessage(
              chatId,
              `📊 *Статистика бота*\n\n` +
              `📨 *Всего обратных связей:* ${stats.totalFeedback}\n` +
              `⏰ *За последние 24 часа:* ${stats.last24h}\n` +
              `📅 *За последнюю неделю:* ${stats.lastWeek}\n` +
              `📎 *С файлами:* ${stats.withFiles}\n\n` +
              `📋 *Последние 5 сообщений:*\n${
                feedbackQueue.slice(-5).reverse().map((f, i) => 
                  `${i+1}. ${f.email}: ${f.message.substring(0, 50)}${f.message.length > 50 ? '...' : ''}`
                ).join('\n') || 'Нет данных'
              }`,
              {
                parse_mode: 'Markdown'
              }
            );
          }
          else if (text && !text.startsWith('/')) {
            const loco = LOCOMOTIVES.find(l => 
              l.name.toLowerCase() === text.toLowerCase() || 
              text.toLowerCase().includes(l.name.toLowerCase())
            );
            
            if (loco) {
              try {
                await bot.telegram.sendPhoto(
                  chatId,
                  loco.photoUrl,
                  {
                    caption: formatLocomotiveInfo(loco),
                    parse_mode: 'Markdown',
                    reply_markup: {
                      inline_keyboard: [
                        [{ text: '🌐 На сайт', url: `${SITE_URL}#locomotives` }],
                        [{ text: '📋 Меню', callback_data: 'locomotives' }]
                      ]
                    }
                  }
                );
              } catch (photoError) {
                console.error('Error sending photo:', photoError);
                await bot.telegram.sendMessage(
                  chatId,
                  formatLocomotiveInfo(loco),
                  {
                    parse_mode: 'Markdown',
                    reply_markup: {
                      inline_keyboard: [
                        [{ text: '🌐 На сайт', url: `${SITE_URL}#locomotives` }],
                        [{ text: '📋 Меню', callback_data: 'locomotives' }]
                      ]
                    }
                  }
                );
              }
            }
          }
        }

        if (update.callback_query) {
          const query = update.callback_query;
          const chatId = query.message.chat.id;
          const messageId = query.message.message_id;
          const data = query.data;

          try {
            if (data === 'locomotives') {
              await bot.telegram.editMessageText(
                chatId,
                messageId,
                null,
                `🚂 *Локомотивы РЖД*\n\n` +
                `*Выберите локомотив для получения подробной информации:*\n\n` +
                `⚡ *Доступно в боте:*\n` +
                `• ЧС2 - легендарный "Чебурашка"\n` +
                `• ВЛ80С - трудяга грузовых перевозок\n` +
                `• 2ТЭ25КМ - современный "Витязь"\n` +
                `• ЭП20 - скоростной двухсистемный\n\n` +
                `🌐 *На сайте доступно ещё больше моделей!*`,
                {
                  parse_mode: 'Markdown',
                  reply_markup: {
                    inline_keyboard: [
                      [
                        { text: 'ЧС2', callback_data: 'loco_chs2' },
                        { text: 'ВЛ80С', callback_data: 'loco_vl80s' }
                      ],
                      [
                        { text: '2ТЭ25КМ', callback_data: 'loco_2te25km' },
                        { text: 'ЭП20', callback_data: 'loco_ep20' }
                      ],
                      [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
                    ]
                  }
                }
              );
            }
            else if (data.startsWith('loco_')) {
              const locoId = data.split('_')[1];
              const loco = LOCOMOTIVES.find(l => l.id === locoId);
              
              if (loco) {
                try {
                  await bot.telegram.sendPhoto(
                    chatId,
                    loco.photoUrl,
                    {
                      caption: formatLocomotiveInfo(loco),
                      parse_mode: 'Markdown',
                      reply_markup: {
                        inline_keyboard: [
                          [{ text: '🌐 На сайт', url: `${SITE_URL}#locomotives` }],
                          [{ text: '📋 Меню', callback_data: 'locomotives' }]
                        ]
                      }
                    }
                  );
                } catch (photoError) {
                  console.error('Error sending photo:', photoError);
                  await bot.telegram.sendMessage(
                    chatId,
                    formatLocomotiveInfo(loco),
                    {
                      parse_mode: 'Markdown',
                      reply_markup: {
                        inline_keyboard: [
                          [{ text: '🌐 На сайт', url: `${SITE_URL}#locomotives` }],
                          [{ text: '📋 Меню', callback_data: 'locomotives' }]
                        ]
                      }
                    }
                  );
                }
              }
            }
            else if (data === 'back_to_main') {
              try {
                await bot.telegram.deleteMessage(chatId, messageId);
              } catch (deleteError) {
                console.error('Error deleting message:', deleteError);
              }
              
              await bot.telegram.sendMessage(
                chatId,
                `👋 *Главное меню*\n\nВыберите действие:`,
                {
                  parse_mode: 'Markdown',
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: '🌐 Перейти на сайт', url: SITE_URL }],
                      [{ text: '🚂 Показать локомотивы', callback_data: 'locomotives' }]
                    ]
                  }
                }
              );
            }

            await bot.telegram.answerCallbackQuery(query.id);
          } catch (error) {
            console.error('Error handling callback query:', error);
            
            try {
              await bot.telegram.sendMessage(
                chatId,
                `❌ Произошла ошибка. Попробуйте ещё раз.`
              );
            } catch (sendError) {
              console.error('Error sending error message:', sendError);
            }
          }
        }

        res.status(200).json({ success: true });
        return;
      }
    }

    if (req.method === 'GET') {
      const totalFeedback = feedbackQueue.length;
      const last24h = feedbackQueue.filter(f => 
        new Date(f.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length;
      
      return res.status(200).json({ 
        status: 'Bot is running', 
        project: 'RZD Machinist Portal',
        website: SITE_URL,
        features: 'File upload support up to 50MB, Locomotive information, Feedback system',
        statistics: {
          totalFeedback,
          last24h,
          locomotivesInBot: LOCOMOTIVES.length
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Bot error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
