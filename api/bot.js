const { Telegraf, Markup } = require('telegraf');
const Busboy = require('busboy');

const supportWaitList = new Set();
// Добавляем карту для отслеживания ID сообщений, которые нужно удалить
const supportPromptMap = new Map(); 

module.exports = async (req, res) => {
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
  
  const START_PHOTO_URL = 'https://avatars.mds.yandex.net/get-shedevrum/17784680/img_1058f787ced111f09d76864026b543ce/orig';
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

  function cleanFileName(filename) {
    if (!filename) return `file_${Date.now()}`;
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/\s+/g, '_').toLowerCase();
  }

  function formatLocomotiveInfo(loco) {
    return `🚂 <b>${loco.name}</b>\n\n` +
           `📊 <b>Тип:</b> ${loco.type}\n` +
           `📅 <b>Год выпуска:</b> ${loco.year}\n` +
           `⚡ <b>Мощность:</b> ${loco.power}\n` +
           `💨 <b>Макс. скорость:</b> ${loco.speed}\n` +
           `⚖️ <b>Вес:</b> ${loco.weight}\n` +
           `📏 <b>Длина:</b> ${loco.length}\n` +
           `🏭 <b>Производитель:</b> ${loco.manufacturer}\n\n` +
           `📝 <b>Описание:</b>\n${loco.description}`;
  }

  async function sendFeedbackToOwner(email, message, files, userAgent) {
    try {
      const isMobile = /mobile|android|iphone|ipad/i.test(userAgent || '');
      const deviceType = isMobile ? '📱 Мобильное устройство' : '💻 Компьютер';
      
      let messageText = `📧 <b>СООБЩЕНИЕ С САЙТА</b>\n\n`;
      messageText += `📨 <b>Email:</b> <code>${email}</code>\n`;
      messageText += `📱 <b>Устройство:</b> ${deviceType}\n`;
      messageText += `💬 <b>Текст:</b>\n${message}\n\n`;

      if (files.length > 0) {
        messageText += `📎 <b>Файлы (${files.length}):</b>\n`;
        files.forEach((file, index) => {
          const sizeMB = (file.size / 1024 / 1024).toFixed(2);
          messageText += `${index + 1}. ${file.filename} (${sizeMB} MB)\n`;
        });
        
        await bot.telegram.sendMessage(OWNER_ID, messageText, { 
          parse_mode: 'HTML',
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
        await bot.telegram.sendMessage(OWNER_ID, messageText, { parse_mode: 'HTML' });
      }
      return true;
    } catch (error) {
      console.error('Feedback error:', error);
      return false;
    }
  }

  const getMainKeyboard = () => {
    return Markup.inlineKeyboard([
      [Markup.button.callback('🚂 Локомотивы', 'locomotives')],
      [Markup.button.url('🌐 Открыть портал', SITE_URL)],
      [Markup.button.callback('📞 Поддержка', 'support_request')]
    ]);
  };

  const sendMain = async (ctx) => {
    const userName = ctx.from.first_name || 'Путешественник';
    const text = `👋 <b>Приветствую, ${userName}!</b>\n\n` +
                 `Я — официальный бот <b>Демо-портала машиниста РЖД</b>.\n\n` +
                 `🚂 Здесь вы можете изучить технические характеристики современных и легендарных локомотивов.\n` +
                 `🌐 По кнопке ниже доступен полный функционал веб-портала.\n` +
                 `📞 Если у вас есть вопросы или предложения, напишите нам в поддержку.\n\n` +
                 `<b>Что будем делать?</b>`;

    const commonOptions = {
        caption: text,
        parse_mode: 'HTML',
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
    const menuText = `🛠 <b>Парк Локомотивов</b>\n\n` +
                     `В нашей базе представлены детальные характеристики подвижного состава.\n` +
                     `Нажмите на название серии, чтобы увидеть паспорт локомотива.\n\n` +
                     `<i>Выберите модель:</i>`;
    
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('⚡ ЧС2 "Чебурашка"', 'loco_chs2')],
      [Markup.button.callback('🔋 ВЛ80С', 'loco_vl80s')],
      [Markup.button.callback('🚂 2ТЭ25КМ "Витязь"', 'loco_2te25km')],
      [Markup.button.callback('🚄 ЭП20 "Олимп"', 'loco_ep20')],
      [Markup.button.callback('🔙 В главное меню', 'back_to_main')]
    ]);

    const commonOptions = {
        caption: menuText,
        parse_mode: 'HTML',
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
    const text = `🆘 <b>Центр помощи</b>\n\n` +
                 `Используйте кнопки ниже для быстрой навигации:`;
    
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🏠 Главное меню', 'back_to_main')],
      [Markup.button.callback('🚂 Список локомотивов', 'locomotives')],
      [Markup.button.callback('📞 Написать в поддержку', 'support_request')],
      [Markup.button.url('🌐 Перейти на сайт', SITE_URL)]
    ]);

    if (ctx.callbackQuery) {
        await ctx.editMessageCaption(text, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup })
            .catch(() => ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup }));
    } else {
        await ctx.reply(text, { parse_mode: 'HTML', reply_markup: keyboard.reply_markup });
    }
  };

  // --- ИЗМЕНЕННЫЙ ОБРАБОТЧИК bot.start для deep link и сохранения ID сообщения ---
  bot.start(async (ctx) => {
    const payload = ctx.startPayload;
    
    if (payload === 'admin_request') {
      supportWaitList.add(ctx.from.id);
      
      const text = `📞 <b>Служба поддержки</b>\n\n` +
                   `Вы перешли по ссылке "Написать админу". Напишите ваше сообщение (текст, фото или видео) прямо сейчас, и я перешлю его администратору.\n\n` +
                   `<i>Ожидаю вашего сообщения...</i>`;
                   
      const message = await ctx.reply(text, { 
          parse_mode: 'HTML',
          reply_markup: Markup.inlineKeyboard([
              [Markup.button.callback('❌ Отмена', 'back_to_main')]
          ]).reply_markup
      });
      
      // Сохраняем ID сообщения для последующего удаления
      supportPromptMap.set(ctx.from.id, message.message_id); 
      
    } else {
      await sendMain(ctx);
    }
  });
  // -----------------------------------------------------------------------------
  
  bot.command('help', sendHelp);

  // ИСПРАВЛЕНО: answerCbQuery перемещен в начало
  bot.action('back_to_main', async (ctx) => {
    await ctx.answerCbQuery(); // <--- ИСПРАВЛЕНО: ответ сразу
    supportWaitList.delete(ctx.from.id);
    // Удаляем сообщение, к которому привязана кнопка "Отмена"
    try { await ctx.deleteMessage(); } catch(e){} 
    await sendMain(ctx);
  });

  // ИСПРАВЛЕНО: answerCbQuery перемещен в начало
  bot.action('locomotives', async (ctx) => {
    await ctx.answerCbQuery(); // <--- ИСПРАВЛЕНО: ответ сразу
    supportWaitList.delete(ctx.from.id);
    await sendLocomotivesMenu(ctx);
  });

  // ИСПРАВЛЕНО: answerCbQuery перемещен в начало
  bot.action(/loco_([a-z0-9]+)/, async (ctx) => {
    await ctx.answerCbQuery(); // <--- ИСПРАВЛЕНО: ответ сразу
    const locoId = ctx.match[1];
    const loco = LOCOMOTIVES.find(l => l.id === locoId);
    if (!loco) return; // Убрали answerCbQuery, т.к. он уже в начале

    const locoText = formatLocomotiveInfo(loco);
    const keyboard = Markup.inlineKeyboard([
      [Markup.button.url('🌐 Подробнее на сайте', `${SITE_URL}#locomotives`)],
      [Markup.button.callback('🔙 К списку', 'locomotives')]
    ]);

    const commonOptions = {
      caption: locoText,
      parse_mode: 'HTML',
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
  });

  // --- ИЗМЕНЕННЫЙ ОБРАБОТЧИК support_request (исправлен таймаут) ---
  bot.action('support_request', async (ctx) => {
    await ctx.answerCbQuery(); // <--- ИСПРАВЛЕНО: ответ сразу
    
    supportWaitList.add(ctx.from.id);
    
    // Удаляем сообщение меню, с которого был вызван support_request
    try { await ctx.deleteMessage(); } catch(e){} 
    
    const text = `📞 <b>Служба поддержки</b>\n\n` +
                 `Напишите ваше сообщение (текст, фото или видео) прямо сейчас, и я перешлю его администратору.\n\n` +
                 `<i>Ожидаю вашего сообщения...</i>`;
                 
    const message = await ctx.reply(text, { 
        parse_mode: 'HTML',
        reply_markup: Markup.inlineKeyboard([
            [Markup.button.callback('❌ Отмена', 'back_to_main')]
        ]).reply_markup
    });
    
    // Сохраняем ID сообщения для последующего удаления
    supportPromptMap.set(ctx.from.id, message.message_id); 
    
  });
  // -----------------------------------------------------------------
  
  // --- НОВЫЕ ACTION'ы для удаления сообщения-подтверждения ---
  bot.action('back_to_main_and_delete', async (ctx) => {
    await ctx.answerCbQuery();
    try { await ctx.deleteMessage(); } catch(e){} // Удаляем сообщение-подтверждение
    await sendMain(ctx);
  });

  bot.action('support_request_and_delete', async (ctx) => {
    await ctx.answerCbQuery();
    try { await ctx.deleteMessage(); } catch(e){} // Удаляем сообщение-подтверждение
    await bot.action('support_request')(ctx); // Перезапускаем запрос поддержки
  });
  // -----------------------------------------------------------
  
  // --- НОВЫЙ ACTION для удаления сообщения с ответом админа ---
  // ИСПРАВЛЕНО: answerCbQuery перемещен в начало
  bot.action('back_to_main_and_delete_reply', async (ctx) => {
    await ctx.answerCbQuery(); // <--- ИСПРАВЛЕНО: ответ сразу
    
    const userId = ctx.from.id;
    const replyMessageId = supportPromptMap.get(`reply_${userId}`);
    
    if (replyMessageId) {
        try { 
            await bot.telegram.deleteMessage(userId, replyMessageId);
        } catch (e) {
            console.error('Failed to delete admin reply message:', e);
        }
        supportPromptMap.delete(`reply_${userId}`);
    } else {
        // Fallback: удаляем сообщение, к которому привязана кнопка
        try { await ctx.deleteMessage(); } catch(e){} 
    }
    
    await sendMain(ctx);
  });
  // ------------------------------------------------------------
  
  // --- ИЗМЕНЕННЫЙ ОБРАБОТЧИК bot.on('message') ---
  bot.on('message', async (ctx) => {
    const userId = ctx.from.id;
    const isOwner = userId.toString() === OWNER_ID;

    // --- Логика ответа владельца (админа) ---
    if (isOwner && ctx.message.reply_to_message) {
        const originalText = ctx.message.reply_to_message.text || ctx.message.reply_to_message.caption || '';
        const idMatch = originalText.match(/\[(\d+)\]/);
        
        if (idMatch && idMatch[1]) {
            const targetUserId = idMatch[1];
            try {
                await ctx.copyMessage(targetUserId);
                
                // Отправляем сообщение с ответом и кнопками
                const replyMessage = await bot.telegram.sendMessage(targetUserId, 
                    `👨‍💻 <b>Ответ от поддержки:</b>\n(см. сообщение выше)\n\n<i>Если хотите ответить, нажмите кнопку ниже:</i>`, 
                    {
                        parse_mode: 'HTML',
                        reply_markup: Markup.inlineKeyboard([
                            [Markup.button.callback('💬 Ответить в поддержку', 'support_request')],
                            // Добавляем новую кнопку для перехода в меню и удаления сообщения
                            [Markup.button.callback('🏠 В меню', 'back_to_main_and_delete_reply')] 
                        ]).reply_markup
                    }
                );
                
                // Сохраняем ID сообщения с ответом для последующего удаления
                supportPromptMap.set(`reply_${targetUserId}`, replyMessage.message_id); 
                
                await ctx.reply('✅ Ответ отправлен пользователю.');
            } catch (err) {
                console.error('Ошибка отправки ответа:', err);
                await ctx.reply('❌ Не удалось отправить ответ (пользователь заблокировал бота?).');
            }
        }
        return;
    }

    // --- Логика запроса поддержки от пользователя ---
    if (supportWaitList.has(userId)) {
        // 1. Удаляем предыдущее сообщение-запрос от бота
        const promptMessageId = supportPromptMap.get(userId);
        if (promptMessageId) {
            try { 
                await bot.telegram.deleteMessage(userId, promptMessageId);
            } catch (err) {
                console.error('Failed to delete prompt message:', err);
            }
            supportPromptMap.delete(userId);
        }
        
        const firstName = ctx.from.first_name || '';
        const lastName = ctx.from.last_name || '';
        const userName = ctx.from.username || 'нет_юзернейма';

        const userInfo = `📩 <b>#SupportRequest</b>\n` +
                         `👤 <b>От:</b> ${firstName} ${lastName}\n` +
                         `🆔 ID: [${userId}]\n` +
                         `🔗 @${userName}`;
        
        try {
            await bot.telegram.sendMessage(OWNER_ID, userInfo, { parse_mode: 'HTML' });
            
            await ctx.forwardMessage(OWNER_ID);

            // Отправляем сообщение-подтверждение с кнопками на новые action'ы для удаления
            await ctx.reply(`✅ <b>Сообщение отправлено!</b>\nОтвет придет в этот чат.`, {
                parse_mode: 'HTML',
                reply_markup: Markup.inlineKeyboard([
                    [Markup.button.callback('🏠 В меню', 'back_to_main_and_delete')],
                    [Markup.button.callback('💬 Написать ещё', 'support_request_and_delete')]
                ]).reply_markup
            });

            supportWaitList.delete(userId);

        } catch (err) {
            console.error('Ошибка пересылки:', err);
            await ctx.reply('❌ Ошибка отправки. Попробуйте позже.');
        }
    }
  });
  // -------------------------------------------------

  try {
    if (req.method === 'POST') {
      const contentType = req.headers['content-type'] || '';

      if (contentType.includes('multipart/form-data')) {
        const bb = Busboy({ 
            headers: req.headers,
            defParamCharset: 'utf8',
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
            const safeFilename = info.filename ? Buffer.from(info.filename, 'latin1').toString('utf8') : `mobile_upload_${Date.now()}.jpg`;
            
            file.on('data', (chunk) => chunks.push(chunk));
            file.on('end', () => {
              if (chunks.length === 0) return;
              const buffer = Buffer.concat(chunks);
              files.push({ filename: safeFilename, mimeType: info.mimeType, size: buffer.length });
              fileBuffers.push({ filename: safeFilename, buffer, mimeType: info.mimeType });
            });
          } else {
             file.resume();
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
