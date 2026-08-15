import { SmartHomeProvider, DeviceState, DeviceCommand } from '../core/types';
import { db } from '../../lib/db';

let MiraieAcJs: any | null = null;

export class MiraieAdapter implements SmartHomeProvider {
  id = 'miraie';
  name = 'MirAIe';

  private _session: any | null = null;

  async authenticate(): Promise<void> {
    // prefer explicit env-based credentials for server-side integration
    const username = process.env.MIRAIE_USERNAME;
    const password = process.env.MIRAIE_PASSWORD;
    if (!username || !password) return;

    // dynamic import for ESM package
    if (!MiraieAcJs) {
      try {
        const mod = await import('miraie-ac-js');
        MiraieAcJs = (mod && (mod as any).default) ? (mod as any).default : mod;
      } catch (e) {
        MiraieAcJs = null;
      }
    }
    if (!MiraieAcJs) return;
    this._session = await MiraieAcJs.createSession({ username, password });
    if (this._session && typeof this._session.connect === 'function') await this._session.connect();
  }

  private async ensureSession() {
    if (this._session) return;
    await this.authenticate();
  }

  private mapDevice(d: any): DeviceState {
    const id = String(d.data?.deviceId || d.id || d.deviceId || d.device_id || d.data?.id || '');
    const name = d.getFriendlyName ? d.getFriendlyName() : (d.data?.deviceName || d.data?.name || id);
    const state: DeviceState = {
      id,
      name,
      providerId: this.id,
      online: true,
      power: !!d.data?.power || false,
      mode: d.data?.mode || undefined,
      targetTemperature: d.data?.targetTemperature || d.data?.targetTemp || undefined,
      currentTemperature: d.data?.roomTemp || d.data?.currentTemperature || undefined,
      fanSpeed: d.data?.fanSpeed || undefined,
      capabilities: ['power', 'temperature', 'mode', 'fanSpeed'],
    };
    return state;
  }

  async getDevices(): Promise<DeviceState[]> {
    // try session-based discovery, otherwise fallback to in-memory DB
    await this.ensureSession();
    if (this._session && this._session.getDevices) {
      const devs = await this._session.getDevices();
      const mapped = (devs || []).map((d: any) => {
        const s = this.mapDevice(d);
        // keep in-memory db in sync
        db.devices.set(s.id, s);
        // persist to storage if available
        try { 
          // lazy import to avoid circular
          const storage = require('../../lib/storage').default;
          storage.setDevice(s.id, s).catch(() => {});
        } catch (e) {}
        return s;
      });
      return mapped;
    }
    return Array.from(db.devices.values());
  }

  async getDeviceState(deviceId: string): Promise<DeviceState | null> {
    await this.ensureSession();
    if (this._session && this._session.getDevices) {
      const devs = await this._session.getDevices();
      const d = (devs || []).find((x: any) => String(x.data?.deviceId || x.id) === String(deviceId));
      if (d) {
        const s = this.mapDevice(d);
        db.devices.set(s.id, s);
        try { 
          const storage = require('../../lib/storage').default;
          storage.setDevice(s.id, s).catch(() => {});
        } catch (e) {}
        return s;
      }
    }
    return db.devices.get(deviceId) ?? null;
  }

  async executeCommand(deviceId: string, command: DeviceCommand): Promise<DeviceState> {
    await this.ensureSession();
    // prefer session/fluent device control
    if (this._session && this._session.getDevices) {
      const devs = await this._session.getDevices();
      const d = (devs || []).find((x: any) => String(x.data?.deviceId || x.id) === String(deviceId));
      if (!d) throw new Error('INVALID_DEVICE');
      // map common commands
      if (command.temperature !== undefined) {
        await d.setTemperature(Number(command.temperature));
      }
      if (command.power !== undefined) {
        if (command.power) await d.turnOn(); else await d.turnOff();
      }
      if (command.mode !== undefined && typeof d.setHvacMode === 'function') {
        await d.setHvacMode(command.mode);
      }
      // refresh state
      const s = this.mapDevice(d);
      db.devices.set(s.id, s);
      try { 
        const storage = require('../../lib/storage').default;
        storage.setDevice(s.id, s).catch(() => {});
      } catch (e) {}
      return s;
    }

    // fallback: update in-memory db
    const dev = db.devices.get(deviceId);
    if (!dev) throw new Error('INVALID_DEVICE');
    if (command.power !== undefined) dev.power = !!command.power;
    if (command.temperature !== undefined) dev.targetTemperature = command.temperature;
    if (command.mode !== undefined) dev.mode = command.mode;
    if (command.fanSpeed !== undefined) dev.fanSpeed = command.fanSpeed;
    db.devices.set(deviceId, dev);
    return dev;
  }
}
