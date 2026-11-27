import { createRoot } from 'react-dom/client'
import '@fontsource/nunito/400.css'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import '@fontsource/nunito/800.css'
import './styles.css'
import App from './App'
import { loadTelegram } from './tg'

let done = false
const render = () => { if (done) return; done = true; createRoot(document.getElementById('root')!).render(<App />) }
loadTelegram(render)
setTimeout(render, 1500)
