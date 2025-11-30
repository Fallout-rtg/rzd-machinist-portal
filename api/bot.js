const { URLSearchParams } = require('url');

const BOT_TOKEN = process.env.BOT_TOKEN;
const OWNER_ID = process.env.OWNER_ID;
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
        req.on('error', (err) => {
            reject(err);
        });
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
        const content = partBuffer.slice(headerEnd + 4); // +4 for \r\n\r\n

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

        startIndex = endIndex + boundaryDelimiter.length - 2; // -2 for \r\n
    }
    return parts;
}


async function sendTelegramMessage(text) {
    const telegramApi = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const params = {
        chat_id: OWNER_ID,
        text: text,
        parse_mode: 'Markdown',
    };

    const response = await fetch(telegramApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(params),
    });

    if (!response.ok) {
        throw new Error(`Failed to send text message: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

async function sendTelegramFile(filePart, fileIndex) {
    const telegramApi = `https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`;

    const formData = new FormData();
    formData.append('chat_id', OWNER_ID);
    
    const fileBlob = new Blob([filePart.data], { type: filePart.contentType });
    
    formData.append('document', fileBlob, filePart.filename || `file_${fileIndex}.${filePart.contentType.split('/')[1]}`);

    const response = await fetch(telegramApi, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        throw new Error(`Failed to send file ${filePart.filename}: ${response.status} ${response.statusText}`);
    }
    return response.json();
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        res.status(405).json({ success: false, message: 'Method Not Allowed' });
        return;
    }

    if (!BOT_TOKEN || !OWNER_ID) {
        res.status(500).json({ success: false, message: 'Server configuration error: BOT_TOKEN or OWNER_ID is missing.' });
        return;
    }

    try {
        const rawBody = await getRawBody(req);
        const contentType = req.headers['content-type'];
        
        const parts = parseMultipartData(rawBody, contentType);

        const fields = parts.filter(p => !p.filename);
        const files = parts.filter(p => p.filename);

        const email = fields.find(f => f.name === 'email')?.value || 'Не указан';
        const messageText = fields.find(f => f.name === 'message')?.value || 'Нет текста сообщения';

        let message = `*Новое сообщение с портала РЖД-Машиниста*\n\n`;
        message += `*E-mail:* \`${email}\`\n`;
        message += `*Сообщение:*\n${messageText}`;
        
        if (files.length > 0) {
            message += `\n\n_К этому сообщению приложено ${files.length} файл(ов). Они будут отправлены отдельными сообщениями._`;
        }

        await sendTelegramMessage(message);

        for (let i = 0; i < files.length; i++) {
            await sendTelegramFile(files[i], i + 1);
        }

        const confirmationMessage = `*Автоматическое подтверждение*\n\nВаше сообщение успешно получено! Мы свяжемся с вами в ближайшее время на почту: \`${email}\`.`;
        if (VERCEL_DOMAIN) {
             confirmationMessage += `\n\n[Перейти на портал](${VERCEL_DOMAIN})`;
        }
        
        await sendTelegramMessage(confirmationMessage);

        res.status(200).json({ success: true, message: 'Message and files sent successfully' });

    } catch (error) {
        console.error('Telegram API Error:', error.message);
        res.status(500).json({ success: false, message: 'Failed to process request due to internal error.', error: error.message });
    }
};
