// src/lib/youtube.ts

export function classifyYouTubeUrl(url: string): {
    kind: 'channel'|'handle'|'user'|'video'|'playlist'|'unknown',
    idOrPath: string
  } {
    try {
      const u = new URL(url);
      const host = u.hostname.replace(/^www\./, '');
      if (!['youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) {
        return { kind: 'unknown', idOrPath: '' };
      }
  
      if (host === 'youtu.be') {
        return { kind: 'video', idOrPath: u.pathname.slice(1) };
      }
  
      const path = u.pathname.replace(/\/+$/, '');
  
      if (path.startsWith('/channel/')) return { kind: 'channel', idOrPath: path.split('/')[2] };
      if (path.startsWith('/@'))       return { kind: 'handle',  idOrPath: path.slice(1) };
      if (path.startsWith('/user/'))   return { kind: 'user',    idOrPath: path.split('/')[2] };
  
      if (path === '/watch') {
        const v = u.searchParams.get('v');
        if (v) return { kind: 'video', idOrPath: v };
      }
  
      if (path.startsWith('/playlist')) {
        const list = u.searchParams.get('list');
        if (list) return { kind: 'playlist', idOrPath: list };
      }
  
      return { kind: 'unknown', idOrPath: '' };
    } catch {
      return { kind: 'unknown', idOrPath: '' };
    }
  }