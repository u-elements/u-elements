import { writable } from "svelte/store";
const localStorageKey = "selected-tabs-v2";

const selectedTabStore = () => {
  const { subscribe, set: setStore } = writable<Tab>(getInitialSelectedTab());

  const set = (value: Tab) => {
    setStore(value);
    localStorage.setItem(localStorageKey, JSON.stringify(value));
  };

  return {
    subscribe,
    set,
  };
};

export const tabs = [
  { name: "Stars", icon: "*" },
  { name: "Medals", icon: "🎖️" },
  { name: "Help", icon: "?" },
] as const;

type Tab = (typeof tabs)[number];

const getInitialSelectedTab = () => {
  const userSelectedTab = JSON.parse(
    localStorage.getItem(localStorageKey) ?? "null"
  );
  if (userSelectedTab != null) {
    return userSelectedTab;
  }
  return tabs[0];
};

export default selectedTabStore();
