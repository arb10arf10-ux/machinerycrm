/** @type {import('tailwindcss').Config} */
export default {
 content: ['./index.html','./src/**/*.{js,ts,jsx,tsx}'],
 theme: { extend: {
  colors: {
   graphite:{950:'#0f1115',900:'#161a21',800:'#1e242e',700:'#2a3340',600:'#3a4656'},
   paper:{50:'#faf8f5',100:'#f5f1eb',200:'#ebe4d9'}, amber:{400:'#f5a623',500:'#e8940f',600:'#c47a0a'},
   status:{available:'#22c55e',rented:'#3b82f6',sold:'#8b5cf6',service:'#f59e0b',reserved:'#eab308',retired:'#6b7280',risk:'#ef4444'}
  },
  fontFamily:{sans:['Inter','system-ui','sans-serif'],mono:['IBM Plex Mono','ui-monospace','monospace']},
  transitionDuration:{fast:'120ms',normal:'160ms'}
 }},
 plugins:[]
}