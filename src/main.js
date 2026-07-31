import './style.css'

const DEFAULT_USER = 'Priyanka-cmd23'

const state = {
  username: localStorage.getItem('gsd_user') || DEFAULT_USER,
  contributionDays: [],
  totalContributions: 0,
  longestStreak: 0,
  currentStreak: 0,
  lastContribution: null,
  lastUpdated: null,
  dailyGoal: Number(localStorage.getItem('gsd_goal')) || 1,
  todayCount: 0,
}

function todayKey() {
  const d = new Date()
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

async function fetchContributions(username) {
  const cacheKey = `gsd_cache_${username}`
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    const { ts, data } = JSON.parse(cached)
    if (Date.now() - ts < 30 * 60 * 1000) return data
  }

  const res = await fetch(`https://github.com/users/${username}/contributions`, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
  })
  if (!res.ok) throw new Error('Failed to fetch profile (status ' + res.status + ')')
  const html = await res.text()

  const cells = [...html.matchAll(/<td[^>]*data-date="([^"]+)"[^>]*data-level="([^"]+)"[^>]*>/g)]
  if (!cells.length) throw new Error('Contribution graph not found. Check the username.')

  const days = cells.map((c) => ({ date: new Date(c[1] + 'T00:00:00Z'), level: Number(c[2]) }))
  const countMatch = html.match(/([\d,]+)\s+contributions?\s+in\s+the\s+last\s+year/i)

  const contributionCount = countMatch ? parseInt(countMatch[1].replace(/,/g, ''), 10) : days.reduce((s, d) => s + d.level, 0)

  localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: { days, contributionCount } }))
  return { days, contributionCount }
}

function computeStats(days, goal) {
  const today = todayKey()
  let totalContributions = 0
  let currentStreak = 0
  let longestStreak = 0
  let todayCount = 0
  let lastContribution = null

  const withLevels = days.filter((d) => d.level > 0).map((d) => d.date)

  for (const d of days) {
    totalContributions += d.level
    if (isSameDay(d.date, today)) todayCount += d.level
  }

  let run = 0
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i]
    if (d.level > 0) {
      run++
      if (run > longestStreak) longestStreak = run
      if (!lastContribution) lastContribution = d.date
    } else {
      run = 0
    }
  }

  const t = todayKey()
  const hasToday = withLevels.some((d) => isSameDay(d, t))
  const hasYesterday = withLevels.some((d) => {
    const y = new Date(t); y.setUTCDate(y.getUTCDate() - 1)
    return isSameDay(d, y)
  })

  if (hasToday) {
    currentStreak = 1
    for (let i = 1; ; i++) {
      const d = new Date(t); d.setUTCDate(d.getUTCDate() - i)
      if (withLevels.some((x) => isSameDay(x, d))) currentStreak++
      else break
    }
  } else if (hasYesterday) {
    currentStreak = 0
    for (let i = 1; ; i++) {
      const d = new Date(t); d.setUTCDate(d.getUTCDate() - i)
      if (withLevels.some((x) => isSameDay(x, d))) currentStreak++
      else break
    }
  }

  return { totalContributions, currentStreak, longestStreak, lastContribution, todayCount }
}

function renderGraph(days, username) {
  const el = document.getElementById('graph')
  if (!days.length) {
    el.innerHTML = '<p class="empty">No contribution data.</p>'
    return
  }
  const weeks = []
  let week = []
  for (const d of days) {
    const offset = (d.date.getUTCDay() + 6) % 7
    if (week.length === 0) for (let i = 0; i < offset; i++) week.push(null)
    week.push(d)
    if (week.length === 7) { weeks.push(week); week = [] }
  }
  if (week.length) weeks.push(week)

  const levels = ['var(--cell-0)', 'var(--cell-1)', 'var(--cell-2)', 'var(--cell-3)', 'var(--cell-4)']
  const totalWeeks = weeks.length
  const height = 7 * 12 + 3
  const width = totalWeeks * 12 + 3
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  svg.setAttribute('role', 'img')
  svg.setAttribute('aria-label', 'Contribution graph for ' + username)

  weeks.forEach((w, x) => {
    w.forEach((d, y) => {
      if (!d) return
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
      rect.setAttribute('x', x * 12)
      rect.setAttribute('y', y * 12)
      rect.setAttribute('width', 10)
      rect.setAttribute('height', 10)
      rect.setAttribute('rx', 2)
      rect.setAttribute('fill', levels[d.level])
      rect.setAttribute('data-date', d.date.toISOString().slice(0, 10))
      rect.setAttribute('data-level', String(d.level))
      const title = document.createElementNS('http://www.w3.org/2000/svg', 'title')
      title.textContent = `${d.date.toISOString().slice(0, 10)}: ${d.level} contribution${d.level === 1 ? '' : 's'}`
      rect.appendChild(title)
      svg.appendChild(rect)
    })
  })
  el.innerHTML = ''
  el.appendChild(svg)
}

function fmtDate(d) {
  if (!d) return 'Never'
  return d.toUTCString().split(' ').slice(0, 4).join(' ')
}

function renderStats() {
  const goal = state.dailyGoal
  const pct = goal > 0 ? Math.min(100, Math.round((state.todayCount / goal) * 100)) : 0
  document.getElementById('streak').textContent = String(state.currentStreak)
  document.getElementById('longest').textContent = String(state.longestStreak)
  document.getElementById('total').textContent = String(state.totalContributions).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  document.getElementById('last').textContent = fmtDate(state.lastContribution)
  document.getElementById('goal').textContent = `${state.todayCount} / ${goal}`
  const bar = document.getElementById('goal-bar')
  bar.style.width = pct + '%'
  bar.dataset.done = pct >= 100 ? 'true' : 'false'
  document.getElementById('goal-pct').textContent = pct + '%'
}

function setStatus(msg, ok = true) {
  const el = document.getElementById('status')
  el.textContent = msg
  el.classList.toggle('error', !ok)
  el.classList.toggle('ok', ok)
}

async function load(username = state.username) {
  const userInput = document.getElementById('user-input')
  if (username !== userInput.value.trim()) userInput.value = username
  setStatus('Loading contributions for ' + username + '…')
  try {
    const { days, contributionCount } = await fetchContributions(username)
    state.username = username
    state.contributionDays = days
    state.totalContributions = contributionCount
    const stats = computeStats(days, state.dailyGoal)
    Object.assign(state, stats)
    state.lastUpdated = new Date()
    localStorage.setItem('gsd_user', username)
    renderGraph(days, username)
    renderStats()
    setStatus('Last updated just now')
  } catch (err) {
    setStatus('Error: ' + err.message, false)
    renderStats()
  }
}

function bindEvents() {
  const input = document.getElementById('user-input')
  const go = document.getElementById('go')
  const apply = () => {
    const v = input.value.trim()
    if (v && v !== state.username) load(v)
  }
  go.addEventListener('click', apply)
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') apply() })

  const goalInput = document.getElementById('goal-input')
  const setGoal = () => {
    const v = parseInt(goalInput.value, 10)
    if (v >= 0 && v <= 100) {
      state.dailyGoal = v
      localStorage.setItem('gsd_goal', String(v))
      renderStats()
    }
  }
  document.getElementById('set-goal').addEventListener('click', setGoal)
  goalInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') setGoal() })

  document.getElementById('refresh').addEventListener('click', () => {
    localStorage.removeItem(`gsd_cache_${state.username}`)
    load(state.username)
  })
}

function renderApp() {
  document.getElementById('app').innerHTML = `
    <header>
      <h1><span class="flame">🔥</span> Streak Dashboard</h1>
      <p class="sub">Track your GitHub contribution streak and stay on a roll.</p>
    </header>
    <main>
      <section class="card controls">
        <div class="row">
          <input id="user-input" type="text" placeholder="GitHub username" value="${state.username}" autocomplete="off" spellcheck="false" />
          <button id="go" class="primary">Track</button>
          <button id="refresh" title="Refresh">⟳</button>
        </div>
        <div class="row goal-row">
          <label for="goal-input">Daily goal</label>
          <input id="goal-input" type="number" min="0" max="100" value="${state.dailyGoal}" />
          <button id="set-goal">Set</button>
          <span id="goal-pct" class="pill"></span>
        </div>
        <p id="status" class="status"></p>
      </section>
      <section class="stats-grid">
        <div class="card stat"><div class="stat-num" id="streak">–</div><div class="stat-label">🔥 Current streak (days)</div></div>
        <div class="card stat"><div class="stat-num" id="longest">–</div><div class="stat-label">🏆 Longest streak</div></div>
        <div class="card stat"><div class="stat-num" id="total">–</div><div class="stat-label">📈 Contributions (year)</div></div>
        <div class="card stat"><div class="stat-num" id="last">–</div><div class="stat-label">📅 Last contribution</div></div>
      </section>
      <section class="card">
        <h2>Contributions — last year</h2>
        <div id="graph"></div>
      </section>
      <section class="card">
        <h2>Today's goal</h2>
        <div class="bar-track"><div id="goal-bar" class="bar-fill"></div></div>
        <p id="goal" class="goal-num">0 / 0</p>
      </section>
    </main>
    <footer><p>Data from your public GitHub profile. Refreshed automatically every 30 min.</p></footer>
  `
  bindEvents()
}

renderApp()
load()
