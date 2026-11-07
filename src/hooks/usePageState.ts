import { useCallback, useMemo, useSyncExternalStore } from 'react';
import { applyPatch, parsePageState, serializePageState, type PageState } from '../lib/pageState';

// Своё событие: history.pushState само по себе никого не оповещает.
const URL_CHANGE = 'kkd:urlchange';

function subscribe(listener: () => void): () => void {
  window.addEventListener('popstate', listener);
  window.addEventListener(URL_CHANGE, listener);
  return () => {
    window.removeEventListener('popstate', listener);
    window.removeEventListener(URL_CHANGE, listener);
  };
}

const getSearch = () => window.location.search;

export type UpdatePageState = (patch: Partial<PageState>, options?: { replace?: boolean }) => void;

/**
 * Состояние страницы из адресной строки. Без роутера: страница одна, хватает History API.
 * Изменения пишутся через pushState — кнопка «Назад» в браузере возвращает прошлый выбор.
 */
export function usePageState(): [PageState, UpdatePageState] {
  const search = useSyncExternalStore(subscribe, getSearch);
  const state = useMemo(() => parsePageState(search), [search]);

  const update = useCallback<UpdatePageState>((patch, options = {}) => {
    const current = parsePageState(window.location.search);
    const next = serializePageState(applyPatch(current, patch));
    if (next === window.location.search) return;
    const url = `${window.location.pathname}${next}${window.location.hash}`;
    if (options.replace) window.history.replaceState(null, '', url);
    else window.history.pushState(null, '', url);
    window.dispatchEvent(new Event(URL_CHANGE));
  }, []);

  return [state, update];
}
