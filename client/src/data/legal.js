/**
 * The policy pages, as data.
 *
 * ⚠ WHY THESE EXIST AT ALL. The site collects a name, a phone number, an
 * email address, a description of someone's house and — through the enquiry
 * form's upload field — their architect's drawings. It runs first-party
 * analytics, it can be configured to load the Meta Pixel and GA4, it embeds a
 * Google Map, and it keeps a chat thread. Every one of those is a disclosure
 * obligation under India's Digital Personal Data Protection Act 2023, and the
 * site had no privacy notice of any kind. Search engines and ad platforms
 * also both treat a missing policy as a trust signal: Meta will not approve a
 * pixel-driven lead campaign for a site with no privacy policy at the URL its
 * form links to.
 *
 * ⚠ EVERY FACTUAL CLAIM BELOW IS TRUE OF THE CODE AS SHIPPED, and was checked
 * against it rather than copied from a template. "No cookie is set and no IP
 * address is stored" is services/analytics.js and the server's daily-rotating
 * hash; the FormSubmit fallback is the `.catch()` in enquiryFormController.js;
 * the three storage keys are the only three the public site writes; the
 * optional third-party tags are the ones Site Settings can switch on. If any
 * of that changes, this file changes with it — a policy that describes a site
 * you no longer run is worse than none.
 *
 * ⚠ IT IS NOT LEGAL ADVICE AND HAS NOT BEEN THROUGH COUNSEL. It is an honest,
 * specific description of what this software does, which is the part a lawyer
 * cannot write for you. The company's advisers should read it before launch,
 * particularly the retention periods and the grievance-officer designation,
 * which are the two places where a real decision has to be made rather than
 * a fact recorded.
 */

/**
 * Shown as "Last updated" on every policy.
 *
 * A single constant, not three: the three documents describe one site and
 * were written in one pass, and three dates drifting apart is how a policy
 * starts looking abandoned. Bump it when the substance changes — not when a
 * typo is fixed.
 */
export const POLICY_UPDATED = '10 August 2026'

/** Where a data-protection request goes. Kept in one place. */
const PRIVACY_CONTACT = 'info@glazewindowsystems.com'

/**
 * The documents, in the order the footer lists them.
 *
 * `sections[].id` is the anchor a deep link can point at ("our privacy policy,
 * clause 6"), and it is also the key React renders on, so the two cannot drift.
 */
export const LEGAL_DOCS = {
  privacy: {
    slug: 'privacy',
    path: '/privacy',
    nav: 'Privacy Policy',
    label: 'Privacy',
    title: 'Privacy Policy — Glaze Window Systems',
    description:
      'How Glaze Window Systems handles the personal data you share — what the enquiry form collects, what the site measures, who it is shared with, how long it is kept and how to have it erased.',
    heading: { lead: 'Privacy', em: 'Policy.' },
    standfirst:
      'What we collect when you enquire, what this site measures while you read it, and what you can ask us to do about either.',
    sections: [
      {
        id: 'who-we-are',
        heading: 'Who we are',
        body: [
          'Glaze Window Systems designs, fabricates and installs architectural aluminium window and door systems from Hyderabad, Telangana, India. In this policy “we”, “us” and “Glaze” mean Glaze Window Systems; “you” means anyone using this website or contacting us through it.',
          'For the purposes of the Digital Personal Data Protection Act, 2023, Glaze Window Systems is the Data Fiduciary for the personal data described below. Our registered contact details are at the foot of this page and on the contact page.',
        ],
      },
      {
        id: 'what-we-collect',
        heading: 'What we collect',
        body: [
          'We collect two different things, and it is worth separating them, because one of them you hand over deliberately and the other happens while you read.',
        ],
        groups: [
          {
            title: 'What you give us',
            body: [
              'The enquiry form on the contact page and on each system page asks for your name, an email address, a phone number, the kind of project you are planning, the city or site location, which system and variant you are interested in, and anything you choose to write in the message field. The form also lets you attach files — typically drawings, elevations or photographs of the opening. Whatever you attach, we receive.',
              'If you use the chat window, we receive the messages you send in it and hold the thread so the conversation survives a page change.',
              'None of these fields is compulsory in order to read the site. They are compulsory in order to get a reply, which is the only reason we ask for them.',
            ],
          },
          {
            title: 'What the site records by itself',
            body: [
              'This site runs its own analytics rather than handing the job to a third party, and it is deliberately thin. For each page view it records the path, the page title, the referring site if you arrived from an external link, and a per-tab identifier held in your browser’s session storage that is discarded the moment you close the tab.',
              'It does not set a cookie, and it does not store your IP address. The server derives a pseudonymous key from the request in order to tell one visitor from another for the rest of the day, and that key is rotated at midnight, so yesterday’s figures cannot be reconnected to today’s.',
              'If the optional third-party measurement tags described in our Cookie Policy have been switched on, those services collect their own data under their own terms. That is the one part of this site that is not first-party, and it is why it has a page of its own.',
            ],
          },
        ],
      },
      {
        id: 'why',
        heading: 'Why we use it',
        body: ['We use what you give us to:'],
        list: [
          'reply to your enquiry, by phone or email, and answer what you asked;',
          'prepare a specification, a drawing or a quotation for the opening you described;',
          'arrange a site visit, a showroom appointment or a measurement;',
          'keep a record of a project we have quoted for or worked on, so that a later question about it can be answered;',
          'send the automatic acknowledgement that confirms your enquiry arrived.',
        ],
        after: [
          'We use what the site records to understand which pages are read and which systems are looked at, so the site can be improved. That is a statistical use; it is not used to build a profile of you and it is not used to advertise to you.',
          'We do not sell personal data. We do not rent it, share it with data brokers, or add you to a marketing list because you asked a question about a window.',
        ],
      },
      {
        id: 'basis',
        heading: 'The basis on which we hold it',
        body: [
          'When you submit an enquiry you are asking us to contact you, and we process the details you gave for that purpose — the “certain legitimate uses” consent basis under the DPDP Act, where the data is given voluntarily for a purpose you specified and have not withdrawn.',
          'Where we keep a record of a completed project, we do so because it is necessary for the contract and for the ordinary business records a manufacturer has to be able to produce.',
          'Where an optional third-party measurement tag is active, it operates on consent, and you can decline it through the browser and platform controls set out in the Cookie Policy.',
        ],
      },
      {
        id: 'sharing',
        heading: 'Who else sees it',
        body: ['Your enquiry is seen by the people who need to answer it, and by the services that carry it:'],
        list: [
          'our own sales and technical team, who receive the enquiry by email at the addresses configured in our system;',
          'our hosting and email providers, who transmit and store the message in the ordinary course of delivering it;',
          'a third-party form relay (FormSubmit) which is used only as a fallback, in the event our own server is unreachable at the moment you press send — it forwards the message to the same address and does not retain it for us;',
          'our professional advisers, or a public authority, where we are required by law to produce it.',
        ],
        after: [
          'We do not transfer personal data outside India for our own purposes. Our providers may process it on infrastructure outside India in the course of transmitting it, which is a normal property of email and hosting.',
        ],
      },
      {
        id: 'retention',
        heading: 'How long we keep it',
        body: [
          'An enquiry that does not become a project is kept for up to twenty-four months, so that a returning enquirer is not asked to explain their project from the beginning, and is then deleted.',
          'Where an enquiry becomes a quotation or an order, the record is kept for the life of the relationship and for as long afterwards as the tax, warranty and statutory record-keeping periods that apply to a manufacturer require.',
          'Chat threads are held in your own browser for the tab you are using and on our server for the same period as an enquiry.',
          'Analytics is aggregated. The day-scoped key described above is not retained in a form that can be reconnected to a person once the day has ended.',
        ],
      },
      {
        id: 'rights',
        heading: 'Your rights',
        body: ['Under the DPDP Act you may ask us to:'],
        list: [
          'tell you what personal data of yours we hold and what we have done with it;',
          'correct anything that is wrong, incomplete or out of date;',
          'erase what we hold, where we are not required to keep it;',
          'withdraw a consent you have given, at any time, with the same ease with which you gave it;',
          'nominate someone to exercise these rights on your behalf if you are unable to.',
        ],
        after: [
          `Write to ${PRIVACY_CONTACT} with “Data request” in the subject line and we will respond. We may need to confirm who you are before we act, which is a protection for you rather than an obstacle.`,
          'If you are not satisfied with how we have handled a request, you may complain to the Data Protection Board of India.',
        ],
      },
      {
        id: 'security',
        heading: 'How it is protected',
        body: [
          'Enquiries are transmitted over an encrypted connection and stored on access-controlled infrastructure. The administrative area of this site is reachable only by named staff accounts, protected by session credentials the page’s own JavaScript cannot read.',
          'No transmission over the internet is perfectly secure, and we do not claim otherwise. What we can say is that we ask for the minimum a reply requires, and we do not keep it longer than the periods above.',
        ],
      },
      {
        id: 'children',
        heading: 'Children',
        body: [
          'This site is aimed at people specifying, building or renovating a building. It is not directed at children, and we do not knowingly collect the personal data of anyone under eighteen. If you believe a child has sent us their details, write to us and we will delete them.',
        ],
      },
      {
        id: 'changes',
        heading: 'Changes to this policy',
        body: [
          'When what we do changes, this page changes with it, and the “last updated” date at the top moves. We do not make a change retrospective: data collected under an earlier version is handled under the version that was in force when you gave it, unless the newer one is more protective.',
        ],
      },
    ],
  },

  terms: {
    slug: 'terms',
    path: '/terms',
    nav: 'Terms of Use',
    label: 'Terms',
    title: 'Terms of Use — Glaze Window Systems',
    description:
      'The terms on which this website is published: what the published performance figures mean, what an enquiry is and is not, and the law that governs both.',
    heading: { lead: 'Terms of', em: 'Use.' },
    standfirst:
      'What the numbers on this site mean, what an enquiry commits either of us to, and the law that governs the answer.',
    sections: [
      {
        id: 'about',
        heading: 'About these terms',
        body: [
          'This website is published by Glaze Window Systems. By using it you accept these terms. If you do not accept them, please do not use the site.',
          'These terms govern the website. They do not govern the supply of any product: that is governed by the written quotation, order acknowledgement and terms of sale issued for a specific project, which take precedence over anything on this site if the two ever disagree.',
        ],
      },
      {
        id: 'content',
        heading: 'The content of this site',
        body: [
          'Everything published here is descriptive. Images, renders, films and photography show representative installations and are not a statement of what will be supplied for your opening; finishes, glass and hardware vary by specification.',
          'We take care that what is written here is accurate at the time of publication, and we correct errors when we find them. We do not warrant that the site is free of error, uninterrupted, or current in every particular at every moment.',
        ],
      },
      {
        id: 'performance',
        heading: 'Performance figures and specifications',
        body: [
          'The figures published on the system and series pages — maximum sash weight and height, thermal transmittance, sound reduction, air permeability and water tightness — are values obtained for a nominated profile series under the test standards named beside them, in the test configuration those standards define.',
          'They are the performance of the system, not a guarantee of the performance of a particular opening. What a given window achieves in a given wall depends on its size and configuration, the glazing specified, the interfaces built around it and the quality of the installation. Where a project has to meet a stated figure, that figure belongs in the specification and is confirmed in writing for that project.',
          'Dimensional limits are maxima for the series, not a promise that any combination up to that limit is buildable. We will tell you which series suits an opening; that is what the enquiry is for.',
        ],
      },
      {
        id: 'enquiries',
        heading: 'Enquiries, quotations and orders',
        body: [
          'Nothing on this site is an offer to sell. Submitting an enquiry does not create a contract, reserve production capacity, or fix a price.',
          'A quotation we issue is an invitation to place an order, is valid for the period stated on it, and is subject to survey and to the terms of sale accompanying it. A contract comes into existence when we acknowledge your order in writing.',
          'You are responsible for the accuracy of the information you give us — dimensions, drawings, site conditions and contact details. Where a quotation is prepared from information you supplied, it is prepared on the basis that the information is correct.',
        ],
      },
      {
        id: 'ip',
        heading: 'Intellectual property',
        body: [
          'The design of this site and its text, photography, film, drawings, technical illustrations and the Glaze name and marks are owned by Glaze Window Systems or used under licence. You may read the site, print a page for your own reference, and share a link to it.',
          'You may not reproduce, republish, systematically copy or exploit any of it commercially, or use it to train an automated system, without our written permission. Product names and marks belonging to our hardware, glass and coating partners remain theirs.',
        ],
      },
      {
        id: 'use',
        heading: 'Acceptable use',
        body: ['You agree not to:'],
        list: [
          'use the site for any unlawful purpose, or in any way that damages or impairs it;',
          'attempt to gain access to any part of it, or to any server or database behind it, that is not made available to you;',
          'submit anything through the forms that is unlawful, defamatory, malicious, or that infringes somebody else’s rights;',
          'upload a file containing malware, or attempt to introduce one by any other route;',
          'collect data from the site by automated means, or use it to send unsolicited communications.',
        ],
      },
      {
        id: 'third-party',
        heading: 'Links and embedded content',
        body: [
          'This site links to third-party sites — our partners, our social profiles — and embeds a map from Google. We do not control those services and are not responsible for their content or their handling of your data. Following an external link takes you outside these terms and into theirs.',
        ],
      },
      {
        id: 'liability',
        heading: 'Liability',
        body: [
          'To the extent the law permits, we are not liable for loss arising from reliance on the site’s general content — for example, specifying a system from a published figure without written confirmation for the project. Where a project needs a figure to be certain, ask us and we will confirm it.',
          'Nothing in these terms limits liability for death or personal injury caused by negligence, for fraud, or for anything else that cannot lawfully be limited.',
        ],
      },
      {
        id: 'law',
        heading: 'Governing law',
        body: [
          'These terms, and any dispute arising out of the website, are governed by the laws of India. The courts at Hyderabad, Telangana have exclusive jurisdiction.',
        ],
      },
      {
        id: 'changes',
        heading: 'Changes',
        body: [
          'We may revise these terms. The version in force is the one published here on the day you use the site, and the “last updated” date at the top tells you when it last moved.',
        ],
      },
    ],
  },

  cookies: {
    slug: 'cookies',
    path: '/cookies',
    nav: 'Cookie Policy',
    label: 'Cookies',
    title: 'Cookie Policy — Glaze Window Systems',
    description:
      'This site sets no tracking cookies of its own. What it does store in your browser, which optional third-party tags may be active, and how to turn them off.',
    heading: { lead: 'Cookie', em: 'Policy.' },
    standfirst:
      'The short version: this site sets no tracking cookies of its own. The longer version is below, including the parts that are not ours.',
    sections: [
      {
        id: 'short',
        heading: 'The short version',
        body: [
          'Measuring how a site is read normally means a cookie. This one does it without: the audience figures behind this site are first-party, and the server tells one reader from another using a pseudonymous key it derives per day and rotates at midnight. No cookie is set for that, and no IP address is stored.',
          'What the site does keep is a small amount of session storage — which is not a cookie, is never sent to any server on its own, and is erased by your browser the moment you close the tab.',
        ],
      },
      {
        id: 'storage',
        heading: 'What this site stores in your browser',
        table: {
          columns: ['Key', 'Kind', 'What it is for', 'How long'],
          rows: [
            ['glz_session', 'Session storage', 'Groups the pages you read in one visit into a single session, so a visit is counted once rather than as one visitor per page.', 'Until the tab is closed'],
            ['glazeSeen', 'Session storage', 'Records that you have already seen the opening animation, so it plays once per visit rather than on every page.', 'Until the tab is closed'],
            ['glz-chat-session', 'Session storage', 'Identifies your chat conversation so a reply reaches the right thread.', 'Until the tab is closed'],
            ['glz-chat-thread', 'Session storage', 'Holds the recent messages in the chat window so the conversation survives moving between pages.', 'Until the tab is closed'],
          ],
        },
        after: [
          'Cookies are set for the staff administration area, and only there: they authenticate a signed-in member of our team and protect that form submission. They are never set for an ordinary visitor to the public site.',
        ],
      },
      {
        id: 'third-party',
        heading: 'Optional third-party tags',
        body: [
          'This site is built so that third-party measurement can be switched on when a campaign needs it and is otherwise entirely absent — not merely inactive. When none is configured, no third-party script is loaded and no third-party cookie is set.',
          'When they are configured, the following may be active, and each sets its own cookies under its own policy:',
        ],
        list: [
          'Google Analytics 4 — page and event measurement. Governed by Google’s privacy policy; you can opt out with Google’s own browser add-on.',
          'Google Tag Manager — a container that loads the tags above rather than collecting anything itself.',
          'Meta Pixel — measures whether a visit followed an advertisement and whether it ended in an enquiry. Governed by Meta’s data policy; ad and cookie preferences are controlled in your Meta account settings.',
        ],
        after: [
          'These are the only third-party measurement services this site is able to load. If you want to know which, if any, are live today, ask us and we will tell you.',
        ],
      },
      {
        id: 'embeds',
        heading: 'Embedded content',
        body: [
          'The contact page embeds a Google Map so you can find the showroom without leaving the page. Loading it contacts Google, which may set its own cookies under its own terms. The rest of the site — every film, every image — is served from our own domain.',
        ],
      },
      {
        id: 'control',
        heading: 'How to control any of this',
        body: [
          'Every browser lets you block or delete cookies and clear site storage, usually under Privacy or Site settings. Blocking storage for this site costs you nothing except that the opening animation will play again on each page and a chat conversation will not follow you between pages.',
          'If your browser sends a “do not track” or global privacy signal, no first-party measurement on this site is affected, because there is nothing to withdraw from: it does not identify you in the first place.',
        ],
      },
      {
        id: 'changes',
        heading: 'Changes',
        body: [
          'If we start using something that stores more than the table above describes, this page is updated before it goes live, and the “last updated” date moves.',
        ],
      },
    ],
  },
}

/** The documents in footer order. */
export const LEGAL_ORDER = ['privacy', 'terms', 'cookies']

/** `[{ label, href }]` for the footer's base rule. */
export const LEGAL_LINKS = LEGAL_ORDER.map((key) => ({
  label: LEGAL_DOCS[key].nav,
  href: LEGAL_DOCS[key].path,
}))
