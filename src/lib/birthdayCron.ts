import cron from 'node-cron';
import PDFDocument from 'pdfkit';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';

export interface BirthdaySettings {
    mondayEmails: string;
    wednesdayEmails: string;
    mondayTelegramIds: string;
    wednesdayTelegramIds: string;
    botToken: string;
    appPassword: string;
}

let isInitialized = false;

const STATE_FILE = path.join(process.cwd(), 'last_sent_distributions.json');

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
    
    const kyivDate = new Date(year, month - 1, day, hour, minute);
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
                if (pdfPath) {
                    const formData = new FormData();
                    formData.append('chat_id', chatId);
                    const fileBuffer = fs.readFileSync(pdfPath);
                    const blob = new Blob([fileBuffer]);
                    formData.append('document', blob, 'Imenynnyky.pdf');
                    
                    await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
                        method: 'POST',
                        body: formData
                    });
                } else {
                    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
                    });
                }
            } catch (err) {
                console.error(`Telegram send error to ${chatId}:`, err);
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
        console.log("Running Monday Birthday Distribution...");
        const settings = getSettingsFn();
        const birthdays = getBirthdaysFn();
        if (birthdays.list.length === 0) {
            console.log("No birthdays this week, skipping Monday distribution.");
            return;
        }

        const UKR_DAYS = ["Нд", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
        let msg = `🎂 *ІМЕНИННИКИ ПОТОЧНОГО ТИЖНЯ* 🎂\n/ ${birthdays.weekRangeText} /\n\n`;
        
        birthdays.list.forEach((item: any) => {
            const dayName = UKR_DAYS[item.dayOfWeekNum];
            const dateFormatted = item.celebrationDate.split("-").reverse().join(".");
            const jubileeText = item.isJubilee ? `ювілей` : ``;
            msg += `${item.fullName} (${dayName}, ${dateFormatted}${jubileeText ? ' - ' + jubileeText : ''})\n`;
        });

        await sendTelegram(settings.mondayTelegramIds, msg, settings.botToken);
        await sendEmails(settings.mondayEmails, `Іменинники тижня (${birthdays.weekRangeText})`, msg, settings.appPassword);
        console.log("Monday Birthday Distribution completed.");
    };

    const runWednesdayDistribution = async () => {
        console.log("Running Wednesday Birthday Distribution...");
        const settings = getSettingsFn();
        const birthdays = getBirthdaysFn();
        if (birthdays.list.length === 0) {
            console.log("No birthdays this week, skipping Wednesday distribution.");
            return;
        }

        const pdfPath = path.join(process.cwd(), 'birthdays_temp.pdf');
        const doc = new PDFDocument({ size: 'A5', layout: 'portrait', margin: 40 });
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);

        const regularFont = path.join(process.cwd(), 'fonts', 'Roboto-Regular.ttf');
        const boldFont = path.join(process.cwd(), 'fonts', 'Roboto-Bold.ttf');
        
        if (fs.existsSync(regularFont) && fs.existsSync(boldFont)) {
            doc.font(boldFont).fontSize(14).text('ІМЕНИННИКИ ПОТОЧНОГО ТИЖНЯ', { align: 'center' });
            doc.moveDown(0.5);
            doc.font(regularFont).fontSize(10).text(`/ ${birthdays.weekRangeText} /`, { align: 'center' });
            doc.moveDown(2);

            birthdays.list.forEach((item: any) => {
                doc.font(boldFont).fontSize(12);
                if (item.isJubilee) {
                    doc.fillColor('red');
                } else {
                    doc.fillColor('black');
                }
                doc.text(item.shortName, { align: 'center' });
                doc.moveDown(0.5);
            });
        }
        
        doc.end();

        await new Promise<void>((resolve, reject) => {
            writeStream.on('finish', async () => {
                try {
                    let msg = `📄 Прикріплено файл ПДФ зі списком іменинників поточного тижня (${birthdays.weekRangeText}).`;
                    await sendTelegram(settings.wednesdayTelegramIds, msg, settings.botToken, pdfPath);
                    await sendEmails(settings.wednesdayEmails, `Іменинники тижня PDF (${birthdays.weekRangeText})`, msg, settings.appPassword, pdfPath);
                    if (fs.existsSync(pdfPath)) {
                        fs.unlinkSync(pdfPath);
                    }
                    console.log("Wednesday Birthday Distribution completed.");
                    resolve();
                } catch (err) {
                    console.error("Error in Wednesday writeStream finish handler:", err);
                    reject(err);
                }
            });
            writeStream.on('error', (err) => {
                console.error("WriteStream error:", err);
                reject(err);
            });
        });
    };

    const checkAndCatchUp = async () => {
        try {
            const nowKyiv = getKyivDateTime();
            
            let state: { lastMondaySent?: string; lastWednesdaySent?: string } = {};
            if (fs.existsSync(STATE_FILE)) {
                try {
                    state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
                } catch (e) {
                    console.error("Error parsing distribution state file:", e);
                }
            }

            console.log(`[Distribution Catch-Up Check] Kyiv date: ${nowKyiv.dateStr}, Kyiv hour: ${nowKyiv.hour}, Day of week: ${nowKyiv.dayOfWeek}`);

            // If Monday, >= 11:00 AM Kyiv, and we haven't sent Monday's report for this date yet
            if (nowKyiv.dayOfWeek === 1 && nowKyiv.hour >= 11) {
                if (state.lastMondaySent !== nowKyiv.dateStr) {
                    console.log(`[Distribution Catch-Up] Missed Monday distribution for ${nowKyiv.dateStr}. Sending now!`);
                    await runMondayDistribution();
                    state.lastMondaySent = nowKyiv.dateStr;
                    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
                }
            }

            // If Wednesday, >= 11:00 AM Kyiv, and we haven't sent Wednesday's report for this date yet
            if (nowKyiv.dayOfWeek === 3 && nowKyiv.hour >= 11) {
                if (state.lastWednesdaySent !== nowKyiv.dateStr) {
                    console.log(`[Distribution Catch-Up] Missed Wednesday distribution for ${nowKyiv.dateStr}. Sending now!`);
                    await runWednesdayDistribution();
                    state.lastWednesdaySent = nowKyiv.dateStr;
                    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
                }
            }
        } catch (err: any) {
            console.error("Error in checkAndCatchUp:", err.message);
        }
    };

    // Monday 11:00 Kyiv
    cron.schedule('0 11 * * 1', async () => {
        console.log("Running Monday Birthday Cron...");
        await runMondayDistribution();
        
        // Update state file to avoid dual triggers from catchup
        try {
            const nowKyiv = getKyivDateTime();
            let state: any = {};
            if (fs.existsSync(STATE_FILE)) {
                state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
            }
            state.lastMondaySent = nowKyiv.dateStr;
            fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
        } catch (e) {}
    }, {
        timezone: "Europe/Kyiv"
    });

    // Wednesday 11:00 Kyiv
    cron.schedule('0 11 * * 3', async () => {
        console.log("Running Wednesday Birthday Cron...");
        await runWednesdayDistribution();

        // Update state file to avoid dual triggers from catchup
        try {
            const nowKyiv = getKyivDateTime();
            let state: any = {};
            if (fs.existsSync(STATE_FILE)) {
                state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
            }
            state.lastWednesdaySent = nowKyiv.dateStr;
            fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
        } catch (e) {}
    }, {
        timezone: "Europe/Kyiv"
    });

    // Run catch-up immediately upon server startup / initialization
    setTimeout(() => {
        checkAndCatchUp();
    }, 5000);
}
