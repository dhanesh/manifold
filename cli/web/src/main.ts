/**
 * Web entrypoint — imports global styles, initialises the theme system,
 * mounts the Svelte 5 root component.
 */

import './app.css';
import './lib/themes'; // registers built-in themes + window.manifold API
import { initThemeSystem } from './lib/theme-store';
import { mount } from 'svelte';
import App from './App.svelte';

initThemeSystem();

mount(App, { target: document.getElementById('app')! });
