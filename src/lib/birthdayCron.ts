import cron from 'node-cron';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import axios from 'axios';
import FormData from 'form-data';

export interface BirthdaySettings {
    mondayEmails: string;
    wednesdayEmails: string;
    mondayTelegramIds: string;
    wednesdayTelegramIds: string;
    botToken: string;
    appPassword: string;
    mondayMailingDay?: number | string;
    mondayMailingHour?: number | string;
    mondayMailingMinute?: number | string;
    wednesdayMailingDay?: number | string;
    wednesdayMailingHour?: number | string;
    wednesdayMailingMinute?: number | string;
}

let isInitialized = false;

const STATE_FILE = path.join(os.tmpdir(), 'last_sent_distributions.json');

const getKyivDateTime = () => {
    const d = new Date();
    // Use a formatter that gives us exactly what we need
    const options: Intl.DateTimeFormatOptions = {
        timeZone: 'Europe/Kyiv',
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
    };

    const formatter = new Intl.DateTimeFormat('en-US', options);
    const parts = formatter.formatToParts(d);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || "";
    
    const year = parseInt(getPart('year'), 10);
    const month = parseInt(getPart('month'), 10);
    const day = parseInt(getPart('day'), 10);
    const hour = parseInt(getPart('hour'), 10);
    const minute = parseInt(getPart('minute'), 10);
    
    // For day of week, it's safer to use a specific formatter part if possible, 
    // or just calculate it correctly from the parts.
    // In 'en-US' with weekday: 'short', we get "Sun", "Mon", etc.
    const dayOfWeekStr = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Kyiv', weekday: 'short' }).format(d);
    const dayMap: Record<string, number> = { 'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6 };
    const dayOfWeek = dayMap[dayOfWeekStr] ?? 0;
    
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    
    return {
        dateStr,
        dayOfWeek,
        hour,
        minute
    };
};

export function initBirthdayCron(getBirthdaysFn: () => any, getSettingsFn: () => BirthdaySettings) {
    if (isInitialized) {
        console.log("[BirthdayCron] Already initialized, skipping.");
        return;
    }
    isInitialized = true;
    console.log("Initializing Birthday Cron Jobs (Europe/Kyiv)...");

    const sendTelegram = async (chatIds: string, text: string, botToken: string, filePath?: string) => {
        if (!botToken) {
            console.warn("[BirthdayCron] No bot token provided for Telegram.");
            return;
        }
        const ids = chatIds.split(',').map(id => id.trim()).filter(Boolean);
        if (ids.length === 0) {
            console.warn("[BirthdayCron] No Telegram chat IDs provided.");
            return;
        }

        for (const chatId of ids) {
            try {
                if (filePath && fs.existsSync(filePath)) {
                    console.log(`[BirthdayCron] Sending file to Telegram chat ${chatId}: ${filePath}`);
                    const fileBuffer = fs.readFileSync(filePath);
                    const filename = path.basename(filePath);
                    const formData = new FormData();
                    formData.append('chat_id', chatId);
                    formData.append('caption', text);
                    formData.append('document', fileBuffer, { filename });
                    
                    const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendDocument`, formData, {
                        headers: formData.getHeaders()
                    });
                    if (response.data.ok) {
                        console.log(`[BirthdayCron] File ${filename} sent successfully to Telegram chat ${chatId}`);
                    } else {
                        console.error(`[BirthdayCron] Telegram sendDocument failed for ${chatId}:`, response.data);
                    }
                } else {
                    console.log(`[BirthdayCron] Sending text message to ${chatId}`);
                    await axios.post(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                        chat_id: chatId,
                        text: text,
                        parse_mode: 'Markdown'
                    });
                }
            } catch (err: any) {
                console.error(`[BirthdayCron] Telegram send error to ${chatId}:`, err.response?.data || err.message);
            }
        }
    };

    const sendEmails = async (emails: string, subject: string, text: string, appPassword: string, attachments?: { filename: string, path: string }[]) => {
        if (!appPassword || !emails) return;
        const mailList = emails.split(',').map(e => e.trim()).filter(Boolean);
        if (mailList.length === 0) return;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'kostel.if.ua@gmail.com',
                pass: appPassword
            }
        });

        const mailOptions: any = {
            from: '"База 777" <kostel.if.ua@gmail.com>',
            to: mailList,
            subject: subject,
            text: text
        };

        if (attachments && attachments.length > 0) {
            mailOptions.attachments = attachments;
        }

        try {
            await transporter.sendMail(mailOptions);
            console.log(`Emails sent to ${mailList.join(', ')}`);
        } catch (err) {
            console.error('Email send error:', err);
        }
    };

    const runMondayDistribution = async () => {
        console.log("Running Distribution 1 (Text)...");
        const settings = getSettingsFn();
        const birthdays = getBirthdaysFn();
        if (birthdays.list.length === 0) {
            console.log("No birthdays this week, skipping distribution 1.");
            return;
        }

        const UKR_DAYS = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
        let msg = `🎂 *ІМЕНИННИКИ ПОТОЧНОГО ТИЖНЯ* 🎂\n/ ${birthdays.weekRangeText} /\n\n`;
        
        birthdays.list.forEach((item: any) => {
            const dayName = UKR_DAYS[item.dayOfWeekNum];
            const dateFormatted = item.celebrationDate.split("-").reverse().join(".");
            const jubileeText = item.isJubilee ? `ювілей` : ``;
            msg += `${item.cleanName || item.fullName} (${dayName}, ${dateFormatted}${jubileeText ? ' - ' + jubileeText : ''})\n`;
        });

        await sendTelegram(settings.mondayTelegramIds, msg, settings.botToken);
        await sendEmails(settings.mondayEmails, `Іменинники тижня (${birthdays.weekRangeText})`, msg, settings.appPassword);
        console.log("Distribution 1 completed.");
    };

    const runWednesdayDistribution = async () => {
        console.log("[BirthdayCron] Running Distribution 2 (PDF & HTML)...");
        const settings = getSettingsFn();
        const birthdays = getBirthdaysFn();
        if (!birthdays || !birthdays.list || birthdays.list.length === 0) {
            console.log("[BirthdayCron] No birthdays this week, skipping distribution 2.");
            return;
        }

        const nowTs = Date.now();
        const pdfPath = path.join(os.tmpdir(), `birthdays_${nowTs}.pdf`);
        const htmlPath = path.join(os.tmpdir(), `birthdays_${nowTs}.html`);
        
        console.log(`[BirthdayCron] Generating files: ${pdfPath}, ${htmlPath}`);

        // --- HTML Generation ---
        const UKR_DAYS = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
        let htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
                h1 { text-align: center; color: #000; font-size: 24px; margin-bottom: 5px; }
                .subtitle { text-align: center; font-size: 16px; color: #666; margin-bottom: 30px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                th { background-color: #f2f2f2; font-weight: bold; }
                .jubilee { color: #e74c3c; font-weight: bold; }
                .day-col { width: 60px; text-align: center; }
                .date-col { width: 100px; text-align: center; }
            </style>
        </head>
        <body>
            <h1>ІМЕНИННИКИ ПОТОЧНОГО ТИЖНЯ</h1>
            <div class="subtitle">/ ${birthdays.weekRangeText} /</div>
            <table>
                <thead>
                    <tr>
                        <th class="day-col">День</th>
                        <th class="date-col">Дата</th>
                        <th>ПІБ / Ім'я</th>
                    </tr>
                </thead>
                <tbody>
        `;

        birthdays.list.forEach((item: any) => {
            const dayName = UKR_DAYS[item.dayOfWeekNum];
            const dateFormatted = item.celebrationDate.split("-").reverse().join(".");
            const jubileeClass = item.isJubilee ? 'class="jubilee"' : '';
            htmlContent += `
                <tr ${jubileeClass}>
                    <td class="day-col">${dayName}</td>
                    <td class="date-col">${dateFormatted}</td>
                    <td>${item.cleanName || item.fullName} ${item.isJubilee ? '(Ювілей!)' : ''}</td>
                </tr>
            `;
        });

        htmlContent += `
                </tbody>
            </table>
            <p style="margin-top: 30px; font-size: 12px; color: #999; text-align: center;">Згенеровано автоматично системою "База 777"</p>
        </body>
        </html>
        `;
        fs.writeFileSync(htmlPath, htmlContent);

        // --- PDF Generation ---
        const doc = new PDFDocument({ size: 'A5', layout: 'portrait', margin: 40 });
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);

        const regularFontPath = path.resolve(process.cwd(), 'fonts', 'Roboto-Regular.ttf');
        const boldFontPath = path.resolve(process.cwd(), 'fonts', 'Roboto-Bold.ttf');
        
        try {
            if (fs.existsSync(regularFontPath) && fs.existsSync(boldFontPath)) {
                doc.registerFont('Roboto-Regular', regularFontPath);
                doc.registerFont('Roboto-Bold', boldFontPath);

                doc.font('Roboto-Bold').fontSize(14);
                doc.text('ІМЕНИННИКИ ПОТОЧНОГО ТИЖНЯ', { align: 'center' });
                doc.moveDown(0.5);
                
                doc.font('Roboto-Regular').fontSize(10);
                doc.text(`/ ${birthdays.weekRangeText} /`, { align: 'center' });
                doc.moveDown(2);

                birthdays.list.forEach((item: any) => {
                    doc.font('Roboto-Bold').fontSize(12);
                    if (item.isJubilee) {
                        doc.fillColor('red');
                    } else {
                        doc.fillColor('black');
                    }
                    const dayName = UKR_DAYS[item.dayOfWeekNum];
                    const nameText = `${dayName}: ${String(item.cleanName || item.fullName || item.shortName)}`;
                    doc.text(nameText, { align: 'center' });
                    doc.moveDown(0.5);
                });
            } else {
                console.warn("[BirthdayCron] Fonts not found, creating PDF with default font.");
                doc.fontSize(14).text('ІМЕНИННИКИ ПОТОЧНОГО ТИЖНЯ', { align: 'center' });
                doc.moveDown();
                birthdays.list.forEach((item: any) => {
                    doc.fontSize(12).text(String(item.cleanName || item.fullName || "Невідомо"), { align: 'center' });
                });
            }
            doc.end();
            console.log("[BirthdayCron] doc.end() called.");
        } catch (pdfErr) {
            console.error("[BirthdayCron] Error during PDF drawing:", pdfErr);
            doc.end();
        }

        await new Promise<void>((resolve, reject) => {
            writeStream.on('finish', async () => {
                console.log(`[BirthdayCron] writeStream finished: ${pdfPath}`);
                try {
                    const attachments = [];
                    if (fs.existsSync(pdfPath)) {
                        const stats = fs.statSync(pdfPath);
                        if (stats.size > 0) {
                            attachments.push({ filename: 'Imenynnyky.pdf', path: pdfPath });
                        } else {
                            console.warn("[BirthdayCron] Generated PDF is empty (0 bytes)!");
                        }
                    }
                    if (fs.existsSync(htmlPath)) {
                        attachments.push({ filename: 'Imenynnyky.html', path: htmlPath });
                    }

                    let msg = `📄 Прикріплено список іменинників (${birthdays.weekRangeText}) у форматах ПДФ та HTML (для друку).`;
                    
                    console.log("[BirthdayCron] Sending Telegram (Distribution 2)...");
                    // Send PDF if exists, otherwise text
                    const telegramFilePath = attachments.find(a => a.filename === 'Imenynnyky.pdf')?.path;
                    await sendTelegram(settings.wednesdayTelegramIds, msg, settings.botToken, telegramFilePath);
                    
                    // Also send HTML to Telegram if PDF is missing or just as an alternative? 
                    // Telegram doesn't support multiple documents in one sendDocument call easily without loops
                    if (!telegramFilePath && fs.existsSync(htmlPath)) {
                        await sendTelegram(settings.wednesdayTelegramIds, "Альтернативний формат (HTML) для друку:", settings.botToken, htmlPath);
                    }

                    console.log("[BirthdayCron] Sending Emails (Distribution 2)...");
                    await sendEmails(settings.wednesdayEmails, `Іменинники тижня (${birthdays.weekRangeText})`, msg, settings.appPassword, attachments);
                    
                    // Cleanup
                    if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
                    if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
                    
                    console.log("[BirthdayCron] Distribution 2 completed successfully.");
                    resolve();
                } catch (err) {
                    console.error("[BirthdayCron] Error in distribution 2 writeStream finish handler:", err);
                    reject(err);
                }
            });
            writeStream.on('error', (err) => {
                console.error("[BirthdayCron] WriteStream error:", err);
                reject(err);
            });
        });
    };

    // Check every minute for scheduled distributions
    cron.schedule('* * * * *', async () => {
        try {
            const now = getKyivDateTime();
            const settings = getSettingsFn();
            
            // Log every hour to show we're alive
            if (now.minute === 0) {
                console.log(`[BirthdayCron] Heartbeat (Kyiv time): ${now.dateStr} ${now.hour}:${now.minute}, Day: ${now.dayOfWeek}`);
            }

            const mondayDay = settings.mondayMailingDay !== undefined ? Number(settings.mondayMailingDay) : 1;
            const mondayHour = settings.mondayMailingHour !== undefined ? Number(settings.mondayMailingHour) : 11;
            const mondayMinute = settings.mondayMailingMinute !== undefined ? Number(settings.mondayMailingMinute) : 0;

            const wedDay = settings.wednesdayMailingDay !== undefined ? Number(settings.wednesdayMailingDay) : 3;
            const wedHour = settings.wednesdayMailingHour !== undefined ? Number(settings.wednesdayMailingHour) : 11;
            const wedMinute = settings.wednesdayMailingMinute !== undefined ? Number(settings.wednesdayMailingMinute) : 0;

            let state: any = {};
            if (fs.existsSync(STATE_FILE)) {
                try {
                    state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
                } catch (e) {
                    console.error("[BirthdayCron] Error reading state file:", e);
                }
            }

            // Distribution 1
            if (now.dayOfWeek === mondayDay && now.hour === mondayHour && now.minute === mondayMinute) {
                if (state.lastMondaySent !== now.dateStr) {
                    console.log(`[BirthdayCron] Triggering Monday Distribution 1 (Day=${now.dayOfWeek}, Time=${now.hour}:${now.minute})`);
                    await runMondayDistribution();
                    state.lastMondaySent = now.dateStr;
                    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
                }
            }

            // Distribution 2
            if (now.dayOfWeek === wedDay && now.hour === wedHour && now.minute === wedMinute) {
                if (state.lastWednesdaySent !== now.dateStr) {
                    console.log(`[BirthdayCron] Triggering Wednesday Distribution 2 (Day=${now.dayOfWeek}, Time=${now.hour}:${now.minute})`);
                    await runWednesdayDistribution();
                    state.lastWednesdaySent = now.dateStr;
                    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
                }
            }
        } catch (globalErr) {
            console.error("[BirthdayCron] Global error in cron tick:", globalErr);
        }
    }, {
        timezone: "Europe/Kyiv"
    });
}
