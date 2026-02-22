const nodemailer = require('nodemailer');

function getBoolEnv(name, fallback = false) {
  const v = process.env[name];
  if (typeof v === 'undefined') return fallback;
  return String(v).toLowerCase() === 'true' || String(v) === '1';
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = getBoolEnv('SMTP_SECURE', port === 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;

  return { host, port, secure, user, pass, from };
}

function hasSmtpConfig() {
  const { host, user, pass, from } = getSmtpConfig();
  return Boolean(host && user && pass && from);
}

function getTransporter() {
  const { host, port, secure, user, pass } = getSmtpConfig();
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

async function sendEmail({ to, subject, text, html }) {
  const { from } = getSmtpConfig();
  const transporter = getTransporter();
  return await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

module.exports = {
  getSmtpConfig,
  hasSmtpConfig,
  sendEmail,
};

