Blocker: pricing removals invalidate sibling addresses inside one batch.

packages/journey-page-domain/src/page-list-edits.ts:184 and :225 renumber surviving plans and features after removal. The next edit still carries the seqNo that pages_get returned. A second removal cannot find it and returns an unchanged success, so pages_edit commits only part of the requested batch while reporting success. A setter after a sibling removal instead refuses not_found.

Reproduced on https://pr-1041.clarity-video.workers.dev at 68f6bdb1fed5a2222b9e78044b619beca00bf1f7 with no concurrent writer:

1. Create pricing plans A and B with seq_no 10 and 20.
2. Send one pages_edit with remove_plan 10 followed by remove_plan 20.
3. The response is revision 3, changed true. pages_get still returns Plan B with a new sequence.
4. A plan containing features A and B at 100 and 200 behaves the same when both removals appear in one batch. Feature B remains after success at revision 5.
5. Removing plan 10 then setting plan 20's title refuses edit 2 with edit_refused/not_found and leaves the batch unapplied.

Expected fix: preserve surviving seq_no addresses on deletion, since removing an item does not require resequencing to preserve public order. For operations that must resequence, retain an address mapping within the batch or otherwise preserve the documented target identities. Add dispatcher tests that remove two plans, remove two features, and remove one plan then edit its sibling using one pages_get snapshot.

Evidence: batch-defect.json contains the real requests, responses, and readbacks. batch-defect.log is the short transcript. sequence-probe.json contains the local pure-core reproduction. The created preview page was deleted and the connection revoked, with confirmations in batch-defect.json.

This is not the accepted concurrent-list merge limitation. One request with no other writer reproduces it.
