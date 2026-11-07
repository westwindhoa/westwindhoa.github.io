# Westwind Site Maintenance Notes

These steps used to live as comments inside the page files. They were moved here so the page source stays clean. Files that start with an underscore are not published by GitHub Pages, so residents won't see this file.

## Add a set of meeting minutes (minutes.html)

1. Upload the minutes PDF into the `pdfs` folder, for example `pdfs/2026-09-Westwind-Minutes.pdf`.
2. Open `minutes.html` and find the table for the year the meeting took place.
3. Paste this block right under that year's heading row (newest at the top):

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

4. Change the title, date and both file names to match.

## Add a newsletter issue (newsletter.html)

Same steps as minutes. Use `Newsletter` as the category and the mailing date as the date. The Spring 2026 issue in `newsletter.html` is a working example to copy.

## Start a new year (minutes.html and newsletter.html)

Copy a whole year block (the `<div style="margin-bottom:36px;">` that holds the year heading and its table), paste it at the top of the list, and change the year. Each January, consider removing the oldest year at the bottom.

## Move or cancel a board meeting (home page "Next board meeting")

The home page fills in the next meeting date by itself (third Wednesday, 7:30 p.m.). If a meeting moves or is canceled, open `script.js`, find `MEETING_CHANGES` in section 5, and add a line using the regular date:

```js
  var MEETING_CHANGES = {
    '2026-12-16': '2026-12-09',
    '2027-01-20': 'canceled'
  };
```

## Approved colors (colors.html)

If the board adopts a neighborhood color list, add it as a new section between "How Color Approval Works" and the closing form link. Use only colors the board has actually approved.
