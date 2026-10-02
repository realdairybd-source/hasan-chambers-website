/**
 * Cloudflare Worker for Hasan Chambers.
 * Static files are served through the ASSETS binding; this Worker handles
 * the enquiry form without exposing the email-provider key to the browser.
 */

const MAX_FIELD_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=UTF-8", "cache-control": "no-store" },
  });
}

function text(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[character]);
}

function emailIsValid(value) {
  // Deliberately conservative: delivery is ultimately verified by the mail provider.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/api/enquiry") return env.ASSETS.fetch(request);
    if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      return json({ error: "Invalid request." }, 415);
    }
    // Browsers send Origin on fetch requests. This prevents other sites from using this endpoint.
    const origin = request.headers.get("origin");
    if (origin && origin !== url.origin) return json({ error: "Invalid request origin." }, 403);

    let payload;
    try { payload = await request.json(); } catch { return json({ error: "Invalid request." }, 400); }

    const name = text(payload.name, MAX_FIELD_LENGTH);
    const email = text(payload.email, 254);
    const phone = text(payload.phone, MAX_FIELD_LENGTH);
    const subject = text(payload.subject, MAX_FIELD_LENGTH);
    const message = text(payload.message, MAX_MESSAGE_LENGTH);
    if (!name || !emailIsValid(email) || !message || payload.consent !== true) {
      return json({ error: "Please provide your name, a valid email address, a message and consent." }, 400);
    }
    if (!env.RESEND_API_KEY || !env.ENQUIRY_TO || !env.ENQUIRY_FROM) {
      console.error("Missing email configuration");
      return json({ error: "The enquiry service is not configured yet. Please contact chambers by phone." }, 503);
    }

    const title = subject ? `Website enquiry: ${subject}` : "Website enquiry";
    const html = `<h2>${escapeHtml(title)}</h2><p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Phone:</strong> ${escapeHtml(phone || "Not provided")}</p><p><strong>Message:</strong></p><p>${escapeHtml(message).replace(/\n/g, "<br>")}</p>`;
    const providerResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: env.ENQUIRY_FROM, to: [env.ENQUIRY_TO], reply_to: email, subject: title, html }),
    });
    if (!providerResponse.ok) {
      console.error("Email provider rejected enquiry", providerResponse.status);
      return json({ error: "We could not send your enquiry. Please try again or contact chambers by phone." }, 502);
    }
    return json({ ok: true });
  },
};
