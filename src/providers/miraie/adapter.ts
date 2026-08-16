import { SmartHomeProvider, DeviceState, DeviceCommand } from '../core/types';
import { db } from '../../lib/db';
import storage from '../../lib/storage';

let MiraieAcJs: any | null = null;
const CACHE_TTL_MS = Number(process.env.DEVICE_CACHE_TTL_MS || 30_000);

export class MiraieAdapter implements SmartHomeProvider {
  id = 'miraie';
  name = 'MirAIe';
  private session: any | null = null;

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

  private mapDevice(device: any): DeviceState {
    const id = String(device.data?.deviceId || device.id || device.deviceId || device.device_id || device.data?.id || '');
    return {
      id,
      name: device.getFriendlyName?.() || device.data?.deviceName || device.data?.name || id,
      providerId: this.id,
      online: device.data?.online ?? true,
      power: Boolean(device.data?.power),
      mode: device.data?.mode,
      targetTemperature: device.data?.targetTemperature ?? device.data?.targetTemp,
      currentTemperature: device.data?.roomTemp ?? device.data?.currentTemperature,
      fanSpeed: device.data?.fanSpeed,
      capabilities: ['power', 'temperature', 'mode', 'fanSpeed'],
    };
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
      const devices = await this.session.getDevices();
      const states: DeviceState[] = (devices || []).map((device: any) => this.mapDevice(device));
      await Promise.all(states.map((state) => this.cacheDevice(state)));
      return states;
    }
    const cached = await this.cachedDevices();
    return cached.length ? cached : Array.from(db.devices.values());
  }

  async getDeviceState(deviceId: string): Promise<DeviceState | null> {
    await this.ensureSession();
    if (typeof this.session?.getDevices === 'function') {
      const devices = await this.session.getDevices();
      const device = (devices || []).find((item: any) => String(item.data?.deviceId || item.id) === deviceId);
      if (device) {
        const state = this.mapDevice(device);
        await this.cacheDevice(state);
        return state;
      }
      await storage.deleteDevice(deviceId);
      return null;
    }
    const cached = await storage.getDevice(deviceId, CACHE_TTL_MS);
    return (cached?.data as DeviceState | undefined) ?? db.devices.get(deviceId) ?? null;
  }

  async executeCommand(deviceId: string, command: DeviceCommand): Promise<DeviceState> {
    await this.ensureSession();
    if (typeof this.session?.getDevices === 'function') {
      const devices = await this.session.getDevices();
      const device = (devices || []).find((item: any) => String(item.data?.deviceId || item.id) === deviceId);
      if (!device) throw new Error('INVALID_DEVICE');
      if (command.temperature !== undefined) await device.setTemperature(Number(command.temperature));
      if (command.power !== undefined) command.power ? await device.turnOn() : await device.turnOff();
      if (command.mode !== undefined && typeof device.setHvacMode === 'function') await device.setHvacMode(command.mode);
      const state = this.mapDevice(device);
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
