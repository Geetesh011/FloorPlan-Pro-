import { useState, useCallback } from 'react';

export function useHistory(initialState) {
  const [past, setPast] = useState([]);
  const [present, setPresent] = useState(initialState);
  const [future, setFuture] = useState([]);

  const set = useCallback((updater) => {
    setPresent((currentPresent) => {
      const newState = typeof updater === 'function' ? updater(currentPresent) : updater;
      // Only push to past if state actually changed
      if (newState !== currentPresent) {
        setPast((p) => {
          const newPast = [...p, currentPresent];
          return newPast.length > 50 ? newPast.slice(newPast.length - 50) : newPast;
        });
        setFuture([]);
      }
      return newState;
    });
  }, []);

  const setLive = useCallback((updater) => {
    setPresent((currentPresent) => {
      return typeof updater === 'function' ? updater(currentPresent) : updater;
    });
  }, []);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    setPast(newPast);
    setFuture([present, ...future]);
    setPresent(previous);
  }, [past, present, future]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    setPast([...past, present]);
    setFuture(newFuture);
    setPresent(next);
  }, [past, present, future]);

  return {
    state: present,
    set,
    setLive,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0
  };
}
