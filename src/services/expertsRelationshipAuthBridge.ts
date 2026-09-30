import { onAuthStateChanged } from 'firebase/auth';
import { firebaseAuth } from '../lib/firebase';
import { hydrateExpertsRelationshipMemory } from './expertsRelationshipMemory';

let hydratedUid = '';

onAuthStateChanged(firebaseAuth, (user) => {
  if (!user) {
    hydratedUid = '';
    return;
  }
  if (hydratedUid === user.uid) return;
  hydratedUid = user.uid;
  void hydrateExpertsRelationshipMemory();
});
