import nodemailer from 'nodemailer';
import SystemSettings from '../models/SystemSettings.js';

const escapeHtml = (value) => String(value || '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[character]));

const createEmailTransporter = () => {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER } = process.env;
  const emailPassword = process.env.EMAIL_PASS || process.env.EMAIL_PASSWORD;
  const port = Number(EMAIL_PORT || 465);
  if (!EMAIL_USER || !emailPassword || !port) {
    throw new Error('SMTP configuration is incomplete.');
  }

  const auth = { user: EMAIL_USER, pass: emailPassword };
  const transportOptions = EMAIL_HOST
    ? { host: EMAIL_HOST, port, secure: process.env.EMAIL_SECURE === 'true' || port === 465, auth }
    : { service: process.env.EMAIL_SERVICE || 'gmail', auth };
  return nodemailer.createTransport(transportOptions);
};

export const sendNotificationEmail = async ({ recipient, title, message, actionLink, notificationKey }) => {
  if (process.env.EMAIL_NOTIFICATIONS_ENABLED !== 'true') {
    return { sent: false, reason: 'Email notifications are disabled.' };
  }

  try {
    const settings = await SystemSettings.findOne().select('notifications').lean();
    const propertyEmailPreferences = recipient?.propertySettings?.emailPreferences;
    if (settings?.notifications?.emailNotifications === false
      || (notificationKey && settings?.notifications?.notifyWhen?.[notificationKey] === false)
      || recipient?.notificationPreferences?.emailNotifications === false
      || propertyEmailPreferences?.emailNotifications === false
      || propertyEmailPreferences?.systemNotificationEmail === false
      || (notificationKey && propertyEmailPreferences?.[notificationKey] === false)) {
      return { sent: false, reason: 'Email notifications are disabled.' };
    }

    const email = String(recipient?.email || '').trim();
    if (!email) return { sent: false, reason: 'Recipient email is missing.' };

    const transporter = createEmailTransporter();
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

export const sendPasswordResetEmail = async ({ recipient, actionLink }) => {
  const { EMAIL_USER } = process.env;
  const transporter = createEmailTransporter();
  const greeting = `Hello${recipient?.name ? ` ${recipient.name}` : ''},`;
  const instructions = 'Use the link below to reset your Bahir Dar University account password. This link expires in one hour.';
  const message = `${greeting}\n\n${instructions}\n\n${actionLink}\n\nIf you did not request a password reset, you can ignore this email.`;
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || EMAIL_USER,
    to: recipient.email,
    subject: 'Reset your BDU account password',
    text: message,
    html: `<p>${escapeHtml(greeting)}</p><p>${escapeHtml(instructions)}</p><p><a href="${escapeHtml(actionLink)}">Reset your password</a></p><p>If you did not request a password reset, you can ignore this email.</p>`,
  });
};

export const sendCredentialsEmail = async ({ recipient, sender, username, password }) => {
  const transporter = createEmailTransporter();
  const greeting = `Hello${recipient?.name ? ` ${recipient.name}` : ''},`;
  const instructions = 'Your Bahir Dar University Clearance Management System account is ready. Sign in with the credentials below, then change your password immediately.';
  const loginUrl = new URL('/login', process.env.APP_BASE_URL || 'http://localhost:5173').toString();
  const senderName = String(sender?.name || 'Bahir Dar University HR').trim();
  const senderEmail = String(sender?.email || '').trim().toLowerCase();
  if (!senderEmail) throw new Error('The authenticated HR officer does not have a registered email address.');
  const message = `${greeting}\n\n${instructions}\n\nUsername: ${username}\nTemporary password: ${password}\n\nSign in and change your password: ${loginUrl}\n\nIf you did not expect this email, please contact your administrator.`;
  await transporter.sendMail({
    from: { name: senderName, address: senderEmail },
    replyTo: { name: senderName, address: senderEmail },
    to: recipient.email,
    subject: 'Your BDU account login credentials',
    text: message,
    html: `<div style="font-family:Arial,sans-serif;color:#1e293b;line-height:1.6;max-width:600px;margin:0 auto"><h2 style="color:#1d4ed8">Your BDU account is ready</h2><p>${escapeHtml(greeting)}</p><p>${escapeHtml(instructions)}</p><table style="border-collapse:collapse;width:100%;margin:20px 0"><tr><th style="text-align:left;padding:10px;border:1px solid #e2e8f0;background:#f8fafc">Username</th><td style="padding:10px;border:1px solid #e2e8f0">${escapeHtml(username)}</td></tr><tr><th style="text-align:left;padding:10px;border:1px solid #e2e8f0;background:#f8fafc">Temporary password</th><td style="padding:10px;border:1px solid #e2e8f0;font-family:monospace">${escapeHtml(password)}</td></tr></table><p style="color:#b45309"><strong>For your security, change this password immediately after signing in.</strong></p><p><a href="${escapeHtml(loginUrl)}" style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 16px;border-radius:4px;text-decoration:none">Sign in and change password</a></p><p>If you did not expect this email, please contact your administrator.</p><p style="color:#64748b">Sent by ${escapeHtml(senderName)} (${escapeHtml(senderEmail)})</p></div>`,
  });
};