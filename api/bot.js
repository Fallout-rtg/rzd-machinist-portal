const { Telegraf, Markup } = require('telegraf');
const Busboy = require('busboy');

// Глобальное хранилище состояний (в serverless среде Vercel оно может сбрасываться 
// при "холодном" старте, но для активной переписки обычно держится достаточно долго)
// Хранит ID пользователей, которые нажали кнопку "Поддержка" и бот ждет от них сообщения.
const supportWaitList = new Set();

module.exports = async (req, res) => {
  // --- CORS Config ---
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // --- Configuration ---
  const BOT_TOKEN = process.env.BOT_TOKEN;
  const OWNER_ID = process.env.OWNER_ID;
  const SITE_URL = 'https://rzd-machinist-portal.vercel.app';
  
  // Медиа ссылки
  const START_PHOTO_URL = 'https://avatars.mds.yandex.net/get-shedevrum/17784680/img_1058f787ced111f09d76864026b543ce/orig';
  const LOCOMOTIVES_MENU_PHOTO_URL = `${SITE_URL}/images/locomotives/locomotives_commands.jpg`;

  if (!BOT_TOKEN || !OWNER_ID) {
    return res.status(500).json({ error: 'Bot configuration missing' });
  }

  const bot = new Telegraf(BOT_TOKEN);

  // --- Data ---
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

  // --- Helpers ---
  function cleanFileName(filename) {
    if (!filename) return `file_${Date.now()}`;
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

  // Функция для отправки сообщений с формы сайта владельцу
  async function sendFeedbackToOwner(email, message, files, userAgent) {
    try {
      const isMobile = /mobile|android|iphone|ipad/i.test(userAgent || '');
      const deviceType = isMobile ? '📱 Мобильное устройство' : '💻 Компьютер';
      
      let messageText = `📧 *СООБЩЕНИЕ С САЙТА*\n\n`;
      messageText += `📨 *Email:* \`${email}\`\n`;
      messageText += `📱 *Устройство:* ${deviceType}\n`;
      messageText += `💬 *Текст:* ${message}\n\n`;

      if (files.length > 0) {
        messageText += `📎 *Файлы (${files.length}):*\n`;
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
            const cleanName = cleanFileName(fileData.filename);
            
            if (fileData.buffer.length === 0) continue;

            const fileBuffer = Buffer.isBuffer(fileData.buffer) ? fileData.buffer : Buffer.from(fileData.buffer);

            if (fileData.mimeType.startsWith('image/')) {
              await bot.telegram.sendPhoto(OWNER_ID, { source: fileBuffer }, { caption: `📸 ${cleanName}` });
            } else if (fileData.mimeType.startsWith('video/')) {
              await bot.telegram.sendVideo(OWNER_ID, { source: fileBuffer }, { caption: `🎥 ${cleanName}` });
            } else {
              await bot.telegram.sendDocument(OWNER_ID, { source: fileBuffer, filename: cleanName }, { caption: `📎 ${cleanName}` });
            }
          } catch (fileError) {
            await bot.telegram.sendMessage(OWNER_ID, `❌ Не удалось отправить файл "${fileData.filename}"`);
          }
        }
      } else {
        await bot.telegram.sendMessage(OWNER_ID, messageText, { parse_mode: 'Markdown' });
      }
      return true;
    } catch (error) {
      console.error('Feedback error:', error);
      return false;
    }
  }

  // --- UI Functions ---

  const getMainKeyboard = () => {
    return Markup.inlineKeyboard([
      [Markup.button.callback('🚂 Локомотивы', 'locomotives')],
      [Markup.button.url('🌐 Открыть портал', SITE_URL)],
      [Markup.button.callback('📞 Поддержка', 'support_request')]
    ]);
  };

  const sendMain = async (ctx) => {
    const userName = ctx.from.first_name || 'Путешественник';
    const text = `👋 *Приветствую, ${userName}!*\n\n` +
                 `Я — официальный бот *Демо-портала машиниста РЖД*.\n\n` +
                 `🚂 Здесь вы можете изучить технические характеристики современных и легендарных локомотивов.\n` +
                 `🌐 По кнопке ниже доступен полный функционал веб-портала.\n` +
                 `📞 Если у вас есть вопросы или предложения, напишите нам в поддержку.\n\n` +
                 `*Что будем делать?*`;

    const commonOptions = {
        caption: text,
        parse_mode: 'Markdown',
        reply_markup: getMainKeyboard().reply_markup
    };

    try {
        if (ctx.callbackQuery) {
             try { await ctx.deleteMessage(); } catch(e){}
        }
        await ctx.replyWithPhoto(START_PHOTO_URL, commonOptions);
    } catch (e) {
        await ctx.reply(text, commonOptions);
    }
  };

  const sendLocomotivesMenu = async (ctx) => {
    const menuText = `🛠 *Парк Локомотивов*\n\n` +
                     `В нашей базе представлены детальные характеристики подвижного состава.\n` +
                     `Нажмите на название серии, чтобы увидеть паспорт локомотива.\n\n` +
                     `_Выберите модель:_`;
    
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('⚡ ЧС2 "Чебурашка"', 'loco_chs2')],
      [Markup.button.callback('🔋 ВЛ80С', 'loco_vl80s')],
      [Markup.button.callback('🚂 2ТЭ25КМ "Витязь"', 'loco_2te25km')],
      [Markup.button.callback('🚄 ЭП20 "Олимп"', 'loco_ep20')],
      [Markup.button.callback('🔙 В главное меню', 'back_to_main')]
    ]);

    const commonOptions = {
        caption: menuText,
        parse_mode: 'Markdown',
        reply_markup: keyboard.reply_markup
    };

    try {
        if (ctx.callbackQuery && ctx.callbackQuery.message.photo) {
            await ctx.editMessageMedia(
                { type: 'photo', media: LOCOMOTIVES_MENU_PHOTO_URL, ...commonOptions },
                { reply_markup: commonOptions.reply_markup }
            );
        } else {
            try { if (ctx.callbackQuery) await ctx.deleteMessage(); } catch(e){}
            await ctx.replyWithPhoto(LOCOMOTIVES_MENU_PHOTO_URL, commonOptions);
        }
    } catch (e) {
        try { await ctx.deleteMessage(); } catch(e){}
        await ctx.reply(menuText, commonOptions);
    }
  };

  const sendHelp = async (ctx) => {
    const text = `🆘 *Центр помощи*\n\n` +
                 `Используйте кнопки ниже для быстрой навигации:`;
    
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🏠 Главное меню', 'back_to_main')],
      [Markup.button.callback('🚂 Список локомотивов', 'locomotives')],
      [Markup.button.callback('📞 Написать в поддержку', 'support_request')],
      [Markup.button.url('🌐 Перейти на сайт', SITE_URL)]
    ]);

    if (ctx.callbackQuery) {
        // Если вызвано кнопкой (теоретически)
        await ctx.editMessageCaption(text, { parse_mode: 'Markdown', reply_markup: keyboard.reply_markup })
            .catch(() => ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard.reply_markup }));
    } else {
        // Если вызвано командой /help
        await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard.reply_markup });
    }
  };

  // --- BOT HANDLERS ---

  bot.start(sendMain);
  bot.command('help', sendHelp);

  // Навигация
  bot.action('back_to_main', async (ctx) => {
    supportWaitList.delete(ctx.from.id); // Сбрасываем режим поддержки при уходе
    await sendMain(ctx);
    await ctx.answerCbQuery();
  });

  bot.action('locomotives', async (ctx) => {
    supportWaitList.delete(ctx.from.id);
    await sendLocomotivesMenu(ctx);
    await ctx.answerCbQuery();
  });

  bot.action(/loco_([a-z0-9]+)/, async (ctx) => {
    const locoId = ctx.match[1];
    const loco = LOCOMOTIVES.find(l => l.id === locoId);
    if (!loco) return ctx.answerCbQuery('Локомотив не найден');

    const locoText = formatLocomotiveInfo(loco);
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.url('🌐 Подробнее на сайте', `${SITE_URL}#locomotives`)],
      [Markup.button.callback('🔙 К списку', 'locomotives')]
    ]);

    const commonOptions = {
      caption: locoText,
      parse_mode: 'Markdown',
      reply_markup: keyboard.reply_markup
    };

    try {
        await ctx.editMessageMedia(
            { type: 'photo', media: loco.photoUrl, ...commonOptions },
            { reply_markup: commonOptions.reply_markup }
        );
    } catch (e) {
        try { await ctx.deleteMessage(); } catch(e){}
        await ctx.replyWithPhoto(loco.photoUrl, commonOptions);
    }
    await ctx.answerCbQuery();
  });

  // --- SUPPORT LOGIC ---

  // 1. Пользователь нажимает кнопку
  bot.action('support_request', async (ctx) => {
    supportWaitList.add(ctx.from.id);
    
    const text = `📞 *Служба поддержки*\n\n` +
                 `Напишите ваше сообщение (текст, фото или видео) прямо сейчас, и я перешлю его администратору.\n\n` +
                 `_Ожидаю вашего сообщения..._`;
                 
    await ctx.reply(text, { 
        parse_mode: 'Markdown',
        reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('❌ Отмена', 'back_to_main')]
        ]).reply_markup
    });
    await ctx.answerCbQuery();
  });

  // 2. Обработка всех входящих сообщений
  bot.on('message', async (ctx) => {
    const userId = ctx.from.id;
    const isOwner = userId.toString() === OWNER_ID;

    // A. Логика АДМИНИСТРАТОРА (Ответ пользователю)
    if (isOwner && ctx.message.reply_to_message) {
        // Пытаемся достать ID пользователя из текста оригинального сообщения (которое бот прислал админу)
        // Формат бота: "📩 #SupportRequest [12345678]..."
        const originalText = ctx.message.reply_to_message.text || ctx.message.reply_to_message.caption || '';
        const idMatch = originalText.match(/\[(\d+)\]/); // Ищем ID в квадратных скобках
        
        if (idMatch && idMatch[1]) {
            const targetUserId = idMatch[1];
            try {
                // Копируем сообщение админа пользователю
                await ctx.copyMessage(targetUserId);
                
                // Добавляем кнопку "Ответить" пользователю
                await bot.telegram.sendMessage(targetUserId, 
                    `👨‍💻 *Ответ от поддержки:*\n(см. сообщение выше)\n\n_Если хотите ответить, нажмите кнопку ниже:_`, 
                    {
                        parse_mode: 'Markdown',
                        reply_markup: Markup.inlineKeyboard([
                            [Markup.button.callback('💬 Ответить в поддержку', 'support_request')]
                        ]).reply_markup
                    }
                );
                await ctx.reply('✅ Ответ отправлен пользователю.');
            } catch (err) {
                console.error('Ошибка отправки ответа:', err);
                await ctx.reply('❌ Не удалось отправить ответ (пользователь заблокировал бота?).');
            }
        } else {
            // Если это не сообщение поддержки, игнорируем или пишем в лог
        }
        return;
    }

    // B. Логика ПОЛЬЗОВАТЕЛЯ (Отправка в поддержку)
    if (supportWaitList.has(userId)) {
        // Формируем заголовок для Админа
        const userInfo = `📩 #SupportRequest\n👤 *От:* ${ctx.from.first_name} ${ctx.from.last_name || ''}\n🆔 ID: [${userId}]\n🔗 @${ctx.from.username || 'нет_юзернейма'}`;
        
        try {
            // 1. Отправляем карточку с инфо о юзере (чтобы Админ мог сделать Reply на неё)
            await bot.telegram.sendMessage(OWNER_ID, userInfo, { parse_mode: 'Markdown' });
            
            // 2. Пересылаем само сообщение (чтобы видеть контент)
            await ctx.forwardMessage(OWNER_ID);

            // 3. Подтверждаем юзеру
            await ctx.reply(`✅ *Сообщение отправлено!*\nОтвет придет в этот чат.`, {
                parse_mode: 'Markdown',
                reply_markup: Markup.inlineKeyboard([
                    [Markup.button.callback('🏠 В меню', 'back_to_main')],
                    [Markup.button.callback('💬 Написать ещё', 'support_request')]
                ]).reply_markup
            });

            // Убираем из списка ожидания, чтобы бот не пересылал каждое "спасибо"
            supportWaitList.delete(userId);

        } catch (err) {
            console.error('Ошибка пересылки:', err);
            await ctx.reply('❌ Ошибка отправки. Попробуйте позже.');
        }
    }
  });


  // --- MAIN SERVER LOGIC ---

  try {
    if (req.method === 'POST') {
      const contentType = req.headers['content-type'] || '';

      // 1. Обработка формы с сайта (multipart/form-data)
      if (contentType.includes('multipart/form-data')) {
        const bb = Busboy({ 
            headers: req.headers,
            defParamCharset: 'utf8', // Важно для кириллицы
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
            const chunks = [];
            // Фикс для мобильных: если filename отсутствует или пуст
            const safeFilename = info.filename ? Buffer.from(info.filename, 'latin1').toString('utf8') : `mobile_upload_${Date.now()}.jpg`;
            
            file.on('data', (chunk) => chunks.push(chunk));
            file.on('end', () => {
              if (chunks.length === 0) return;
              const buffer = Buffer.concat(chunks);
              files.push({ filename: safeFilename, mimeType: info.mimeType, size: buffer.length });
              fileBuffers.push({ filename: safeFilename, buffer, mimeType: info.mimeType });
            });
          } else {
             file.resume(); // Пропускаем лишние файлы
          }
        });

        bb.on('close', async () => {
          if (!email || !message) {
            return res.status(400).json({ error: 'Email and message are required' });
          }

          const success = await sendFeedbackToOwner(email, message, fileBuffers, userAgent);
          
          if (success) {
            res.status(200).json({ success: true, message: 'Message sent successfully' });
          } else {
            res.status(500).json({ error: 'Failed to send via Telegram Bot' });
          }
        });

        req.pipe(bb);
        return;
      } 
      
      // 2. Обработка команд Телеграм (Webhook)
      else if (contentType.includes('application/json')) {
        let update;
        try {
            update = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        } catch (e) {
            return res.status(400).send('Invalid JSON');
        }
        
        await bot.handleUpdate(update);
        res.status(200).json({ success: true });
        return;
      }
    }

    if (req.method === 'GET') {
      return res.status(200).json({ status: 'Bot is active', version: '2.0.0' });
    }

    res.status(405).json({ error: 'Method not allowed' });
    
  } catch (error) {
    console.error('General Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
