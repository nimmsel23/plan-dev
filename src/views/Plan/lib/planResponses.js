import { auth, db } from '@cloud/firebase.js';
import { createPlanResponseStore } from './planResponseStore.js';
export const planResponses = createPlanResponseStore({ db, getActor: () => auth.currentUser });
