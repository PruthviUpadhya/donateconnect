import nodemailer, { Transporter } from "nodemailer";
import { config } from "../config/env";

export interface SendOtpEmailParams {
  to: string;
  otp: string;
  expiresInMinutes?: number;
}

export class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initTransporter();
  }

  private initTransporter(): void {
    if (config.smtp.user && config.smtp.password) {
      this.transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.secure,
        auth: {
          user: config.smtp.user,
          pass: config.smtp.password,
        },
      });
      this.isConfigured = true;
    } else {
      this.transporter = null;
      this.isConfigured = false;
    }
  }

  public async sendOtpEmail({ to, otp, expiresInMinutes = 10 }: SendOtpEmailParams): Promise<{ success: boolean; deliveredVia: "smtp" | "console" }> {
    const fromAddress = config.smtp.from || config.smtp.user || "no-reply@donateconnect.org";

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

    // Production check: require real SMTP
    if (config.nodeEnv === "production" && !this.isConfigured) {
      throw new Error("SMTP credentials are not configured in production environment.");
    }

    // Automated test mode: Mock transport immediately without real SMTP overhead
    if (config.nodeEnv === "test") {
      return { success: true, deliveredVia: "smtp" };
    }

    if (this.isConfigured && this.transporter) {
      await this.transporter.sendMail({
        from: `"DonateConnect" <${fromAddress}>`,
        to,
        subject: `Your DonateConnect Verification Code: ${otp}`,
        text: `Your DonateConnect verification code is ${otp}. This code expires in ${expiresInMinutes} minutes. If you did not request this code, you can safely ignore this email.`,
        html: htmlContent,
      });
      return { success: true, deliveredVia: "smtp" };
    }

    // Development fallback: Log OTP to console when SMTP is not configured
    console.log("-------------------------------------------------------");
    console.log(`📨 [DEV EMAIL SERVICE] To: ${to}`);
    console.log(`🔑 Verification Code: ${otp} (expires in ${expiresInMinutes}m)`);
    console.log("-------------------------------------------------------");
    return { success: true, deliveredVia: "console" };
  }
}

export const emailService = new EmailService();
export default emailService;
