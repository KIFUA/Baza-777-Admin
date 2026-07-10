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

function generateBirthdayPDF(doc: any, birthdays: any, regularFont: string, boldFont: string) {
  const hasFonts = fs.existsSync(regularFont) && fs.existsSync(boldFont);

  // Helper to draw borders on a page
  const drawPageBorders = (pdfDoc: any) => {
    pdfDoc.rect(15, 15, 390, 565).lineWidth(1.5).stroke('#224853');
    pdfDoc.rect(18, 18, 384, 559).lineWidth(0.5).stroke('#1a3843');
  };

  // Draw borders for the first page
  drawPageBorders(doc);

  // Draw borders on any subsequent page automatically
  doc.on('pageAdded', () => {
    drawPageBorders(doc);
  });

  // Header
  doc.y = 35;
  if (hasFonts) doc.font(boldFont);
  doc.fontSize(14).fillColor('#0e2128').text('ІМЕНИННИКИ ЦЬОГО ТИЖНЯ', { align: 'center' });
  doc.moveDown(0.2);
  
  if (hasFonts) doc.font(regularFont);
  doc.fontSize(9).fillColor('#50707c').text(`Період: ${birthdays.weekRangeText}`, { align: 'center' });
  doc.moveDown(0.8);

  // Separator line
  doc.moveTo(35, doc.y).lineTo(385, doc.y).lineWidth(0.5).stroke('#224853');
  doc.moveDown(1.2);

  const daysOrder = [1, 2, 3, 4, 5, 6, 0];
  const daysUkr = ["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"];

  const hasAnyBirthdays = birthdays && birthdays.list && birthdays.list.length > 0;
  
  if (!hasAnyBirthdays) {
    if (hasFonts) doc.font(regularFont);
    doc.fontSize(11).fillColor('#809090').text('На цьому тижні немає іменинників.', { align: 'center' });
  } else {
    daysOrder.forEach((dayNum) => {
      const dayBirthdays = birthdays.list.filter((b: any) => b.dayOfWeekNum === dayNum);
      if (dayBirthdays.length === 0) return;

      // Check space before printing a day group
      if (doc.y > 500) {
        doc.addPage();
        doc.y = 40; // reset y
      }

      // We can draw a subtle divider line before each new day group (except if it's the start of a page)
      if (doc.y > 110) {
        doc.moveTo(35, doc.y).lineTo(385, doc.y).lineWidth(0.2).stroke('#cfd8dc');
        doc.moveDown(0.5);
      }

      const startY = doc.y;

      // Draw left column (Day Name and Date)
      const dateFormatted = dayBirthdays[0].celebrationDate.split("-").reverse().slice(0, 2).join(".");
      if (hasFonts) doc.font(boldFont);
      doc.fontSize(11).fillColor('#1a3843');
      doc.text(`${daysUkr[dayNum]}\n(${dateFormatted})`, 35, startY, { width: 100, align: 'left' });

      // Draw right column (List of people on this day)
      let currentY = startY;
      dayBirthdays.forEach((item: any) => {
        // Check page break for individual person
        if (currentY > 520) {
          doc.addPage();
          currentY = 40;
        }

        if (hasFonts) doc.font(boldFont);
        doc.fontSize(11);
        if (item.isJubilee) {
          doc.fillColor('#c62828'); // deep red for jubilee
        } else {
          doc.fillColor('#0e2128');
        }
        
        // Print Name
        const nameText = item.fullName || item.shortName;
        const jubileeSuffix = item.isJubilee ? ` (ювілей! 🎂 ${item.age} р.)` : ` (${item.age} р.)`;
        doc.text(`${nameText}${jubileeSuffix}`, 145, currentY, { width: 240, align: 'left' });
        currentY = doc.y + 2;

        // Print Details: Phone & Rayon & Presbyter
        if (hasFonts) doc.font(regularFont);
        doc.fontSize(9).fillColor('#50707c');
        const detailsParts = [];
        if (item.tel_mob) detailsParts.push(`📞 ${item.tel_mob}`);
        if (item.rayon2_ukr) detailsParts.push(`📍 ${item.rayon2_ukr}`);
        if (item.presviter) detailsParts.push(`⛪ ${item.presviter}`);
        
        if (detailsParts.length > 0) {
          doc.text(detailsParts.join('  •  '), 145, currentY, { width: 240, align: 'left' });
          currentY = doc.y + 6;
        } else {
          currentY += 4;
        }
      });

      // Set y to the end of the day group
      doc.y = currentY + 4;
    });
  }
}

export function initBirthdayCron(getBirthdaysFn: () => any, getSettingsFn: () => BirthdaySettings) {
    console.log("Initializing Birthday Cron Jobs...");

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
                user: 'kostel.if.ua@gmail.com', // fallback hardcoded for now or use what's provided? Let's use env or standard.
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

    // Monday 11:00
    cron.schedule('0 11 * * 1', async () => {
        console.log("Running Monday Birthday Cron...");
        const settings = getSettingsFn();
        const birthdays = getBirthdaysFn();
        if (birthdays.list.length === 0) return;

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
    });

    // Wednesday 11:00
    cron.schedule('0 11 * * 3', async () => {
        console.log("Running Wednesday Birthday Cron...");
        const settings = getSettingsFn();
        const birthdays = getBirthdaysFn();
        if (birthdays.list.length === 0) return;

        const pdfPath = path.join(process.cwd(), 'birthdays_temp.pdf');
        const doc = new PDFDocument({ size: 'A5', layout: 'portrait', margin: 30 });
        const writeStream = fs.createWriteStream(pdfPath);
        doc.pipe(writeStream);

        const regularFont = path.join(process.cwd(), 'fonts', 'Roboto-Regular.ttf');
        const boldFont = path.join(process.cwd(), 'fonts', 'Roboto-Bold.ttf');
        
        generateBirthdayPDF(doc, birthdays, regularFont, boldFont);
        
        doc.end();

        writeStream.on('finish', async () => {
            let msg = `📄 Прикріплено файл ПДФ зі списком іменинників поточного тижня (${birthdays.weekRangeText}).`;
            await sendTelegram(settings.wednesdayTelegramIds, msg, settings.botToken, pdfPath);
            await sendEmails(settings.wednesdayEmails, `Іменинники тижня PDF (${birthdays.weekRangeText})`, msg, settings.appPassword, pdfPath);
            fs.unlinkSync(pdfPath); // Cleanup
        });
    });
}
