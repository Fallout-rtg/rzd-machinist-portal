const { Telegraf, Markup } = require('telegraf');
const Busboy = require('busboy');

module.exports = async (req, res) => {
  // Настройки CORS для Webhook
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const BOT_TOKEN = process.env.BOT_TOKEN;
  const OWNER_ID = process.env.OWNER_ID;
  const SITE_URL = 'https://rzd-machinist-portal.vercel.app';
  
  // Новая ссылка для стартового сообщения
  const START_PHOTO_URL = 'https://avatars.mds.yandex.net/get-shedevrum/17784680/img_1058f787ced111f09d76864026b543ce/orig';
  // Ссылка для меню локомотивов (оставлена как было)
  const LOCOMOTIVES_MENU_PHOTO_URL = `${SITE_URL}/images/locomotives/locomotives_commands.jpg`;

  if (!BOT_TOKEN || !OWNER_ID) {
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

  function cleanFileName(filename) {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\s+/g, '_').toLowerCase();
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
            const cleanFilename = cleanFileName(fileData.filename);
            
            if (fileData.buffer.length === 0) continue;

            const fileBuffer = Buffer.isBuffer(fileData.buffer) ? fileData.buffer : Buffer.from(fileData.buffer);

            if (fileData.mimeType.startsWith('image/')) {
              await bot.telegram.sendPhoto(
                OWNER_ID,
                { source: fileBuffer },
                { caption: `📸 ${cleanFilename}`, disable_notification: true }
              );
            } else if (fileData.mimeType.startsWith('video/')) {
              await bot.telegram.sendVideo(
                OWNER_ID,
                { source: fileBuffer },
                { caption: `🎥 ${cleanFilename}`, disable_notification: true }
              );
            } else {
              await bot.telegram.sendDocument(
                OWNER_ID,
                { source: fileBuffer, filename: cleanFilename },
                { caption: `📎 ${cleanFilename}`, disable_notification: true }
              );
            }
          } catch (fileError) {
            await bot.telegram.sendMessage(OWNER_ID, `❌ Ошибка при отправке файла "${fileData.filename}"`);
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
      return false;
    }
  }

  // --- ОБРАБОТЧИКИ TElegraf ---

  const locomotivesMenuKeyboard = Markup.inlineKeyboard([
    [Markup.button.callback('ЧС2', 'loco_chs2'), Markup.button.callback('ВЛ80С', 'loco_vl80s')],
    [Markup.button.callback('2ТЭ25КМ', 'loco_2te25km'), Markup.button.callback('ЭП20', 'loco_ep20')],
    [Markup.button.callback('🔙 Назад', 'back_to_main')]
  ]);

  const mainKeyboard = (isOwner) => {
    return Markup.inlineKeyboard([
      [Markup.button.url('🌐 Перейти на сайт', SITE_URL)],
      [Markup.button.callback('🚂 Показать локомотивы', 'locomotives')]
    ]);
  };

  const getMainText = (isOwner, userName) => {
    return isOwner 
      ? `👋 *Привет, создатель!*\n\nЯ ваш бот для демо-портала.\n\nВыберите действие:`
      : `🚂 *Демо-портал машиниста РЖД*\n\n*Добро пожаловать, ${userName}!*\n\nЯ помогу вам узнать больше о локомотивах.\n\nВыберите действие:`;
  };

  const sendMain = async (ctx) => {
    const isOwner = ctx.from.id.toString() === OWNER_ID;
    const userName = ctx.from.first_name || 'Пользователь';
    const text = getMainText(isOwner, userName);
    const keyboard = mainKeyboard(isOwner);

    if (ctx.callbackQuery) {
      try {
        await ctx.deleteMessage();
      } catch (e) {}
    }

    const commonOptions = {
        caption: text,
        parse_mode: 'Markdown',
        reply_markup: keyboard.reply_markup
    };

    try {
        // Используем новую ссылку для стартового сообщения
        await ctx.replyWithPhoto(START_PHOTO_URL, commonOptions);
    } catch (e) {
        // Fallback: Если фото недоступно, отправляем только текст
        await ctx.reply(text, commonOptions);
    }
  };
  
  const sendLocomotivesMenu = async (ctx) => {
    // Используем старую ссылку для меню локомотивов
    const menuPhotoUrl = LOCOMOTIVES_MENU_PHOTO_URL;
    const menuText = `🚂 *Локомотивы РЖД*\n\n` +
                     `*Выберите локомотив для получения подробной информации:*\n\n` +
                     `⚡ *Доступно в боте:*\n` +
                     `• ЧС2 - легендарный "Чебурашка"\n` +
                     `• ВЛ80С - трудяга грузовых перевозок\n` +
                     `• 2ТЭ25КМ - современный "Витязь"\n` +
                     `• ЭП20 - скоростной двухсистемный\n\n` +
                     `🌐 *На сайте доступно ещё больше моделей!*`;

    const commonOptions = {
        caption: menuText,
        parse_mode: 'Markdown',
        reply_markup: locomotivesMenuKeyboard.reply_markup
    };

    try {
        if (ctx.callbackQuery && ctx.callbackQuery.message.photo) {
            await ctx.editMessageMedia(
                {
                    type: 'photo',
                    media: menuPhotoUrl,
                    ...commonOptions
                },
                { reply_markup: commonOptions.reply_markup }
            );
        } else {
            try {
                if (ctx.callbackQuery) await ctx.deleteMessage();
            } catch (e) {}
            
            await ctx.replyWithPhoto(menuPhotoUrl, commonOptions);
        }
    } catch (e) {
        try {
            await ctx.deleteMessage();
        } catch (e) {}
        await ctx.reply(menuText, commonOptions);
    }
  };

  const sendLocomotiveInfo = async (ctx, locoId) => {
    const loco = LOCOMOTIVES.find(l => l.id === locoId);
    if (!loco) return;

    const locoText = formatLocomotiveInfo(loco);
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.url('🌐 На сайт', `${SITE_URL}#locomotives`)],
      [Markup.button.callback('📋 Меню', 'locomotives')]
    ]);

    const commonOptions = {
      caption: locoText,
      parse_mode: 'Markdown',
      reply_markup: keyboard.reply_markup
    };

    try {
        await ctx.editMessageMedia(
            {
                type: 'photo',
                media: loco.photoUrl,
                ...commonOptions
            },
            { reply_markup: commonOptions.reply_markup }
        );
    } catch (e) {
        try {
            await ctx.deleteMessage();
        } catch (e) {}
        
        try {
            await ctx.replyWithPhoto(loco.photoUrl, commonOptions);
        } catch (e) {
            await ctx.reply(locoText, commonOptions);
        }
    }
  };


  // --- НАСТРОЙКА ОБРАБОТЧИКОВ ---

  bot.start(sendMain);

  bot.command('help', (ctx) => {
    ctx.reply(
      `🆘 *Помощь*\n\n*Команды:*\n/start - Меню\n/help - Справка\n\n*Админ:*\n/stats - Статистика`,
      { parse_mode: 'Markdown' }
    );
  });

  bot.command('stats', (ctx) => {
    const isOwner = ctx.from.id.toString() === OWNER_ID;
    if (isOwner) {
      ctx.reply(
        `📊 *Статистика*\nСообщений: ${feedbackQueue.length}`,
        { parse_mode: 'Markdown' }
      );
    }
  });

  bot.action('locomotives', async (ctx) => {
    await sendLocomotivesMenu(ctx);
    await ctx.answerCbQuery();
  });

  bot.action('back_to_main', async (ctx) => {
    await sendMain(ctx);
    await ctx.answerCbQuery();
  });

  bot.action(/loco_([a-z0-9]+)/, async (ctx) => {
    const locoId = ctx.match[1];
    await sendLocomotiveInfo(ctx, locoId);
    await ctx.answerCbQuery();
  });

  // --- ГЛАВНАЯ SERVERLESS ЛОГИКА ---

  try {
    if (req.method === 'POST') {
      const contentType = req.headers['content-type'] || '';

      if (contentType.includes('multipart/form-data')) {
        const bb = Busboy({ 
          headers: req.headers,
          limits: { fileSize: 50 * 1024 * 1024, files: 10 }
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
            
            file.on('data', (chunk) => chunks.push(chunk));
            file.on('end', () => {
              if (chunks.length === 0) return;
              const buffer = Buffer.concat(chunks);
              files.push({ filename: filename || 'file', mimeType, size: buffer.length });
              fileBuffers.push({ filename: filename || 'file', buffer, mimeType });
            });
          }
        });

        bb.on('close', async () => {
          if (!email || !message) {
            return res.status(400).json({ error: 'Email and message are required' });
          }

          const success = await sendFeedbackToOwner(email, message, fileBuffers, userAgent);
          
          if (success) {
            feedbackQueue.push({ email, message, files: files.length, timestamp: new Date().toISOString() });
            if (feedbackQueue.length > 100) feedbackQueue.shift();
            res.status(200).json({ success: true, message: 'Sent' });
          } else {
            res.status(500).json({ error: 'Failed' });
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
        
        await bot.handleUpdate(update);

        res.status(200).json({ success: true });
        return;
      }
    }

    if (req.method === 'GET') {
      return res.status(200).json({ status: 'Bot is running' });
    }

    res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Bot error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
