#!/usr/bin/env python3
"""
Updated script to analyze OpenCode sessions for the chiron project and categorize them by 2-week periods.
"""

import json
import os
from datetime import datetime
import re
from pathlib import Path

def parse_session_file(session_filepath, message_dir):
    """Parse a session file and extract relevant information including messages."""
    try:
        with open(session_filepath, 'r') as f:
            data = json.load(f)
        
        # Extract basic info
        session_id = data.get('id', '')
        title = data.get('title', '')
        directory = data.get('directory', '')
        
        # Parse time information
        time_info = data.get('time', {})
        created_at = time_info.get('created')
        updated_at = time_info.get('updated')
        
        # Convert timestamps to ISO strings
        if created_at:
            created_at = datetime.fromtimestamp(created_at / 1000).isoformat()
        if updated_at:
            updated_at = datetime.fromtimestamp(updated_at / 1000).isoformat()
        
        # Load messages for this session
        messages = []
        agents_used = set()
        main_work_area = "Unknown"
        
        # Find message directory for this session
        session_message_dir = message_dir / session_id
        if session_message_dir.exists():
            message_files = list(session_message_dir.glob("msg_*.json"))
            
            # Sort messages by created time
            messages_data = []
            for msg_file in message_files:
                try:
                    with open(msg_file, 'r') as msg_f:
                        msg_data = json.load(msg_f)
                        messages_data.append(msg_data)
                except:
                    continue
            
            # Sort by created time
            messages_data.sort(key=lambda x: x.get('time', {}).get('created', 0))
            
            # Analyze messages
            for i, msg in enumerate(messages_data):
                messages.append(msg)
                
                # Extract agent info
                agent = msg.get('agent', '')
                if agent and agent != 'explore':  # explore is default
                    agents_used.add(agent)
                
                # Get content for first few messages to determine work area
                if i < 5:
                    content = msg.get('content', '')
                    if isinstance(content, str):
                        # Determine work area from content
                        if 'workflow' in content.lower() or 'step' in content.lower():
                            main_work_area = "Workflow Development"
                        elif 'component' in content.lower() or 'ui' in content.lower():
                            main_work_area = "UI Components"
                        elif 'database' in content.lower() or 'schema' in content.lower():
                            main_work_area = "Database/Schema"
                        elif 'api' in content.lower() or 'endpoint' in content.lower():
                            main_work_area = "API Development"
                        elif 'test' in content.lower() or 'testing' in content.lower():
                            main_work_area = "Testing"
                        elif 'auth' in content.lower() or 'authentication' in content.lower():
                            main_work_area = "Authentication"
                        elif 'deploy' in content.lower() or 'deployment' in content.lower():
                            main_work_area = "Deployment"
                        elif 'bmad' in content.lower():
                            main_work_area = "BMAD Methodology"
        
        # Determine story/epic from title and work area
        story_epic = "Not specified"
        if title:
            if 'workflow' in title.lower():
                story_epic = "Workflow Development"
            elif 'ui' in title.lower() or 'component' in title.lower():
                story_epic = "UI Development"
            elif 'api' in title.lower():
                story_epic = "API Development"
            elif 'database' in title.lower():
                story_epic = "Database"
            elif 'auth' in title.lower():
                story_epic = "Authentication"
            elif 'test' in title.lower():
                story_epic = "Testing"
            elif 'deploy' in title.lower():
                story_epic = "Deployment"
            elif 'bmad' in title.lower():
                story_epic = "BMAD Methodology"
        
        return {
            'session_id': session_id,
            'title': title,
            'directory': directory,
            'created_at': created_at,
            'updated_at': updated_at,
            'message_count': len(messages),
            'agents_used': sorted(list(agents_used)),
            'main_work_area': main_work_area,
            'story_epic': story_epic,
            'filepath': session_filepath
        }
    except Exception as e:
        print(f"Error parsing {session_filepath}: {e}")
        return None

def get_sprint_for_date(date_str):
    """Determine which sprint a date belongs to."""
    if not date_str:
        return None
    
    # Try to parse different date formats
    date_formats = [
        '%Y-%m-%dT%H:%M:%S.%f',
        '%Y-%m-%dT%H:%M:%S',
        '%Y-%m-%d %H:%M:%S',
        '%Y-%m-%d'
    ]
    
    date_obj = None
    for fmt in date_formats:
        try:
            date_obj = datetime.strptime(date_str, fmt)
            break
        except:
            try:
                date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                break
            except:
                continue
    
    if not date_obj:
        return None
    
    # Define sprint boundaries
    sprints = [
        ("Sep 29 - Oct 12, 2025", datetime(2025, 9, 29), datetime(2025, 10, 12)),
        ("Oct 13 - Oct 26, 2025", datetime(2025, 10, 13), datetime(2025, 10, 26)),
        ("Oct 27 - Nov 9, 2025", datetime(2025, 10, 27), datetime(2025, 11, 9)),
        ("Nov 10 - Nov 23, 2025", datetime(2025, 11, 10), datetime(2025, 11, 23)),
        ("Nov 24 - Dec 7, 2025", datetime(2025, 11, 24), datetime(2025, 12, 7)),
        ("Dec 8 - Dec 21, 2025", datetime(2025, 12, 8), datetime(2025, 12, 21)),
        ("Dec 22, 2025 - Jan 4, 2026", datetime(2025, 12, 22), datetime(2026, 1, 4)),
        ("Jan 5 - Jan 18, 2026", datetime(2026, 1, 5), datetime(2026, 1, 18)),
        ("Jan 19 - Jan 30, 2026", datetime(2026, 1, 19), datetime(2026, 1, 30)),
    ]
    
    for name, start, end in sprints:
        if start <= date_obj <= end:
            return name
    
    return None

def main():
    """Main analysis function."""
    
    opencode_storage = Path.home() / ".local/share/opencode/storage"
    session_storage = opencode_storage / "session"
    message_storage = opencode_storage / "message"
    
    print(f"Analyzing OpenCode sessions from: {session_storage}")
    print(f"Loading messages from: {message_storage}")
    
    # Find all session files
    session_files = []
    for session_dir in session_storage.iterdir():
        if session_dir.is_dir():
            session_files.extend(session_dir.glob("ses_*.json"))
    
    print(f"Found {len(session_files)} session files")
    
    # Filter for chiron-related sessions
    chiron_sessions = []
    
    for session_file in session_files:
        try:
            with open(session_file, 'r') as f:
                content = f.read()
                if 'chiron' in content.lower():
                    session_data = parse_session_file(session_file, message_storage)
                    if session_data:
                        chiron_sessions.append(session_data)
        except Exception as e:
            print(f"Error reading {session_file}: {e}")
    
    print(f"Found {len(chiron_sessions)} chiron-related sessions")
    
    # Group by sprints
    sprint_data = {}
    
    for session in chiron_sessions:
        # Try to determine sprint from updated_at, then created_at, then file modification time
        sprint = None
        
        if session['updated_at']:
            sprint = get_sprint_for_date(session['updated_at'])
        
        if not sprint and session['created_at']:
            sprint = get_sprint_for_date(session['created_at'])
        
        if not sprint:
            # Try to use file modification time
            try:
                file_mtime = datetime.fromtimestamp(session['filepath'].stat().st_mtime)
                sprint = get_sprint_for_date(file_mtime.isoformat())
            except:
                pass
        
        if not sprint:
            sprint = "Unknown Period"
        
        if sprint not in sprint_data:
            sprint_data[sprint] = {
                'sessions': [],
                'total_messages': 0,
                'agents': set(),
                'work_areas': set(),
                'stories_epics': set()
            }
        
        sprint_data[sprint]['sessions'].append(session)
        sprint_data[sprint]['total_messages'] += session['message_count']
        sprint_data[sprint]['agents'].update(session['agents_used'])
        sprint_data[sprint]['work_areas'].add(session['main_work_area'])
        sprint_data[sprint]['stories_epics'].add(session['story_epic'])
    
    # Generate report
    report = "# Chiron OpenCode Sessions by Sprint\n\n"
    report += f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
    report += f"Total Sessions Analyzed: {len(chiron_sessions)}\n\n"
    
    # Sort sprints chronologically
    sprint_order = [
        "Sep 29 - Oct 12, 2025",
        "Oct 13 - Oct 26, 2025", 
        "Oct 27 - Nov 9, 2025",
        "Nov 10 - Nov 23, 2025",
        "Nov 24 - Dec 7, 2025",
        "Dec 8 - Dec 21, 2025",
        "Dec 22, 2025 - Jan 4, 2026",
        "Jan 5 - Jan 18, 2026",
        "Jan 19 - Jan 30, 2026"
    ]
    
    for sprint_name in sprint_order:
        if sprint_name in sprint_data:
            data = sprint_data[sprint_name]
            session_ids = [s['session_id'] for s in data['sessions']]
            
            report += f"## {sprint_name}\n"
            report += f"- Sessions: {len(data['sessions'])}\n"
            report += f"- Total Messages: {data['total_messages']}\n"
            report += f"- Agents: {', '.join(sorted(list(data['agents']))) if data['agents'] else 'None detected'}\n"
            report += f"- Work Areas: {', '.join(sorted(list(data['work_areas'])))}\n"
            report += f"- Key Deliverables: Based on work areas: {', '.join(sorted(list(data['stories_epics'])))}\n"
            report += f"- Session IDs: {', '.join(session_ids[:5])}"
            if len(session_ids) > 5:
                report += f" ... and {len(session_ids) - 5} more"
            report += "\n\n"
    
    # Add sessions without clear sprint classification
    if "Unknown Period" in sprint_data:
        data = sprint_data["Unknown Period"]
        report += f"## Unknown Period\n"
        report += f"- Sessions: {len(data['sessions'])}\n"
        report += f"- Total Messages: {data['total_messages']}\n"
        report += f"- Agents: {', '.join(sorted(list(data['agents']))) if data['agents'] else 'None detected'}\n"
        report += f"- Work Areas: {', '.join(sorted(list(data['work_areas'])))}\n\n"
    
    # Add summary table
    report += "## Summary Table\n\n"
    report += "| Sprint | Sessions | Messages | Agents | Work Areas |\n"
    report += "|-------|----------|----------|--------|------------|\n"
    
    for sprint_name in sprint_order:
        if sprint_name in sprint_data:
            data = sprint_data[sprint_name]
            agents_str = str(len(data['agents'])) if data['agents'] else '0'
            areas_str = str(len(data['work_areas'])) if data['work_areas'] else '0'
            report += f"| {sprint_name} | {len(data['sessions'])} | {data['total_messages']} | {agents_str} | {areas_str} |\n"
    
    if "Unknown Period" in sprint_data:
        data = sprint_data["Unknown Period"]
        agents_str = str(len(data['agents'])) if data['agents'] else '0'
        areas_str = str(len(data['work_areas'])) if data['work_areas'] else '0'
        report += f"| Unknown Period | {len(data['sessions'])} | {data['total_messages']} | {agents_str} | {areas_str} |\n"
    
    # Save report
    output_file = Path.home() / "Desktop/projects/masters/chiron/SESSIONS_BY_SPRINT.md"
    with open(output_file, 'w') as f:
        f.write(report)
    
    print(f"Report saved to: {output_file}")
    print(f"\nQuick Summary:")
    total_messages = 0
    for sprint_name in sprint_order:
        if sprint_name in sprint_data:
            data = sprint_data[sprint_name]
            total_messages += data['total_messages']
            print(f"  {sprint_name}: {len(data['sessions'])} sessions, {data['total_messages']} messages")
    
    if "Unknown Period" in sprint_data:
        data = sprint_data["Unknown Period"]
        total_messages += data['total_messages']
        print(f"  Unknown Period: {len(data['sessions'])} sessions, {data['total_messages']} messages")
    
    print(f"\nTotal: {len(chiron_sessions)} sessions, {total_messages} messages")

if __name__ == "__main__":
    main()
