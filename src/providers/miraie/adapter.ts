import { SmartHomeProvider, DeviceState, DeviceCommand } from '../core/types';
import { db } from '../../lib/db';

export class MiraieAdapter implements SmartHomeProvider {
  id = 'miraie';
  name = 'MirAIe (stub)';

  async authenticate() {
    // In a real implementation this would use MirAIe credentials and MQTT/API.
    return;
  }

  async getDevices(): Promise<DeviceState[]> {
    return Array.from(db.devices.values());
  }

  async getDeviceState(deviceId: string): Promise<DeviceState | null> {
    return db.devices.get(deviceId) ?? null;
  }

  async executeCommand(deviceId: string, command: DeviceCommand): Promise<DeviceState> {
    const dev = db.devices.get(deviceId);
    if (!dev) throw new Error('INVALID_DEVICE');
    if (command.power !== undefined) dev.power = !!command.power;
    if (command.temperature !== undefined) dev.targetTemperature = command.temperature;
    if (command.mode !== undefined) dev.mode = command.mode;
    if (command.fanSpeed !== undefined) dev.fanSpeed = command.fanSpeed;
    // Update online status or other fields as needed
    db.devices.set(deviceId, dev);
    return dev;
  }
}
