// Static JSON import shared by Node's CLI and Vite; no runtime fetch or dynamic import.
import catalog from './workoutTemplates.json' with { type: 'json' };
export default catalog;
