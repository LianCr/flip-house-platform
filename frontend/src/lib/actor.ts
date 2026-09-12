import { createContext, useContext } from 'react';

/** 顶栏“我是谁”。没有登录，先用人员代号区分是谁在填。存在本机浏览器里。 */
const KEY = 'actor';

export function getActor(): string {
  try { return localStorage.getItem(KEY) || '负责人'; } catch { return '负责人'; }
}

export function setActor(code: string) {
  try { localStorage.setItem(KEY, code); } catch { /* ignore */ }
}

export const ActorContext = createContext<{ actor: string; setActor: (c: string) => void }>({ actor: '负责人', setActor: () => {} });
export const useActor = () => useContext(ActorContext);
