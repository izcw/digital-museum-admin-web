import { createApp, h } from 'vue'
import { createMemoryHistory, createRouter, RouterView } from 'vue-router'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import CollectionPage from '../src/views/content/collect/index.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: '/content/collect', component: CollectionPage }]
})
const app = createApp({ render: () => h(RouterView) })
app.use(createPinia()).use(router).use(ElementPlus)
app.component('ArtSvgIcon', { render: () => h('span', { 'aria-hidden': 'true' }, '⋮') })
await router.push('/content/collect')
await router.isReady()
app.mount('#app')

// 记录真实 Chromium 绘制过的排序位移帧，不以“配置了 animation”代替动画验收。
const status = document.createElement('aside')
status.style.cssText =
  'position:fixed;right:12px;bottom:12px;background:white;padding:12px;z-index:99999'
const fail = document.createElement('input')
fail.type = 'checkbox'
fail.setAttribute('aria-label', '模拟排序保存失败')
fail.addEventListener('change', () => {
  document.body.dataset.failOrder = String(fail.checked)
})
const label = document.createElement('label')
label.append(fail, '模拟排序保存失败')
const report = document.createElement('div')
status.append(label, report)
document.body.append(status)
let animationFrames = 0
let dropFrames = 0
function sample() {
  const cards = [...document.querySelectorAll('.collection-grid > .collection-card')]
  if (cards.some((card) => getComputedStyle(card).transform !== 'none')) animationFrames++
  if (cards.some((card) => card.classList.contains('collection-order-move'))) dropFrames++
  document.body.dataset.animationFrames = String(animationFrames)
  document.body.dataset.dropFrames = String(dropFrames)
  report.textContent = `位移动画帧：${animationFrames}；松手过渡帧：${dropFrames}`
  requestAnimationFrame(sample)
}
requestAnimationFrame(sample)
