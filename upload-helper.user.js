// ==UserScript==
// @name         MaM Upload Helper
// @namespace    Violentmonkey Scripts
// @version      0.2.1
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

;(async () => {
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
  const firstFile = files?.querySelector('tr td.row2')?.textContent
  const title = firstFile
    ?.replace(/[[\-.].*/, '')
    .replaceAll(/([*?])/g, '"$1"')
    .trim()
  const fullTitle = firstFile?.replace(/[[.].*/, '').trim()
  const asin = firstFile?.replace(/.*\[([A-Z0-9]+)\].*/, '$1').trim()
  const tags = uploadForm.querySelector('tr:has(input[name="tor[tags]"])')

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
      }
      .categoryPreview {
	width: 170px;
        background-color: var(--secondary-background);
	border-radious: 5px;
      }
      a.altColor[href="#"] {
        background-color: var(--red-background);
      }
      .torDetPoster:hover {
        max-width: 95vw;
        max-height: 95vh;
        cursor: zoom-out;
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

  function getSearchQuery() {
    const form = document.querySelector('form[action="/tor/upload.php"]')
    const data = new FormData(form)
    const title = data.get('tor[title]')
    const authors = data.getAll('tor[author][]').filter(Boolean)
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

  if (files) {
    const filesTable = files.querySelector('table')
    const a = document.createElement('a')
    a.href = `https://www.goodreads.com/search?q=${encodeURIComponent(fullTitle)}`
    a.target = 'goodreads'
    a.textContent = 'Goodreads'
    a.style = 'margin-right: 20px;'
    filesTable.parentElement.appendChild(a)
    onQueryChanged(() => {
      a.href = `https://www.goodreads.com/search?q=${encodeURIComponent(getSearchQuery())}`
    })
  }

  if (files) {
    const filesTable = files.querySelector('table')
    const a = document.createElement('a')
    a.href =
      `https://www.storytel.com/se/search/all?query=` +
      encodeURIComponent(fullTitle) +
      '&formats=abook%2Cebook'
    a.target = 'storytel'
    a.textContent = 'Storytel'
    a.style = 'margin-right: 20px;'
    filesTable.parentElement.appendChild(a)
    onQueryChanged(() => {
      a.href = `https://www.storytel.com/se/search/all?query=${encodeURIComponent(
        getSearchQuery(),
      )}&formats=abook%2Cebook`
    })
  }

  if (files) {
    const filesTable = files.querySelector('table')
    const a = document.createElement('a')
    a.href = `https://www.romance.io/search?q=${encodeURIComponent(fullTitle)}`
    a.target = 'romance.io'
    a.textContent = 'romance.io'
    filesTable.parentElement.appendChild(a)
    onQueryChanged(() => {
      a.href = `https://www.romance.io/search?q=${encodeURIComponent(getSearchQuery())}`
    })
  }

  // JSON fill
  {
    uploadForm.querySelector('#fillJson')?.remove()

    const fillRow = document.createElement('tr')
    fillRow.className = 'torDetRow'
    fillRow.innerHTML =
      '<td class="row1">Fast Fill</td><td class="row1"><input type=file><br><input type=text></div>'
    const fillJsonFile = fillRow.querySelector('input[type="file"]')
    const fillJsonText = fillRow.querySelector('input[type="text"]')

    uploadForm.insertBefore(fillRow, files.nextElementSibling)
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

  // Tags
  {
    const a = document.createElement('a')
    a.href = `#`
    a.textContent = 'Cleanup'
    a.style = 'margin-left: 20px'
    a.addEventListener('click', (e) => {
      e.preventDefault()
      const input = tags.querySelector('input')
      const tagsStart = input.value.lastIndexOf(' | ')
      console.log('tags', input.value.slice(tagsStart + 3))

      let tagValues = input.value
        .slice(tagsStart + 3)
        .replaceAll(/([a-z])([A-Z0-9])/g, '$1, $2')
        .replaceAll(/(LGBT)([A-Z])/g, '$1, $2')
        .split(', ')
      const ignoreTags = [
        'Fiction',
        'Nonfiction',
        'Audiobook',
        'Literature',
        'Book Club',
      ]
      const mapTags = {
        'Autistic Spectrum Disorder': ['Autistic Spectrum Disorder', 'ASD'],
        'Lesbian Romance': ['Lesbian', 'Sapphic'],
        'Lesbian Fiction': ['Lesbian', 'Sapphic'],
        Lesbian: ['Lesbian', 'Sapphic'],
        'M M Romance': ['MM', 'Gay'],
      }
      tagValues = tagValues
        .filter((tag) => !ignoreTags.includes(tag))
        .flatMap((tag) => mapTags[tag] ?? [tag])
      tagValues = Array.from(new Set(tagValues))
      input.value = input.value.slice(0, tagsStart + 3) + tagValues.join(', ')
    })
    const br = tags.querySelector('br')
    br.parentElement.insertBefore(a, br)
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
      Poetry: 38,
      Romance: 42,
      SF: 45,
      'Science Fiction': 45,
      'Self-Help': 46,
      'Urban Fantasy': 53,
      Western: 54,
      YA: 55,
      'Young Adult': 55,
      'Literary Fiction': 57,
    }
    tags?.addEventListener('input', () => {
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

  // Poster
  {
    const fileInput = uploadForm.querySelector('input[name="poster"]')
    const urlInput = uploadForm.querySelector('input[name="tor[posterURL]"]')
    const td = fileInput.parentElement
    td.appendChild(document.createElement('br'))
    const img = document.createElement('img')
    img.style.maxWidth = '500px'
    img.style.maxHeight = '500px'
    td.append(img)

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
            text: query,
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
    addOtherTorrents(otherTorrentsSearchTable, body)
  }

  function addOtherTorrents(table, body, uploadHelpers = true) {
    let added = false
    if (body.data) {
      table.innerHTML = ''

      for (const t of body.data) {
        added = true

        const row = document.createElement('tr')
        row.innerHTML = `<td>${t.cat}</td><td></td><td class="expand"><div class="posterImage"><img></div><a class="torTitle"></a> by <a class="author"></a><br><span class="torNarrator">Narrated by: <a class="narrator"></a></span> | <span class="series_info"><span class="torSeries"> Series: <a class="series" href=""></a></span></span><br></span><span class="torRowDesc"></span><br><span class="torFileTypes"><a></a></span> | <span class="comments"></span> comments</td><td></td><td class="shrink"><a></a><br></td><td></td><td><p>0</p><p>0</p><p>0</p></td>`
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
            author.textContent = name
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
              narrator.textContent = name
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
      const results = await acSearch(value, type)
      const name = value
        .toLowerCase()
        .replaceAll('.', ' ')
        .replaceAll(/\s+/g, ' ')
      const entity = results.find((e) => e.value.toLowerCase() === name)
      if (entity) {
        acCache[type][value] = entity.id
        acCache[type][name] = entity.id
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

  async function acSearch(term, type) {
    if (acCache[type]?.[term]) return [{ value: term, id: acCache[type][term] }]
    const raw = await cookieStore.get('mam_id')
    const mamId = decodeURIComponent(raw.value)
    const body = new URLSearchParams()
    body.append('term', term)
    body.append('type', type)
    body.append('mam_id', mamId)

    const res = await fetch('https://cdn.myanonamouse.net/json/ac_names.php', {
      method: 'POST',
      headers: {
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      },
      body,
      credentials: 'include',
    })
    const json = await res.json()
    for (const entity of json) {
      acCache[type][entity.value] = entity.id
    }
    return json
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
      // uploadForm.querySelector('input[name="tor[description]"]').value = json.description;
      try {
        $unsafeWindow.tinyMCE.activeEditor.setContent(json.description)
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
  }
  function check(name, value) {
    if (typeof value === 'number') {
      const input = uploadForm.querySelector(`input[${name}][value="${value}"]`)
      if (input) input.checked = true
    } else {
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
    const categories = data
      .getAll('tor[categories][]')
      .map(
        (cat) =>
          uploadForm.querySelector(
            `input[name="tor[categories][]"][value="${cat}"]`,
          )?.parentElement?.textContent,
      )
    const languageId = data.get('tor[language]')
    const language = uploadForm.querySelector(
      `select[name="tor[language]"] option[value="${languageId}"]`,
    )?.textContent
    const authors = await Promise.all(
      data
        .getAll('tor[author][]')
        .filter(Boolean)
        .map(async (a) => ({
          id: (await acSearch(a, 'author'))[0]?.id,
          name: a,
        })),
    )
    let series = []
    data.forEach((value, key) => {
      if (key.startsWith('tor[series]') && key.endsWith('[name]')) {
        series.push(
          acSearch(value, 'series').then((entities) => ({
            id: entities[0]?.id,
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
          id: (await acSearch(a, 'narrator'))[0]?.id,
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

    const isValid = !!(
      posterUrl &&
      title &&
      authors.length >= 1 &&
      cat &&
      mediaType &&
      mainCat &&
      categories.length >= 1 &&
      tags &&
      (mediaInfo || mediaType !== 'Audiobook')
    )

    div.innerHTML = `<div id="torDetMainCon">
  <div id="posterHolder" style="width: 302px; height: 302px">&nbsp;</div>
  <img id="torDetPoster" src="${posterUrl}" class="torDetPoster" />
  <div class="torDetRow torDetRowFirst">
    <div class="torDetLeft">Title</div>
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
        <span>${mediaType}<br>${mainCat}</span>
	<div class="categoriesPreview">${categories.map((cat) => `<div class="categoryPreview">${cat}</div>`).join('')}</div>
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
        ? `<div class="torDetInnerCon">
      <div class="torDetInnerTop ">Media Info</div>
      <div class="torDetInnerBottom" style="text-align:left;overflow:auto">
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
  ${isValid ? `<input type="submit" form="uploadFormForm" value="Upload Torrent">` : ''}
</div>
`

    form.id = 'uploadFormForm'
    div.querySelector('#torDesc').innerHTML = description
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
              text: `${title} (${authorsQuery})`,
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
                  text: `${shortTitle} (${authorsQuery})`,
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

      addOtherTorrents(otherTorrentsTable, body, false)
    }
    searchOtherTorrents()
  }
})()
