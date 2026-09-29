import nodemailer from 'nodemailer';
import SystemSettings from '../models/SystemSettings.js';

const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

export const sendNotificationEmail = async ({ recipient, title, message, actionLink, notificationKey }) => {
  try {
    const settings = await SystemSettings.findOne().select('notifications').lean();
    if (settings?.notifications?.emailNotifications === false
      || (notificationKey && settings?.notifications?.notifyWhen?.[notificationKey] === false)
      || recipient?.notificationPreferences?.emailNotifications === false) {
      return { sent: false, reason: 'Email notifications are disabled.' };
    }

    const email = String(recipient?.email || '').trim();
    if (!email) return { sent: false, reason: 'Recipient email is missing.' };

    const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER } = process.env;
    const emailPassword = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;
    const port = Number(EMAIL_PORT || 465);
    if (!EMAIL_USER || !emailPassword || !port) {
      console.warn('Email notification skipped: configure EMAIL_USER and EMAIL_PASS in server/.env.');
      return { sent: false, reason: 'SMTP configuration is incomplete.' };
    }

    const auth = { user: EMAIL_USER, pass: emailPassword };
    const transportOptions = EMAIL_HOST
      ? { host: EMAIL_HOST, port, secure: process.env.EMAIL_SECURE === 'true' || port === 465, auth }
      : { service: process.env.EMAIL_SERVICE || 'gmail', auth };
    const transporter = nodemailer.createTransport(transportOptions);
    const appUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
    const link = actionLink ? new URL(actionLink, appUrl).toString() : '';
    const text = `${message}${link ? `\n\nOpen: ${link}` : ''}`;
    const html = `<p>${escapeHtml(message)}</p>${link ? `<p><a href="${escapeHtml(link)}">Open notification</a></p>` : ''}`;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || EMAIL_USER,
      to: email,
      subject: title,
      text,
      html,
    });
    return { sent: true };
  } catch (error) {
    console.error('Email notification delivery failed:', error.message);
    return { sent: false, reason: error.message };
  }
};