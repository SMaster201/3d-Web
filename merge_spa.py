import re
import os

def extract_main_content(html):
    # Non-greedy match to find everything inside <main ... id="main-content" ...> ... </main>
    # Note: re.DOTALL allows . to match newlines
    match = re.search(r'<main[^>]*id="main-content"[^>]*>(.*?)</main>', html, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1)
    
    # Fallback to just <main>
    match = re.search(r'<main[^>]*>(.*?)</main>', html, re.DOTALL | re.IGNORECASE)
    if match:
        return match.group(1)
    
    return ""

def main():
    root = r"c:\Users\fcu\Documents\SMaster project\3d"
    index_path = os.path.join(root, "index.html")
    
    with open(index_path, "r", encoding="utf-8") as f:
        index_html = f.read()

    # Find the main-content block
    main_start_match = re.search(r'<main[^>]*id="main-content"[^>]*>', index_html, re.IGNORECASE)
    main_end_match = re.search(r'</main>', index_html[main_start_match.end():], re.IGNORECASE)
    
    if not main_start_match or not main_end_match:
        print("Could not find main tag in index.html")
        return

    main_start_idx = main_start_match.end()
    main_end_idx = main_start_match.end() + main_end_match.start()
    
    original_main_inner = index_html[main_start_idx:main_end_idx]
    
    new_main_inner = f'\n            <section id="view-home" class="view-section h-full flex flex-col min-h-0">\n{original_main_inner}\n            </section>\n'
    
    files_to_inject = [
        ("detection_history.html", "history"),
        ("record_detail.html", "record-detail"),
        ("ai_chat.html", "chat"),
        ("settings.html", "settings"),
        ("settings_camera.html", "settings-camera"),
        ("settings_model.html", "settings-model"),
        ("settings_alert.html", "settings-alert"),
        ("user_profile.html", "profile")
    ]
    
    for filename, view_id in files_to_inject:
        filepath = os.path.join(root, "scripts", filename)
        if not os.path.exists(filepath):
            print(f"Skipping {filename} - not found")
            continue
            
        with open(filepath, "r", encoding="utf-8") as f:
            file_html = f.read()
            
        inner_content = extract_main_content(file_html)
        if inner_content:
            new_main_inner += f'\n            <section id="view-{view_id}" class="view-section hidden h-full flex flex-col min-h-0">\n{inner_content}\n            </section>\n'
            print(f"Injected {filename} as view-{view_id}")
        else:
            print(f"Could not extract main from {filename}")
            
    final_html = index_html[:main_start_idx] + new_main_inner + index_html[main_end_idx:]
    
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(final_html)
        
    print("Successfully merged all views into index.html")

if __name__ == "__main__":
    main()
