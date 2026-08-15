export interface Device {
  id: string;
  name: string;
  model?: string;
}

export interface DeviceState {
  power: boolean;
  mode?: string;
  temperature?: number;
  fan?: string;
}

export type DeviceCommand = {
  type: string;
  payload?: Record<string, any>;
};
