/**
 * Westwind HOA website form handler (Google Apps Script web app)
 * =================================================================
 * Receives submissions from the four forms on the website:
 *   1. Exterior Modification (ACC) Request   (with photo/PDF attachments)
 *   2. Suspected Violation Report            (anonymous allowed, optional photos)
 *   3. Contact the Board
 *   4. Rental & Property Manager Registration
 *
 * For every submission this script:
 *   - logs a row in a Google Sheet (one tab per form) with a reference number
 *   - saves any attachments to a Google Drive folder
 *   - emails the board with the details and the real files attached
 *   - emails the homeowner a receipt when they gave an email address
 *
 * SETUP (about 10 minutes, do it signed in to the HOA's own Google account)
 * ------------------------------------------------------------------------
 * 1. Go to script.google.com > New project. Name it "Westwind Website Forms".
 * 2. Delete the starter code and paste this whole file in. Save.
 * 3. Change BOARD_EMAIL below to the inbox that should receive submissions.
 * 4. In the toolbar pick the function "setup" and click Run. Approve the
 *    permissions it asks for (Sheets, Drive, Gmail). It creates the
 *    spreadsheet and the Drive folder, and prints both links in the log.
 * 5. Deploy > New deployment > type "Web app".
 *       Execute as: Me
 *       Who has access: Anyone
 *    Click Deploy and copy the Web app URL (ends in /exec).
 * 6. Open forms.js on the website and paste that URL into FORMS_ENDPOINT.
 * 7. Back here, run "sendTestSubmission". The board inbox should get a test
 *    email within a minute, and the sheet should get a test row.
 *
 * If you change this code later: Deploy > Manage deployments > pencil icon >
 * Version: New version > Deploy. The URL stays the same.
 *
 * Tip: share the spreadsheet and the Drive folder with the other board members
 * (Share button) so they can see the log and open the attachments.
 */

const CONFIG = {
  // Default inbox for every board notification.
  BOARD_EMAIL: 'westwindhomeownersassoc@gmail.com',

  // Optional: send a form to a different inbox. Leave '' to use BOARD_EMAIL.
  ROUTES: {
    acc: '',        // e.g. 'acc@westwindhoa.net'
    violation: '',  // e.g. 'board@westwindhoa.net'
    contact: '',
    rental: ''
  },

  // Optional: route Contact form topics to specific people.
  // Exact topic text from the form's dropdown, e.g. { 'Dues / billing': 'treasurer@westwindhoa.net' }
  CONTACT_TOPIC_ROUTES: {},

  SEND_RECEIPTS: true,                 // email a confirmation to the person who submitted
  TIMEZONE: 'America/New_York',
  MAX_FILES: 6,
  MAX_TOTAL_BYTES: 15 * 1024 * 1024,   // total attachments per submission
  MAX_SUBMISSIONS_PER_HOUR: 40         // safety brake against spam floods
};

const FORM_DEFS = {
  acc: {
    title: 'Exterior Modification Request',
    prefix: 'ACC',
    tab: 'ACC Requests',
    allowFiles: true,
    receiptEmailField: 'owner_email',
    subjectField: 'property_address',
    fields: [
      ['owner_name', 'Homeowner name', true],
      ['property_address', 'Property address', true],
      ['owner_phone', 'Phone', false],
      ['owner_email', 'Email', true],
      ['mod_type', 'Type of modification', true],
      ['mod_description', 'Description of work, dimensions, location on lot', true],
      ['mod_materials', 'Materials, colors and specifications', false],
      ['contractor', 'Contractor', false],
      ['mod_dates', 'Estimated start / completion', false],
      ['ack', 'Acknowledgment that no work starts before written ACC approval', true]
    ]
  },
  violation: {
    title: 'Suspected Violation Report',
    prefix: 'VIO',
    tab: 'Violation Reports',
    allowFiles: true,
    receiptEmailField: 'reporter_email',
    subjectField: 'property_address',
    fields: [
      ['property_address', 'Property address in question', true],
      ['category', 'Type of issue', true],
      ['status', 'Ongoing or one-time', false],
      ['date_noticed', 'Date first noticed', false],
      ['description', 'What was observed', true],
      ['checked_guidelines', 'Checked the guidelines first', false],
      ['reporter_name', 'Reporter name (optional)', false],
      ['reporter_phone', 'Reporter cell phone (optional)', false],
      ['reporter_email', 'Reporter email (optional)', false]
    ]
  },
  contact: {
    title: 'Contact the Board',
    prefix: 'MSG',
    tab: 'Contact Messages',
    allowFiles: false,
    receiptEmailField: 'email',
    subjectField: 'topic',
    fields: [
      ['name', 'Name', true],
      ['email', 'Email', true],
      ['phone', 'Phone', false],
      ['topic', 'Topic', true],
      ['message', 'Message', true]
    ]
  },
  rental: {
    title: 'Rental & Property Manager Registration',
    prefix: 'RNT',
    tab: 'Rental Registrations',
    allowFiles: false,
    receiptEmailField: 'owner_email',
    subjectField: 'address',
    fields: [
      ['address', 'Property address', true],
      ['owner_name', 'Homeowner name(s)', true],
      ['owner_phone', 'Homeowner phone', true],
      ['owner_email', 'Homeowner email', true],
      ['owner_mailing', 'Owner mailing address', false],
      ['occupancy', 'Current occupancy', true],
      ['tenant_name', 'Tenant name(s)', false],
      ['tenant_phone', 'Tenant phone', false],
      ['tenant_email', 'Tenant email', false],
      ['tenant_occupants', 'Everyone living in the home', false],
      ['lease_start', 'Lease start date', false],
      ['lease_end', 'Lease end date', false],
      ['tenant_vehicles', 'Tenant vehicles', false],
      ['tenant_pets', 'Pets', false],
      ['tenant_emergency', 'Tenant emergency contact', false],
      ['ack_rules', 'Owner gave tenant the Westwind guidelines', false],
      ['vacant_contact', 'Vacant home upkeep contact', false],
      ['vacant_date', 'Expected re-occupancy date', false],
      ['management', 'Property management', true],
      ['mgmt_company', 'Management company', false],
      ['mgmt_contact', 'Management contact person', false],
      ['mgmt_phone', 'Management office phone', false],
      ['mgmt_email', 'Management email', false],
      ['mgmt_after_hours', 'Management after-hours phone', false],
      ['mgmt_address', 'Management mailing address', false],
      ['notes', 'Other notes', false]
    ]
  }
};

const ALLOWED_EXT = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', heic: 'image/heic', pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

/* ------------------------------------------------------------------ */
/* One-time setup                                                      */
/* ------------------------------------------------------------------ */

function setup() {
  const props = PropertiesService.getScriptProperties();

  let ss;
  const sheetId = props.getProperty('SHEET_ID');
  if (sheetId) {
    ss = SpreadsheetApp.openById(sheetId);
  } else {
    ss = SpreadsheetApp.create('Westwind Website Forms Log');
    props.setProperty('SHEET_ID', ss.getId());
  }

  let folder;
  const folderId = props.getProperty('FOLDER_ID');
  if (folderId) {
    folder = DriveApp.getFolderById(folderId);
  } else {
    folder = DriveApp.createFolder('Westwind Website Form Uploads');
    props.setProperty('FOLDER_ID', folder.getId());
  }

  Object.keys(FORM_DEFS).forEach(function (key) { getSheet_(ss, FORM_DEFS[key]); });

  // Remove the blank default tab if it is still there.
  const blank = ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1) ss.deleteSheet(blank);

  Logger.log('Spreadsheet: ' + ss.getUrl());
  Logger.log('Upload folder: ' + folder.getUrl());
  Logger.log('Setup finished. Next: Deploy > New deployment > Web app.');
}

/** Run this after deploying to confirm the whole pipeline works. */
function sendTestSubmission() {
  const fakeEvent = {
    postData: {
      contents: JSON.stringify({
        form: 'acc',
        fields: {
          owner_name: 'Test Homeowner',
          property_address: '1 Test Lane (TEST, please ignore)',
          owner_phone: '240-555-0100',
          owner_email: CONFIG.BOARD_EMAIL,
          mod_type: 'Fence or gate',
          mod_description: 'This is a test submission from sendTestSubmission().',
          mod_materials: '',
          contractor: '',
          mod_dates: '',
          ack: true
        },
        files: []
      })
    }
  };
  const out = doPost(fakeEvent).getContent();
  Logger.log(out);
}

/* ------------------------------------------------------------------ */
/* Web app entry points                                                */
/* ------------------------------------------------------------------ */

function doGet() {
  return json_({ ok: true, message: 'Westwind forms endpoint is running.' });
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Spam trap: real visitors never see or fill this field.
    if (payload.hp) return json_({ ok: true, ref: 'OK' });

    const def = FORM_DEFS[payload.form];
    if (!def) return json_({ ok: false, error: 'Unknown form.' });

    const clean = {};
    const missing = [];
    def.fields.forEach(function (f) {
      const key = f[0], label = f[1], required = f[2];
      let v = payload.fields ? payload.fields[key] : '';
      if (v === true) v = 'Yes';
      if (v === false) v = required ? '' : 'No';
      if (v === null || v === undefined) v = '';
      v = String(v).trim().slice(0, 5000);
      if (required && !v) missing.push(label);
      clean[key] = v;
    });
    // Rental form: tenant, vacant and management details are required
    // whenever the matching option is chosen (enforced here too, not just in the browser).
    if (payload.form === 'rental') {
      const need = function (key, label) {
        if (!clean[key] || clean[key] === 'No') missing.push(label);
      };
      if (clean.occupancy === 'Rented') {
        need('tenant_name', 'Tenant name(s)');
        need('tenant_phone', 'Tenant phone');
        need('lease_start', 'Lease start date');
        need('ack_rules', 'Confirmation that the tenant received the Westwind guidelines');
      }
      if (clean.occupancy === 'Vacant') {
        need('vacant_contact', 'Vacant home upkeep contact');
      }
      if (clean.management === 'Managed by an outside company') {
        need('mgmt_company', 'Management company');
        need('mgmt_contact', 'Management contact person');
        need('mgmt_phone', 'Management office phone');
      }
    }
    if (missing.length) {
      return json_({ ok: false, error: 'Please fill in: ' + missing.join(', ') + '.' });
    }

    const emailKey = def.receiptEmailField;
    if (clean[emailKey] && !isEmail_(clean[emailKey])) {
      if (def.fields.filter(function (f) { return f[0] === emailKey && f[2]; }).length) {
        return json_({ ok: false, error: 'Please enter a valid email address.' });
      }
      clean[emailKey] = ''; // optional and malformed: drop it rather than fail
    }

    const files = decodeFiles_(payload.files, def.allowFiles);

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    let ref, rowNumber, folderUrl = '';
    try {
      if (overRateLimit_()) {
        return json_({ ok: false, error: 'Too many submissions right now. Please try again later or email the board.' });
      }

      const props = PropertiesService.getScriptProperties();
      const ss = SpreadsheetApp.openById(props.getProperty('SHEET_ID'));
      const sheet = getSheet_(ss, def);

      ref = makeRef_(def.prefix);
      const stamp = new Date();
      const saved = saveFiles_(files, ref, clean[def.subjectField]);
      folderUrl = saved.folderUrl;

      const row = [stamp, ref];
      def.fields.forEach(function (f) { row.push(safeCell_(clean[f[0]])); });
      row.push(saved.links.join('\n'));
      row.push('New');
      row.push('');
      sheet.appendRow(row);
      rowNumber = sheet.getLastRow();
    } finally {
      lock.releaseLock();
    }

    // Emails happen after the data is safely logged.
    try {
      notifyBoard_(def, payload, clean, files, ref, folderUrl);
      if (CONFIG.SEND_RECEIPTS && clean[emailKey]) sendReceipt_(def, clean, ref, files.length);
    } catch (mailErr) {
      console.error('Email failed for ' + ref + ': ' + mailErr);
      markStatus_(def, rowNumber, 'Saved, email failed (check sheet)');
    }

    return json_({ ok: true, ref: ref });
  } catch (err) {
    const known = err && err.userMessage;
    if (!known) console.error(err && err.stack ? err.stack : err);
    return json_({ ok: false, error: known || 'Something went wrong on our end. Please email the board directly.' });
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function userError_(msg) {
  const e = new Error(msg);
  e.userMessage = msg;
  return e;
}

function isEmail_(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
}

function overRateLimit_() {
  const cache = CacheService.getScriptCache();
  const n = parseInt(cache.get('hourly_count') || '0', 10);
  if (n >= CONFIG.MAX_SUBMISSIONS_PER_HOUR) return true;
  cache.put('hourly_count', String(n + 1), 3600);
  return false;
}

function makeRef_(prefix) {
  const day = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyyMMdd');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return prefix + '-' + day + '-' + rand;
}

/** Stops a cell that starts with = + - @ from being run as a formula. */
function safeCell_(v) {
  v = String(v == null ? '' : v);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function getSheet_(ss, def) {
  let sheet = ss.getSheetByName(def.tab);
  if (!sheet) sheet = ss.insertSheet(def.tab);
  if (sheet.getLastRow() === 0) {
    const headers = ['Submitted', 'Reference']
      .concat(def.fields.map(function (f) { return f[1]; }))
      .concat(['Attachments', 'Status', 'Board notes']);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#E9EFE6');
    sheet.setFrozenRows(1);
    sheet.getRange(2, 1, 1000, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  }
  return sheet;
}

function markStatus_(def, rowNumber, text) {
  try {
    const ss = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID'));
    const sheet = getSheet_(ss, def);
    const statusCol = 2 + def.fields.length + 2;
    sheet.getRange(rowNumber, statusCol).setValue(text);
  } catch (e) {
    console.error('markStatus_ failed: ' + e);
  }
}

function decodeFiles_(list, allowed) {
  if (!list || !list.length) return [];
  if (!allowed) throw userError_('This form does not accept attachments.');
  if (list.length > CONFIG.MAX_FILES) {
    throw userError_('Please attach no more than ' + CONFIG.MAX_FILES + ' files.');
  }
  let total = 0;
  const blobs = [];
  list.forEach(function (f, i) {
    const rawName = String(f.name || ('attachment-' + (i + 1)));
    const name = rawName.replace(/[\\\/:*?"<>|\r\n]+/g, '_').slice(0, 120);
    const ext = (name.split('.').pop() || '').toLowerCase();
    const mime = ALLOWED_EXT[ext];
    if (!mime) throw userError_('The file "' + name + '" is not an allowed type. Use JPG, PNG, PDF, or Word files.');
    const bytes = Utilities.base64Decode(String(f.data || ''));
    total += bytes.length;
    if (total > CONFIG.MAX_TOTAL_BYTES) {
      throw userError_('Attachments are too large. Keep the total under ' + Math.round(CONFIG.MAX_TOTAL_BYTES / 1048576) + ' MB.');
    }
    blobs.push(Utilities.newBlob(bytes, mime, name));
  });
  return blobs;
}

function saveFiles_(blobs, ref, label) {
  if (!blobs.length) return { links: [], folderUrl: '' };
  const root = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('FOLDER_ID'));
  const safeLabel = String(label || '').replace(/[\\\/:*?"<>|\r\n]+/g, ' ').trim().slice(0, 50);
  const folder = root.createFolder(ref + (safeLabel ? ' ' + safeLabel : ''));
  const links = blobs.map(function (b) {
    return b.getName() + ': ' + folder.createFile(b).getUrl();
  });
  return { links: links, folderUrl: folder.getUrl() };
}

function recipientFor_(def, formKey, clean) {
  if (formKey === 'contact' && CONFIG.CONTACT_TOPIC_ROUTES[clean.topic]) {
    return CONFIG.CONTACT_TOPIC_ROUTES[clean.topic];
  }
  return CONFIG.ROUTES[formKey] || CONFIG.BOARD_EMAIL;
}

function notifyBoard_(def, payload, clean, blobs, ref, folderUrl) {
  const when = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, "EEE MMM d, yyyy 'at' h:mm a");
  const sheetUrl = SpreadsheetApp.openById(PropertiesService.getScriptProperties().getProperty('SHEET_ID')).getUrl();

  let body = def.title + ' received ' + when + '\nReference: ' + ref + '\n\n';
  def.fields.forEach(function (f) {
    const v = clean[f[0]];
    if (!v && !f[2] && def.prefix === 'RNT') return; // keep the rental email short
    body += f[1] + ': ' + (v || '(blank)') + '\n';
  });
  if (payload.form === 'violation' && !clean.reporter_name && !clean.reporter_phone && !clean.reporter_email) {
    body += '\nThis report was submitted anonymously.\n';
  }
  body += '\nAttachments: ' + (blobs.length ? blobs.length + ' file(s) attached to this email.' : 'none') + '\n';
  if (folderUrl) body += 'Saved in Drive: ' + folderUrl + '\n';
  body += 'Tracking sheet: ' + sheetUrl + '\n';

  const subjectDetail = clean[def.subjectField] || '';
  const subject = '[Westwind] ' + def.title + ': ' + subjectDetail.slice(0, 80) + ' (' + ref + ')';

  const options = { attachments: blobs, name: 'Westwind Website Forms' };
  const replyTo = clean[def.receiptEmailField];
  if (replyTo && isEmail_(replyTo)) options.replyTo = replyTo;

  GmailApp.sendEmail(recipientFor_(def, payload.form, clean), subject, body, options);
}

function sendReceipt_(def, clean, ref, fileCount) {
  const to = clean[def.receiptEmailField];
  let body;
  if (def.prefix === 'ACC') {
    body = 'Thank you. The Westwind Architectural Control Committee received your exterior modification request for '
      + clean.property_address + '.\n\n'
      + 'Reference number: ' + ref + '\n'
      + 'Attachments received: ' + fileCount + '\n\n'
      + 'A board member will follow up. This message is not an approval. Please wait for written ACC approval before starting any work.\n\n'
      + 'Westwind Homeowners Association';
  } else if (def.prefix === 'VIO') {
    body = 'Thank you. The Westwind board received your report. The board and ACC review every report against the governing documents before taking any action.\n\n'
      + 'Reference number: ' + ref + '\n\n'
      + 'Westwind Homeowners Association';
  } else if (def.prefix === 'RNT') {
    body = 'Thank you. The Westwind board received your rental and property manager registration for '
      + clean.address + '. If anything changes later, such as a new tenant or management company, just submit the form again with the updated details.\n\n'
      + 'Reference number: ' + ref + '\n\n'
      + 'Westwind Homeowners Association';
  } else {
    body = 'Thank you for contacting the Westwind board. We received your message about "' + clean.topic + '" and a board member will follow up.\n\n'
      + 'Reference number: ' + ref + '\n\n'
      + 'Westwind Homeowners Association';
  }
  GmailApp.sendEmail(to, 'We received your Westwind ' + def.title.toLowerCase() + ' (' + ref + ')', body, {
    name: 'Westwind HOA',
    replyTo: CONFIG.BOARD_EMAIL
  });
}
