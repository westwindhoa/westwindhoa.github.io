# Westwind HOA Website: Handoff and Maintenance Notes

Everything the board needs to run westwindhoa.net, in one place. Last updated November 8, 2026.

**This repository is public.** Anyone can read this file on github.com, even though it isn't published on the website itself (GitHub Pages skips files whose names start with an underscore). Never put passwords, recovery codes, phone numbers for account recovery or other private details in this file or anywhere in this repository. Keep those in the board's private records.

---

## 1. What runs the site

| Piece | Where it lives | Who manages it |
|---|---|---|
| Website files | GitHub organization `westwindhoa`, repository `westwindhoa.github.io`, branch `main`, folder `/ (root)` | Board members who are Owners of the GitHub organization |
| Hosting | GitHub Pages (free), deploys automatically on every commit | GitHub |
| Domain name | `westwindhoa.net`, registered at Squarespace | Chad |
| DNS records | Squarespace (see section 4) | Chad |
| HTTPS certificate | Let's Encrypt, requested and renewed automatically by GitHub Pages | GitHub (see section 5) |
| Online forms | Google Apps Script web app "Westwind Website Forms" in the HOA Google account | Board (see section 6) |
| Form log and uploads | Google Sheet "Westwind Website Forms Log" and a Google Drive upload folder, both owned by the HOA Google account | Board (see section 6) |
| Board inbox | westwindhomeownersassoc@gmail.com | Board |

The site is plain HTML: 23 pages plus `style.css` (all styling), `script.js` (menus, PDF viewer, next-meeting date) and `forms.js` (sends the four forms to Apps Script). There is no database and nothing to install.

### Accounts the board must keep access to

Record the following in the board's private records, not here:

- GitHub: which board members are Owners of the `westwindhoa` organization, and their two-factor sign-in recovery codes. Keep at least two Owners at all times.
- HOA Google account (westwindhomeownersassoc@gmail.com): password, the recovery phone number and recovery email, and which device holds the account's passkey. Google asks for the passkey, a phone prompt or a code during sensitive steps like authorizing Apps Script. Without one of those, the account can lock the board out.
- Squarespace: who holds the login for the domain, and that auto-renew is on with a working payment card.

---

## 2. Updating the site

You update the site by uploading files through the GitHub website. No software is needed.

### Upload changed files

1. Go to github.com/westwindhoa/westwindhoa.github.io.
2. Click **Add file > Upload files**.
3. Drag in the changed files. If you have a zip of the site, unzip it, open the folder inside and drag in the files that are *inside* the folder, not the folder itself. Dragging the folder creates a new subfolder in the repo, and the live site doesn't change.
4. Check the upload list. Names should look like `index.html` or `images/logo-icon.png`, with no extra folder name in front.
5. Type a short commit message describing the change and click **Commit changes**.
6. Click the **Actions** tab. A yellow dot means publishing is in progress. A green check means the change is live, usually within one or two minutes.
7. Open westwindhoa.net and press **Cmd + Shift + R** (Mac) or **Ctrl + Shift + R** (Windows) to load the fresh version.

### How uploads behave

- A file with the same name in the same folder **replaces** the old one.
- A file with a new name is **added**.
- Files you don't upload are **left alone**. Uploading never deletes anything.
- Uploading an identical file changes nothing, so uploading the whole site is safe.
- Every commit is saved in the history, so any old version can be recovered.

### Edit one small thing directly on GitHub

For a typo or a one-word fix: click the file, click the **pencil icon**, make the change, click **Commit changes**, and commit to `main`.

**Caution:** an upload replaces the whole file. If someone edits a file directly on GitHub and someone else later uploads an older copy of that file, the edit is lost. Before working on files offline, download a fresh copy with **Code > Download ZIP**.

### Delete a file

Uploads never delete. Click the file, click **...** at the top right, click **Delete file**, then **Commit changes**. **Never delete `CNAME`** (see section 4).

### Get an old version back

Click the file, click **History**, open the commit from before the change, click **...** > **View file**, then **Raw**. Save that page and upload it again with the same name.

### A canceled run in the Actions tab

If two uploads happen within a minute or two, GitHub cancels the older publishing run and only finishes the newer one. A gray circle with an exclamation point on an older run is normal.

---

## 3. Common content changes

### Home page announcements (`index.html`)

Announcements sit right under the welcome section. The **Next board meeting** box at the top fills in its own date (see below). Under it, each announcement is one block like this. The newest goes first.

```html
        <article class="announce">
          <span class="date">Holiday season</span>
          <div>
            <h3>Decorating for the Holidays? One Rule to Remember</h3>
            <p>Short description. Link to a page with <a href="holiday-decorations.html" style="color:var(--pine);font-weight:700;">link text</a>.</p>
          </div>
        </article>
```

The `date` label can be a date ("Nov 7, 2026") or a word ("Reminder"). Remove announcements once they're out of date. An event announcement goes stale the day after the event.

### Next board meeting box (home page)

`script.js` (section 5) shows the next **third Wednesday of the month at 7:30 p.m.** It switches to the following month at 9:30 p.m. on meeting night, and it labels March as the Annual Meeting. If a meeting moves or is canceled, open `script.js`, find `MEETING_CHANGES` and add a line using the *regular* date:

```js
  var MEETING_CHANGES = {
    '2026-12-16': '2026-12-09',
    '2027-01-20': 'canceled'
  };
```

### Add meeting minutes (`minutes.html`)

The board hasn't decided whether to post full minutes, short highlights or nothing (Maryland requires minutes to be available to owners on request, not posted online). The page currently says minutes are available on request. If the board decides to post them:

1. Upload the PDF into the `pdfs` folder, for example `pdfs/2026-09-Westwind-Minutes.pdf`.
2. Open `minutes.html` and find the table for that year.
3. Paste this block right under that year's heading row, newest at the top, and change the title, date and both file names:

```html
          <div class="lib-row">
            <span class="lib-title">September 2026 Board Meeting</span>
            <span class="lib-tag">Minutes</span>
            <span class="lib-date">Sep 16, 2026</span>
            <span class="lib-dl">
              <button class="btn-view-pdf" data-pdf-src="pdfs/2026-09-Westwind-Minutes.pdf" data-pdf-title="September 2026 Board Meeting Minutes">View</button>
              &middot; <a href="pdfs/2026-09-Westwind-Minutes.pdf" download>Download &darr;</a>
            </span>
          </div>
```

### Add a newsletter issue (`newsletter.html`)

Same steps as minutes. Use `Newsletter` as the category and the mailing date as the date. The Spring 2026 issue in the file is a working example to copy. Future newsletters should list westwindhoa.net as the website address.

### Start a new year (minutes and newsletter)

Copy a whole year block (the `<div style="margin-bottom:36px;">` that holds the year heading and its table), paste it at the top of the list and change the year.

### Approved colors (`colors.html`)

The page explains how to get a color approved through the ACC. If the board adopts a neighborhood color list, add it as a new section between "How Color Approval Works" and the closing form link. Use only colors the board has actually approved.

### Adding a new page

1. Copy an existing page with a similar layout and rename it.
2. Add it to the menu in **every** page (the menu is repeated in each HTML file).
3. Add a line for it in `sitemap.xml` so Google finds it, then resubmit the sitemap in Search Console (section 7).

---

## 4. Domain and DNS (Squarespace)

These records make westwindhoa.net point to GitHub Pages. **Leave them exactly as they are.**

| Type | Host | Value |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | westwindhoa.github.io |
| TXT | _github-pages-challenge-westwindhoa | (verification value from GitHub) |

Email records at Squarespace are separate and were left alone.

Rules:

- Don't add any other A or AAAA records on `@`. Extra records can break the site and the HTTPS certificate.
- If anyone adds a CAA record, it must include `letsencrypt.org`.
- The `CNAME` file in this repository must stay. It contains only `westwindhoa.net`. Deleting it disconnects the domain.
- The domain is verified at the GitHub organization level (organization **Settings > Pages**). Leave that verification in place.
- **Domain renewal:** westwindhoa.net must stay on auto-renew at Squarespace with a working payment card. If the domain lapses, the whole site goes offline.

---

## 5. HTTPS certificate

Let's Encrypt certificates last 90 days. GitHub Pages requests and renews them automatically. Nobody needs to renew anything by hand, as long as the DNS records in section 4 stay correct and the custom domain stays set in GitHub.

### Quarterly check (about two minutes)

1. Open westwindhoa.net in Chrome.
2. Click the icon at the left end of the address bar, then **Connection is secure > Certificate is valid**.
3. Look at **Expires on**. The date should move forward between checks. A date less than two weeks away means renewal is stuck.
4. In the repository, open **Settings > Pages**. There should be a green check next to westwindhoa.net, and **Enforce HTTPS** should be checked.

### If renewal gets stuck

1. In **Settings > Pages**, remove the custom domain and wait for the page to clear.
2. Type `westwindhoa.net` back in and click **Save**. This restarts the certificate request, which can take up to an hour.
3. Check that the `CNAME` file is still in the repository and contains only `westwindhoa.net`. Removing the domain can delete it. If it's gone, create it again with **Add file > Create new file**.
4. Check **Enforce HTTPS** again once the certificate is ready.

---

## 6. Online forms

### How it works

The website has four forms: Exterior Modification (ACC) Request with photo uploads, Suspected Violation Report, Contact the Board, and Rental & Property Manager Registration. When someone submits one:

1. `forms.js` sends it to the Apps Script web app.
2. The script adds a row with a reference number (ACC-, VIO-, MSG- or RNT-) to the matching tab in the "Westwind Website Forms Log" spreadsheet.
3. Attachments are saved to the upload folder in Google Drive.
4. The board inbox gets an email with the details and the files attached.
5. The person who submitted gets a receipt email, if they gave an email address.

If the web app can't be reached, the form falls back to opening an email to the board inbox, so residents can still reach the board.

### Where things are

- **Apps Script project:** script.google.com, signed in as the HOA account, project "Westwind Website Forms"
- **Web app URL** (also on line 11 of `forms.js`): https://script.google.com/macros/s/AKfycbz6GO-9OwPsRYqKjjTA7aoWnFJUepRlJTXdr1817nzSDZ4BDQ8iDAWSE7eX6wY9H5yG/exec
- **Log spreadsheet:** https://docs.google.com/spreadsheets/d/1CZGv1cRmUyyGSdeiUPG7XAGWCvKbldG6DMLUFtU8L0g/edit
- **Upload folder:** https://drive.google.com/drive/folders/118xM9P7N-89MLiK18D_F0l0wKfxewtzx
- **Script source:** `westwind-forms-apps-script.gs` in this repository (a copy of what's in Apps Script)

The spreadsheet and folder links only open for people they're shared with. Opening the web app URL in a browser should show `{"ok":true,"message":"Westwind forms endpoint is running."}`.

### Using the log

Each tab has a **Status** column (starts as "New") and a **Board notes** column for the board to fill in as requests are handled. Share the spreadsheet and the upload folder with board members as **Editor** (Share button, add their email).

### Changing where emails go

In the Apps Script project, edit `CONFIG` near the top of the code:

- `BOARD_EMAIL`: the inbox for all notifications
- `ROUTES`: send one form to a different inbox, for example ACC requests to an ACC chair
- `CONTACT_TOPIC_ROUTES`: send Contact form topics to specific people

After any code change, publish it with the steps below.

### Updating the script without breaking the forms

1. Edit and save the code in Apps Script. Copy the same change into `westwind-forms-apps-script.gs` in this repository so the two stay matched.
2. Click **Deploy > Manage deployments**.
3. Click the **pencil icon**, set **Version** to **New version** and click **Deploy**.

**Never use Deploy > New deployment for an update.** That creates a new URL, and the forms keep sending to the old one until `forms.js` is changed. **Test deployments** links only work for the signed-in account, so never put one in `forms.js`.

### Testing

- In Apps Script, choose **sendTestSubmission** in the function dropdown and click **Run**. The board inbox should get a test email and the ACC Requests tab should get a test row within a minute.
- To test the live site, submit each form with "TEST" in the name or message, then delete the test rows. To delete a row, right-click its row number and choose **Delete row**.

### Things that are normal

- "Google hasn't verified this app" when authorizing the script. Click **Advanced > Go to Westwind Website Forms (unsafe) > Allow**. The "developer" is the HOA account itself.
- Google "Security alert" emails after authorizing the script or signing in on a new device.
- A passkey QR code during authorization. If the passkey device isn't nearby, click **Cancel > More ways to verify > Enter your password**.
- More than 40 submissions in an hour pauses the forms briefly. That limit protects the inbox from spam floods.

### If the forms stop working

1. Open the web app URL in a browser. If it doesn't show the "running" message, check **Deploy > Manage deployments** in Apps Script. **Who has access** must be **Anyone**.
2. In Apps Script, click **Executions** (the list icon on the left) to see errors from recent submissions.
3. If Google revoked the script's permissions (for example after a password change), run **setup** again. It reuses the existing spreadsheet and folder and asks for permission again.

---

## 7. Google search

- **Search Console:** search.google.com/search-console, property `https://westwindhoa.net/` (URL prefix). Ownership is verified with an HTML file Google provides, named like `google1a2b3c.html`, uploaded to this repository. **Leave that file in the repository**, or Search Console loses access. Sign in with the HOA Google account so the next board inherits it, or add the HOA account under **Settings > Users and permissions**.
- **`sitemap.xml`:** lists every page for Google. Add new pages to it and resubmit it under **Sitemaps** in Search Console.
- **`robots.txt`:** tells search engines they may read the site.
- To check that Google has the site, search Google for `site:westwindhoa.net`.
- Links from other sites help Google find and rank this one. Ask FHCC to keep a link to westwindhoa.net on flowerhill.org/westwind, and include the address in every newsletter.

---

## 8. Content rules for this site

- Quote governing-document wording **verbatim**, never paraphrased, and name the document, article and section.
- **Trees:** the tree rule is still in the recorded Declaration. At the October 21, 2026 meeting, the board agreed not to require approval requests for tree removal for now, but nothing has been officially amended. Never say the rule was removed or eliminated. Say the board "is not currently requiring approval." The board still enforces lawn and yard upkeep (Declaration Article VI and Article VII, Section 9).
- **Meet link and phone PIN:** currently public on the Board Meetings page, in the spring newsletter PDF and on flowerhill.org/westwind. If the board decides to share them only with homeowners, all three places need updating.
- **Proxies:** the Board Meetings page tells homeowners to email signed proxies to the board inbox, addressed to the Secretary. Update that page if the board adopts a different method or a proxy form.
- Writing style: no em dashes in sentences; don't start sentences with So, And, But or To; no comma before "so," and no comma before "and" or "but" unless needed.

---

## 9. Checklists

### Every few months

- Remove out-of-date home page announcements.
- Do the HTTPS certificate check in section 5.
- Glance at the forms log for rows still marked "New."

### Every January

- Confirm westwindhoa.net auto-renew and the payment card at Squarespace.
- Confirm at least two board members are Owners of the GitHub organization with two-factor sign-in on.
- Update the board list on the Board & Contacts page, and send corrections to FHCC for flowerhill.org/westwind.
- Add a new year section to the minutes and newsletter pages if they're in use.
- Review who has access to the forms spreadsheet and upload folder, and remove people who have left the board.

### When board members change

- Remove departing members from the GitHub organization, the forms spreadsheet and the upload folder.
- Change the HOA Google password, update its recovery phone and email if they belonged to the departing member, and update the board's private records.
- Add new members where needed.
