import { SmartHomeProvider } from './core/types';

const providers = new Map<string, SmartHomeProvider>();

export function registerProvider(p: SmartHomeProvider) {
  providers.set(p.id, p);
}

export function getProvider(id: string) {
  return providers.get(id) ?? null;
}

export function listProviders() {
  return Array.from(providers.values());
}
