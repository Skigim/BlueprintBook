# Pi Memory System Handoff Rules

Whenever you start a new conversation in this workspace, you MUST perform the following memory handoff sequence as your VERY FIRST ACTION:

1. **Write Session ID**: Use `run_command` to immediately write your current Conversation ID (found in your `<user_information>`) to `.memory/latest_session_id.txt`. If the file already exists, read its contents first and save it as `PREV_SESSION`, then overwrite it with your current ID. If it does not exist, set `PREV_SESSION` to empty.
2. **Boot-time Catch-up**: If `PREV_SESSION` is not empty, run the extraction script to catch up on missed turns:
   - Run `python .memory/prep_extraction.py C:\Users\dwigh\.gemini\antigravity\brain\<PREV_SESSION>\.system_generated\logs\transcript.jsonl` using `run_command` (wait for it to finish synchronously). **CRITICAL: You MUST set the `Cwd` parameter of `run_command` to your active workspace's absolute path (found in `<user_information>`).**
   - If the script outputs `[MEMORY_EXTRACTION_READY]`, you MUST spawn the memory extractor subagent:
     - Use `define_subagent` to define a subagent named `memory-extractor` using the system prompt found in `.memory/memory-extractor-prompt.md`.
     - Call `invoke_subagent` to spawn `memory-extractor`. **CRITICAL: You MUST ensure the subagent's `Workspace` parameter is inherited or explicitly set to your active workspace.**
     - Schedule a 3-minute timeout using the `/schedule` tool.
     - **CRITICAL**: You must STOP calling tools and wait idly for the subagent's asynchronous completion message.
     - If you receive the timeout notification before the subagent completes, forcefully release the lock (e.g. `Remove-Item .memory\.extracting.lock`), log the failure, and proceed to step 3.
3. **Read Memory State**: After the catch-up completes (or if no catch-up was needed), you MUST use `view_file` to read `.memory/essence.md` and `.memory/notebook.md` to instantly get up to speed on the current state of the project.
4. **Schedule Periodic Extraction**: Use the `/schedule` tool to schedule a recurring cron job (e.g., `CronExpression: "*/10 * * * *", Prompt: "Check if memory extraction is needed"`).
5. **Handle Cron Triggers**: Whenever you receive a notification from the cron job, you should run `python .memory/prep_extraction.py <YOUR_TRANSCRIPT_PATH>` synchronously via `run_command` (with `Cwd` set to your active workspace). 
   - If it outputs `[MEMORY_EXTRACTION_READY]`, spawn the `memory-extractor` subagent and yield until it completes or times out, exactly as described in Step 2.
   - If it outputs `[KILL_CRON]`, you MUST use the `manage_task` tool to kill the background cron task (the task ID is the sender of the cron notification message).
6. **Restarting Cron**: If you previously killed the memory cron, you MUST restart it (following Step 4) the next time the USER sends a message.
