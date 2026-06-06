import nodemailer from 'nodemailer';

const CS_EMAIL = 'takeaseat.cs@gmail.com';

export async function sendInquiryEmail(params: {name: string; email: string; content: string}): Promise<void> {
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (!smtpUser || !smtpPass) {
        console.warn('[inquiry] SMTP_USER / SMTP_PASS 환경변수 미설정 — 메일 발송 건너뜀');
        return;
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {user: smtpUser, pass: smtpPass},
    });

    const replyTo = params.email || undefined;

    await transporter.sendMail({
        from: `TAS 문의 <${smtpUser}>`,
        to: CS_EMAIL,
        replyTo,
        subject: `[TAS 문의] ${params.name}`,
        text: [
            `이름: ${params.name}`,
            `이메일: ${params.email || '(미입력)'}`,
            '',
            params.content,
        ].join('\n'),
    });
}
