/**
 * functions/index.js — Royal Mog vote anomaly rollback
 *
 * Deploy:  firebase deploy --only functions
 * Runtime: Node 20
 *
 * This Cloud Function is triggered whenever the client-side anomaly
 * detector writes a record to royalmog/audit_log/{entry}.
 * It runs with admin privileges and can authoritatively roll back
 * a manipulated vote count — something the client cannot do safely.
 */

const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const { initializeApp }     = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

const VOTES_DOC_PATH   = 'royalmog/votes';
const SPIKE_THRESHOLD  = 20; // must match client constant

exports.auditAndRollback = onDocumentCreated(
  'royalmog/audit_log/{entry}',
  async (event) => {
    const data = event.data.data();
    if (!data || data.resolved) return;

    const { candidateId, prevCount, detectedCount, delta } = data;

    // Sanity-check: only act on genuine spikes
    if (!candidateId || delta < SPIKE_THRESHOLD) {
      console.log(`[Audit] Entry for "${candidateId}" below threshold (delta=${delta}). Skipping.`);
      return;
    }

    console.log(`[Audit] Rolling back "${candidateId}": ${detectedCount} → ${prevCount}`);

    try {
      await db.runTransaction(async tx => {
        const votesRef = db.doc(VOTES_DOC_PATH);
        const snap     = await tx.get(votesRef);
        if (!snap.exists) return;

        const current = snap.data()[candidateId] ?? 0;

        // Only roll back if still anomalously high
        if (current - prevCount >= SPIKE_THRESHOLD) {
          tx.update(votesRef, { [candidateId]: prevCount });
          console.log(`[Audit] Rolled back "${candidateId}" from ${current} to ${prevCount}.`);
        } else {
          console.log(`[Audit] "${candidateId}" count is ${current}; no longer anomalous. Skipping rollback.`);
        }
      });

      // Mark audit record as resolved
      await event.data.ref.update({
        resolved:   true,
        resolvedAt: FieldValue.serverTimestamp(),
        resolvedBy: 'cloud-function',
      });

    } catch (err) {
      console.error(`[Audit] Rollback failed for "${candidateId}":`, err);
    }
  }
);
