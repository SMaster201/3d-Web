import re
import os

def main():
    root = r"c:\Users\fcu\Documents\SMaster project\3d"
    app_js_path = os.path.join(root, "js", "app.js")
    record_html_path = os.path.join(root, "scripts", "record_detail.html")
    
    with open(app_js_path, "r", encoding="utf-8") as f:
        app_js = f.read()
        
    with open(record_html_path, "r", encoding="utf-8") as f:
        record_html = f.read()
        
    # Extract script from record_detail.html
    script_match = re.search(r'<script>\s*document.addEventListener\(\'DOMContentLoaded\', async \(\) => \{(.*?)\}\);\s*</script>', record_html, re.DOTALL)
    
    if script_match:
        script_content = script_match.group(1)
        
        # Replace back-btn logic to use SPA instead of window.location.href
        script_content = script_content.replace("window.location.href = 'detection_history.html';", "document.getElementById('nav-history').click();")
        
        # Wrap it in window.initRecordDetailView
        init_function = f"\n\nwindow.initRecordDetailView = async () => {{{script_content}}};\n\n"
        
        # Add spa listener
        spa_listener = """
window.addEventListener('spa:view-loaded', (e) => {
    if (e.detail.viewId === 'view-record-detail') {
        if (typeof window.initRecordDetailView === 'function') {
            window.initRecordDetailView();
        }
    }
});
"""
        
        # Append to app.js (inside DOMContentLoaded or outside. Since app.js is a module-like script, putting it at the end is fine, but it needs to be inside or outside the DOMContentLoaded wrapper)
        # We can just append it to the very end of app.js.
        app_js += init_function + spa_listener
        
        with open(app_js_path, "w", encoding="utf-8") as f:
            f.write(app_js)
            
        print("Successfully injected initRecordDetailView into app.js")
    else:
        print("Could not find script block in record_detail.html")

if __name__ == "__main__":
    main()
