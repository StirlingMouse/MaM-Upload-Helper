// ==UserScript==
// @name         MaM Audible Upload
// @namespace    Violentmonkey Scripts
// @version      0.1.0
// @license      MIT
// @description  Adds button to copy audiobook data as json to Audible page and opens MAM upload
// @author       _
// @include      https://www.audible.com/pd/*
// @include      https://www.audible.com/ac/*
// @include      https://www.audible.com/search*
// @include      https://www.audible.com/author/*
// @include      https://www.audible.com/narrator/*
// @include      https://www.audible.com/series/*
// @include      https://www.audible.in/pd/*
// @include      https://www.audible.es/pd/*
// @include      https://www.audible.es/ac/*
// @include      https://www.audible.es/search*
// @include      https://www.audible.es/author/*
// @include      https://www.audible.es/narrator/*
// @include      https://www.audible.es/series/*
// @include      https://www.audible.it/pd/*
// @include      https://www.audible.it/ac/*
// @include      https://www.audible.it/search*
// @include      https://www.audible.it/author/*
// @include      https://www.audible.it/narrator/*
// @include      https://www.audible.it/series/*
// @include      https://www.audible.co.uk/pd/*
// @include      https://www.audible.co.uk/ac/*
// @include      https://www.audible.co.uk/search*
// @include      https://www.audible.co.uk/author/*
// @include      https://www.audible.co.uk/narrator/*
// @include      https://www.audible.co.uk/series/*
// @include      https://www.audible.com.au/pd/*
// @include      https://www.audible.com.au/search*
// @include      https://www.audible.com.au/author/*
// @include      https://www.audible.com.au/narrator/*
// @include      https://www.audible.com.au/series/*
// @grant        none
// @downloadURL	 https://github.com/StirlingMouse/MaM-Upload-Helper/raw/refs/heads/main/audible.user.js
// @updateURL    https://github.com/StirlingMouse/MaM-Upload-Helper/raw/refs/heads/main/audible.user.js
// ==/UserScript==

if (
  window.location.pathname.startsWith('/pd') ||
  window.location.pathname.startsWith('/ac')
) {
  const CHAPTERIZED = true

  const AVAILABLE_CATEGORIES = {
    // "Art",
    Biografías: 'Biographical',
    // "Business",
    // "Crafts",
    Fantástico: 'Fantasy',
    // "Food",
    Histórico: 'History',
    // "Horror",
    // "Humor",
    // "Instructional",
    // "Juvenile",
    // "Language",
    // "Medical",
    // "Mystery",
    // "Nature",
    // "Philosophy",
    // "Recreation",
    Romántica: 'Romance',
    'Narrativa di crimini': 'Crime/Thriller',
    // "Self-Help",
    // "Western",
    'Coming of age': 'Young Adult',
    'Novela histórica': 'Historical Fiction',
    // "Literary Classics",
    'Ciencia ficción': 'Science Fiction',
    // "True Crime",
    // "Urban Fantasy",
    'Acción y aventura': 'Action/Adventure',
    // "Computer/Internet",
    // "Crime/Thriller",
    // "Home/Garden",
    // "Math/Science/Tech",
    // "Travel/Adventure",
    // "Pol/Soc/Relig",
    // "General Fiction",
    // "General Non-Fic",
  }

  let scndEdition = false
  function getTitle() {
    let title = document.getElementsByTagName('h1')[0].innerText
    if (title.endsWith(' (2nd Edition)')) {
      scndEdition = true
      title = title.replace(' (2nd Edition)', '')
    }
    return title
  }

  function getSubtitle() {
    const sLoggedIn = $$$('[slot="subtitle"]')[0]
    const sLoggedOut = null
    let subtitle = ''
    if (sLoggedIn) {
      subtitle = sLoggedIn.textContent
    } else if (sLoggedOut) {
      subtitle = sLoggedOut.textContent
    }

    if (!subtitle) return ['']

    const series = getSeriesName().toLowerCase()
    const isSubtitleSeries = Boolean(
      series && subtitle.toLocaleLowerCase().includes(series),
    )
    if (isSubtitleSeries) return ['']
    // Inclusive Teaching, Book 2
    let patt = /(.+?)(?:, Book)? (\d+)$/
    let matches = patt.exec(subtitle)

    if (matches) {
      return ['', matches[1], matches[2]]
    }
    // A Novel (Ms. Right, Book 2)
    patt = /(.+) \((.+), Book (\d+)\)$/
    matches = patt.exec(subtitle)

    let seriesName
    let seriesNumber
    if (matches) {
      subtitle = matches[1]
      seriesName = matches[2]
      seriesNumber = matches[3]
    }

    if (subtitle === 'A Novel') {
      subtitle = ''
    }

    return [subtitle, seriesName, seriesNumber]
  }

  function getTitleAndSubtitle() {
    const [subtitle] = getSubtitle()
    if (subtitle) {
      return `${getTitle()}: ${subtitle}`
    }
    return getTitle()
  }

  const authorTitles = / (PhD|LPC-S|ACS|ACN|MD|PAC|Ed.D.|Ph. ?D|PsyD)\b/gi
  function getAuthors() {
    const authorElements = $$$(
      'a[href^="/author/"]',
      $$$('.product-metadata')[0],
    )
    authorElements.push(
      ...$$$('a[href^="/search?searchAuthor="]', $$$('.product-metadata')[0]),
    )
    const authors = []
    const translators = []
    for (const el of authorElements) {
      if (el.textContent.includes('translator')) {
        translators.push(
          el.textContent
            .replace(/ - ?(translator)/gi, '')
            .replaceAll(authorTitles, ''),
        )
      } else if (
        el.textContent.match(/ - ?(foreword|afterword|translator|editor)/gi)
      ) {
      } else {
        authors.push(el.textContent.replaceAll(authorTitles, ''))
      }
    }
    return { authors, translators }
  }

  function getNarrators() {
    const narratorElements = $$$(
      'a[href^="/search?searchNarrator="]',
      $$$('.product-metadata')[0],
    )
    const narrators = []
    for (let index = 0; index < narratorElements.length; index++) {
      narrators[index] = narratorElements[index].textContent.replaceAll(
        authorTitles,
        '',
      )
    }
    return narrators
  }

  function getSeriesName() {
    const seriesElement = document.querySelector('.seriesLabel')
    if (seriesElement) {
      return seriesElement.querySelector('a').textContent
    }
    const series =
      Array.from($$$('.line[role="group"]'))
        .find((e) => {
          const label = e.querySelector('.label').textContent
          return label === 'Serie'
        })
        ?.querySelector('.link')?.textContent ?? ''
    return series
  }

  function getSeriesBookNumber() {
    let bookNumber = ''
    if (!getSeriesName()) {
      return ''
    }
    const seriesElement = document.querySelector('.seriesLabel')
    if (!seriesElement) return ''
    const patt = /Book\s*?(\d+\.?\d*-?\d*\.?\d*)/g
    bookNumber = patt.exec(seriesElement.textContent)

    if (!bookNumber) {
      return ''
    }
    return bookNumber[1]
  }

  function getLanguage() {
    const language = Array.from($$$('.line[role="group"]'))
      .find((e) => {
        const label = e.querySelector('.label').textContent
        return label === 'Idioma' || label === 'Language' || label === 'Lingua'
      })
      .querySelector('.text').textContent
    const languages = {
      English: 'English',
      Inglese: 'English',
      Inglés: 'English',
      Svedese: 'Swedish',
      Sueco: 'Swedish',
      Swedish: 'Swedish',
    }
    return languages[language]
  }

  function getRunTime() {
    const runtimeElement = Array.from($$$('.line[role="group"]'))
      .find((e) => {
        const label = e.querySelector('.label').textContent
        return label === 'Duración' || label === 'Length' || label === 'Durata'
      })
      .querySelector('.text').textContent
    /* clean up unnecessary parts of string */
    const patt =
      /(?:(\d+) (?:horas|hrs|ore)?)?(?: (?:y|e|and) )?(?:(\d+) mins?)?/
    const matches = patt.exec(runtimeElement)
    console.log('runtimeElement', runtimeElement, matches)
    /* The first capture group contains the actual runtime */
    return matches[1]
      ? matches[2]
        ? `${matches[1]} hrs and ${matches[2]} mins`
        : `${matches[1]} hrs`
      : `${matches[2]} mins`
  }

  function getBookCover() {
    return $$$('img', $$$('adbl-product-image')[0])[0].src
  }

  function getAudibleCategory() {
    const categoryElements = $$$('adbl-chip[href^="/tag/genre/').map(
      (e) => e.textContent,
    )
    return categoryElements
  }

  function getMAMCategory() {
    /* TODO: Implement guessing of categories */
    const audibleCategory = getAudibleCategory()
    console.log('audibleCategory', audibleCategory)
    const cat = audibleCategory
      .map((c) => AVAILABLE_CATEGORIES[c])
      .find(Boolean)
    if (cat) return `Audiobooks - ${cat}`
  }

  function getDescription() {
    const element = $$$('[slot="summary"]')[0]
    if (element == null) {
      return ''
    }
    /* In order: Remove excess whitespace, replace double quotes, remove empty p elements, add line break after every paragraph, and every list */
    const desc = element.innerHTML
      .replace(/\s+/g, ' ')
      .replace(/"/g, "'")
      .replace(/<p><\/p>/g, '')
      .replace(/<\/p>/g, '</p><br>')
      .replace(/<\/ul>/g, '</ul><br>')
      .replace(/<\/ul>/g, '</ul><br>')
      .replace(/©.*/, '')
      .replace(
        'PLEASE NOTE: When you purchase this title, the accompanying PDF will be available in your Audible Library along with the audio.',
        'Includes the accompanying PDF',
      )
      .replace('Please note: This audiobook is in Swedish.', '')
      .replace('Please note: This audiobook is in Swedish', '')
      .trim()
      .replace(/(\n| |<br>|<p>(<b><\/b>)?<\/p>)*$/, '')
    return desc
  }

  function getReleaseDate() {
    const element = Array.from($$$('.line[role="group"]'))
      .find((e) => {
        const label = e.querySelector('.label').textContent
        return (
          label === 'Fecha de lanzamiento' ||
          label === 'Release date' ||
          label === 'Data di pubblicazione'
        )
      })
      .querySelector('.text').textContent
    let patt = /(\d{2})-(\d{2})-(\d{2})/
    let matches = patt.exec(element)
    const months = [
      '',
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]
    if (matches) {
      return `${months[+matches[2]]} ${+matches[1]}, ${matches[3] < 30 ? '20' : '19'}${matches[3]}`
    }
    patt = /(\d{2})\/(\d{2})\/(\d{4})/
    matches = patt.exec(element)
    return matches
      ? `${months[+matches[2]]} ${+matches[1].replace(/^0/, '')}, ${matches[3]}`
      : ''
  }

  function getAdditionalTags() {
    const authors = getAuthors()
    let releaseDate = getReleaseDate()
    if (
      getLanguage() === 'Swedish' &&
      releaseDate.match(/^May (1[5-9]|2[0-5]), 2025$/)
    ) {
      releaseDate = ''
    }
    const raw_tags = [releaseDate, getRunTime()]

    if (CHAPTERIZED) raw_tags.push('Libation, Chapterized')
    else raw_tags.push('Libation')
    if (scndEdition) raw_tags.unshift('Second Edition')
    for (const translator of authors.translators) {
      raw_tags.push(`Translator: ${translator}`)
    }
    console.log(authors)

    return raw_tags.join(' | ') + ' | '
  }

  function getSeries() {
    let [, seriesName, bookNumber] = getSubtitle()
    if (seriesName) {
      return [{ name: seriesName, number: bookNumber }]
    }
    seriesName = getSeriesName()
    if (seriesName) {
      bookNumber = getSeriesBookNumber()
      return [{ name: seriesName, number: bookNumber }]
    }
    return []
  }

  function getIsbn() {
    const asin = location.pathname.match(/\/(?:pd|ac)\/[^/]+(?:\/(\w+)|$)/)[1]
    if (asin) return `ASIN:${asin}`
  }

  function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement('textarea')
    textArea.value = text

    // Avoid scrolling to bottom
    textArea.style.top = '0'
    textArea.style.left = '0'
    textArea.style.position = 'fixed'

    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    try {
      const successful = document.execCommand('copy')
      const msg = successful ? 'successful' : 'unsuccessful'
      console.log(`Fallback: Copying text command was ${msg}`)
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err)
    }

    document.body.removeChild(textArea)
  }

  function copyTextToClipboard(text) {
    if (!navigator.clipboard) {
      fallbackCopyTextToClipboard(text)
      return
    }
    navigator.clipboard.writeText(text).then(
      () => {
        console.log('ok', text)
      },
      (err) => {
        console.error('Async: Could not copy text: ', err)
      },
    )
  }

  const buttonStr = (label) => `<div id="" class="bc-row bc-spacing-top-s1">
  <div class="bc-row">
    <div class="bc-trigger bc-pub-block">
      <span class="bc-button bc-button-primary">
        <button
          id="upload-to-mam"
          class="bc-button-text"
          type="button"
          tabindex="0" title="Copy book details as JSON"
        >
          <span class="bc-text bc-button-text-inner bc-size-action-large">
            ${label}
          </span>
        </button>
      </span>
    </div>
  </div>
  </div>
  `

  let foo = document.createElement('foo')
  foo.innerHTML = buttonStr('Copy img').trim()

  let button = foo.firstChild
  document.querySelector('#adbl-buy-box')?.appendChild(button)

  button.addEventListener('click', () => {
    copyTextToClipboard(getBookCover())
  })

  foo = document.createElement('foo')
  foo.innerHTML = buttonStr('Copy as JSON').trim()

  button = foo.firstChild
  document.querySelector('#adbl-buy-box')?.appendChild(button)

  button.addEventListener('click', () => {
    const result = {
      isbn: getIsbn(),
      authors: getAuthors().authors,
      description: getDescription(),
      narrators: getNarrators(),
      thumbnail: getBookCover(),
      title: getTitleAndSubtitle(),
      tags: getAdditionalTags(),
      language: getLanguage(),
      series: getSeries(),
      category: getMAMCategory(),
    }
    console.log('result', result)
    copyTextToClipboard(JSON.stringify(result))
  })

  function $$$(selector, rootNode = document.body) {
    const arr = []

    const traverser = (node) => {
      // 1. decline all nodes that are not elements
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return
      }

      // 2. add the node to the array, if it matches the selector
      if (node.matches(selector)) {
        arr.push(node)
      }

      // 3. loop through the children
      const children = node.children
      if (children.length) {
        for (const child of children) {
          traverser(child)
        }
      }

      // 4. check for shadow DOM, and loop through it's children
      const shadowRoot = node.shadowRoot
      if (shadowRoot) {
        const shadowChildren = shadowRoot.children
        for (const shadowChild of shadowChildren) {
          traverser(shadowChild)
        }
      }
    }

    traverser(rootNode)

    return arr
  }
} else {
  const allowQueueElm = document.createElement('div')
  allowQueueElm.style.position = 'fixed'
  allowQueueElm.style.top = 0
  allowQueueElm.style.right = 0
  allowQueueElm.style.padding = '8px'
  allowQueueElm.style.backgroundColor = 'rebeccapurple'
  allowQueueElm.innerHTML =
    '<label>Allow Queue Processing <input type="checkbox" checked></label>'
  const allowQueueCheckbox = allowQueueElm.querySelector('input')
  document.body.append(allowQueueElm)
  allowQueueCheckbox.addEventListener('change', () => {
    processQueue()
  })

  const getQueue = () => JSON.parse(localStorage.getItem('addQueue') ?? '[]')
  const setQueue = (queue) =>
    localStorage.setItem('addQueue', JSON.stringify(queue))

  const queue = getQueue()
  console.log('queue', getQueue())

  processQueue()

  function queueAdd(asin) {
    const queue = getQueue()
    queue.push(asin)
    setQueue(queue)
    processQueue()
  }

  function queueRemove(asin) {
    let queue = getQueue()
    queue = queue.filter((q) => q !== asin)
    setQueue(queue)
  }

  for (const addButton of document.querySelectorAll(
    '.ucx-add-to-library-button',
  )) {
    console.log('add button found')
    const form = addButton.closest('form')
    const asin = form.querySelector('input[name="asin"]').value

    const queueAddButton = document.createElement('button')
    queueAddButton.type = 'button'
    queueAddButton.textContent = queue.includes(asin) ? 'queued' : 'add'
    addButton.after(queueAddButton)
    queueAddButton.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const queue = getQueue()
      if (queue.includes(asin)) {
        queueAddButton.textContent = 'add'
        queueRemove(asin)
      } else {
        queueAddButton.textContent = 'queued'
        queueAdd(asin)
      }
    })
    //
    // const mamSearchButton = document.createElement('button')
    // mamSearchButton.type = 'button'
    // mamSearchButton.textContent = queue.includes(asin) ? 'queued' : 'add'
    // queueAddButton.after(mamSearchButton)
  }

  for (const listItem of document.querySelectorAll('.productListItem')) {
    const titleElm =
      listItem.querySelector('.bc-heading a[href^="/pd/"]') ??
      listItem.querySelector('.bc-heading a[href^="/ac/"]')
    const title = decodeHtml(listItem.getAttribute('aria-label'))
      .replaceAll(/[!()]/g, '')
      .replaceAll(/&|(\band\b)/g, '(&|and)')
    const authorElm =
      listItem.querySelector('a[href^="/author/"') ??
      listItem.querySelector('a[href^="/search?searchAuthor"')
    if (!authorElm) continue
    const author = authorElm.textContent
      .replaceAll(/([A-Z])([A-Z])/g, '$1 $2')
      .replaceAll(/([A-Z])\.([A-Z])\./g, '$1 $2')

    const titleButton = document.createElement('a')
    titleButton.textContent = 'title'
    titleButton.target = 'MaM'
    titleButton.href = `https://www.myanonamouse.net/tor/browse.php?tor%5Btext%5D=${encodeURIComponent(title)}&tor[srchIn][title]=true&thumbnail=true`
    titleButton.style.marginLeft = '20px'
    titleButton.style.fontSize = '14px'
    titleButton.style.color = 'lightcoral'
    titleElm.after(titleButton)

    const titleAuthorButton = document.createElement('a')
    titleAuthorButton.textContent = 'title+author'
    titleAuthorButton.target = 'MaM'
    titleAuthorButton.href = `https://www.myanonamouse.net/tor/browse.php?tor%5Btext%5D=${encodeURIComponent(`${title} ${author}`)}&tor[srchIn][title]=true&tor[srchIn][author]=true&thumbnail=true`
    titleAuthorButton.style.marginLeft = '20px'
    titleAuthorButton.style.fontSize = '14px'
    titleAuthorButton.style.color = 'lightcoral'
    titleButton.after(titleAuthorButton)
    //
    // const mamSearchButton = document.createElement('button')
    // mamSearchButton.type = 'button'
    // mamSearchButton.textContent = queue.includes(asin) ? 'queued' : 'add'
    // queueAddButton.after(mamSearchButton)
  }

  function processQueue() {
    console.log(1)
    if (!allowQueueCheckbox.checked) return
    console.log(2)
    const queue = getQueue()
    for (const asin of queue) {
      console.log('firstItem', asin)
      if (asin) {
        const addButton = document.querySelector(
          `input[name="asin"][value="${asin}"] ~ .ucx-add-to-library-button button`,
        )
        if (!addButton) {
          const asinElm = document.querySelector(
            `input[name="asin"][value="${asin}"]`,
          )
          if (asinElm) {
            console.log(
              'found asin',
              asinElm.closest('[aria-label]')?.getAttribute('aria-label'),
            )
            return
          }
        }
        console.log('click', addButton)
        if (addButton) {
          setTimeout(() => {
            if (!allowQueueCheckbox.checked) return
            queueRemove(asin)
            addButton.click()
          }, 500)
          return
        }
      }
    }
  }

  function decodeHtml(html) {
    const template = document.createElement('textarea')
    template.innerHTML = html
    return template.value
  }
}
