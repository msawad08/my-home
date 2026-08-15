import bcrypt from 'bcryptjs';

type User = { username: string; passwordHash: string };
type ApiKey = { name: string; key: string; expiresAt?: string; revoked?: boolean };

export const db = {
  users: new Map<string, User>(),
  apiKeys: new Map<string, ApiKey>(),
  devices: new Map<string, any>(),
};

// initialize default user from env
const defaultUser = process.env.APP_USERNAME || 'admin';
const defaultPassword = process.env.APP_PASSWORD || 'admin';
const hash = bcrypt.hashSync(defaultPassword, 10);
db.users.set(defaultUser, { username: defaultUser, passwordHash: hash });

// sample device
db.devices.set('bedroom-ac', {
  id: 'bedroom-ac',
  name: 'Bedroom AC',
  providerId: 'miraie',
  online: true,
  power: false,
  mode: 'cool',
  targetTemperature: 24,
  currentTemperature: 27,
  fanSpeed: 'auto',
  capabilities: ['power', 'temperature', 'mode', 'fanSpeed'],
});

export type { User, ApiKey };
