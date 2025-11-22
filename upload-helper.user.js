// ==UserScript==
// @name         MaM Upload Helper
// @namespace    Violentmonkey Scripts
// @version      0.5.1
// @description  Adds other torrents, preview, check for creating new entities and more to the upload page
// @author       Stirling Mouse
// @match        https://www.myanonamouse.net/tor/upload.php
// @icon         https://cdn.myanonamouse.net/apple-touch-icon.png?v=b
// @sandbox      MAIN_WORLD
// @grant	 GM_getValue
// @grant	 GM_setValue
// @grant	 GM.xmlHttpRequest
// @connect      www.myanonamouse.net
// @downloadURL	 https://github.com/StirlingMouse/MaM-Upload-Helper/raw/refs/heads/main/upload-helper.user.js
// @updateURL    https://github.com/StirlingMouse/MaM-Upload-Helper/raw/refs/heads/main/upload-helper.user.js
// ==/UserScript==

;(async function uploadHelpers() {
  const acCache = {
    author: {},
    series: {},
    narrator: {},
  }

  const $unsafeWindow =
    typeof unsafeWindow !== 'undefined'
      ? (unsafeWindow.wrappedJSObject ?? unsafeWindow)
      : window

  const uploadForm = document.querySelector('#uploadForm tbody')
  if (!uploadForm) return
  const files = Array.from(uploadForm.querySelectorAll('tr')).find(
    (tr) => tr.firstElementChild?.textContent === 'Files',
  )
  if (!files) {
    // On first step
    const torrentInput = document.querySelector(
      'input[type="file"][name="torrent"]',
    )
    torrentInput.setAttribute(
      'accept',
      'application/x-bittorrent,.torrent,application/json,.json,image/*,.jpg,.jpeg,.png,.webp',
    )
    torrentInput.setAttribute('multiple', '')

    torrentInput.addEventListener('change', async () => {
      if (torrentInput.files.length > 1) {
        const files = Array.from(torrentInput.files)
        const posterFile = files.find((file) => file.type.startsWith('image/'))
        const jsonFile = files.find(
          (file) =>
            file.name.endsWith('.json') || file.type === 'application/json',
        )
        const torrentFile = files.find((file) => file.name.endsWith('.torrent'))
        if (!torrentFile) return
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(torrentFile)
        torrentInput.files = dataTransfer.files
        if (!jsonFile) return
        const data = new FormData(torrentInput.form)
        const response = await fetch('/tor/upload.php', {
          method: 'post',
          body: data,
        })
        const html = await response.text()
        const parser = new DOMParser()
        const uploadPage = parser.parseFromString(html, 'text/html')
        const scripts = uploadPage.querySelectorAll('#mainBody script')
        const newMainBody = uploadPage.querySelector('#mainBody')
        const mainBody = document.querySelector('#mainBody')
        mainBody.innerHTML = newMainBody.innerHTML
        for (const script of scripts) {
          const newScript = document.createElement('script')
          newScript.src = script.src
          const loaded = new Promise((resolve) => {
            newScript.onload = resolve
          })
          mainBody.append(newScript)
          await loaded
        }
        initializeItAll()
        uploadHelpers()
        if (posterFile) {
          const posterInput = document.querySelector(
            'input[type="file"][name="poster"]',
          )
          const dataTransfer = new DataTransfer()
          dataTransfer.items.add(posterFile)
          posterInput.files = dataTransfer.files
          posterInput.dispatchEvent(new Event('change', { bubbles: true }))
        }
        if (jsonFile) {
          const jsonInput = document.querySelector(
            '.jsonFill input[type="file"]',
          )
          const dataTransfer = new DataTransfer()
          dataTransfer.items.add(jsonFile)
          jsonInput.files = dataTransfer.files
          jsonInput.dispatchEvent(new Event('change', { bubbles: true }))
        }
      }
    })
    return
  }
  const firstFile = files?.querySelector('tr td.row2')?.textContent
  const title = firstFile
    ?.replace(/[[\-.].*/, '')
    .replaceAll(/([*?])/g, '"$1"')
    .trim()
  const fullTitle = firstFile?.replace(/[[.].*/, '').trim()
  const asin = firstFile?.replace(/.*\[([A-Z0-9]+)\].*/, '$1').trim()
  const tags = uploadForm.querySelector('tr:has(input[name="tor[tags]"])')

  let categoryData
  try {
    categoryData = JSON.parse(
      localStorage.getItem('otherTorrents::categoryData'),
    )
  } catch {}
  async function fetchCategoryData() {
    const response = await fetch(
      'https://www.myanonamouse.net/tor/json/categories.php?new',
    )
    const json = await response.json()
    categoryData = {
      categories: Object.fromEntries(
        Object.values(json.categories).map((c) => [c.id, c.name]),
      ),
      media_types: Object.fromEntries(
        Object.values(json.media_types).map((c) => [c.id, c.name]),
      ),
    }
    localStorage.setItem(
      'otherTorrents::categoryData',
      JSON.stringify(categoryData),
    )
  }
  if (!categoryData) await fetchCategoryData()

  const styles = document.createElement('style')
  styles.innerHTML = `
    .otherTorrents-container {
      max-block-size: 400px;
      overflow: auto;
    }

    .otherTorrents-container table td.shrink {
      white-space: nowrap
    }

    .otherTorrents-container table td.expand {
      width: 99%
    }

    .otherTorrents-container .expand {
      font-size: 1em;
      font-weight: normal;
    }
    .otherTorrents-container .torNarrator,
    .otherTorrents-container .torRowDesc {
      font-size: 1em;
    }

    #mainBody {
      .categoryColumns {
        column-count: unset;
        column-width: unset;
      }

      label.mainCategories>div,
      label.mediaTypes>div,
      label.category>div {
        padding: 4px 8px;
        height: unset;
        font-size: 12pt;
        width: 200px;
        img { display: none; }
      }

      label.mainCategories,
      label.mediaTypes {
        height: 32px;
        width: 200px;
        padding: 0;
      }
      label.category {
        width: 200px;
      }

      label.mainCategories>div,
      label.mediaTypes>div,
      label.category>div {
        border: none;
        background-image: none;
        display:inline-block;
        padding-right: 20px;
        white-space: nowrap;
        overflow: hidden;
      }

      label.mainCategories>input:checked + div,
      label.mediaTypes>input:checked + div,
      label.category>input:checked + div {
        background-color: rebeccapurple
      }

      #showAllCats:has(input:not(:checked)) ~ .categoryColumns label.category:has(input:not(:checked)) {
        display: none;
      }

      tr:has(#fastFill) {
        display: none;
      }
      input[placeholder="number(s) in series"] {
        max-width: 40px;
        min-width: 40px;
      }
      tr h3.red { display: none; }
      .plusDiv { display: unset !important; }
      .categoriesPreview {
	display: flex;
	flex-direction: column;
	flex-wrap: wrap;
        padding-top: 5px;
	height: 60px;
        gap: 4px;
      }
      #torrentPreview {
        width: 98%;

        .newCatLink {
          position: relative;
        }
        .newCatLink::after {
          content: "";
          background-color: red;
          width: 50px;
          height: 50px;
          position: absolute;
          top: 5px;
          left: 5px;
          z-index: -1;
        }
      }
      a.altColor[href="#"] {
        background-color: var(--red-background);
      }
      .torDetPoster:hover {
        max-width: 95vw;
        max-height: 95vh;
        cursor: zoom-out;
      }
      p.uploadError {
        padding: 4px 8px;
        color: var(--red-background-font-color);
        background-color: var(--red-background);
      }
    }
 `
  document.body.appendChild(styles)

  if (asin) {
    const filesTable = files.querySelector('table')
    let domain = GM_getValue('audibleDomain', 'com')
    const a = document.createElement('a')
    a.href = `https://www.audible.${domain}/pd/${asin}`
    a.target = 'audible'
    a.textContent = `Audible.${domain}`
    a.style = 'margin-right: 20px;'
    a.addEventListener('click', (e) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const newDomain = prompt('enter Audible domain:', domain)
      domain = newDomain ?? domain
      GM_setValue('audibleDomain', domain)
      a.href = `https://www.audible.${domain}/pd/${asin}`
      a.textContent = `Audible.${domain}`
    })
    filesTable.parentElement.appendChild(a)
  }

  function getSearchQuery(mapPerson = (name) => name) {
    const form = document.querySelector('form[action="/tor/upload.php"]')
    const data = new FormData(form)
    const title = data.get('tor[title]')
    const authors = data.getAll('tor[author][]').filter(Boolean).map(mapPerson)
    const query =
      title && authors.length >= 1
        ? `${title.split(':')[0]} ${authors[0]}`
        : fullTitle
    return query
  }
  function onQueryChanged(callback) {
    const title = uploadForm.querySelector('input[name="tor[title]"]')
    title.addEventListener('input', callback)
    const authors = uploadForm.querySelector('#tdAuth')
    authors.addEventListener('input', callback)
  }

  {
    const filesTable = files.querySelector('table')
    const a = document.createElement('a')
    a.href = `https://www.goodreads.com/search?q=${encodeURIComponent(fullTitle)}`
    a.target = 'goodreads'
    a.textContent = 'Goodreads'
    a.style = 'margin-right: 20px;'
    filesTable.parentElement.appendChild(a)
    onQueryChanged(() => {
      a.href = `https://www.goodreads.com/search?q=${encodeURIComponent(getSearchQuery((name) => name.replaceAll(/([A-Z])\s([A-Z])\s/g, '$1.$2. ')))}`
    })
  }

  {
    const filesTable = files.querySelector('table')
    const a = document.createElement('a')
    a.href =
      `https://www.storytel.com/search/all?query=` +
      encodeURIComponent(fullTitle) +
      '&formats=abook%2Cebook'
    a.target = 'storytel'
    a.textContent = 'Storytel'
    a.style = 'margin-right: 20px;'
    filesTable.parentElement.appendChild(a)
    onQueryChanged(() => {
      a.href = `https://www.storytel.com/search/all?query=${encodeURIComponent(
        getSearchQuery(),
      )}&formats=abook%2Cebook`
    })
  }

  {
    const filesTable = files.querySelector('table')
    const a = document.createElement('a')
    a.href = `https://www.romance.io/search?q=${encodeURIComponent(fullTitle)}`
    a.target = 'romance.io'
    a.textContent = 'romance.io'
    a.style = 'margin-right: 20px;'
    filesTable.parentElement.appendChild(a)
    onQueryChanged(() => {
      a.href = `https://www.romance.io/search?q=${encodeURIComponent(getSearchQuery((name) => name.replaceAll(/([A-Z])\s([A-Z])\s/g, '$1.$2. ')))}`
    })
  }

  {
    const filesTable = files.querySelector('table')
    const a = document.createElement('a')
    a.href = `https://www.startpage.com/sp/search?q=${encodeURIComponent(fullTitle)}`
    a.target = 'startpage.com'
    a.textContent = 'Web'
    filesTable.parentElement.appendChild(a)
    onQueryChanged(() => {
      a.href = `https://www.startpage.com/sp/search?q=${encodeURIComponent(getSearchQuery())}`
    })
  }

  // JSON fill
  {
    uploadForm.querySelector('#fillJson')?.remove()

    const fillRow = document.createElement('tr')
    fillRow.className = 'torDetRow'
    fillRow.innerHTML =
      '<td class="row1">Fast Fill</td><td class="row1 jsonFill"><input type=file><br><input type=text></div>'
    const fillJsonFile = fillRow.querySelector('input[type="file"]')
    const fillJsonText = fillRow.querySelector('input[type="text"]')

    files.after(fillRow)
    fillJsonFile.addEventListener('change', () => {
      if (fillJsonFile.files.length === 1) {
        fillJsonText.value = ''
        const file = fillJsonFile.files[0]
        const reader = new FileReader()
        reader.onload = () => {
          jsonFill(JSON.parse(reader.result))
        }
        reader.onerror = () => {
          console.error('Error reading the file. Please try again.', 'error')
        }
        reader.readAsText(file)
      }
    })
    fillJsonText.addEventListener('input', () => {
      if (fillJsonText.value) {
        fillJsonFile.value = ''
        jsonFill(JSON.parse(fillJsonText.value))
      }
    })
  }

  // Title
  {
    const titleElm = document.querySelector('input[name="tor[title]"]')

    const readingLine = document.createElement('a')
    readingLine.textContent = '[cut reading line]'
    readingLine.href = '#'
    readingLine.onclick = (e) => {
      e.preventDefault()
      const [, titleText, readingLineText] =
        titleElm.value.match(/(^.+)(?:[:꞉]\s+([^:]+))$/) ?? []
      if (!titleText) return
      titleElm.value = titleText
      navigator.clipboard.writeText(readingLineText)
    }
    titleElm.after(readingLine)
    titleElm.after(document.createTextNode(' '))
    readingLine.after(document.createElement('br'))
  }

  // Categories
  {
    const catTd = uploadForm.querySelector(
      'td:has(input[name="tor[categories][]"])',
    )
    const toggle = document.createElement('div')
    toggle.id = 'showAllCats'
    toggle.innerHTML = `<label>Show all <input type=checkbox></label>`
    catTd.prepend(toggle)
  }

  acField(document.querySelector('#tdAuth'), 'author')
  acField(document.querySelector('#tdSeries'), 'series')
  acField(document.querySelector('#tdNar'), 'narrator')

  {
    const seriesTd = document.querySelector('#tdSeries')
    if (seriesTd.firstChild.nodeType === 3) seriesTd.firstChild.remove()
    if (seriesTd.firstChild.tagName === 'SPAN') seriesTd.firstChild.remove()
    if (seriesTd.firstChild.nodeType === 3) seriesTd.firstChild.remove()
    if (seriesTd.firstChild.tagName === 'BR') seriesTd.firstChild.remove()
  }

  function autoCategoriesEnabled() {
    return localStorage.getItem('uploadFormHelper::autoCategories') === 'true'
  }

  // Tags
  {
    const a = document.createElement('a')
    a.href = `#`
    a.textContent = '[cleanup]'
    a.style = 'margin-left: 20px;margin-right: 20px;'
    a.addEventListener('click', (e) => {
      e.preventDefault()
      const input = tags.querySelector('input[name="tor[tags]"]')
      const tagsStart = input.value.lastIndexOf(' | ')

      let tagValues = input.value
        .slice(tagsStart + 3)
        .replaceAll(/([a-z])([A-Z0-9])/g, '$1, $2')
        .replaceAll(/(LGBT)([A-Z])/g, '$1, $2')
        .replaceAll(/(BDSM)([A-Z])/g, '$1, $2')
        .split(', ')
      const ignoreTags = [
        'Fiction',
        'Nonfiction',
        'Audiobook',
        'Literature',
        'Book Club',
        'Contemporary Romance',
      ]
      const mapTags = {
        'Autistic Spectrum Disorder': ['Autistic Spectrum Disorder', 'ASD'],
        'Lesbian Romance': ['Lesbian', 'Sapphic'],
        'Lesbian Fiction': ['Lesbian', 'Sapphic'],
        Lesbian: ['Lesbian', 'Sapphic'],
        'M M Romance': ['MM', 'Gay'],
        'Fantasy Romance': 'Romantasy',
      }
      tagValues = tagValues
        .filter((tag) => !ignoreTags.includes(tag))
        .flatMap((tag) => mapTags[tag] ?? [tag])
      tagValues = Array.from(new Set(tagValues))
      input.value = input.value.slice(0, tagsStart + 3) + tagValues.join(', ')
    })
    const br = tags.querySelector('br')
    br.parentElement.insertBefore(a, br)
    const autoCategories = document.createElement('label')
    autoCategories.innerHTML = `Autoupdate categories from tags: <input type=checkbox ${autoCategoriesEnabled() ? 'checked' : ''}>`
    autoCategories.querySelector('input').addEventListener('change', (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.currentTarget.checked) {
        localStorage.setItem('uploadFormHelper::autoCategories', 'true')
      } else {
        localStorage.removeItem('uploadFormHelper::autoCategories')
      }
    })
    a.after(autoCategories)
    a.after(document.createTextNode(' '))
  }
  // More tags
  {
    const tags = document.querySelector('input[name="tor[tags]"]')
    const mainCats = {
      1: ['Fantasy', 'Fiction'],
      2: ['Memoir', 'Autobiography', 'Self-Help', 'nonfiction'],
    }
    const cats = {
      Memoir: 3,
      Biography: 3,
      Autobiography: 3,
      Crime: 9,
      'Full Cast': 10,
      Fantasy: 13,
      Historical: 17,
      Horror: 19,
      Humor: 20,
      Children: 23,
      Classic: 28,
      Music: 32,
      Mystery: 34,
      Nature: 35,
      Paranormal: 36,
      Poetry: 38,
      Romance: 42,
      SF: 45,
      'Science Fiction': 45,
      'Self-Help': 46,
      'Urban Fantasy': 53,
      Western: 54,
      YA: 55,
      'New Adult': 55,
      'Young Adult': 55,
      'Coming Of Age': 55,
      'Literary Fiction': 57,
    }
    tags?.addEventListener('input', () => {
      if (!autoCategoriesEnabled()) return

      const text = tags.value
      if (
        text.includes('LGBT') ||
        text.includes('Queer') ||
        text.includes('Lesbian') ||
        text.includes('MM') ||
        text.includes('Transgender')
      ) {
        const lgbt = document.querySelector('input[name="tor[flags][lgbt]"]')
        if (lgbt) lgbt.checked = true
        const cat = document.querySelector(
          'input[name="tor[categories][]"][value="25"]',
        )
        if (cat) cat.checked = true
      }
      const activeMainCats = Object.entries(mainCats).filter(([_id, tags]) => {
        for (const tag of tags) {
          if (text.includes(tag)) return true
        }
        return false
      })
      if (activeMainCats.length === 1) {
        const id = activeMainCats[0][0]
        const cat = document.querySelector(
          `input[name="tor[main_cat]"][value="${id}"]`,
        )
        if (cat) cat.checked = true
      }
      for (const [cat, id] of Object.entries(cats)) {
        if (text.includes(cat)) {
          const cat = document.querySelector(
            `input[name="tor[categories][]"][value="${id}"]`,
          )
          if (cat) cat.checked = true
        }
      }
    })
  }

  // Description
  {
    const a = document.createElement('a')
    a.href = `#`
    a.textContent = 'space paragraphs'
    a.addEventListener('click', (e) => {
      e.preventDefault()
      tinyMCE.activeEditor.setContent(
        tinyMCE.activeEditor
          .getContent()
          .replaceAll(/<\/p>\s*<p>/gi, '</p><br><p>'),
      )
    })
    const td = uploadForm.querySelector('tr:has(>td#description) td')
    td.append(document.createElement('br'))
    td.append(a)
  }

  // Poster
  {
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td class="row2">Poster</td>
      <td class="row2">
        <img style="float:right; max-width: 400px; max-height: 400px;">
        Upload: <input autocomplete="off" name="poster" type="file" accept="image/*"><br>
        By URL: <input autocomplete="off" name="tor[posterURL]" type="text" value=""><br>
        <input type="checkbox" name="tor[noPoster]"> I can not find a poster to include for this upload</label><br>
      </td>
    `
    const origFileInput = uploadForm.querySelector('input[name="poster"]')
    origFileInput.parentElement.parentElement.remove()
    const isbnRow = uploadForm.querySelector('tr:has(input[name="tor[isbn]"])')
    isbnRow.parentElement.insertBefore(tr, isbnRow)

    const fileInput = tr.querySelector('input[name="poster"]')
    const urlInput = tr.querySelector('input[name="tor[posterURL]"]')
    const img = tr.querySelector('img')

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length === 1) {
        urlInput.value = ''
        const file = fileInput.files[0]
        const url = URL.createObjectURL(file)
        img.src = url
      } else if (!urlInput.value) {
        img.src = ''
      }
    })
    urlInput.addEventListener('input', () => {
      if (urlInput.value) {
        fileInput.value = ''
        img.src = `https://cdn.myanonamouse.net/images/imageGateway.php?${urlInput.value}`
      } else if (fileInput.files.length !== 1) {
        img.src = ''
      }
    })
  }

  // Other torrents with search
  let otherTorrentsSearchTable
  let otherTorrentsSearchQuery
  let otherTorrentsResearchOnFill = false
  {
    const otherRow = document.createElement('tr')
    otherRow.className = 'torDetRow'
    otherRow.innerHTML =
      '<td class="row1">Other Torrents</td><td class="row1 otherTorrents-container"><input id="otherTorrents-query" style="width:100%"><table class="newTorTable"></table></div>'
    uploadForm.insertBefore(
      otherRow,
      files.nextElementSibling.nextElementSibling,
    )
    otherTorrentsSearchTable = otherRow.querySelector('table')

    otherTorrentsSearchQuery = otherRow.querySelector('#otherTorrents-query')
    let lastQuery = title
    otherTorrentsSearchQuery.value = lastQuery
    otherTorrentsSearchQuery.addEventListener('blur', (e) => {
      if (e.currentTarget.value !== lastQuery) {
        lastQuery = e.currentTarget.value

        searchTorrents(lastQuery, true)
      }
    })
    searchTorrents(lastQuery)
  }

  async function searchTorrents(query, includeAuthor = false) {
    otherTorrentsSearchQuery.value = query
    const response = await fetch(
      'https://www.myanonamouse.net/tor/js/loadSearchJSONbasic.php',
      {
        method: 'post',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          thumbnail: true,
          description: true,
          tor: {
            text: prepareQuery(query),
            srchIn: {
              title: 'true',
              author: includeAuthor ? 'true' : undefined,
            },
          },
        }),
      },
    )
    const body = await response.json()
    otherTorrentsResearchOnFill = body.data?.length > 10
    console.log('MaM Upload Helper response', body)
    await addOtherTorrents(otherTorrentsSearchTable, body)
  }

  async function addOtherTorrents(table, body, uploadHelpers = true) {
    let added = false
    if (body.data) {
      table.innerHTML = ''

      for (const t of body.data) {
        added = true

        const row = document.createElement('tr')
        row.innerHTML = `<td>${t.cat}</td><td><div style="width:79px;"></div><div class="posterImage"><img></div></td><td class="expand"><a class="torTitle"></a> by <a class="author"></a><br><span class="torNarrator">Narrated by: <a class="narrator"></a></span> | <span class="series_info"><span class="torSeries"> Series: <a class="series" href=""></a></span></span><br></span><span class="torRowDesc"></span><br><span class="torFileTypes"><a></a></span> | <span class="comments"></span> comments</td><td></td><td class="shrink"><a></a><br></td><td></td><td><p>0</p><p>0</p><p>0</p></td>`
        const poster = row.querySelector('.posterImage img')
        const title = row.querySelector('.torTitle')
        let author = row.querySelector('.author')
        let narrator = row.querySelector('.narrator')
        let series = row.querySelector('.series')
        const desc = row.querySelector('.torRowDesc')
        const fileType = row.querySelector('.torFileTypes a')
        const comments = row.querySelector('.comments')
        const tags = row.querySelector('td:nth-child(2)')
        const info = row.querySelector('td:nth-child(3)')
        const links = row.querySelector('td:nth-child(4)')
        const size = row.querySelector('td:nth-child(5)')
        const numfiles = row.querySelector('td:nth-child(5) a')
        const upload = row.querySelector('td:nth-child(6)')
        const seeders = row.querySelector('td:nth-child(7) p:nth-of-type(1)')
        const leechers = row.querySelector('td:nth-child(7) p:nth-of-type(2)')
        const times_completed = row.querySelector(
          'td:nth-child(7) p:nth-of-type(3)',
        )

        if (t.lang_code !== 'ENG') {
          const lang = document.createElement('span')
          lang.textContent = `[${t.lang_code}]`
          info.insertBefore(lang, info.firstChild)
        }

        if (t.poster_type) {
          poster.src = `https://cdn.myanonamouse.net/tor/poster_mini.php/${t.id}/${t.poster_type.replace('image/', '')}`
        }

        if (t.personal_freeleech) {
          tags.innerHTML += '<span title="personal freeleech">PF</span>'
        }
        if (t.free) {
          tags.innerHTML +=
            '<img src="https://cdn.myanonamouse.net/pic/freedownload.gif" alt="">'
        }
        if (t.vip) {
          if (t.vip_expire) {
            const date = new Date(t.vip_expire * 1000)
            const expire_date = date.toISOString().slice(0, 10)
            const days = Math.floor((date - Date.now()) / 1000 / 60 / 60 / 24)
            tags.innerHTML += `<img src="https://cdn.myanonamouse.net/pic/vip_temp.png" alt="VIP expires ${expire_date} (in ${days} days)" title="VIP expires ${expire_date} (in ${days} days)">`
          } else {
            tags.innerHTML +=
              '<img src="https://cdn.myanonamouse.net/pic/vip.png" alt="VIP" title="VIP">'
          }
        }
        if (t.browseflags & (1 << 1)) {
          tags.innerHTML +=
            '<img alt="Contains Crude Language" title="Contains Crude Language" src="https://cdn.myanonamouse.net/pic/language.png">'
        }
        if (t.browseflags & (1 << 2)) {
          tags.innerHTML +=
            '<img alt="Contains Violence" title="Contains Violence" src="https://cdn.myanonamouse.net/pic/hand.png">'
        }
        if (t.browseflags & (1 << 3)) {
          tags.innerHTML +=
            '<img alt="Contains Some Explicit Sexual Content" title="Contains Some Explicit Sexual Content" src="https://cdn.myanonamouse.net/pic/lipssmall.png">'
        }
        if (t.browseflags & (1 << 4)) {
          tags.innerHTML +=
            '<img alt="Contains Explicit Sexual Content" title="Contains Explicit Sexual Content" src="https://cdn.myanonamouse.net/pic/flames.png">'
        }
        if (t.browseflags & (1 << 5)) {
          tags.innerHTML +=
            '<img alt="Abridged book" title="Abridged book" src="https://cdn.myanonamouse.net/pic/abridged.png">'
        }
        if (t.browseflags & (1 << 6)) {
          tags.innerHTML +=
            '<img alt="LGBT themed" title="LGBT themed" src="https://cdn.myanonamouse.net/pic/lgbt.png">'
        }

        title.textContent = t.title
        title.href = `/t/${t.id}`
        let authorInfo
        try {
          authorInfo = JSON.parse(t.author_info)
          let clone = false
          for (const [id, name] of Object.entries(authorInfo)) {
            if (clone) author = cloneAndInsert(author)
            clone = true
            author.textContent = decodeHtml(name)
            author.href = `/tor/browse.php?author=${id}&amp;tor%5Bcat%5D%5B%5D=0`
          }
        } catch {}
        let narratorInfo
        if (t.narrator_info) {
          try {
            narratorInfo = JSON.parse(t.narrator_info)
            let clone = false
            for (const [id, name] of Object.entries(narratorInfo)) {
              if (clone) narrator = cloneAndInsert(narrator)
              clone = true
              narrator.textContent = decodeHtml(name)
              narrator.href = `/tor/browse.php?narrator=${id}&amp;tor%5Bcat%5D%5B%5D=0`
            }
          } catch {}
        } else {
          row.querySelector('.torNarrator').nextSibling.remove()
          row.querySelector('.torNarrator').remove()
        }
        let seriesInfo
        if (t.series_info) {
          try {
            seriesInfo = JSON.parse(t.series_info)
            let clone = false
            for (const [id, [name, num]] of Object.entries(seriesInfo)) {
              if (clone) series = cloneAndInsert(series)
              clone = true
              series.textContent = `${decodeHtml(name)} (#${num})`
              series.href = `/tor/browse.php?series=${id}&amp;tor%5Bcat%5D%5B%5D=0`
            }
          } catch {}
        } else {
          if (t.narrator_info) {
            row.querySelector('.torNarrator').nextSibling.remove()
          } else {
            row.querySelector('.series_info').nextSibling.remove()
          }
          row.querySelector('.series_info').remove()
        }
        desc.textContent = t.tags
        fileType.textContent = t.filetype
        comments.textContent = t.comments
        if (t.my_snatched) {
          info.appendChild(document.createElement('br'))
          const snatched = document.createElement('div')
          snatched.className = 'browseAct'
          snatched.innerHTML = 'Previously Downloaded'
          info.appendChild(snatched)
        }
        if (t.categories) {
          let categories
          try {
            categories = JSON.parse(t.categories)
          } catch {}
          if (categories) {
            info.appendChild(document.createElement('br'))
            const multiCat = document.createElement('div')
            multiCat.id = 'searchMultiCat'
            for (const id of categories) {
              let name = categoryData.categories[id]
              if (!name) {
                await fetchCategoryData()
                name = categoryData.categories[id]
              }
              if (name) {
                const cat = document.createElement('a')
                cat.className = 'mCat'
                cat.dataset.mcatid = id
                cat.textContent = name
                multiCat.appendChild(cat)
              }
            }
            info.appendChild(multiCat)
          }
        }

        {
          let linksHTML = ''
          if (t.bookmarked) {
            linksHTML += `<a id="torDeBookmark${t.id}" title="Remove bookmark" role="button" tabindex="0">remove bookmark</a>`
          } else {
            linksHTML += `<a id="torBookmark${t.id}" title="bookmark" role="button">Bookmark</a>`
          }
          if (uploadHelpers) {
            linksHTML += `<a id="vipMatch${t.id}" title="VIP match" role=button><img src="https://cdn.myanonamouse.net/pic/vip.png"></a>`
            linksHTML += `<a id="clone${t.id}" title="Clone" role=button><img src="https://cdn.myanonamouse.net/pic/pencil.png"></a>`
          }
          links.innerHTML = linksHTML

          links
            .querySelector(`#torDeBookmark${t.id}`)
            ?.addEventListener('click', (e) => {
              e.preventDefault()
              $unsafeWindow.delBookmarkConfirm(t.id)
            })
          links
            .querySelector(`#torBookmark${t.id}`)
            ?.addEventListener('click', (e) => {
              e.preventDefault()
              $unsafeWindow.bookmarkClick('add', t.id)
            })
          links
            .querySelector(`#vipMatch${t.id}`)
            ?.addEventListener('click', (e) => {
              e.preventDefault()
              const checkbox = uploadForm.querySelector(
                'input[name="tor[vip]"]',
              )
              if (t.vip) {
                const daysInput = uploadForm.querySelector(
                  'input[name="tor[uploadVIPdays]"]',
                )
                checkbox.checked = true
                if (t.vip_expire) {
                  const date = new Date(t.vip_expire * 1000)
                  const days = Math.floor(
                    (date - Date.now()) / 1000 / 60 / 60 / 24,
                  )
                  daysInput.value = days
                } else {
                  daysInput.value = 0
                }
              } else {
                checkbox.checked = false
              }
              e.currentTarget.animate(
                [
                  { filter: 'hue-rotate(0deg)' },
                  { filter: 'hue-rotate(180deg)' },
                  { filter: 'hue-rotate(0deg)' },
                ],
                { duration: 300 },
              )
            })
          links
            .querySelector(`#clone${t.id}`)
            ?.addEventListener('click', (e) => {
              e.preventDefault()
              jsonFill({
                title: t.title,
                language: t.language,
                category: t.catname,
                authors: Object.values(authorInfo ?? {}),
                series: Object.values(seriesInfo ?? {}),
                narrators: Object.values(narratorInfo ?? {}),
                tags: t.tags,
                description: t.description,
                vip: t.vip,
                vip_expire: t.vip_expire,
              })
            })
        }

        numfiles.href = `/t/${t.id}&filelist#filelistLink`
        numfiles.target = '_blank'
        numfiles.textContent = t.numfiles
        size.innerHTML += `[${t.size}]`
        upload.innerHTML = t.added.replace(' ', '<br>') + '<br>'
        if (t.owner) {
          upload.innerHTML += `[<a href="/u/${t.owner}"></a>]`
          upload.querySelector('a').textContent = t.owner_name
        } else {
          upload.innerHTML += `[hidden]`
        }

        seeders.textContent = t.seeders
        leechers.textContent = t.leechers
        times_completed.textContent = t.times_completed

        table.appendChild(row)
      }
    }

    if (!added) {
      table.innerHTML =
        '<tr><td>No other torrents from any of the authors with a matching title were found</td></tr>'
    }
  }

  function prepareQuery(query) {
    return query
      .replaceAll(/([*?])/g, '"$1"')
      .replaceAll(/(['`/]| - )/g, ' ')
      .replaceAll(/&|\band\b/g, '(&|and)')
      .replaceAll('!', '')
      .replaceAll(/\s+[([][^)\]]+[)\]]/g, '')
      .trim()
  }

  {
    const submit = uploadForm.querySelector(
      'input[type="submit"][value="Submit"]',
    )
    const preview = document.createElement('button')
    preview.type = 'button'
    preview.textContent = 'Preview Torrent'
    preview.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      torrentPreview()
    })
    submit.parentElement.prepend(preview)
    submit.remove()
  }

  function cloneAndInsert(element) {
    const clone = element.cloneNode()
    element.parentElement.insertBefore(clone, element.nextSibling)
    return clone
  }

  function decodeHtml(html) {
    const template = document.createElement('textarea')
    template.innerHTML = html
    return template.value
  }

  function acField(td, type) {
    td.addEventListener('focusout', doSearch)
    td.addEventListener('input', doSearch)
    td.addEventListener('click', (e) => {
      const target = e.target
      if (target?.tagName !== 'DIV') return
      if (target.classList.has('minusDiv')) {
        let br = target
        while (br && br.tagName !== 'BR') {
          const old = br
          br = br.nextElementSibling
          if (old.classList.contains('acPreview')) {
            old.remove()
          }
        }
      }
    })

    async function doSearch(e) {
      const target = e.target
      if (target?.tagName !== 'INPUT') return
      if (target === document.activeElement) return
      if (target.name.endsWith('[extra]')) return

      acFieldSearch(target, target.value, type)
    }
  }
  async function acFieldSearch(target, value, type) {
    let el
    if (value) {
      const entity = await acExactSearch(value, type)
      if (entity) {
        el = document.createElement('a')
        el.target = '_blank'
        el.href = `https://www.myanonamouse.net/tor/browse.php?${type}=${entity.id}`
        el.textContent = entity.value
      } else {
        el = document.createElement('i')
        el.textContent = 'new entity'
      }
      el.className = 'acPreview'
    }
    let br = target
    while (br && br.tagName !== 'BR') {
      const old = br
      br = br.nextElementSibling
      if (old.classList.contains('acPreview')) {
        old.remove()
      }
    }
    if (el) {
      if (br) {
        br.parentElement.insertBefore(el, br)
      } else {
        target.parentElement.appendChild(el)
      }
    }
  }

  async function acExactSearch(term, type) {
    const normalized = normalizeAc(term)
    if (acCache[type]?.[normalized])
      return { value: term, id: acCache[type][normalized] }
    const results = await acSearch(term, type)
    const result = results.find((e) => normalizeAc(e.value) === normalized)
    if (result) return result

    // The ac search does not always return an exact match in the result, fallback to a torrent search
    const response = await fetch(
      'https://www.myanonamouse.net/tor/js/loadSearchJSONbasic.php',
      {
        method: 'post',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tor: {
            text: `"${term}"`,
            srchIn: {
              [type]: 'true',
            },
          },
        }),
      },
    )
    const body = await response.json()
    for (const torrent of body.data ?? []) {
      let info
      try {
        info = JSON.parse(torrent[`${type}_info`])
      } catch {}
      if (info) {
        for (let [id, name] of Object.entries(info)) {
          if (Array.isArray(name)) name = name[0]
          const normalizedName = normalizeAc(name)
          acCache[type][normalizedName] = +id
          if (normalizedName === normalized) {
            return { value: name, id: +id }
          }
        }
      }
    }
    return
  }

  async function acSearch(term, type) {
    const normalized = normalizeAc(term)
    if (acCache[type]?.[normalized])
      return [{ value: term, id: acCache[type][normalized] }]
    const raw = await cookieStore.get('mam_id')
    const mamId = decodeURIComponent(raw.value)
    const body = new URLSearchParams()
    body.append('term', term)
    body.append('type', type)
    body.append('mam_id', mamId)

    // The server returns an error if term has & in it
    try {
      const res = await fetch(
        'https://cdn.myanonamouse.net/json/ac_names.php',
        {
          method: 'POST',
          headers: {
            Accept: 'application/json, text/javascript, */*; q=0.01',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          },
          body,
          credentials: 'include',
        },
      )
      const json = await res.json()
      for (const entity of json) {
        acCache[type][normalizeAc(entity.value)] = entity.id
      }
      return json
    } catch (error) {
      console.error(`Error when searching for entity ${term}`, error)
      return []
    }
  }

  function normalizeAc(name) {
    return (
      name
        .normalize('NFD')
        // https://en.wikipedia.org/wiki/Combining_Diacritical_Marks
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replaceAll('.', ' ')
        .replaceAll(/\s+/g, ' ')
    )
  }

  function jsonFill(json) {
    document.querySelector('input[name="qjf"]').value = JSON.stringify(
      json,
      null,
      4,
    )
    if (json.isbn) {
      uploadForm.querySelector('input[name="tor[isbn]"]').value = json.isbn
    }
    if (json.title) {
      const input = uploadForm.querySelector('input[name="tor[title]"]')
      input.value = json.title
      setTimeout(() => {
        input.dispatchEvent(new Event('input', { target: input }))
      })
    }
    if (json.tags) {
      uploadForm.querySelector('input[name="tor[tags]"]').value = json.tags
    }
    if (json.category) {
      setValue('select[name="tor[category]"]', json.category)
    }
    if (json.mediaType) {
      check('name="tor[mediaType]"', json.mediaType)
    }
    if (json.main_cat) {
      check('name="tor[main_cat]"', json.main_cat)
    }
    if (json.categories) {
      for (const category of json.categories) {
        check('name="tor[categories][]"', category)
      }
    }
    if (json.language) {
      setValue('select[name="tor[language]"]', json.language)
    }
    if (json.authors) {
      fillEntities('#tdAuth', json.authors, 'author')
    }
    if (json.series) {
      fillEntities(
        '#tdSeries',
        json.series.map((v) => (Array.isArray(v) ? v : [v.name, v.number])),
        'series',
      )
    }
    if (json.narrators) {
      fillEntities('#tdNar', json.narrators, 'narrator')
    }
    if (json.description) {
      uploadForm.querySelector('textarea[name="tor[description]"]').value =
        json.description
      try {
        tinyMCE.activeEditor.setContent(json.description)
      } catch (e) {
        console.error('description failed', e)
      }
    }
    if (json.thumbnail) {
      uploadForm.querySelector('input[name="tor[posterURL]"]').value =
        json.thumbnail
    }
    if (json.flags) {
      ;['cLang', 'vio', 'sSex', 'eSex', 'abridged', 'lgbt'].forEach((flag) => {
        uploadForm.querySelector(`input[name="tor[flags][${flag}]"]`).checked =
          !!json.flags[flag]
      })
    }
    if (json.vip != null) {
      uploadForm.querySelector('input[name="tor[vip]"]').checked = !!json.vip
    }
    if (json.vip_days != null) {
      uploadForm.querySelector('input[name="tor[uploadVIPdays]"]').value =
        json.vip_days
    } else if (json.vip_expire) {
      const date = new Date(json.vip_expire * 1000)
      const days = Math.floor((date - Date.now()) / 1000 / 60 / 60 / 24)
      uploadForm.querySelector('input[name="tor[uploadVIPdays]"]').value = days
    }
    if (json.mediaInfo) {
      if (typeof json.mediaInfo !== 'string') {
        json.mediaInfo = JSON.stringify(json.mediaInfo)
      }
      uploadForm.querySelector('textarea[name="tor[mediaInfo]"]').value =
        json.mediaInfo
    }

    if (otherTorrentsResearchOnFill && json.title && json.authors?.[0]) {
      searchTorrents(`${json.title} ${json.authors[0]}`, true)
    }
    otherTorrentsSearchQuery?.focus()
    if (
      localStorage.getItem('uploadFormHelper::jsonFill') !==
      'I will check that information is correct'
    ) {
      setTimeout(() => {
        alertBox(
          'Fast Fill out complete',
          'The fast filling in via json has been completed.<br /><br />It is now <strong>your duty</strong> to check that the information is correct.<br /><br />This fast option is a privilege, that is being abused.<br />This continued abuse by some are putting it at risk of being removed.<br />Please check that the information is correct and matches rules and regulations.',
          800,
        )
      })
    }
  }
  function check(name, value) {
    if (typeof value === 'number') {
      const input = uploadForm.querySelector(`input[${name}][value="${value}"]`)
      if (input) input.checked = true
    } else {
      if (name === 'LGBT') name = 'LGBTQIA+'
      value = value.toLowerCase().replaceAll(/[^a-z/ -]/g, '')
      const input = Array.from(
        uploadForm.querySelectorAll(`input[${name}]`),
      ).find(
        (input) =>
          input.parentElement.textContent
            .toLowerCase()
            .replaceAll(/[^a-z/ -]/g, '') === value,
      )
      if (input) input.checked = true
    }
  }
  function setValue(select, value) {
    select = document.querySelector(select)
    if (typeof value === 'number') {
      const opt = select.querySelector(`option[value="${value}"]`)
      if (opt) opt.selected = true
    } else {
      value = value.toLowerCase().replaceAll(/[^a-z/ -]/g, '')
      const opt = Array.from(select.querySelectorAll(`option`)).find(
        (opt) =>
          opt.textContent.toLowerCase().replaceAll(/[^a-z/ -]/g, '') === value,
      )
      if (opt) opt.selected = true
    }
  }
  function fillEntities(td, values, type) {
    td = document.querySelector(td)
    while (true) {
      const el = td.querySelector('.acPreview')
      if (el) {
        el.remove()
      } else {
        break
      }
    }
    while (true) {
      const input = td.querySelector('input')
      if (input?.value) {
        const minus = input.nextElementSibling
        if (minus?.classList.contains('minusDiv'))
          minus.dispatchEvent(new Event('click'))
        else break
      } else {
        break
      }
    }
    for (const value of values) {
      let input = td.querySelector('input:last-of-type')
      if (Array.isArray(value)) {
        for (const v of Array.from(value).reverse()) {
          if (input) {
            input.value = v
            if (v === value[0]) {
              acFieldSearch(input, v, type)
            }
            input = input.previousElementSibling
          }
        }
      } else {
        if (input) {
          input.value = value
          acFieldSearch(input, value, type)
        }
      }
      const plus = td.querySelector('.plusDiv')
      if (plus) plus.dispatchEvent(new Event('click'))
    }
  }

  async function torrentPreview() {
    const form = document.querySelector('form[action="/tor/upload.php"]')
    const div = document.createElement('div')
    div.id = 'torrentPreview'
    const data = new FormData(form)
    const isbn = data.get('tor[isbn]')
    const title = data.get('tor[title]')
    const description = $unsafeWindow.tinyMCE.activeEditor.getContent({
      format: 'raw',
    })
    const cat = data.get('tor[category]')
    const mediaTypeId = data.get('tor[mediaType]')
    const mediaType = uploadForm.querySelector(
      `input[name="tor[mediaType]"][value="${mediaTypeId}"]`,
    )?.parentElement?.textContent
    const mainCatId = data.get('tor[main_cat]')
    const mainCat = uploadForm.querySelector(
      `input[name="tor[main_cat]"][value="${mainCatId}"]`,
    )?.parentElement?.textContent
    const categories = data.getAll('tor[categories][]').map((id) => ({
      id,
      name: uploadForm.querySelector(
        `input[name="tor[categories][]"][value="${id}"]`,
      )?.parentElement?.textContent,
    }))
    const languageId = data.get('tor[language]')
    const language = uploadForm.querySelector(
      `select[name="tor[language]"] option[value="${languageId}"]`,
    )?.textContent
    const authors = await Promise.all(
      data
        .getAll('tor[author][]')
        .filter(Boolean)
        .map(async (a) => ({
          id: (await acExactSearch(a, 'author'))?.id,
          name: a,
        })),
    )
    let series = []
    data.forEach((value, key) => {
      if (key.startsWith('tor[series]') && key.endsWith('[name]')) {
        series.push(
          acExactSearch(value, 'series').then((entity) => ({
            id: entity?.id,
            name: value,
            number: data.get(key.replace('name', 'extra')),
          })),
        )
      }
    })
    series = await Promise.all(series)
    const narrators = await Promise.all(
      data
        .getAll('tor[narrator][]')
        .filter(Boolean)
        .map(async (a) => ({
          id: (await acExactSearch(a, 'narrator'))?.id,
          name: a,
        })),
    )
    const filetypes = data.getAll('tor[ext][]').filter((v) => v !== 'yesIexist')
    const tags = data.get('tor[tags]')
    const posterFile = data.get('poster')
    let posterUrl = data.get('tor[posterURL]')
    if (posterUrl) {
      posterUrl = `https://cdn.myanonamouse.net/images/imageGateway.php?${posterUrl}`
    } else if (posterFile?.size) {
      posterUrl = URL.createObjectURL(posterFile)
    }
    const flags = []
    if (data.get('tor[flags][cLang]')) {
      flags.push({ title: 'Contains Crude Language', icon: 'language' })
    }
    if (data.get('tor[flags][vio]')) {
      flags.push({ title: 'Contains Violence', icon: 'hand' })
    }
    if (data.get('tor[flags][sSex]')) {
      flags.push({
        title: 'Contains Some Explicit Sexual Content',
        icon: 'lipssmall',
      })
    }
    if (data.get('tor[flags][eSex]')) {
      flags.push({ title: 'Contains Explicit Sexual Content', icon: 'flames' })
    }
    if (data.get('tor[flags][abridged]')) {
      flags.push({ title: 'Abridged book', icon: 'abridged' })
    }
    if (data.get('tor[flags][lgbt]')) {
      flags.push({ title: 'LGBT themed', icon: 'lgbt' })
    }
    const vip = data.get('tor[vip]')
    const vip_days = +data.get('tor[uploadVIPdays]')
    let vip_expire_date = new Date()
    vip_expire_date.setDate(vip_expire_date.getDate() + vip_days)
    vip_expire_date = vip_expire_date.toISOString().slice(0, 10)
    const mediaInfoRaw = data.get('tor[mediaInfo]')
    let mediaInfo
    try {
      mediaInfo = JSON.parse(mediaInfoRaw)
    } catch {}
    const mediaGeneral = mediaInfo?.media?.track?.find(
      (t) => t['@type'] === 'General',
    )
    const mediaAudio = mediaInfo?.media?.track?.find(
      (t) => t['@type'] === 'Audio',
    )
    const mediaMenu = mediaInfo?.media?.track?.find(
      (t) => t['@type'] === 'Menu',
    )

    let media
    if (mediaGeneral) {
      const hrs = Math.floor(+mediaGeneral.Duration / 60 / 60)
      const mins = Math.floor((+mediaGeneral.Duration / 60) % 60)
      media = {
        hrs,
        mins,
        duration:
          hrs && mins
            ? `${hrs} hrs ${mins} mins`
            : hrs
              ? `${hrs} hrs`
              : `${mins} mins`,
        bitrate: Math.floor(+mediaGeneral.OverallBitRate / 1000),
        type: mediaGeneral.OverallBitRate_Mode,
      }
    }
    const chapters =
      mediaMenu &&
      Object.entries(mediaMenu.extra)
        .filter(([key]) => key.startsWith('_'))
        .map(([key, value]) => [
          key.slice(1).split('_').slice(0, -1).join(':'),
          value,
        ])

    const titleCheckUrl = new URL(
      'https://titlecaseconverter.com/?showExplanations=1&keepAllCaps=1&multiLine=0&highlightChanges=1&convertOnPaste=1&straightQuotes=1',
    )
    {
      const isEnglish = +languageId === 1 || language === 'English'
      const params = new URLSearchParams(titleCheckUrl.search)
      params.append('style', isEnglish ? 'MLA' : 'SC')
      params.append('title', title.replaceAll('%', ''))
      titleCheckUrl.search = params
    }

    const errors = [
      !posterUrl && 'Missing poster',
      !title && 'Missing title',
      authors.length === 0 && 'Missing authors',
      !cat && 'Missing old category',
      !mediaType && 'Missing media type',
      !mainCat && 'Missing main category',
      categories.length === 0 && 'Missing new categories',
      !tags && 'Missing tags',
      !(mediaInfo || mediaType !== 'Audiobook') && 'Missing media info',
    ].filter(Boolean)
    const warnings = []

    {
      const [, _titleText, readingLineText] =
        title.match(/(^.+)(?:[:꞉]\s+([^:]+))$/) ?? []
      if (
        readingLineText?.match(
          /A\s+((Novel|Memoir)|.*\s+(Mystery|Novel|Novella|Fantasy(\s+Adventure)?|Romance))$/i,
        )
      ) {
        warnings.push(
          `Title might include a reading line, verify that it is correct`,
        )
      }
      if (
        readingLineText?.match(/(A\s+.*\s+(Prequel|Standalone))|(Series)$/i)
      ) {
        warnings.push(
          `Title might include a series name, verify that it is correct`,
        )
      }
    }
    for (const author of authors) {
      if (author.name.match(/[A-Z][A-Z]/)) {
        warnings.push(
          `Author initials should be split, verify that <i>${author.name}</i> is correct`,
        )
      }
    }
    for (const serie of series) {
      if (
        serie.name.match(/^(the|a) .* (book|novel|novella|series?|saga)$/i) ||
        serie.name.match(/(series)$/i)
      ) {
        warnings.push(
          `Series look like it contains a reading line, verify that <i>${serie.name}</i> is correct`,
        )
      }
    }
    for (const narrator of narrators) {
      if (narrator.name.match(/[A-Z][A-Z]/)) {
        warnings.push(
          `Narrator initials should be split, verify that <i>${narrator.name}</i> is correct`,
        )
      }
    }
    if (+mediaTypeId === 1 && narrators.length === 0) {
      warnings.push(`Missing narrators`)
    }
    if (tags.match(/([,|])\s*$/) || tags.match(/^\s*([,|])/)) {
      warnings.push(`Tags and Labels look incomplete`)
    }

    function renderErrors() {
      return (
        errors.map((error) => `<p class=uploadError>${error}</p>`).join('') +
        warnings.map((error) => `<p class=uploadError>${error}</p>`).join('')
      )
    }

    div.innerHTML = `<div id="torDetMainCon">
  <div id="posterHolder" style="width: 302px; height: 302px">&nbsp;</div>
  <img id="torDetPoster" src="${posterUrl}" class="torDetPoster" />
  <div class="torDetRow torDetRowFirst">
    <div class="torDetLeft">Title <a href="${titleCheckUrl}" target=titlecaseconverter>[check]</a></div>
    <div class="torDetRight">
      <span class="flex"><span class="TorrentTitle">${title}</span></span>
    </div>
  </div>
  <div class="torDetRow">
    <div class="torDetLeft">Author</div>
    <div class="torDetRight torAuthors">
      <span class="flex">
	${authors.map((a) => `<a class="altColor" href="${a.id ? `/tor/browse.php?author=${a.id}` : '#'}">${a.name.replaceAll(' ', '&nbsp')}</a>`).join(' ')}
      </span>
    </div>
  </div>
  <div class="torDetRow">
    <div class="torDetLeft">Series</div>
    <div id="Series" class="torDetRight torSeries">
      <span class="flex">
	${series.map((s) => `<a class="altColor" href="${s.id ? `/tor/browse.php?series=${s.id}` : '#'}">${s.name.replaceAll(' ', '&nbsp')}</a>${s.number ? ` (#${s.number})` : ''}`).join(' ')}
      </span>
    </div>
  </div>
  <div class="torDetRow">
    <div class="torDetLeft">Narrator</div>
    <div id="Narrator" class="torDetRight">
      <span class="flex">
	${narrators.map((n) => `<a class="altColor" href="${n.id ? `/tor/browse.php?narrator=${n.id}` : '#'}">${n.name.replaceAll(' ', '&nbsp')}</a>`).join(' ')}
      </span>
    </div>
  </div>
  <div class="torDetRow">
    <div class="torDetLeft">Category</div>
    <div id="fInfo" class="torDetRight">
      <span class="flex" style="gap: 8px">
        <a class="newCatLink" href="/tor/browse.php?tor[cat][]]=${cat}">
          <div class="cat${cat}">&nbsp;</div>
        </a>
        <a class="newCatLink" href="#" title="${mediaType} - ${mainCat}"><div class="media${mediaTypeId}-${mainCatId}">&nbsp;</div></a>
        <div id="multiCat">${categories.map((cat) => `<a class="mCat" data-mcatid="${cat.id}">${cat.name}</a>`).join('')}</div>
      </span>
    </div>
  </div>
  <div class="torDetRow">
    <div class="torDetLeft">Tags and Labels:</div>
    <div class="torDetRight">
      <span class="flex">
        ${tags}
      </span>
    </div>
  </div>
  <div class="torDetRow">
    <div class="torDetLeft">
      File Info<br />
      ${
        vip
          ? vip_days
            ? `<img
        src="https://sas.myanonamouse.net/pic/vip_temp.png"
        alt="VIP expires ${vip_expire_date} (in ${vip_days} days)"
        title="VIP expires ${vip_expire_date} (in ${vip_days} days)"
      />`
            : `<img
        src="https://sas.myanonamouse.net/pic/vip.png"
        alt="VIP"
        title="VIP"
      />`
          : ``
      }
      ${flags
        .map(
          (flag) => `<img
        alt="${flag.title}"
        title="${flag.title}"
        src="https://cdn.myanonamouse.net/pic/${flag.icon}.png"
      />`,
        )
        .join('')}
    </div>
    <div id="fInfo" class="torDetRight">
      <span class="flex">
	${
    language
      ? `<div id="language" class="torDetInnerCon ">
		<div class="torDetInnerTop ">Language</div>
		<div class="torDetInnerBottomSpan "><span>${language}</span></div>
	</div>`
      : ''
  }
        <div id="isbn" class="torDetInnerCon">
          <div class="torDetInnerTop">ISBN</div>
          <div class="torDetInnerBottomSpan"><span>${isbn}</span></div>
        </div>
        <div class="torDetInnerCon fileTypeList">
          <div class="torDetInnerTop">Filetypes</div>
          <div id="PrimaryFileTypes" class="torDetInnerBottomSpan torFileTypes">
            <span><a>${filetypes}</a></span>
          </div>
        </div>
        ${
          media
            ? `<div class="torDetInnerCon">
          <div class="torDetInnerTop">Media</div>
          <div class="torDetInnerBottomSpan">
            <span>${media.bitrate}k ${media.type}<br>
            ${media.duration}</span>
          </div>
        </div>`
            : ''
        }
      </span>
    </div>
  </div>
  <div class="torDetRow">
    <div class="torDetLeft">Other Torrents</div>
    <div class="torDetRight otherTorrents-container"><table class="newTorTable"></table></div>
  </div>
  <div class="torDetBottom">
    <div id="torDetDesc" class="torDetInnerCon">
      <div class="torDetInnerTop">Description</div>
      <div id="torDesc" class="torDetInnerBottom"></div>
    </div>
    ${
      media
        ? `<div class="torDetInnerCon" style="width: 30em">
      <div class="torDetInnerTop">Media Info</div>
      <div class="torDetInnerBottom" style="text-align:left;overflow:auto;max-height:500px">
        <div style="padding-left: 2em;"><b>General</b>
          <div style="padding-left: 2em;"><b>Title</b>: ${mediaGeneral.Title}</div>
          <div style="padding-left: 2em;"><b>Format</b>: ${mediaGeneral.Format}</div>
          <div style="padding-left: 2em;"><b>Duration</b>: ${media.duration}</div>
        </div>
        ${
          mediaAudio
            ? `<div style="padding-left: 2em;"><b>Audio1</b>
          <div style="padding-left: 2em;"><b>Compression_Mode</b>: ${mediaAudio.Compression_Mode}</div>
          <div style="padding-left: 2em;"><b>Channels</b>: ${mediaAudio.Channels}</div>
          <div style="padding-left: 2em;"><b>BitRate_Mode</b>: ${mediaAudio.BitRate_Mode}</div>
          <div style="padding-left: 2em;"><b>BitRate</b>: ${Math.floor(mediaAudio.BitRate / 1000)}k</div>
          <div style="padding-left: 2em;"><b>BitRate_Maximum</b>: ${Math.floor(mediaAudio.BitRate_Maximum / 1000)}k</div>
          <div style="padding-left: 2em;"><b>Format</b>: ${mediaAudio.Format}</div>
        </div>`
            : ''
        }
        ${
          chapters
            ? `<div style="padding-left: 2em;"><b>Chapters</b>
          ${chapters.map(([time, chapter]) => `<div style="padding-left: 2em;"><b>${time}:</b> ${chapter}</div>`).join('')}
        </div>`
            : ''
        }
      </div>`
        : ''
    }
    </div>
  </div>
  <div class=uploadErrors>${renderErrors()}</div>
  ${errors.length === 0 ? `<input type="submit" form="uploadFormForm" value="Upload Torrent">` : ''}
</div>
`

    form.id = 'uploadFormForm'
    div.querySelector('#torDesc').innerHTML = description
    const uploadErrors = div.querySelector('.uploadErrors')
    const otherTorrentsTable = div.querySelector(
      '.otherTorrents-container table',
    )

    document.querySelector('#torrentPreview')?.remove()
    form.parentElement.appendChild(div)

    async function searchOtherTorrents() {
      const authorsQuery = authors.map((a) => `"${a.name}"`).join(' | ')
      let response = await fetch(
        'https://www.myanonamouse.net/tor/js/loadSearchJSONbasic.php',
        {
          method: 'post',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            thumbnail: true,
            tor: {
              text: `${prepareQuery(title)} (${authorsQuery})`,
              srchIn: {
                title: 'true',
                author: 'true',
              },
            },
          }),
        },
      )
      let body = await response.json()
      console.log('MaM Other Torrents response', body)
      if (!body.data || body.data.length < 2) {
        const shortTitle = title.replace(/:.*/, '')
        if (shortTitle !== title) {
          response = await fetch(
            'https://www.myanonamouse.net/tor/js/loadSearchJSONbasic.php',
            {
              method: 'post',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                thumbnail: true,
                tor: {
                  text: `${prepareQuery(shortTitle)} (${authorsQuery})`,
                  srchIn: {
                    title: 'true',
                    author: 'true',
                  },
                },
              }),
            },
          )
          body = await response.json()
          console.log('MaM Other Torrents response', body)
        }
        if (!body.data) return
      }

      for (const torrent of body.data) {
        const expire_date = torrent.vip_expire
          ? new Date(torrent.vip_expire * 1000)
          : undefined
        const days = expire_date
          ? Math.floor((expire_date - Date.now()) / 1000 / 60 / 60 / 24)
          : 0
        if (
          torrent.mediatype === +mediaTypeId &&
          (!!vip !== !!torrent.vip || (!!vip && vip_days !== days))
        ) {
          warnings.push('Potential VIP mismatch')
          uploadErrors.innerHTML = renderErrors()
        }
      }

      addOtherTorrents(otherTorrentsTable, body, false)
    }
    searchOtherTorrents()
  }
})()
