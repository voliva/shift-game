import './style.css'
import { mount } from 'svelte'
import App from './App.svelte'

const target = document.querySelector<HTMLElement>('#app')

if (!target) throw new Error('App root was not found')

mount(App, { target })
