# PostgreSQL connections

The development app opens the connection manager. It supports one PostgreSQL session at a time. Schema discovery and real row browsing follow in #17–#19; connecting does not display demo rows as database data. Press **F2** while disconnected to open the existing mock workspace, and F2 outside an editor to return. Mock edits remain memory-only.

## Configure and connect

Fill in a profile name, host (DNS name or IP address), port, database, user, and TLS mode. Tab / Shift+Tab moves between fields; clicking a field focuses it. On TLS, use Left/Right, Space, Enter, or click to change the mode.

- **Ctrl+S** saves the non-secret profile, or updates the selected saved profile.
- **F3 / Shift+F3**, or click the saved-profile line, selects a saved profile. **Ctrl+N** starts a new profile.
- **Ctrl+R** prompts for a password and connects using the current form. Saving is optional.
- In the password prompt, **Enter** connects, **Esc** cancels, **Backspace** deletes, and **Ctrl+U** clears. Typing and bracketed paste are masked. An empty password is allowed for servers that do not require one.
- **Ctrl+D** disconnects. **Esc** also cancels an in-flight connection attempt.
- **Ctrl+C** exits, including while a connection is pending. In the mock workspace, `q` outside an editor also exits.

The Save, Connect and Disconnect labels are clickable. Use at least 60 columns × 20 rows. Smaller terminals show a resize notice and preserve the form/password draft until resized or cancelled. A connection attempt times out after ten seconds; input and rendering remain responsive while it runs. Replacing a connection first closes the previous session. A failed connection leaves the form available for correction and retry.

| TLS mode                | Behavior                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------- |
| `verify-full` (default) | Requires TLS and verifies the server certificate and hostname using the runtime's trusted CAs. |
| `require`               | Requires encryption without verifying the server's identity.                                   |
| `disable`               | Plain TCP, without TLS.                                                                        |

There is no opportunistic fallback to plaintext. Custom CA/client-certificate fields, SSH tunnels, cloud authentication and OS credential storage are outside this slice. The password is requested for each attempt, handed to the driver through the credential interface, and never written to profiles or logs. Ambient `PGPASSWORD` and `.pgpass` passwords are not used. JavaScript/driver memory is not guaranteed to be securely erased.

Authentication, unreachable-host, missing-database and TLS failures show fixed actionable messages; raw driver/server messages are not displayed or logged. A server-closed session becomes disconnected and can be reconnected manually.

## Profile files

Profiles use `profiles.json` with schema version `1`. #79 will deliver the shared versioned TOML configuration and migration; this initial representation stays behind the profile port.

| Platform | Directory                                                           |
| -------- | ------------------------------------------------------------------- |
| Linux    | `$XDG_CONFIG_HOME/pond`, falling back to `~/.config/pond`           |
| macOS    | `~/Library/Application Support/Pond`                                |
| Windows  | `%APPDATA%\Pond`, falling back to the user's `AppData\Roaming\Pond` |

An absolute `POND_CONFIG_DIR` overrides this directory. Relative overrides and relative `XDG_CONFIG_HOME` values are ignored. Files contain profile IDs/names, engine, database, host, port, user and TLS mode. They contain no password or credential URL. New directories use `0700` and files use `0600` where supported; existing directory permissions are unchanged.

Writes use a temporary file followed by replacement and preserve other saved profiles. Invalid files, duplicate IDs, unknown fields and unsupported versions are rejected without overwriting the file. Storage failures leave the form available. Fix a bad file and retry saving, or reopen the connection manager to reload it. Concurrent editing by multiple app processes or an external editor is not coordinated yet; close Pond before editing the file manually. Profile deletion is currently a manual file edit.

## Validation

`bun run check` covers profile round trips and secret exclusion, damaged/newer-file preservation, session ownership and cancellation, masked typing/paste and retry, safe error mapping, and bounded shutdown. A TCP fixture deliberately stalls authentication to verify that cancellation actually releases its socket.

Linux validation used a disposable PostgreSQL 17.9 server with SCRAM authentication: correct/incorrect passwords, missing database, unreachable port, TLS required, untrusted-certificate rejection, trusted-certificate success, connection replacement, disconnect, and shutdown. The real terminal workflow was checked with diagnostics off/on, including resizing and switching to/from the demo; no passwords appeared in terminal output, profiles or logs. Other platforms still need their normal CI/package and interactive validation. This ticket alone does not complete the 0.4.0 browsing milestone.
