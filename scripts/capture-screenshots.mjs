import { chromium } from 'playwright-core'

const [baseUrl, outDir] = process.argv.slice(2)
const chromePath = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const GROUPING_TIMEOUT_MS = 90_000

const browser = await chromium.launch({ executablePath: chromePath })
const host = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage()
const guest = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage()

async function capture(page, name) {
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true })
  console.log(`captured ${outDir}/${name}.png`)
}

async function join(page, name) {
  await page.getByLabel('Your name').fill(name)
  await page.getByRole('button', { name: 'Join' }).click()
}

async function submitQuestions(page, questions) {
  const input = page.getByLabel('Your question', { exact: true })
  for (const question of questions) {
    await input.fill(question)
    await input.press('Enter')
  }
}

async function createSession() {
  await host.goto(`${baseUrl}/`)
  await capture(host, 'create-session')
  await host.getByLabel('Challenge').fill('Our customers are churning faster than last quarter')
  await host.getByLabel('Burst length (minutes)').fill('1')
  await host.getByRole('button', { name: 'Create session' }).click()
  await host.waitForURL(/\/s\//)
}

async function gatherParticipants() {
  await join(host, 'Ada')
  await guest.goto(host.url())
  await join(guest, 'Grace')
  await host.getByText('Grace').first().waitFor()
  await capture(host, 'lobby')
}

async function runBurst() {
  await host.getByRole('button', { name: 'Start burst' }).click()
  await submitQuestions(host, ['Why do customers churn?', 'How do we price the product?', 'What does a great first week look like?'])
  await submitQuestions(guest, ['What makes clients leave us?', 'Is onboarding confusing for new customers?'])
  await guest.getByRole('button', { name: "I'm done" }).click()
  await capture(host, 'burst')
  await capture(guest, 'burst-mobile')
}

async function consolidate() {
  await host.getByRole('button', { name: 'End burst' }).click()
  await host.getByRole('button', { name: 'Start voting' }).and(host.locator(':enabled')).waitFor({ timeout: GROUPING_TIMEOUT_MS })
  await capture(host, 'consolidate')
}

async function vote() {
  await host.getByRole('button', { name: 'Start voting' }).click()
  const addVote = host.getByRole('button', { name: /^Add vote to/ })
  await addVote.first().click()
  await addVote.first().click()
  await addVote.nth(1).click()
  await guest.getByRole('button', { name: /^Add vote to/ }).first().click()
  await capture(host, 'vote')
}

async function showResults() {
  await host.getByRole('button', { name: 'Show results' }).click()
  await host.getByLabel('Ranked groups').waitFor()
  await capture(host, 'results')
}

try {
  await createSession()
  await gatherParticipants()
  await runBurst()
  await consolidate()
  await vote()
  await showResults()
} finally {
  await browser.close()
}
