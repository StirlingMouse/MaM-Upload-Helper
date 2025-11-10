// ==UserScript==
// @name        MaM Backfill Helper
// @namespace   Violentmonkey Scripts
// @description Makes backfilling categories and media info for old torrents a nice experience
// @match       https://www.myanonamouse.net/t/*
// @match       https://www.myanonamouse.net/tor/browse.php*
// @grant       none
// @version     0.1.1
// @author      Stirling Mouse
// @downloadURL https://github.com/StirlingMouse/MaM-Upload-Helper/raw/refs/heads/main/backfill-helper.user.js
// @updateURL   https://github.com/StirlingMouse/MaM-Upload-Helper/raw/refs/heads/main/backfill-helper.user.js
// ==/UserScript==

;(async () => {
  const styles = document.createElement('style')
  styles.innerHTML = `
    main {
      display: flex;
    }

    #backfill-helper {
      padding-top: 30px;
      width: 800px;
      display: flex;
      flex-direction: column;
      align-items: stretch;

      h3 {
        margin-top: 8px;
        margin-bottom: 2px;
      }

      label.mainCategories>div,
      label.mediaTypes>div,
      label.category>div {
        padding: 4px 8px;
        height: unset;
        font-size: 12pt;
        width: 190px;
      }

      label.mainCategories,
      label.mediaTypes,
      label.category {
        height: auto;
        width: 190px;
        padding: 0 5px;
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
        color: white;
        background-color: rebeccapurple
      }

      #showAllCats:has(input:not(:checked)) ~ label.category:has(input:not(:checked)) {
        display: none;
      }

      .flex {
        display: flex;
      }
      .newCatLink {
        div::before {
          width: 60px;
          height: 60px;
          display: block;
          background-size: contain;
        }
      }

      button {
        margin-top: 20px;
        padding: 8px;

        &:not(:disabled) {
          color: white;
          background: rebeccapurple;
        }
      }
    }

    @media (max-width: 1800px) {
      #backfill-helper {
        width: 600px;
      }
    }
    @media (max-width: 1600px) {
      #backfill-helper {
        width: 800px;
        margin-left: 2%;
        max-width: 96%;
      }
      main {
        flex-direction: column;
      }
    }

    #backfill-helper-batch-menu {
      position: fixed;
      right: 40px;
      bottom: 0;
      min-width: 300px;
      border-top-left-radius: 10px;
      border-top-right-radius: 10px;
      background: rebeccapurple;
      color: white;
      display: flex;
      align-items: center;
      font-size: 16px;
      overflow: hidden;
      z-index: 1000;

      & > * {
        padding: 8px 16px;
        color: inherit;
      }

      a:hover {
        text-decoration: none;
        cursor: pointer;
        background-color: rgba(0, 0, 0, 0.3);
      }
      a.abort:hover {
        background-color: red;
      }
    }
 `
  document.body.appendChild(styles)

  let categoryData
  try {
    categoryData = JSON.parse(
      localStorage.getItem('backfillHelper::categoryData'),
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
      categoriesRev: Object.fromEntries(
        Object.values(json.categories).map((c) => [c.name, c.id]),
      ),
      media_types: Object.fromEntries(
        Object.values(json.media_types).map((c) => [c.id, c.name]),
      ),
    }
    localStorage.setItem(
      'backfillHelper::categoryData',
      JSON.stringify(categoryData),
    )
  }
  if (!categoryData) await fetchCategoryData()

  let currentBatch
  try {
    currentBatch = JSON.parse(
      localStorage.getItem('backfillHelper::currentBatch'),
    )
  } catch {}

  function torrentCounts() {
    const total =
      Object.keys(currentBatch.torrents).length + currentBatch.completed.length
    const completed = currentBatch.completed.length

    const text = `Torrents: ${completed}/${total}`
    return { total, completed, text }
  }
  function updateMenu() {
    const { total, completed, text } = torrentCounts()
    const torrents = document.querySelector(
      '#backfill-helper-batch-menu>.torrents',
    )
    torrents.innerHTML = text

    if (completed === total) {
      const next = document.querySelector('#backfill-helper-batch-menu>.next')
      next?.remove()
      const abort = document.querySelector('#backfill-helper-batch-menu>.abort')
      if (abort) {
        abort.className = 'done'
        abort.textContent = 'done'
      }
    }
  }

  if (currentBatch) {
    const { total, completed, text } = torrentCounts()

    if (completed === total) {
      localStorage.removeItem('backfillHelper::currentBatch')
      window.location.reload()
      return
    }

    const batchMenu = document.createElement('div')
    batchMenu.id = 'backfill-helper-batch-menu'
    batchMenu.innerHTML = `<div class=torrents style="flex:1">${text}</div><a class=next>next</a><a class="abort">abort</a>`

    document.body.appendChild(batchMenu)

    batchMenu.querySelector('.next').addEventListener('click', (e) => {
      e.preventDefault()
      const next = Object.keys(currentBatch.torrents)[0]
      if (next) window.location = `/t/${next}`
    })

    batchMenu.querySelector('.abort').addEventListener('click', (e) => {
      e.preventDefault()
      if (
        e.currentTarget.className === 'done' ||
        confirm('Are you sure you want to abort the current batch?')
      ) {
        localStorage.removeItem('backfillHelper::currentBatch')
        window.location.reload()
      }
    })
  }

  function markComplete(torrentId) {
    const tor = currentBatch?.torrents[torrentId]
    if (!tor) return
    currentBatch.completed.push(tor)
    delete currentBatch.torrents[torrentId]
    localStorage.setItem(
      'backfillHelper::currentBatch',
      JSON.stringify(currentBatch),
    )
    updateMenu()
  }

  if (window.location.pathname.startsWith('/t/')) {
    const torrentId = +window.location.pathname.match(/\/t\/(\d+)/)[1]
    let mediaType
    {
      const newCatLink = document.querySelector(
        '#fInfo .newCatLink>div[class^="media"]',
      )
      const multiCat = document.querySelector('#fInfo #multiCat')
      const mediaInfoDisplay = document.querySelector('#mediaInfoDisplay')
      const [, mediatype, maincat] =
        newCatLink.className.match(/media(\d)-(\d)/)
      mediaType = +mediatype
      const hasData =
        !!mediatype &&
        !!+maincat &&
        multiCat &&
        (mediaType !== 1 || !!mediaInfoDisplay)
      if (hasData) {
        if (currentBatch?.torrents[torrentId]) markComplete(torrentId)
        return
      }
    }
    {
      const editButton = document.querySelector('#torQuickEdit')
      if (!editButton) return
    }

    const mainTable = document.querySelector('#mainTable')
    const backfillForm = document.createElement('div')
    backfillForm.innerHTML = `
<form id="backfill-helper">
    <h2>Backfill categories and mediaInfo of old torrent</h2>

    <h3>JSON Fastfill</h3>
    <div>
      <label>File: <input type=file name="fastFillFile"></label> 
      <label>Text: <input type=text name="fastFillText"></label>
    </div>
    <h3>Media Type</h3>
    <div>
    ${Object.entries(categoryData.media_types)
      .map(
        ([id, c]) =>
          `<label class="mediaTypes"><input name="tor[mediaType]" style="display:none" type="radio" value="${id}"${mediaType == id ? ' checked' : ''}><div>${c}</div></label>`,
      )
      .join('')}
    </div>
    <h3>Main Categories</h3>
    <div>
      <label class="mainCategories"><input name="tor[main_cat]" style="display:none" type="radio" value="1"><div>Fiction</div></label>
      <label class="mainCategories"><input name="tor[main_cat]" style="display:none" type="radio" value="2"><div>Nonfiction</div></label>
    </div>
    <h3>Categories</h3>
    <div>
      <div id="showAllCats"><label>Show all <input type="checkbox" checked></label></div>
      ${Object.entries(categoryData.categories)
        .map(
          ([id, c]) =>
            `<label class="category"><input name="tor[categories][]" style="display:none" type="checkbox" value="${id}"><div>${c}</div></label>`,
        )
        .join('')}
    </div>
    <h3>Media Info</h3>
    <textarea class="mceNoEditor" name="tor[mediaInfo]"></textarea>
    <h3>Preview</h3>
    <div>
      <div class=flex style="gap: 8px">
        <a class="newCatLink" href="#"><div class="media0-0">&nbsp;</div></a>
        <div id="multiCat">${[].map((cat) => `<a class="mCat" data-mcatid="${cat.id}">${cat.name}</a>`).join('')}</div>
        <div id="mediaInfoPreview"></div>
      </div>

      <button disabled>Save categories and media info</button>
    </div>
</form>
`
    mainTable.parentElement.appendChild(backfillForm)
    const form = backfillForm.querySelector('form')
    const newCatLink = form.querySelector('.media0-0')
    const multiCat = form.querySelector('#multiCat')
    const mediaInfoPreview = form.querySelector('#mediaInfoPreview')
    const saveButton = form.querySelector('button')

    const fillJsonFile = form.querySelector('input[name="fastFillFile"]')
    const fillJsonText = form.querySelector('input[name="fastFillText"]')

    fillJsonFile.addEventListener('change', () => {
      if (fillJsonFile.files.length === 1) {
        fillJsonText.value = ''
        const file = fillJsonFile.files[0]
        const reader = new FileReader()
        reader.onload = () => {
          jsonFill(JSON.parse(reader.result))
        }
        reader.onerror = () => {
          console.error('Error reading the file')
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

    form.addEventListener('change', () => {
      updatePreview()
    })

    form.addEventListener('submit', (e) => {
      e.preventDefault()
      submitForm()
    })

    if (currentBatch?.torrents[torrentId]) {
      jsonFill(currentBatch.torrents[torrentId])
    }

    async function submitForm() {
      const data = new FormData(form)
      const mediaTypeId = data.get('tor[mediaType]')
      const mainCatId = data.get('tor[main_cat]')
      const categories = data.getAll('tor[categories][]')
      const mediaInfo = data.get('tor[mediaInfo]')

      const submitData = new URLSearchParams()
      submitData.append('tid', torrentId)
      if (mediaTypeId != mediaType) {
        submitData.append('tor[mediaType]', mediaTypeId)
      }
      submitData.append('tor[main_cat]', mainCatId)
      for (const cat of categories) {
        submitData.append('tor[categories][]', cat)
      }
      if (mediaInfo) {
        submitData.append('tor[mediaInfo]', mediaInfo)
      }

      const res = await fetch(
        'https://www.myanonamouse.net/tor/json/submitTorEdit.php',
        {
          credentials: 'include',
          headers: {
            Accept: 'application/json, text/javascript, */*; q=0.01',
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          },
          body: submitData.toString(),
          method: 'POST',
          mode: 'cors',
        },
      )

      const res2 = await fetch(
        'https://www.myanonamouse.net/tor/json/editMenu.php',
        {
          credentials: 'include',
          headers: {
            Accept: 'text/html, */*; q=0.01',
          },
          body: `tid=${torrentId}&postSubmit=true`,
          method: 'POST',
          mode: 'cors',
        },
      )

      window.location.reload()
    }

    function jsonFill(json) {
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
        if (json.categories.length >= 1) {
          form.querySelector('#showAllCats input').checked = false
        }
      }
      if (json.mediaInfo) {
        if (typeof json.mediaInfo !== 'string') {
          json.mediaInfo = JSON.stringify(json.mediaInfo)
        }
        form.querySelector('textarea[name="tor[mediaInfo]"]').value =
          json.mediaInfo
      }
      updatePreview()
    }
    function check(name, value) {
      if (typeof value === 'number') {
        const input = form.querySelector(`input[${name}][value="${value}"]`)
        if (input) input.checked = true
      } else {
        value = value.toLowerCase().replaceAll(/[^a-z/ -]/g, '')
        const input = Array.from(form.querySelectorAll(`input[${name}]`)).find(
          (input) =>
            input.parentElement.textContent
              .toLowerCase()
              .replaceAll(/[^a-z/ -]/g, '') === value,
        )
        if (input) input.checked = true
      }
    }
    function updatePreview() {
      const data = new FormData(form)
      const mediaTypeId = data.get('tor[mediaType]')
      const mediaType = form.querySelector(
        `input[name="tor[mediaType]"][value="${mediaTypeId}"]`,
      )?.parentElement?.textContent
      const mainCatId = data.get('tor[main_cat]')
      const mainCat = form.querySelector(
        `input[name="tor[main_cat]"][value="${mainCatId}"]`,
      )?.parentElement?.textContent
      const categories = data.getAll('tor[categories][]').map((id) => ({
        id,
        name: form.querySelector(
          `input[name="tor[categories][]"][value="${id}"]`,
        )?.parentElement?.textContent,
      }))
      const mediaInfoRaw = data.get('tor[mediaInfo]')
      let mediaInfo
      try {
        mediaInfo = JSON.parse(mediaInfoRaw.trim())
      } catch {}
      const mediaGeneral = mediaInfo?.media?.track?.find(
        (t) => t['@type'] === 'General',
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
          title: mediaGeneral.Title,
        }
      }

      newCatLink.className = `media${mediaTypeId ?? 0}-${mainCatId ?? 0}`
      multiCat.innerHTML = categories
        .map((cat) => `<a class="mCat" data-mcatid="${cat.id}">${cat.name}</a>`)
        .join('')
      if (media) {
        mediaInfoPreview.innerHTML = `<div class="torDetInnerCon" style="margin:0">
          <div class="torDetInnerTop">Media Info</div>
          <div class="torDetInnerBottomSpan"><span>
            ${media.bitrate}k ${media.type}<br>
            ${media.duration}<br>
            ${media.title}
          </span></div>
        </div>`
      }

      let missingMediaInfo = false
      if (mediaType == 1) {
        missingMediaInfo =
          !media && !document.querySelector('#mediaInfoDisplay')
      }

      saveButton.disabled =
        !(mediaTypeId && mainCatId && categories.length > 0) || missingMediaInfo
    }
  } else if (window.location.pathname === '/tor/browse.php') {
    const searchForm = document.querySelector('#torSearch')
    const details = document.createElement('details')
    details.innerHTML = `
      <summary>Batch backfill metadata for old torrents</summary>
      <p>Upload many JSON fastfill files at once to start backfilling old torrents in batch
      <input type=file accept=".json,application/json" multiple>
    `
    searchForm.parentElement.appendChild(details)

    const fillJsonFiles = details.querySelector('input[type="file"]')

    fillJsonFiles.addEventListener('change', () => {
      if (fillJsonFiles.files.length >= 1) {
        if (!currentBatch) currentBatch = { torrents: {}, completed: [] }

        const promises = []
        for (const file of fillJsonFiles.files) {
          const reader = new FileReader()
          promises.push(
            new Promise((resolve, reject) => {
              reader.onload = () => {
                const json = JSON.parse(reader.result)
                if (!json.id) {
                  console.error('fill file is missing id')
                }
                currentBatch.torrents[json.id] = json
                resolve()
              }
              reader.onerror = () => {
                console.error('Error reading the file')
                reject()
              }
            }),
          )
          reader.readAsText(file)
          Promise.all(promises).then(() => {
            localStorage.setItem(
              'backfillHelper::currentBatch',
              JSON.stringify(currentBatch),
            )
            window.location.reload()
          })
        }
      }
    })

    if (currentBatch) {
      const observableDiv = document.querySelector('#ssr')
      const observer = new MutationObserver(async (mutationsList, observer) => {
        for (const mutation of mutationsList) {
          if (
            Array.from(mutation.addedNodes).some(
              (node) =>
                node.classList && node.classList.contains('newTorTable'),
            )
          ) {
            observer.disconnect()

            for (const torrent of Object.values(currentBatch.torrents)) {
              const row = document.querySelector(`#tdr-${torrent.id}`)
              if (!row) continue
              if (row.querySelector('#searchMultiCat')) {
                markComplete(torrent.id)
                continue
              }
              const multiCat = document.createElement('div')
              multiCat.id = 'searchMultiCat'

              let html = ''
              const ids = []
              for (const cat of torrent.categories) {
                const id =
                  typeof cat === 'number'
                    ? cat
                    : +categoryData.categoriesRev[cat]
                if (!id) {
                  await fetchCategoryData()
                  id = +categoryData.categoriesRev[cat]
                  if (!id) {
                    console.error(`Unknown category ${cat}`)
                    continue
                  }
                }
                if (ids.includes(id)) continue
                ids.push(id)
                const name = categoryData.categories[id]
                html += `<a class="mCat" data-mcatid="${id}" style="color:white;background:rebeccapurple">${name}</a>`
              }
              multiCat.innerHTML = html
              const td = row.querySelector('.torTitle').parentElement
              td.appendChild(document.createElement('br'))
              td.appendChild(multiCat)
            }

            return
          }
        }
      })
      observer.observe(observableDiv, { childList: true })
    }
  }
})()
