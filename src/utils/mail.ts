import Mailgen, { type Content } from "mailgen";
import nodemailer from "nodemailer";

const sendEmail = async (options: {
  mailgenContent: Content;
  email: string;
  subject: string;
}) => {
  const mailGenerator = new Mailgen({
    theme: "default",
    product: {
      name: process.env.PROJECT_NAME ?? "Project Management App",
      link: process.env.FRONTEND_URL ?? "http://localhost:3000",
    },
  });
  const emailTextualContent = mailGenerator.generatePlaintext(
    options.mailgenContent,
  );
  const emailHtmlContent = mailGenerator.generate(options.mailgenContent);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? process.env.MAILTRAP_SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? process.env.MAILTRAP_SMTP_PORT ?? "587", 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER ?? process.env.MAILTRAP_SMTP_USER,
      pass: process.env.SMTP_PASS ?? process.env.MAILTRAP_SMTP_PASS,
    },
  });

  const mail = {
    from: process.env.SMTP_FROM ?? "mail.projectManagement@example.com",
    to: options.email,
    subject: options.subject,
    text: emailTextualContent,
    html: emailHtmlContent,
  };
  try {
    await transport.sendMail(mail);
  } catch (error) {
    console.error("error: ", error);
  }
};

const emailVerificationMailgenContent = (
  username: string,
  verificationLink: string,
) => {
  return {
    body: {
      name: username,
      intro:
        "Welcome to Project Management App! We're very excited to have you on board.",
      action: {
        instructions:
          "To get started with Project Management App, please click here:",
        button: {
          color: "#22BC66",
          text: "Verify your email",
          link: verificationLink,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

const resetPasswordMailgenContent = (
  username: string,
  resetPasswordLink: string,
) => {
  return {
    body: {
      name: username,
      intro:
        "You have requested to reset your password for Project Management App.",
      action: {
        instructions: "To reset your password, please click here:",
        button: {
          color: "#22BC66",
          text: "Reset your password email",
          link: resetPasswordLink,
        },
      },
      outro:
        "Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

const workspaceInvitationMailgenContent = (
  username: string,
  workspaceName: string,
  invitationLink: string,
  role: string,
) => {
  return {
    body: {
      name: username,
      intro: `You have been invited to join ${workspaceName} on Project Management App as a ${role}.`,
      action: {
        instructions: "To view the workspace invitation, please click here:",
        button: {
          color: "#22BC66",
          text: "Open workspace invitation",
          link: invitationLink,
        },
      },
      outro:
        "This invitation will expire in 24 hours. Need help, or have questions? Just reply to this email, we'd love to help.",
    },
  };
};

export {
  emailVerificationMailgenContent,
  resetPasswordMailgenContent,
  workspaceInvitationMailgenContent,
  sendEmail,
};
