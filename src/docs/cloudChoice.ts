// Which cloud the Getting Started page is written for. The choice is shared
// between the page body and the docs shell (the rails stay hidden until a cloud
// is picked) and remembered across visits, so only a first-time reader meets
// the picker with nothing under it.
import { useSyncExternalStore } from "react";

export const CLOUD_IDS = ["aws", "gcp", "azure"] as const;
export type Cloud = (typeof CLOUD_IDS)[number];

const KEY = "burla-docs-cloud";

function isCloud(value: unknown): value is Cloud {
  return CLOUD_IDS.includes(value as Cloud);
}

function read(): Cloud | null {
  try {
    const stored = localStorage.getItem(KEY);
    return isCloud(stored) ? stored : null;
  } catch {
    return null;
  }
}

let current: Cloud | null = typeof window === "undefined" ? null : read();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setCloud(cloud: Cloud) {
  if (current === cloud) return;
  current = cloud;
  try {
    localStorage.setItem(KEY, cloud);
  } catch {
    /* private mode: the choice just does not persist */
  }
  listeners.forEach((listener) => listener());
}

export function useCloudChoice(): [Cloud | null, (cloud: Cloud) => void] {
  const cloud = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );
  // setCloud is a module-level function, so it is already stable.
  return [cloud, setCloud];
}
