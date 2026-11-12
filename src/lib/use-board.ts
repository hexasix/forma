'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createRepository, type Repository } from './repository';
import { EMPTY_BOARD, type BoardData, type Status } from './types';
import { errorMessage, statusName } from './utils';
export interface Notice {
  id: number;
  message: string;
  kind: 'success' | 'error';
}
export function useBoard() {
  const [data, setData] = useState<BoardData>(EMPTY_BOARD);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'demo' | 'supabase'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
      ? 'supabase'
      : 'demo',
  );
  const [notice, setNotice] = useState<Notice | null>(null);
  const repository = useRef<Repository | null>(null);
  const locked = useRef(false);
  const mounted = useRef(false);
  const notify = useCallback(
    (message: string, kind: Notice['kind'] = 'success') =>
      setNotice({ id: Date.now(), message, kind }),
    [],
  );
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), notice.kind === 'error' ? 8000 : 3500);
    return () => clearTimeout(timer);
  }, [notice]);
  const initialize = useCallback(async () => {
    try {
      repository.current ??= createRepository();
      const board = await repository.current.load();
      if (mounted.current) {
        setMode(repository.current.mode);
        setData(board);
        setError(null);
      }
    } catch (failure) {
      if (mounted.current) setError(errorMessage(failure));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void initialize();
    return () => {
      mounted.current = false;
    };
  }, [initialize]);
  const mutate = useCallback(
    async (
      action: (repo: Repository) => Promise<void>,
      message: string,
      optimistic?: (data: BoardData) => BoardData,
    ): Promise<boolean> => {
      if (locked.current || !repository.current) return false;
      locked.current = true;
      setBusy(true);
      let committed = false;
      const previous = data;
      try {
        if (optimistic) setData(optimistic);
        await action(repository.current);
        committed = true;
        const board = await repository.current.load();
        setData(board);
        setError(null);
        notify(message);
        return true;
      } catch (failure) {
        const message = errorMessage(failure);
        if (!committed) setData(previous);
        try {
          setData(await repository.current.load());
        } catch {
          setError(
            'Could not refresh your board. Check your connection and use Refresh to recover.',
          );
        }
        notify(
          committed ? `Your change was saved, but refreshing failed: ${message}` : message,
          'error',
        );
        return committed;
      } finally {
        locked.current = false;
        setBusy(false);
      }
    },
    [data, notify],
  );
  const refresh = useCallback(async () => {
    if (locked.current || !repository.current) return;
    locked.current = true;
    setBusy(true);
    try {
      setData(await repository.current.load());
      setError(null);
      notify('Your board is up to date');
    } catch (failure) {
      notify(errorMessage(failure), 'error');
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }, [notify]);
  const moveTask = useCallback(
    (id: string, status: Status) =>
      mutate(
        (repo) => repo.moveTask(id, status),
        `Moved to ${statusName(status)}`,
        (board) => ({
          ...board,
          tasks: board.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
        }),
      ),
    [mutate],
  );
  return {
    data,
    loading,
    busy,
    error,
    mode,
    notice,
    setNotice,
    initialize: () => {
      setLoading(true);
      setError(null);
      return initialize();
    },
    mutate,
    refresh,
    moveTask,
  };
}
