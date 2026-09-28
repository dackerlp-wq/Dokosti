# České šablony e-mailů Supabase Auth

Supabase posílá e-maily pro registraci, přihlášení odkazem a obnovu hesla z vlastních šablon, které jsou
ve výchozím stavu anglicky. Tyto soubory se vkládají ručně do Supabase: **Authentication → Emails → Templates**.
U každé šablony nastavte předmět (Subject) a do těla (Body, Source) vložte celý obsah souboru.

| Šablona v Supabase   | Soubor                     | Předmět                      |
| -------------------- | -------------------------- | ---------------------------- |
| Confirm sign up      | `potvrzeni-registrace.html` | Potvrďte svůj e-mail         |
| Magic Link           | `prihlaseni-odkazem.html`   | Přihlášení do DoKosti        |
| Reset Password       | `obnova-hesla.html`         | Nastavení nového hesla       |
| Change Email Address | `zmena-emailu.html`         | Potvrďte změnu e-mailu       |
| Invite user          | `pozvanka.html`             | Pozvánka do DoKosti          |

Odkaz v šablonách vede na `{{ .SiteURL }}/auth/callback?token_hash=…&type=…&redirect_to={{ .RedirectTo }}`.
Stránka `/auth/callback` ověří `token_hash` přímo (RPC `verifyOtp`), takže odkaz funguje i v jiném prohlížeči
nebo na telefonu, a z `redirect_to` si vezme, kam zákazníka poslat (`next`). Výchozí odkaz Supabase
(`{{ .ConfirmationURL }}`) používá PKCE a funguje jen v prohlížeči, kde se o odkaz požádalo; callback ho umí
také, ale šablony ho nepoužívají.

Související nastavení v Supabase:

- **Authentication → URL Configuration**: Site URL `https://dokosti.cz`, Redirect URLs
  `https://dokosti.cz/auth/callback` a `https://dokosti.vercel.app/auth/callback`.
- **Authentication → Emails → SMTP Settings**: vlastní SMTP přes Resend (host `smtp.resend.com`, port 465,
  uživatel `resend`, heslo = API klíč, odesílatel `objednavky@dokosti.cz`), jinak platí limit pár e-mailů za hodinu.
- **Authentication → Rate Limits**: „Rate limit for sending emails“ zvednout, např. na 30 za hodinu.
