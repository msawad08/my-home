import { SmartHomeProvider, DeviceState, DeviceCommand } from '../core/types';
import { db } from '../../lib/db';
import storage from '../../lib/storage';

let MiraieAcJs: any | null = null;
const CACHE_TTL_MS = Number(process.env.DEVICE_CACHE_TTL_MS || 30_000);

export class MiraieAdapter implements SmartHomeProvider {
  id = 'miraie';
  name = 'MirAIe';
  private session: any | null = null;
  private devices = new Map<string, any>();

  async authenticate(): Promise<void> {
    const username = process.env.MIRAIE_USERNAME;
    const password = process.env.MIRAIE_PASSWORD;
    if (!username || !password) return;
    if (!MiraieAcJs) {
      const mod = await import('miraie-ac-js');
      MiraieAcJs = (mod as any).default ?? mod;
    }
    this.session = await MiraieAcJs.createSession({ username, password });
    if (typeof this.session?.connect === 'function') await this.session.connect();
  }

  private async ensureSession() {
    if (!this.session) await this.authenticate();
  }

  private toBoolean(value: unknown, fallback = false): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return ['on', 'true', '1', 'enabled'].includes(value.toLowerCase());
    return fallback;
  }

  private toTemperature(value: unknown): number | undefined {
    const temperature = Number(value);
    return Number.isFinite(temperature) && temperature >= 0 && temperature <= 60 ? temperature : undefined;
  }

  private mapDevice(device: any, previous?: DeviceState): DeviceState {
    const id = String(device.data?.deviceId || device.id || device.deviceId || device.device_id || device.data?.id || '');
    const status = device.getStatus?.() || {};
    const powerValue = status.ps ?? status.power ?? status.powerState ?? device.data?.ps ?? device.data?.power;
    const targetTemperature = this.toTemperature(status.actmp ?? status.targetTemperature ?? status.targetTemp ?? device.data?.targetTemperature ?? device.data?.targetTemp) ?? previous?.targetTemperature;
    const currentTemperature = this.toTemperature(status.roomTemp ?? status.roomTemperature ?? status.rmt ?? status.ambientTemperature ?? status.ambT ?? status.currentTemperature ?? device.data?.roomTemp) ?? previous?.currentTemperature;
    return {
      id,
      name: device.getFriendlyName?.() || device.data?.deviceName || device.data?.name || id,
      providerId: this.id,
      online: device.data?.online ?? true,
      power: this.toBoolean(powerValue, previous?.power ?? false),
      mode: status.acmd ?? status.mode ?? device.data?.mode ?? previous?.mode,
      targetTemperature,
      currentTemperature,
      fanSpeed: status.acfs ?? status.fanSpeed ?? device.data?.fanSpeed ?? previous?.fanSpeed,
      capabilities: ['power', 'temperature', 'mode', 'fanSpeed'],
    };
  }

  private async discoverDevices(): Promise<any[]> {
    if (this.devices.size) return Array.from(this.devices.values());
    const devices = await this.session.getDevices();
    for (const device of devices || []) {
      const id = String(device.data?.deviceId || device.id);
      if (id) this.devices.set(id, device);
    }
    const topics = Array.from(this.devices.values()).map((device) => device.data?.topic?.[0]).filter(Boolean).map((topic) => `${topic}/status`);
    if (topics.length && typeof this.session.subscribeToTopics === 'function') await this.session.subscribeToTopics(topics);
    return Array.from(this.devices.values());
  }

  private async cacheDevice(state: DeviceState) {
    db.devices.set(state.id, state);
    await storage.setDevice(state.id, state);
  }

  private async cachedDevices(): Promise<DeviceState[]> {
    const cached = await storage.listDevices(CACHE_TTL_MS);
    return cached.map((device) => device.data as DeviceState);
  }

  async getDevices(): Promise<DeviceState[]> {
    await this.ensureSession();
    if (typeof this.session?.getDevices === 'function') {
      const devices = await this.discoverDevices();
      const states: DeviceState[] = devices.map((device) => this.mapDevice(device, db.devices.get(String(device.data?.deviceId || device.id))));
      await Promise.all(states.map((state) => this.cacheDevice(state)));
      return states;
    }
    const cached = await this.cachedDevices();
    return cached.length ? cached : Array.from(db.devices.values());
  }

  async getDeviceState(deviceId: string): Promise<DeviceState | null> {
    await this.ensureSession();
    if (typeof this.session?.getDevices === 'function') {
      const devices = await this.discoverDevices();
      const device = (devices || []).find((item: any) => String(item.data?.deviceId || item.id) === deviceId);
      if (device) {
        const state = this.mapDevice(device, db.devices.get(deviceId));
        await this.cacheDevice(state);
        return state;
      }
      await storage.deleteDevice(deviceId);
      return null;
    }
    const cached = await storage.getDevice(deviceId, CACHE_TTL_MS);
    return (cached?.data as DeviceState | undefined) ?? db.devices.get(deviceId) ?? null;
  }

  async getDeviceDiagnostics(deviceId: string): Promise<Record<string, unknown> | null> {
    await this.ensureSession();
    if (typeof this.session?.getDevices !== 'function') return null;
    const devices = await this.discoverDevices();
    const device = devices.find((item: any) => String(item.data?.deviceId || item.id) === deviceId);
    if (!device) return null;
    const status = device.getStatus?.();
    return status && typeof status === 'object' ? status : {};
  }

  async executeCommand(deviceId: string, command: DeviceCommand): Promise<DeviceState> {
    await this.ensureSession();
    if (typeof this.session?.getDevices === 'function') {
      const devices = await this.discoverDevices();
      const device = (devices || []).find((item: any) => String(item.data?.deviceId || item.id) === deviceId);
      if (!device) throw new Error('INVALID_DEVICE');
      if (command.temperature !== undefined) await device.setTemperature(Number(command.temperature));
      if (command.power !== undefined) command.power ? await device.turnOn() : await device.turnOff();
      if (command.mode !== undefined && typeof device.setHvacMode === 'function') await device.setHvacMode(command.mode);
      const existing = ((await storage.getDevice(deviceId))?.data as DeviceState | undefined) ?? db.devices.get(deviceId);
      const state = this.mapDevice(device, existing);
      if (command.power !== undefined) state.power = command.power;
      if (command.temperature !== undefined) state.targetTemperature = command.temperature;
      if (command.mode !== undefined) state.mode = command.mode;
      await this.cacheDevice(state);
      return state;
    }
    const cached = await storage.getDevice(deviceId);
    const device = (cached?.data as DeviceState | undefined) ?? db.devices.get(deviceId);
    if (!device) throw new Error('INVALID_DEVICE');
    const updated = { ...device, ...command, targetTemperature: command.temperature ?? device.targetTemperature };
    delete (updated as Partial<DeviceState> & { temperature?: number }).temperature;
    await this.cacheDevice(updated);
    return updated;
  }
}
