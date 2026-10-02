HASAN CHAMBERS WEBSITE: NOTES FOR THE DEVELOPER
================================================

What is in this folder
----------------------
index.html     The whole site: markup, styles and script in one file.
favicon.svg    Browser tab icon (the HC mark).
img/           The twelve pictures the site uses.

It is a static site with a small Cloudflare Worker for the enquiry form.
Cloudflare serves the files in this folder and routes /api/enquiry to
worker.js. There is no build step.

How the pages work
------------------
The six pages (Home, Expertise, People, Insights, Contact, Legal) are
sections of index.html, shown one at a time by the script at the bottom of
the file. Addresses use the part after the # sign:

  /#home  /#expertise  /#people  /#insights  /#contact  /#legal
  /#insights/<article-id>   opens one article

If separate addresses per page are wanted for search engines, each section
(<div id="view-...">) can be split into its own file.

Things that must be done before launch
--------------------------------------
1. EMAIL ADDRESS. The site shows hasanchambers@gmail.com in three places
   (Contact page, footer, Privacy Policy). Replace all three with the
   chambers' address on its own domain. Search for "hasanchambers@gmail.com".

2. ENQUIRY FORM. The form posts to /api/enquiry. Before deployment, create a
   Resend account, verify the sending domain, then set the three Worker
   secrets below. The provider key is held only by Cloudflare, never in this
   website or Git.

3. ARTICLES AND THE WRITING PAGE. The eight articles are stored inside
   index.html, in <div id="static-articles">, one <article> each with a
   data-id, data-topic, data-cat (subject label) and data-cover (picture).
   The script builds the Insights list, the article pages and the three
   cards on the home page from them.

   The site was drafted with a "Write Article" page for the owner (cover
   picture, title, text, save draft, publish). That page relied on a
   database provided by the tool the site was drafted in, and it does not
   work on an ordinary web host: the button stays hidden and /#write shows
   a notice. The owner wants this facility on the live site, so it needs a
   content system set up with the hosting. The script reads published
   articles in this shape, which a replacement can supply:

     { title, topic, cat, author, body (HTML), thumb, hasCover, publishedAt }

   Article text is passed through sanitize() in the script before display;
   only p, h4, ul, ol, li, b, i, a, blockquote and br are kept. Keep that
   step for anything that comes from a database.

Things to know
--------------
- Fonts: Jost (headings, menu, buttons) and Source Sans 3 (text) load from
  Google Fonts. The brand guide's typeface is LEMON MILK Pro FTR; the style
  sheet already names it first, so adding its web font files with an
  @font-face rule will switch the headings over.
- Colours: navy #232E62, gold #C2A06F, on white. Light theme only.
- WhatsApp: the floating button and the phone numbers open
  https://wa.me/8801301337744.
- "Get directions" opens a Google Maps search for the chambers' address.
- Search (the magnifier in the header) runs in the browser over a list in
  the script, plus the article titles.
- Legal wording: the Privacy Policy, Terms of Use, Legal Disclaimer, the
  article texts and the People page have been reviewed by the Head of
  Chambers. Please do not edit their wording without his approval.
- Pictures: the home banner (img/city.jpg) is a stand-in. A photograph of
  commercial Dhaka taken for the chambers is to replace it; use the same
  file name, about 2400 x 1350 pixels, black and white.
- Meta tags: the page title and description are set in the <head>. Add an
  og:image and the final domain's canonical address once the domain is live.

Deploying on Cloudflare Workers
-------------------------------
1. Install Node.js 20+ and log in once with: npx wrangler login
2. In this folder, set the production secrets (use the actual chambers email):

     npx wrangler secret put RESEND_API_KEY
     npx wrangler secret put ENQUIRY_TO
     npx wrangler secret put ENQUIRY_FROM

   ENQUIRY_FROM must use a domain verified in Resend, for example:
   Hasan Chambers <website@hasanchambers.com>. Do not use Gmail as the From
   address. For local testing, copy .dev.vars.example to .dev.vars and add
   real test values; .dev.vars is ignored by Git.
3. Preview locally: npx wrangler dev
4. Deploy: npx wrangler deploy
5. In Cloudflare Workers & Pages, add the final custom domain to this Worker.

The Worker validates form data, permits only same-origin browser requests and
keeps the Resend key private. Enable a Cloudflare WAF/rate-limiting rule for
POST /api/enquiry before launch to reduce form spam.
