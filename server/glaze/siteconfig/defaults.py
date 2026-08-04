"""The stock customer auto-reply, and the placeholder vocabulary it may use.

Table-based layout with inline styles, because that is what survives Outlook,
Gmail's clipper and every other mail client that strips <style> blocks. It
reads as dated HTML on purpose — modern CSS in an email is how you end up with
an unstyled wall of text in half your recipients' inboxes.

Placeholders are a fixed token list, substituted by a plain string replace in
mailer.py. NOT a Django template: this field is editable from the admin panel,
and running a template engine over admin-supplied text hands anyone who
reaches that form a way to walk the object graph through attribute access. A
literal replace over a known vocabulary cannot do anything but swap strings.

"Reset to Default" in the admin panel restores exactly what is below.
"""

# Tokens the admin may use in the subject or body. Anything else is left alone
# so an unrecognised {{token}} is visible in a test send rather than silently
# vanishing.
PLACEHOLDERS = {
    '{{name}}': 'Customer name as submitted',
    '{{email}}': 'Customer email address',
    '{{phone}}': 'Customer phone number',
    '{{system}}': 'System they enquired about (e.g. Sliding)',
    '{{message}}': 'The message they wrote',
    '{{site_name}}': 'Site name from Site Settings',
    '{{contact_email}}': 'Contact email from Site Settings',
    '{{contact_phone}}': 'Contact phone from Site Settings',
    '{{whatsapp_link}}': 'wa.me link built from the WhatsApp number',
    '{{year}}': 'Current year',
}

DEFAULT_AUTO_REPLY_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Thank You — Glaze Window Systems</title>
</head>
<body style="margin:0;padding:0;background:#F5F5F3;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F3;padding:40px 0;">
  <tr>
    <td align="center">

      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;overflow:hidden;box-shadow:0 2px 18px rgba(27,27,27,0.08);max-width:600px;width:100%;">

        <tr>
          <td style="background:#1B1B1B;padding:36px 40px;text-align:center;">
            <div style="font-size:26px;font-weight:300;color:#ffffff;letter-spacing:6px;text-transform:uppercase;">
              Glaze
            </div>
            <div style="font-family:'Courier New',monospace;font-size:10px;color:#A79A87;letter-spacing:3px;text-transform:uppercase;margin-top:10px;">
              Designed to Disappear
            </div>
          </td>
        </tr>

        <tr>
          <td style="background:#726655;height:2px;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <tr>
          <td style="padding:40px;">

            <h1 style="margin:0 0 14px;font-size:24px;font-weight:400;color:#1B1B1B;font-family:Georgia,'Times New Roman',serif;">
              Thank you, {{name}}.
            </h1>

            <p style="margin:0 0 26px;font-size:14px;color:#5A5A5A;line-height:1.8;">
              We have received your enquiry about the <strong style="color:#726655;">{{system}}</strong> system.
              One of our specialists will review it and come back to you within one working day.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F5F3;border-left:2px solid #726655;margin-bottom:28px;">
              <tr>
                <td style="padding:22px 24px;">
                  <div style="font-family:'Courier New',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#8A8A8A;margin-bottom:14px;">
                    Need us sooner?
                  </div>
                  <table cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding:5px 0;font-size:13px;color:#1B1B1B;">
                        <strong style="font-weight:600;">Call</strong>
                        &nbsp;<a href="tel:{{contact_phone}}" style="color:#726655;text-decoration:none;">{{contact_phone}}</a>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;font-size:13px;color:#1B1B1B;">
                        <strong style="font-weight:600;">Email</strong>
                        &nbsp;<a href="mailto:{{contact_email}}" style="color:#726655;text-decoration:none;">{{contact_email}}</a>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;font-size:13px;color:#1B1B1B;">
                        <strong style="font-weight:600;">WhatsApp</strong>
                        &nbsp;<a href="{{whatsapp_link}}" style="color:#726655;text-decoration:none;">Message our team</a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#1B1B1B;margin-bottom:28px;">
              <tr>
                <td style="padding:26px;text-align:center;">
                  <div style="font-size:22px;font-weight:300;color:#ffffff;letter-spacing:1px;">Aluminium since 1989</div>
                  <div style="font-size:12px;color:#A79A87;margin-top:8px;">
                    Sliding &nbsp;·&nbsp; Casement &nbsp;·&nbsp; Lift &amp; Slide &nbsp;·&nbsp; Bi-Fold &nbsp;·&nbsp; Pivot &nbsp;·&nbsp; Fixed
                  </div>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
              <tr>
                <td style="padding-bottom:12px;font-family:'Courier New',monospace;font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#8A8A8A;">
                  Why architects specify Glaze
                </td>
              </tr>
              <tr>
                <td style="font-size:13px;color:#3A3A3A;line-height:2;">
                  — Thermally broken aluminium profiles<br>
                  — Tested to 1200 Pa water tightness<br>
                  — Sightlines from 22 mm<br>
                  — German hardware, 25,000-cycle rated<br>
                  — In-house fabrication and installation
                </td>
              </tr>
            </table>

          </td>
        </tr>

        <tr>
          <td style="background:#1B1B1B;padding:28px 40px;text-align:center;">
            <div style="font-size:15px;font-weight:300;color:#ffffff;letter-spacing:4px;text-transform:uppercase;margin-bottom:10px;">
              {{site_name}}
            </div>
            <div style="font-size:12px;color:rgba(255,255,255,0.55);line-height:1.8;">
              Jubilee Hills, Hyderabad
            </div>
            <div style="margin-top:16px;font-size:12px;">
              <a href="tel:{{contact_phone}}" style="color:#A79A87;text-decoration:none;">{{contact_phone}}</a>
              &nbsp;&nbsp;|&nbsp;&nbsp;
              <a href="mailto:{{contact_email}}" style="color:#A79A87;text-decoration:none;">{{contact_email}}</a>
            </div>
            <div style="margin-top:18px;font-size:10px;color:rgba(255,255,255,0.28);">
              You received this email because you submitted an enquiry on our website. &copy; {{year}}
            </div>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>
</body>
</html>
"""
