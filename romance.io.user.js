// ==UserScript==
// @name        MaM romance.io Upload
// @namespace   Violentmonkey Scripts
// @match       https://www.romance.io/books/*
// @grant       none
// @version     0.1.0
// @author      -
// @description 2025-11-15, 12:03:28
// ==/UserScript==

const ignoreWords = 'of is from to'.split(' ')

const topics = document.querySelector('#valid-book-topics')
if (topics) {
  const allowTags = [
    'trans hero',
    'fantasy',
    'high fantasy',
    'epic fantasy',
    'enemies to lovers',
    'friends to lovers',
    'forced proximity',
    'queer romance',
    'gay romance',
    'dark romance',
    'neurodivergent mc',
    'magic',
    'paranormal',
    'found family',
    'suspense',
    'bisexuality',
    'forbidden love',
    'age gap',
    'new adult',
    'bdsm',
    'slow burn',
    'demisexual hero',
    'contemporary',
    'christmas',
    'poly (3+ people)',
    'mmm+',
    'daddy kink',
    'dual pov',
    'milirary',
    'lesbian romance',
    'pregnancy',
    'grumpy/ice queen',
    'omegaverse',
    'harem',
    'reverse harem',
    'fated mates',
    'young adult',
    'fae',
    'vampires',
    'witches',
    'urban fantasy',
  ]
  const specialTags = {
    'trans hero': 'Transgender',
    'gay romance': 'Gay',
    'queer romance': 'LGBT',
    'poly (3+ people)': 'Poly',
    'mmm+': 'MMM+',
    'lesbian romance': 'Lesbian, Sapphic',
    'grumpy/ice queen': 'Ice Queen',
  }
  const specialWords = { mc: 'MC', bdsm: 'BDSM' }
  const a = document.createElement('a')
  a.href = '#'
  a.textContent = 'copy'
  a.style.color = 'var(--darkreader-text-dd0489, #fb32ad)'
  const li = topics.querySelector('h3')
  li.append(document.createTextNode(' '))
  li.append(a)
  a.addEventListener('click', (e) => {
    e.preventDefault()
    const topicElms = Array.from(topics.querySelectorAll('.topic'))
    const dualPov = document.querySelector(
      '#valid-topics-Format [data-link="dual-pov"]',
    )
    if (dualPov) topicElms.push(dualPov)
    const tags = topicElms
      .map((e) => e.textContent)
      .filter((topic) => allowTags.includes(topic))
      .map((topic) =>
        (specialTags[topic] ?? topic).replaceAll(
          /\b(([a-z])([a-z]*))/g,
          (_, word, first, rest) => {
            if (ignoreWords.includes(word)) return word
            return specialWords[word] ?? first.toUpperCase() + rest
          },
        ),
      )
    console.log(tags)
    navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': tags.join(', '),
      }),
    ])
  })
}

const contentWarnings = document.querySelector('#valid-topics-content-warnings')
if (contentWarnings) {
  const specialWords = { mcs: 'MCs' }
  const a = document.createElement('a')
  a.href = '#'
  a.textContent = 'copy'
  const li = contentWarnings.querySelector('.tabitem-sub')
  li.append(document.createTextNode(' '))
  li.append(a)
  a.addEventListener('click', (e) => {
    e.preventDefault()
    const topicElms = Array.from(contentWarnings.querySelectorAll('.topic'))
    const cws = topicElms.map((e) =>
      e.textContent.replaceAll(
        /\b(([a-z])([a-z]*))/g,
        (_, word, first, rest) => {
          if (ignoreWords.includes(word)) return word
          return specialWords[word] ?? first.toUpperCase() + rest
        },
      ),
    )
    console.log(cws)
    navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': `Content Warnings: ${cws.join(', ')}`,
        'text/html': `<i>Content Warnings:<br><ul>${cws.map((cw) => `<li>${cw}</li>`).join('')}</ul></i>`,
      }),
    ])
  })
}
