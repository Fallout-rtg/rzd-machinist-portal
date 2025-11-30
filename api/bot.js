const { URLSearchParams } = require('url');

const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = process.env.OWNER_ID; 
const VERCEL_DOMAIN = process.env.VERCEL_DOMAIN;

const getRawBody = (req) => {
    return new Promise((resolve, reject) => {
        let body = [];
        req.on('data', (chunk) => {
            body.push(chunk);
        });
        req.on('end', () => {
            resolve(Buffer.concat(body));
        });
        req.on('error', reject);
    });
};

function parseMultipartData(buffer, contentType) {
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    if (!boundaryMatch) throw new Error("Boundary not found in Content-Type");

    const boundary = boundaryMatch[1] || boundaryMatch[2];
    const boundaryPrefix = Buffer.from(`--${boundary}\r\n`);
    const boundaryDelimiter = Buffer.from(`\r\n--${boundary}`);
    const parts = [];

    let startIndex = buffer.indexOf(boundaryPrefix);
    if (startIndex === -1) startIndex = 0;

    while (startIndex < buffer.length) {
        let endIndex = buffer.indexOf(boundaryDelimiter, startIndex + boundaryPrefix.length);
        if (endIndex === -1) break;

        let partBuffer = buffer.slice(startIndex + boundaryPrefix.length, endIndex);

        const headerEnd = partBuffer.indexOf(Buffer.from('\r\n\r\n'));
        if (headerEnd === -1) break;

        const headersText = partBuffer.slice(0, headerEnd).toString('utf8');
        const content = partBuffer.slice(headerEnd + 4); 

        const headers = headersText.split('\r\n').reduce((acc, line) => {
            const [key, value] = line.split(': ');
            if (key && value) acc[key.toLowerCase()] = value;
            return acc;
        }, {});

        const disposition = headers['content-disposition'];
        const nameMatch = disposition ? disposition.match(/name="([^"]+)"/i) : null;
        const filenameMatch = disposition ? disposition.match(/filename="([^"]+)"/i) : null;

        if (nameMatch) {
            const name = nameMatch[1];
            const filename = filenameMatch ? filenameMatch[1] : null;

            if (filename) {
                parts.push({
                    name: name,
                    filename: filename,
                    contentType: headers['content-type'],
                    data: content
                });
            } else {
                parts.push({
                    name: name,
                    value: content.toString('utf8').trim()
                });
            }
        }

        startIndex = endIndex + boundaryDelimiter.length - 2; 
    }
    return parts;
}

async function sendTelegramMessage(chatId, text, disablePreview = false) {
    const telegramApi = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const params = {
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
        disable_web_page_preview: disablePreview
    };

    const response = await fetch(telegramApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params),
    });

    if (!response.ok) {
        throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
    }
}

async function sendTelegramFile(filePart, fileIndex) {
    const telegramApi = `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`;
    const formData = new FormData();
    formData.append('chat_id', ADMIN_ID);
    
    const fileBlob = new Blob([filePart.data], { type: filePart.contentType });
    
    formData.append('document', fileBlob, filePart.filename || `file_${fileIndex}.${filePart.contentType.split('/')[1]}`);

    const response = await fetch(telegramApi, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`Failed to send file ${filePart.filename}: ${response.status} ${response.statusText}`);
    }
}


// --- Обработчик Webhook (Сообщения Боту) ---
async function handleWebhook(req, res) {
    const update = req.body;
    
    if (!update.message) {
        return res.status(200).send('No message update');
    }

    const chatId = update.message.chat.id.toString();
    const isAdmin = chatId === ADMIN_ID.toString();
    const userName = update.message.chat.first_name || 'Создатель';
    
    let responseText;

    if (isAdmin) {
        responseText = `*С возвращением, Повелитель Стальных Магистралей!* 👑\n\nПортал ожидает ваших команд. Все системы функционируют в штатном режиме.\n\n🔗 *Ваш ресурс доступен:* ${VERCEL_DOMAIN}`;
        await sendTelegramMessage(chatId, responseText, true); 
    } else {
        responseText = `Здравствуйте, ${userName}! 👋\n\nЯ — бот-помощник Портала машиниста. Наш ресурс посвящен современным и легендарным локомотивам РЖД, а также содержит информацию о том, как начать карьеру машиниста.\n\nПереходите по ссылке, чтобы узнать больше: ${VERCEL_DOMAIN}`;
        await sendTelegramMessage(chatId, responseText, false); 
    }

    res.status(200).send('OK');
}

// --- Обработчик Формы Обратной Связи ---
async function handleFeedback(req, res) {
    const rawBody = await getRawBody(req);
    const contentType = req.headers['content-type'];
    
    const parts = parseMultipartData(rawBody, contentType);

    const fields = parts.filter(p => !p.filename);
    const files = parts.filter(p => p.filename);

    const name = fields.find(f => f.name === 'name')?.value || 'Не указано';
    const email = fields.find(f => f.name === 'email')?.value || 'Не указан';
    const messageText = fields.find(f => f.name === 'message')?.value || 'Нет текста сообщения';

    let message = `*✉️ НОВАЯ ОБРАТНАЯ СВЯЗЬ С ПОРТАЛА* ✉️\n\n`;
    message += `*Отправитель:* \`${name}\`\n`;
    message += `*E-mail для ответа:* \`${email}\`\n`;
    message += `*Сообщение:*\n${messageText}`;
    
    if (files.length > 0) {
        message += `\n\n_К этому сообщению приложено ${files.length} файл(ов). Они будут отправлены отдельными сообщениями._`;
    }

    await sendTelegramMessage(ADMIN_ID, message); 

    for (let i = 0; i < files.length; i++) {
        await sendTelegramFile(files[i], i + 1);
    }

    res.status(200).json({ success: true, message: 'Сообщение успешно отправлено.' });
}


// --- Главный Обработчик ---

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    if (!BOT_TOKEN || !ADMIN_ID || !VERCEL_DOMAIN) {
        return res.status(500).json({ success: false, message: 'Configuration error.' });
    }

    try {
        // Проверяем, является ли запрос Webhook'ом от Telegram (наличие объекта message)
        if (req.body && req.body.message) {
            await handleWebhook(req, res);
        } else {
            // Если это не Webhook, считаем, что это POST-запрос с формы (Feedback)
            await handleFeedback(req, res);
        }

    } catch (error) {
        console.error('Unified API Error:', error.message);
        
        // Для Webhook запросов, всегда отвечаем 200, чтобы Telegram не переотправлял сообщение.
        // Для Form запросов, отвечаем 500.
        if (req.body && req.body.message) {
            res.status(200).send('Error processed');
        } else {
            res.status(500).json({ success: false, message: 'Internal Server Error', error: error.message });
        }
    }
};
