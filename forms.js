/* ===========================================================
   Westwind HOA: online forms
   Sends each form to the Google Apps Script web app, which logs it
   to a Google Sheet, saves attachments to Drive, and emails the board.
   Setup steps are at the top of westwind-forms-apps-script.gs.
=========================================================== */
(function () {
  'use strict';

  // Paste the Apps Script "Web app" URL (ends in /exec) between the quotes.
  var FORMS_ENDPOINT = 'PASTE_WEB_APP_URL_HERE';

  // Used only if the endpoint is not set yet, or if sending fails.
  var FALLBACK_EMAIL = 'westwindhomeownersassoc@gmail.com';

  var MAX_FILES = 6;
  var MAX_TOTAL_BYTES = 15 * 1024 * 1024;
  var IMAGE_MAX_EDGE = 1800;
  var ALLOWED = /\.(jpe?g|png|gif|webp|heic|pdf|docx?)$/i;

  var endpointReady = FORMS_ENDPOINT.indexOf('PASTE_') === -1 && /^https:\/\//.test(FORMS_ENDPOINT);

  function fmtSize(n) {
    if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + ' KB';
    return (n / 1048576).toFixed(1) + ' MB';
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* Shrink big phone photos so uploads are fast and email-friendly. */
  function shrinkImage(file) {
    return new Promise(function (resolve) {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 400 * 1024) {
        resolve(file);
        return;
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth, h = img.naturalHeight;
        var scale = Math.min(1, IMAGE_MAX_EDGE / Math.max(w, h));
        if (scale === 1 && file.size < 1.5 * 1024 * 1024) {
          URL.revokeObjectURL(url);
          resolve(file);
          return;
        }
        var canvas = document.createElement('canvas');
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        canvas.toBlob(function (blob) {
          if (!blob || blob.size >= file.size) { resolve(file); return; }
          var newName = file.name.replace(/\.[^.]+$/, '') + '.jpg';
          blob.name = newName;
          resolve(blob);
        }, 'image/jpeg', 0.82);
      };
      img.onerror = function () { URL.revokeObjectURL(url); resolve(file); };
      img.src = url;
    });
  }

  function toBase64(blob) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result).split(',')[1] || ''); };
      r.onerror = function () { reject(new Error('Could not read ' + (blob.name || 'a file'))); };
      r.readAsDataURL(blob);
    });
  }

  function setupForm(form) {
    var type = form.getAttribute('data-form');
    var status = form.querySelector('.form-status');
    var submitBtn = form.querySelector('button[type="submit"]');
    var fileInput = form.querySelector('input[type="file"]');
    var fileList = form.querySelector('.file-list');
    var selected = [];
    var openedAt = Date.now();

    function say(msg, kind) {
      status.textContent = msg || '';
      status.className = 'form-status' + (kind ? ' is-' + kind : '');
      status.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    }

    function renderFiles() {
      if (!fileList) return;
      fileList.innerHTML = '';
      selected.forEach(function (f, i) {
        var li = el('li');
        li.appendChild(el('span', 'file-name', f.name));
        li.appendChild(el('span', 'file-size', fmtSize(f.size)));
        var rm = el('button', 'file-remove', 'Remove');
        rm.type = 'button';
        rm.setAttribute('aria-label', 'Remove ' + f.name);
        rm.addEventListener('click', function () {
          selected.splice(i, 1);
          renderFiles();
        });
        li.appendChild(rm);
        fileList.appendChild(li);
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', function () {
        var problems = [];
        Array.prototype.forEach.call(fileInput.files, function (f) {
          if (!ALLOWED.test(f.name)) { problems.push(f.name + ' is not a supported type'); return; }
          if (selected.length >= MAX_FILES) { problems.push('Limit is ' + MAX_FILES + ' files'); return; }
          var dupe = selected.some(function (s) { return s.name === f.name && s.size === f.size; });
          if (!dupe) selected.push(f);
        });
        fileInput.value = '';
        renderFiles();
        say(problems.length ? problems.join('. ') + '.' : '', problems.length ? 'error' : '');
      });
    }

    function collect() {
      var fields = {};
      Array.prototype.forEach.call(form.elements, function (f) {
        if (!f.name || f.name === 'hp' || f.type === 'file' || f.type === 'submit' || f.type === 'button') return;
        if (f.type === 'radio') { if (f.checked) fields[f.name] = f.value; return; }
        if (f.type === 'checkbox') { fields[f.name] = f.checked; return; }
        fields[f.name] = (f.value || '').trim();
      });
      return fields;
    }

    function mailtoFallback(fields) {
      var subject = form.getAttribute('data-subject') || 'Westwind website form';
      var keyField = form.getAttribute('data-subject-field');
      if (keyField && fields[keyField]) subject += ': ' + fields[keyField];
      var body = '';
      Object.keys(fields).forEach(function (k) {
        var input = form.querySelector('[name="' + k + '"]');
        var labelEl = input && input.id ? form.querySelector('label[for="' + input.id + '"]') : null;
        if (!labelEl && input && input.type === 'checkbox') labelEl = input.closest('label');
        var text = labelEl ? labelEl.textContent.replace(/\s*\*\s*$/, '').trim() : k;
        var v = fields[k] === true ? 'Yes' : fields[k] === false ? 'No' : fields[k];
        if (v) body += text + ': ' + v + '\n';
      });
      if (selected.length) body += '\n(Please attach your ' + selected.length + ' file(s) to this email before sending.)';
      return 'mailto:' + FALLBACK_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    }

    function showSuccess(ref) {
      var box = el('div', 'form-success');
      box.setAttribute('tabindex', '-1');
      box.appendChild(el('h3', null, 'Thank you. Your submission was received.'));
      var p = el('p');
      p.appendChild(document.createTextNode('Your reference number is '));
      p.appendChild(el('strong', 'ref-code', ref));
      p.appendChild(document.createTextNode('. Keep it if you need to follow up with the board.'));
      box.appendChild(p);
      var hasEmail = form.querySelector('[name="owner_email"], [name="email"], [name="reporter_email"]');
      var emailVal = hasEmail ? hasEmail.value.trim() : '';
      if (emailVal) box.appendChild(el('p', null, 'A confirmation email is on its way to ' + emailVal + '.'));
      if (type === 'acc') {
        box.appendChild(el('p', null, 'Please do not start any work until you receive written approval from the ACC.'));
      }
      var again = el('button', 'btn btn-pine', 'Submit another');
      again.type = 'button';
      again.addEventListener('click', function () {
        form.reset();
        selected = [];
        renderFiles();
        say('');
        form.hidden = false;
        box.remove();
        openedAt = Date.now();
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
      box.appendChild(again);
      form.hidden = true;
      form.parentNode.insertBefore(box, form.nextSibling);
      box.focus();
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var fields = collect();
      var hp = form.querySelector('[name="hp"]');

      if (!endpointReady) {
        say('Online sending is not switched on yet. Your email app will open with everything filled in.', 'info');
        window.location.href = mailtoFallback(fields);
        return;
      }

      submitBtn.disabled = true;
      var originalLabel = submitBtn.textContent;
      submitBtn.textContent = 'Sending...';
      say(selected.length ? 'Preparing your files...' : 'Sending...', 'info');

      Promise.all(selected.map(function (f) {
        return shrinkImage(f).then(function (blob) {
          return toBase64(blob).then(function (b64) {
            return { name: blob.name || f.name, bytes: blob.size, data: b64 };
          });
        });
      })).then(function (files) {
        var total = files.reduce(function (n, f) { return n + f.bytes; }, 0);
        if (total > MAX_TOTAL_BYTES) {
          throw new Error('Your files total ' + fmtSize(total) + '. Please keep attachments under ' + fmtSize(MAX_TOTAL_BYTES) + ' combined, or remove a file.');
        }
        say('Sending...', 'info');
        var controller = ('AbortController' in window) ? new AbortController() : null;
        var timer = setTimeout(function () { if (controller) controller.abort(); }, 120000);
        // text/plain keeps this a "simple" request so the browser skips a CORS preflight,
        // which Google Apps Script cannot answer.
        return fetch(FORMS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            form: type,
            fields: fields,
            files: files.map(function (f) { return { name: f.name, data: f.data }; }),
            hp: hp ? hp.value : '',
            elapsedMs: Date.now() - openedAt,
            page: location.pathname
          }),
          signal: controller ? controller.signal : undefined
        }).then(function (res) {
          clearTimeout(timer);
          return res.json();
        });
      }).then(function (result) {
        if (result && result.ok) {
          showSuccess(result.ref);
        } else {
          throw new Error((result && result.error) || 'The server could not accept the form.');
        }
      }).catch(function (err) {
        var msg = (err && err.name === 'AbortError')
          ? 'This is taking too long. Check your connection and try again.'
          : (err && err.message) || 'Something went wrong.';
        status.className = 'form-status is-error';
        status.setAttribute('role', 'alert');
        status.textContent = msg + ' ';
        var a = el('a', null, 'Send by email instead');
        a.href = mailtoFallback(fields);
        status.appendChild(a);
      }).then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = originalLabel;
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    Array.prototype.forEach.call(document.querySelectorAll('form[data-form]'), setupForm);
  });
})();
