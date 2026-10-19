# Prepare the self-hosted GitHub release

The repository is prepared at https://github.com/BryanWalker321/Tellybox (private during release preparation). Publish only the clean self-hosted starter, following these steps:

1. Build `release/tellybox-self-hosted.zip` using `python scripts/package-release.py`. Extract it into a **new empty folder**, separate from the running UK station.
2. Confirm catalogue.json has one channel and two generated demo transmissions. Confirm there is no data directory, owner.json, .env, SQLite database, local recording or real Discord credential. The bundled example media under examples/demo is safe to publish.
3. Create an empty GitHub repository under the intended account/organisation. Choose the final project name and description; identify this as the reusable engine, not the live Tellybox UK network.
4. Initialise Git in the extracted folder, commit the source, add the new repository as its remote and push. Keep the supplied .gitignore; runtime data and uploaded media must stay excluded.
5. Publish the starter ZIP as a tagged GitHub Release. Add the final repository/release links to the live station’s Host your own page, replacing its forthcoming-release message.
6. Check a fresh clone locally and the supplied Docker setup. Keep MIT application licensing and separate third-party notices. Add CI that runs the Node tests with FFmpeg available.

The UK edition and its archive programme pack can be maintained separately. Never publish the running station folder wholesale or treat its private data backup as a source release.
