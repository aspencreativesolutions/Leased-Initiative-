import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim();
    const message = String(body.message ?? "").trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "Name, email, and message are required." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const to = process.env.CONTACT_NOTIFICATION_EMAIL;
    const from = process.env.CONTACT_FROM_EMAIL ?? "onboarding@resend.dev";

    if (!resend || !to) {
      console.warn(
        "[contact] Missing RESEND_API_KEY or CONTACT_NOTIFICATION_EMAIL — form not sent."
      );
      return NextResponse.json(
        {
          error:
            "Contact form is not configured yet. Add your Resend API key and notification email to .env.local.",
        },
        { status: 503 }
      );
    }

    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `Willow Web Solutions — contact from ${name}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        "",
        "Message:",
        message,
      ].join("\n"),
    });

    if (error) {
      console.error("[contact] Resend error:", error);
      return NextResponse.json(
        { error: "Failed to send message. Please try again later." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[contact]", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
