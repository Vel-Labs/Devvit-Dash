# Hackathon Submission Checklist

## Final three-hour order

1. Confirm the Devpost account has joined the hackathon and the Daily Dash project draft opens.
2. Resolve judge access first: record the exact final app version, judge-accessible subreddit, and exact game-post URL in [`JUDGE_ACCESS.md`](JUDGE_ACCESS.md).
3. Upload `daily-dash-devpost-landscape-58s.mp4` from `outputs/final-video-package-20260715/` to an approved public video host and paste the URL into Devpost. Keep the vertical cut as the alternate.
4. Apply/read back the app-listing copy and verify the unique app link opens.
5. Reconcile the Devpost draft, README, app listing, post, screenshots, and video to the same exact version and claims.
6. Submit the optional Developer Platform feedback form using [`DEVELOPER_FEEDBACK_DRAFT.md`](DEVELOPER_FEEDBACK_DRAFT.md); the feedback deadline is the same as the submission deadline.
7. Run one clean-session judge path: open post → ride → build/certify → Roadbook → Share Card.
8. Submit early enough to reopen and read back the final Devpost entry before 6:00 PM Pacific / 8:00 PM Central.

- [x] Live Devpost overview/rules, launch guide, community-games guide, and current Devvit Rules reconciled on 2026-07-15 in [`SUBMISSION_REQUIREMENTS_MATRIX.md`](SUBMISSION_REQUIREMENTS_MATRIX.md); recheck immediately before submission.
- [ ] Devpost hackathon registration completed.
- [x] Reddit Developer Platform account and CLI app ownership previously confirmed.
- [x] Unique app slug `drawn-to-deliver` is recorded in `devvit.json`.
- [ ] Final app-listing copy from [`APP_LISTING_DRAFT.md`](APP_LISTING_DRAFT.md) applied and read back.
- [x] App link staged: `https://developers.reddit.com/apps/drawn-to-deliver`; verify judge access after the final upload.
- [x] Documented private-playtest administrative path recorded through the installed Admin Helper; clean-role readback and the final submission access decision remain open.
- [ ] Final public Reddit post running the exact submitted app version; record it in [`JUDGE_ACCESS.md`](JUDGE_ACCESS.md).
- [x] Root `README.md` leads judges through the player journey, explains the return loop and Reddit-native contribution model, gives Phaser a dedicated section, and moves technical/security detail after the consumer story.
- [ ] Devpost draft from [`DEVPOST_SUBMISSION_DRAFT.md`](DEVPOST_SUBMISSION_DRAFT.md) reconciled to final live receipts and pasted/read back.
- [x] Updated 58-second 1920×1080 and 1080×1920 masters are checksum-verified from installed client `0.0.1.43`; exact Playwright source recordings are preserved in the final package before transient browser cleanup.
- [ ] Upload the selected 1920×1080 master publicly to YouTube, Vimeo, Facebook Video, or Youku and add the exact URL to Devpost. Keep the vertical cut as the mobile/social alternate.
- [ ] Complete the optional Developer Platform feedback survey from [`DEVELOPER_FEEDBACK_DRAFT.md`](DEVELOPER_FEEDBACK_DRAFT.md) before the deadline if pursuing the Feedback Award; one form per entrant.
- [x] Local first launch explains build/ride choices and controls without external documentation; refreshed in live playtest `v0.0.1.13` at an emulated portrait viewport.
- [x] Existing founding routes demonstrate Roadbook locally and in prior private playtest; final public-post readback remains covered by the final-version gate.
- [ ] Builder publication persists for authenticated user in the final live candidate and survives reload.
- [x] Daily route compilation is deterministic/idempotent locally; scheduler registration and daily posts through 2026-07-14 UTC were read back live. A final-version fresh post remains required.
- [x] Portrait Menu/Builder/Creator and compact-landscape gate pass local viewport checks; complete the final real mobile Reddit matrix.
- [x] No gameplay audio ships, so mute is not applicable; decorative reduced-motion controls remain unnecessary because no required information depends on animation.
- [x] Fixed-reason report, guarded removal, and solver-valid route repair pass local tests; verify member/moderator behavior live.
- [x] Third-party asset licenses recorded for the imported Kenney subset.
- [x] Privacy inventory, retention, inactivity anonymization, and explicit owner deletion are documented; live destructive proof remains approval-gated.
- [x] `npm run check` passes for the local Route Passport candidate (24 test files / 100 tests); rerun after any T121 repair and before private install or submission use.
- [x] `npm run build` passes without warnings after the Devvit 0.13.7 / Vite 8.1.4 patch update.
- [x] `npm audit --omit=dev` reports zero shipped-production vulnerabilities; full development audit retains one high/four low findings inside the Devvit CLI chain, with only a breaking `devvit@1.0.0` force-fix offered.
- [ ] No World Tour claim unless real shared service is operational.
- [ ] No payments, external services, free-text Builder input, uploads, arbitrary drawing, or jumping mechanic added as MVP dependencies.
- [ ] Submission materials are in English or include English translations.
- [ ] Submission screenshots follow [`SCREENSHOT_PLAN.md`](SCREENSHOT_PLAN.md) and come from the final live candidate, not mocked/local evidence.
- [ ] Demo captures both build and ride loops and, only with real final-candidate profile values, the Route Passport.
- [ ] Demo post, app listing, video, images, README, and Devpost text all name the same final app version and proof boundary.
