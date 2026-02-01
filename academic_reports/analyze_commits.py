import subprocess
import datetime
import os
import re

periods = [
    ("2025-09-29", "2025-10-12"),
    ("2025-10-13", "2025-10-26"),
    ("2025-10-27", "2025-11-09"),
    ("2025-11-10", "2025-11-23"),
    ("2025-11-24", "2025-12-07"),
    ("2025-12-08", "2025-12-21"),
    ("2025-12-22", "2026-01-04"),
    ("2026-01-05", "2026-01-18"),
    ("2026-01-19", "2026-01-30"),
]

def run_command(command):
    try:
        result = subprocess.run(command, shell=True, text=True, capture_output=True, errors='replace')
        return result.stdout.strip()
    except Exception as e:
        return ""

output_file = "COMMITS_TECHNICAL_ANALYSIS.md"

with open(output_file, "w") as f:
    f.write("# Technical Analysis of Commits\n\n")
    f.write(f"Generated: {datetime.datetime.now().strftime('%Y-%m-%d')}\n")
    f.write("Repository: chiron\n\n")

    for start, end in periods:
        print(f"Analyzing period: {start} to {end}")
        f.write(f"## Period: {start} to {end}\n\n")

        commits_cmd = f'git log --since="{start} 00:00:00" --until="{end} 23:59:59" --pretty=format:"%h|%an|%ad|%s" --date=short'
        commits_output = run_command(commits_cmd)
        
        if not commits_output:
            f.write("*No commits found in this period.*\n\n")
            continue

        commits = commits_output.split('\n')
        f.write(f"**Total Commits:** {len(commits)}\n\n")

        stats_cmd = f'git log --since="{start} 00:00:00" --until="{end} 23:59:59" --numstat'
        stats_output = run_command(stats_cmd)
        
        added = 0
        deleted = 0
        files_changed = set()
        
        for line in stats_output.split('\n'):
            if not line: continue
            parts = line.split()
            if len(parts) >= 3:
                try:
                    a = int(parts[0]) if parts[0] != '-' else 0
                    d = int(parts[1]) if parts[1] != '-' else 0
                    added += a
                    deleted += d
                    files_changed.add(parts[2])
                except ValueError:
                    pass
        
        f.write("### Code Quality Metrics\n")
        f.write(f"- **Lines Added:** {added}\n")
        f.write(f"- **Lines Removed:** {deleted}\n")
        f.write(f"- **Net Change:** {added - deleted}\n")
        f.write(f"- **Unique Files Modified:** {len(files_changed)}\n\n")

        f.write("### Technical Summary\n")
        
        arch_changes = []
        features = []
        db_changes = []
        api_changes = []
        deps = []
        config = []
        fix = []
        refactor = []
        tests = []
        
        for commit in commits:
            parts = commit.split('|')
            if len(parts) < 4: continue
            msg = parts[3]
            msg_lower = msg.lower()
            
            if msg_lower.startswith('feat'): features.append(msg)
            elif msg_lower.startswith('fix'): fix.append(msg)
            elif msg_lower.startswith('refactor'): refactor.append(msg)
            elif msg_lower.startswith('test'): tests.append(msg)
            elif msg_lower.startswith('chore') or msg_lower.startswith('config'): config.append(msg)
            
            if "schema" in msg_lower or "migration" in msg_lower or "drizzle" in msg_lower: db_changes.append(msg)
            if "api" in msg_lower or "router" in msg_lower or "trpc" in msg_lower or "endpoint" in msg_lower: api_changes.append(msg)
            if "dependency" in msg_lower or "package.json" in msg_lower or ("add" in msg_lower and "package" in msg_lower): deps.append(msg)
            if "architecture" in msg_lower or "structure" in msg_lower or "engine" in msg_lower: arch_changes.append(msg)

        if arch_changes:
            f.write("**Architectural Changes:**\n")
            for item in sorted(list(set(arch_changes)))[:10]: f.write(f"- {item}\n")
            f.write("\n")

        if features:
            f.write("**Key Features:**\n")
            for item in features[:10]: f.write(f"- {item}\n")
            if len(features) > 10: f.write(f"- ...and {len(features)-10} more\n")
            f.write("\n")
            
        if db_changes:
            f.write("**Database Changes:**\n")
            for item in sorted(list(set(db_changes)))[:5]: f.write(f"- {item}\n")
            f.write("\n")
            
        if api_changes:
            f.write("**API & Backend:**\n")
            for item in sorted(list(set(api_changes)))[:5]: f.write(f"- {item}\n")
            f.write("\n")
            
        if deps:
            f.write("**Dependency Updates:**\n")
            for item in sorted(list(set(deps)))[:5]: f.write(f"- {item}\n")
            f.write("\n")

        f.write("### Development Patterns\n")
        f.write(f"- **Bug Fixes:** {len(fix)}\n")
        f.write(f"- **Refactoring:** {len(refactor)}\n")
        f.write(f"- **Feature Work:** {len(features)}\n")
        f.write(f"- **Test Updates:** {len(tests)}\n")
        
        dirs = {}
        for path in files_changed:
            d = os.path.dirname(path)
            if d.startswith('./'): d = d[2:]
            if not d: d = "root"
            
            parts = d.split('/')
            if len(parts) > 2:
                d = "/".join(parts[:2])
            
            dirs[d] = dirs.get(d, 0) + 1
            
        sorted_dirs = sorted(dirs.items(), key=lambda x: x[1], reverse=True)
        f.write("**Most Active Components:**\n")
        for d, count in sorted_dirs[:5]:
            f.write(f"- `{d}` ({count} files modified)\n")
        f.write("\n")

        debt_keywords = ["todo", "fixme", "hack", "workaround", "temp", "legacy", "debt", "cleanup"]
        debt_commits = []
        for commit in commits:
            msg = commit.split('|')[3]
            if any(k in msg.lower() for k in debt_keywords):
                debt_commits.append(msg)
                
        if debt_commits:
            f.write("### Technical Debt Activity\n")
            for item in debt_commits[:5]: f.write(f"- {item}\n")
            f.write("\n")
        
        f.write("---\n\n")

print(f"Analysis complete. Saved to {output_file}")
