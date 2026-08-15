export type DeviceCommand = {
  power?: boolean;
  temperature?: number;
  mode?: string;
  fanSpeed?: string;
};

export type DeviceState = {
  id: string;
  name: string;
  providerId: string;
  online: boolean;
  power: boolean;
  mode?: string;
  targetTemperature?: number;
  currentTemperature?: number;
  fanSpeed?: string;
  capabilities?: string[];
};

export interface SmartHomeProvider {
  id: string;
  name: string;
  authenticate(): Promise<void>;
  getDevices(): Promise<DeviceState[]>;
  getDeviceState(deviceId: string): Promise<DeviceState | null>;
  executeCommand(deviceId: string, command: DeviceCommand): Promise<DeviceState>;
}
