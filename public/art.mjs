// Original Antiyoy sprites by Yiotro. See NOTICE.md for attribution and restrictions.
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
export const ASSET_PATH='/assets/antiyoy/';
export function spriteName(type,level=1){return type==='unit'?['man0','man1','man2','man3'][level-1]:({capital:'castle',farm:'house',tower:'tower',fort:'strong_tower',pine:'pine',palm:'palm',grave:'grave'}[type]);}
export function piece(type,level=1){const name=spriteName(type,level);return name?`<image href="${ASSET_PATH}${name}.png" x="-24" y="-26" width="48" height="48" preserveAspectRatio="xMidYMid meet"/>`:'';}
export function pieceIcon(type,level=1){return `<svg viewBox="-24 -29 48 54" class="piece-icon" aria-hidden="true">${piece(type,level)}</svg>`;}
export function hudImage(name){return `<img src="${ASSET_PATH}${name}.png" alt="" draggable="false">`;}
