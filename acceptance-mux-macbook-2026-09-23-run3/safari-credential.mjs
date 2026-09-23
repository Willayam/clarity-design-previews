import fs from 'node:fs';import {execFileSync} from 'node:child_process';
const key=process.argv[2];const value=fs.readFileSync('.env.e2e.local','utf8').split('\n').find(l=>l.startsWith(key+'=')).slice(key.length+1).trim().replace(/^['"]|['"]$/g,'');
execFileSync('osascript',[],{input:`tell application "System Events"
tell process "Safari"
set frontmost to true
keystroke ${JSON.stringify(value)}
end tell
end tell`,stdio:['pipe','ignore','ignore']});
