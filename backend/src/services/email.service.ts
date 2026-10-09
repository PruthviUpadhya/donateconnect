import { config } from "../config/env";

export interface SendOtpEmailParams {
  to: string;
  otp: string;
  expiresInMinutes?: number;
}

export class EmailService {
  public async sendOtpEmail({
    to,
    otp,
    expiresInMinutes = 10,
  }: SendOtpEmailParams): Promise<{ success: boolean; deliveredVia: "brevo" | "console" | "smtp" }> {
    // Always log OTP to server console as an immediate, foolproof fallback
    console.log("-------------------------------------------------------");
    console.log(`📨 [OTP CODE] Recipient: ${to}`);
    console.log(`🔑 Verification Code: ${otp} (expires in ${expiresInMinutes}m)`);
    console.log("-------------------------------------------------------");

    // Automated test mode: Mock transport immediately
    if (config.nodeEnv === "test") {
      return { success: true, deliveredVia: "brevo" };
    }

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background-color: #030712; color: #f3f4f6; border-radius: 16px; border: 1px solid #1e293b;">
        <div style="margin-bottom: 24px; text-align: center;">
          <span style="font-size: 24px; font-weight: 800; background: linear-gradient(135deg, #6366f1 0%, #f43f5e 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">DonateConnect</span>
        </div>
        <h2 style="font-size: 20px; font-weight: 700; color: #ffffff; margin-bottom: 12px; text-align: center;">Verify Your Account</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #94a3b8; text-align: center; margin-bottom: 24px;">
          Use the 6-digit verification code below to complete your authentication. This OTP expires in <strong>${expiresInMinutes} minutes</strong>.
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #6366f1; background-color: #0f172a; padding: 14px 28px; border-radius: 12px; border: 1px solid #312e81;">
            ${otp}
          </span>
        </div>
        <p style="font-size: 12px; color: #64748b; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 20px; text-align: center;">
          If you did not request this verification code, you can safely ignore this email. Never share your OTP with anyone.
        </p>
      </div>
    `;

    // Try Brevo HTTPS REST API (Works seamlessly on Render Free Tier, sends to any recipient)
    if (config.brevoApiKey) {
      try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "accept": "application/json",
            "api-key": config.brevoApiKey,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            sender: {
              name: config.brevoSenderName,
              email: config.brevoSenderEmail,
            },
            to: [{ email: to }],
            subject: `Your DonateConnect Verification Code: ${otp}`,
            htmlContent,
          }),
        });

        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          console.log(`✅ [BREVO] Email successfully sent to ${to}:`, data);
          return { success: true, deliveredVia: "brevo" };
        } else {
          const errorText = await response.text();
          console.error(`⚠️ [BREVO ERROR] Status ${response.status}:`, errorText);
        }
      } catch (err: any) {
        console.error("⚠️ [BREVO EXCEPTION]:", err?.message || err);
      }
    } else {
      console.warn("⚠️ [EMAIL SERVICE] No BREVO_API_KEY configured. OTP logged to console only.");
    }

    return { success: true, deliveredVia: "console" };
  }
}

export const emailService = new EmailService();
export default emailService;
