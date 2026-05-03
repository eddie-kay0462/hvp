/**
 * Verifies Zoho SMTP from your laptop (same env as the app).
 *
 * Usage:
 *   node scripts/test-zoho-smtp.mjs you@gmail.com
 *
 * Requires in .env (see .env.example):
 *   ZOHO_SMTP_HOST, ZOHO_SMTP_PORT, ZOHO_SMTP_USER, ZOHO_SMTP_PASS
 *
 * If this script SUCCEEDS but Supabase still fails → fix Supabase dashboard
 * (re-save SMTP, match port 465+SSL vs 587+TLS, exact same password).
 * If this script FAILS → fix Zoho app password, host (.com vs .eu), or user.
 */
import "dotenv/config";
import nodemailer from "nodemailer";

const host = process.env.ZOHO_SMTP_HOST;
const port = Number(process.env.ZOHO_SMTP_PORT || 465);
const user = process.env.ZOHO_SMTP_USER;
const pass = process.env.ZOHO_SMTP_PASS;
const to = process.argv[2] || process.env.ZOHO_TEST_TO;

if (!host || !user || !pass) {
  console.error(
    "Missing env: ZOHO_SMTP_HOST, ZOHO_SMTP_USER, and/or ZOHO_SMTP_PASS"
  );
  process.exit(1);
}
if (!to) {
  console.error(
    "Usage: node scripts/test-zoho-smtp.mjs recipient@example.com\n" +
      "   or: ZOHO_TEST_TO=you@gmail.com npm run test:smtp"
  );
  process.exit(1);
}

const secure = port === 465;
const transporter = nodemailer.createTransport({
  host,
  port,
  secure,
  auth: { user, pass },
  ...(port === 587 ? { requireTLS: true } : {}),
});

try {
  console.log(`Connecting ${host}:${port} (secure=${secure}) as ${user}…`);
  await transporter.verify();
  console.log("verify: OK (server accepted credentials)");
  const info = await transporter.sendMail({
    from: `"HVP SMTP test" <${user}>`,
    to,
    subject: "HVP: Zoho SMTP test",
    text:
      "If you received this, Zoho SMTP works from your machine with these settings.\n" +
      "Copy the same host/port/user/password into Supabase Auth → SMTP.",
  });
  console.log("send:", info.messageId);
  console.log("\nDone. Check inbox (and spam) for:", to);
} catch (err) {
  console.error("\nSMTP failed:", err.message);
  if (err.code) console.error("code:", err.code);
  if (err.response) console.error("response:", err.response);
  console.error(
    "\nTry: EU host smtp.zoho.eu | app password for THIS mailbox | port 587 + requireTLS"
  );
  process.exit(1);
}
