export type DeviceCommand = {
  power?: boolean;
  temperature?: number;
  mode?: string;
  fanSpeed?: string;
};

export function validateDeviceCommand(body: any) : { success: boolean; data?: DeviceCommand; error?: any } {
  const data: DeviceCommand = {};
  if (body == null || typeof body !== 'object') return { success: false, error: 'invalid_body' };
  if ('power' in body) {
    if (typeof body.power !== 'boolean') return { success: false, error: { field: 'power', reason: 'expected_boolean' } };
    data.power = body.power;
  }
  if ('temperature' in body) {
    const t = Number(body.temperature);
    if (!Number.isInteger(t) || t < 16 || t > 30) return { success: false, error: { field: 'temperature', reason: 'invalid_range' } };
    data.temperature = t;
  }
  if ('mode' in body) {
    if (typeof body.mode !== 'string') return { success: false, error: { field: 'mode', reason: 'expected_string' } };
    data.mode = body.mode;
  }
  if ('fanSpeed' in body) {
    if (typeof body.fanSpeed !== 'string') return { success: false, error: { field: 'fanSpeed', reason: 'expected_string' } };
    data.fanSpeed = body.fanSpeed;
  }
  return { success: true, data };
}
