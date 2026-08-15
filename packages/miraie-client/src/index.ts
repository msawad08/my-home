import { Device, DeviceCommand, DeviceState } from './types';

export interface MiraieClientOptions {
  username?: string;
  password?: string;
  host?: string;
  token?: string;
}

/**
 * MiraieClient (stub)
 * TODO: implement authentication, device discovery, and command protocol.
 */
export class MiraieClient {
  private opts: MiraieClientOptions;
  private connected = false;

  constructor(opts: MiraieClientOptions = {}) {
    this.opts = opts;
  }

  /** connect to service / prepare client */
  async connect(): Promise<void> {
    // TODO: implement real connection/auth flow
    this.connected = true;
  }

  /** list known devices */
  async getDevices(): Promise<Device[]> {
    if (!this.connected) await this.connect();
    // TODO: query real devices
    return [];
  }

  /** get device state */
  async getDeviceState(deviceId: string): Promise<DeviceState | null> {
    if (!this.connected) await this.connect();
    // TODO: fetch real state
    return null;
  }

  /** execute a command on a device */
  async executeCommand(deviceId: string, command: DeviceCommand): Promise<any> {
    if (!this.connected) await this.connect();
    // TODO: send command to device and return result
    return { success: false, message: 'Not implemented' };
  }
}

export default MiraieClient;
