import { MiraieAdapter } from './adapter';
import { registerProvider } from '../registry';

const adapter = new MiraieAdapter();
registerProvider(adapter);

export default adapter;
