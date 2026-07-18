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
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Europe/Kyiv',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    
    const parts = formatter.formatToParts(d);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || "";
    
    const year = parseInt(getPart('year'), 10);
    const month = parseInt(getPart('month'), 10);
    const day = parseInt(getPart('day'), 10);
    const hour = parseInt(getPart('hour'), 10);
    const minute = parseInt(getPart('minute'), 10);
    
    // Create date object in Kyiv time
    const kyivDate = new Date(year, month - 1, day, hour, minute);
    
    // Calculate day of week manually
    const dayOfWeek = kyivDate.getDay(); // 0 is Sunday, 1 is Monday ... 6 is Saturday
    
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
        return;
    }
    isInitialized = true;
    console.log("Initializing Birthday Cron Jobs (Europe/Kyiv)...");

    const sendTelegram = async (chatIds: string, text: string, botToken: string, pdfPath?: string) => {
        if (!botToken) return;
        const ids = chatIds.split(',').map(id => id.trim()).filter(Boolean);
        for (const chatId of ids) {
            try {
                if (pdfPath && fs.existsSync(pdfPath)) {
                    console.log(`[BirthdayCron] Sending PDF to Telegram chat ${chatId}: ${pdfPath}`);
                    const fileBuffer = fs.readFileSync(pdfPath);
                    const formData = new FormData();
                    formData.append('chat_id', chatId);
                    formData.append('caption', text);
                    formData.append('document', fileBuffer, { filename: 'Imenynnyky.pdf' });
                    
                    const response = await axios.post(`https://api.telegram.org/bot${botToken}/sendDocument`, formData, {
                        headers: formData.getHeaders()
                    });
                    if (response.data.ok) {
                        console.log(`[BirthdayCron] PDF sent successfully to Telegram chat ${chatId}`);
                    } else {
                        console.error(`[BirthdayCron] Telegram sendDocument failed:`, response.data);
                    }
                } else {
                    console.log(`[BirthdayCron] No PDF found or provided, sending text message to ${chatId}`);
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

    const sendEmails = async (emails: string, subject: string, text: string, appPassword: string, pdfPath?: string) => {
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

        if (pdfPath) {
            mailOptions.attachments = [{
                filename: 'Imenynnyky.pdf',
                path: pdfPath
            }];
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
        console.log("Running Distribution 2 (PDF)...");
        const settings = getSettingsFn();
        const birthdays = getBirthdaysFn();
        if (birthdays.list.length === 0) {
            console.log("No birthdays this week, skipping distribution 2.");
            return;
        }

        const pdfPath = path.resolve(process.cwd(), `birthdays_${Date.now()}.pdf`);
        console.log(`[BirthdayCron] Starting PDF generation: ${pdfPath}`);
        const doc = new PDFDocument({ size: 'A5', layout: 'portrait', margin: 40 });
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);

        const regularFontPath = path.resolve(process.cwd(), 'fonts', 'Roboto-Regular.ttf');
        const boldFontPath = path.resolve(process.cwd(), 'fonts', 'Roboto-Bold.ttf');
        
        try {
            if (fs.existsSync(regularFontPath) && fs.existsSync(boldFontPath)) {
                console.log("[BirthdayCron] Using custom fonts for PDF.");
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
                    const nameText = String(item.cleanName || item.fullName || item.shortName || "Невідоме ім'я");
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
                    if (fs.existsSync(pdfPath)) {
                        const stats = fs.statSync(pdfPath);
                        console.log(`[BirthdayCron] PDF file size: ${stats.size} bytes`);
                    } else {
                        console.error(`[BirthdayCron] PDF file DOES NOT EXIST after finish!`);
                    }

                    let msg = `📄 Прикріплено файл ПДФ зі списком іменинників поточного тижня (${birthdays.weekRangeText}).`;
                    console.log("[BirthdayCron] Sending Telegram (Distribution 2)...");
                    await sendTelegram(settings.wednesdayTelegramIds, msg, settings.botToken, pdfPath);
                    
                    console.log("[BirthdayCron] Sending Emails (Distribution 2)...");
                    await sendEmails(settings.wednesdayEmails, `Іменинники тижня PDF (${birthdays.weekRangeText})`, msg, settings.appPassword, pdfPath);
                    
                    if (fs.existsSync(pdfPath)) {
                        console.log(`[BirthdayCron] Unlinking temp PDF: ${pdfPath}`);
                        fs.unlinkSync(pdfPath);
                    }
                    console.log("Distribution 2 completed.");
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
        const now = getKyivDateTime();
        const settings = getSettingsFn();
        
        const mondayDay = settings.mondayMailingDay !== undefined ? Number(settings.mondayMailingDay) : 1;
        const mondayHour = settings.mondayMailingHour !== undefined ? Number(settings.mondayMailingHour) : 11;
        const mondayMinute = settings.mondayMailingMinute !== undefined ? Number(settings.mondayMailingMinute) : 0;

        const wedDay = settings.wednesdayMailingDay !== undefined ? Number(settings.wednesdayMailingDay) : 3;
        const wedHour = settings.wednesdayMailingHour !== undefined ? Number(settings.wednesdayMailingHour) : 11;
        const wedMinute = settings.wednesdayMailingMinute !== undefined ? Number(settings.wednesdayMailingMinute) : 0;

        // Skip log spam every minute, but we could log if we wanted
        // console.log(`Cron check (Kyiv): Day=${now.dayOfWeek}, Time=${now.hour}:${now.minute}`);

        let state: any = {};
        if (fs.existsSync(STATE_FILE)) {
            try {
                state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
            } catch (e) {}
        }

        // Distribution 1
        if (now.dayOfWeek === mondayDay && now.hour === mondayHour && now.minute === mondayMinute) {
            if (state.lastMondaySent !== now.dateStr) {
                await runMondayDistribution();
                state.lastMondaySent = now.dateStr;
                fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
            }
        }

        // Distribution 2
        if (now.dayOfWeek === wedDay && now.hour === wedHour && now.minute === wedMinute) {
            if (state.lastWednesdaySent !== now.dateStr) {
                await runWednesdayDistribution();
                state.lastWednesdaySent = now.dateStr;
                fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
            }
        }
    }, {
        timezone: "Europe/Kyiv"
    });
}
