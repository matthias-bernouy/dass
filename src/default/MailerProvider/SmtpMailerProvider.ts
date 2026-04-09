import type { Be5_MailMessage, IBe5_Mailer } from "../../interfaces/MailerInterface";

export type SmtpMailerConfig = {
    host: string;
    port: number;
    secure?: boolean;
    auth?: {
        user: string;
        pass: string;
    };
    defaultFrom: string;
};

/**
 * SMTP-backed mailer built on top of nodemailer.
 *
 * Nodemailer is imported dynamically so that consumers who only use the
 * ConsoleMailerProvider don't pay the cost of pulling it in.
 */
export class SmtpMailerProvider implements IBe5_Mailer {

    private readonly config: SmtpMailerConfig;
    private _transporter: any | null = null;

    constructor(config: SmtpMailerConfig) {
        this.config = config;
    }

    private async transporter(): Promise<any> {
        if (this._transporter) return this._transporter;
        const nodemailer = await import("nodemailer");
        const createTransport = (nodemailer as any).createTransport ?? (nodemailer as any).default?.createTransport;
        if (!createTransport) {
            throw new Error("SmtpMailerProvider: failed to load nodemailer.createTransport");
        }
        this._transporter = createTransport({
            host: this.config.host,
            port: this.config.port,
            secure: this.config.secure ?? false,
            auth: this.config.auth,
        });
        return this._transporter;
    }

    async send(message: Be5_MailMessage): Promise<void> {
        const t = await this.transporter();
        await t.sendMail({
            from: message.from ?? this.config.defaultFrom,
            to: message.to,
            subject: message.subject,
            html: message.html,
            text: message.text,
        });
    }
}
