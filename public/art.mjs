// Lightweight vector game pieces: no font/emoji dependency, crisp at every zoom level.
export function icon(name,size=20) {
  const paths={
    plus:'M12 5v14M5 12h14',minus:'M5 12h14',close:'m6 6 12 12M18 6 6 18',back:'m14 6-6 6 6 6',arrow:'M4 12h16m-6-6 6 6-6 6',
    edit:'m15 4 5 5-11 11H4v-5Zm-2 3 5 5',map:'m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Zm6-2v16m6-14v16',
    users:'M16 21v-3a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v3m14-14a4 4 0 0 1 0 8m4 6v-3a4 4 0 0 0-3-4M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
    dice:'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM7 7h.01M17 7h.01M12 12h.01M7 17h.01M17 17h.01',
    link:'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2m3 6a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2',
    check:'m5 12 4 4L19 6',help:'M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
    download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',upload:'M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5',
    save:'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2ZM7 3v6h10V3M7 21v-8h10v8',
    undo:'M3 10h11a7 7 0 0 1 0 14M3 10l6-6M3 10l6 6',center:'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M12 8v8M8 12h8',
    flag:'M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0',home:'m3 10 9-7 9 7M5 9v12h14V9m-10 12v-8h6v8',
    eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    shield:'m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z',sound:'M11 5 6 9H3v6h3l5 4Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14',
    muted:'M11 5 6 9H3v6h3l5 4Zm5 4 5 6m0-6-5 6',hand:'M8 12V5a2 2 0 0 1 4 0v7-9a2 2 0 0 1 4 0v9-6a2 2 0 0 1 4 0v9c0 5-3 7-7 7-3 0-5-2-7-5l-3-4a2 2 0 0 1 3-2l2 2',
    clock:'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',chevron:'m9 5 7 7-7 7',folder:'M3 7V4h7l2 3h9v14H3Z',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.plus}"/></svg>`;
}
export const coin='<span class="coin" aria-label="золото"></span>';
export function piece(type,level=1) {
  if(type==='pine')return '<path fill="#775336" d="M-2 4h4v10h-4z"/><path fill="#386641" d="m0-19-11 17h5l-8 10H14L6-2h5Z"/><path fill="#498751" d="m0-19-11 17h5l-8 10H0Z"/>';
  if(type==='palm')return '<path d="m-2 12 3-23 4 1-2 22" fill="#947148"/><path d="M3-11Q-10-25-17-11q12-5 20 0Q9-27 19-14q-10-2-16 3Q-12-14-14-2q8-8 17-9Q16-12 18 0 10-9 3-11Z" fill="#347342"/>';
  if(type==='grave')return '<path fill="#7d8785" d="M-8 10V-5a8 8 0 0 1 16 0v15Z"/><path fill="#b7c0b4" d="M-8 10V-5a8 8 0 0 1 10-8v23Z"/><path stroke="#7a8980" stroke-width="2" d="M-3-5h6M0-8v9"/>';
  if(type==='capital')return '<ellipse cy="12" rx="17" ry="4" fill="#233d32" opacity=".14"/><path fill="#f5ebca" d="M-12-4h24v17h-24Z"/><path fill="#d0c399" d="M5-4h7v17H5Z"/><path fill="#9e5738" d="m-17-3 17-15L17-3Z"/><path fill="#bd764b" d="m-17-3 17-15 4 15Z"/><path fill="#564a38" d="M-3 4h7v9h-7Z"/><path fill="#8eaeaf" d="M-9 1h4v5h-4Z"/>';
  if(type==='farm')return '<path fill="#9e703f" d="M-19 0h22v13h-22Z"/><path stroke="#e7c778" stroke-width="2" d="M-17 2 1 2M-17 6H1m-18 4H1"/><path fill="#f1dbab" d="M2-3h13v15H2Z"/><path fill="#a15e3c" d="m-2-2 10-11L19-2Z"/><path fill="#675037" d="M7 5h5v7H7Z"/>';
  if(type==='tower'||type==='fort')return `<ellipse cy="13" rx="15" ry="4" fill="#233d32" opacity=".15"/><path fill="${type==='fort'?'#757d7e':'#d4d8ca'}" d="M-10-14h5v5h3v-5h5v5h3v-5h5v10l-2 2 3 16h-23l3-16-2-2Z"/><path fill="${type==='fort'?'#5b6468':'#aebaae'}" d="M3-9h8v5l-2 2 3 16H3Z"/><path fill="#344b48" d="M-3 7a3 3 0 0 1 6 0v7h-6Zm1-12h3v5h-3Z"/>${type==='fort'?'<path d="M0-14v-11l10 3-10 5" stroke="#526661" fill="#e0a460" stroke-width="1.5"/>':''}`;
  if(type==='unit') {
    const coat=['','#987345','#8a7764','#858e91','#636e7b'][level];
    return `<ellipse cy="13" rx="10" ry="3" fill="#233d32" opacity=".18"/><path fill="#3f4a3e" d="M-6 7h5v7h-6Zm7 0h5l1 7H1Z"/><path fill="${coat}" d="M-5-6h10l4 15H-9Z"/><path stroke="#dccaa1" stroke-width="3" d="m-5-3-6 8M5-3l5 8"/><circle cy="-11" r="5" fill="#e7cda1"/>${level===1?'<path fill="#887145" d="M-7-12q1-8 8-5l4 5Z"/>':`<path fill="${level>2?'#b6c3c5':'#8f9082'}" d="M-6-11v-3a6 6 0 0 1 12 0v3Z"/>`}${level>=2?'<path stroke="#715638" stroke-width="2" d="M12 9v-28"/><path fill="#d9e3dc" d="m12-25-3 8 3-1 3 1Z"/>':''}${level>=3?'<path fill="#596a70" stroke="#d7e0ce" d="m-12-4 6 2v6l-6 4-6-4v-6Z"/>':''}${level===4?'<path fill="#bc654e" d="M-1-19q7-13 10-5l-6 7Z"/>':''}`;
  }
  return '';
}
export function pieceIcon(type,level=1){return `<svg viewBox="-24 -29 48 48" class="piece-icon" aria-hidden="true">${piece(type,level)}</svg>`;}
